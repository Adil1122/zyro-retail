import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

interface CheckoutItemInput {
  variantId: string;
  quantity: number;
  unitPrice?: number;
  lineDiscountAmount?: number;
  note?: string;
}

interface CheckoutPaymentInput {
  methodCode: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'khata' | 'other';
  amount: number;
  tenderedAmount?: number;
  referenceNo?: string;
}

interface CheckoutBody {
  branchId?: string;
  customerId?: string | null;
  clientSyncId?: string;
  discountPayload?: { mode: 'pct' | 'rs'; value: number; reason?: string } | null;
  taxRatePct?: number;
  notes?: string;
  heldBillId?: string | null;
  allowPartialKhata?: boolean;
  items?: CheckoutItemInput[];
  payments?: CheckoutPaymentInput[];
}

const VALID_METHODS = new Set(['cash', 'jazz', 'easy', 'raast', 'card', 'bank', 'khata', 'other']);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CheckoutBody | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, branch, membership, userFullName } = guard.ctx;

  const itemsInput = body.items ?? [];
  if (itemsInput.length === 0) {
    return NextResponse.json({ error: 'Cart is empty. Add at least one footwear pair.' }, { status: 400 });
  }

  const canOverridePrice =
    membership.permissions.includes('pos.discount.approve') ||
    membership.permissions.includes('inventory.manage');
  const canApplyDiscount =
    membership.permissions.includes('pos.discount.apply') || canOverridePrice;

  // Validate all variants server-side against authoritative DB prices, active status, and branch stock
  const variantIds = Array.from(new Set(itemsInput.map((i) => i.variantId).filter(Boolean)));
  if (variantIds.length === 0) {
    return NextResponse.json({ error: 'Invalid cart items.' }, { status: 400 });
  }

  const [{ data: variantRows, error: varErr }, { data: stockRows }] = await Promise.all([
    supabase
      .from('product_variants')
      .select(
        `
        id, product_id, variant_name, sku, colour_name, size_name, cost_price, selling_price, is_active, deleted_at,
        products:product_id ( id, name, brand, base_selling_price, track_inventory, is_active, deleted_at )
      `,
      )
      .eq('business_id', businessId)
      .in('id', variantIds),
    supabase
      .from('stock_levels')
      .select('variant_id, quantity_on_hand, quantity_reserved')
      .eq('business_id', businessId)
      .eq('branch_id', branchId)
      .in('variant_id', variantIds),
  ]);

  if (varErr) {
    return NextResponse.json({ error: varErr.message }, { status: 500 });
  }

  const variantMap = new Map(
    (variantRows ?? []).map((v) => [
      v.id,
      v as unknown as {
        id: string;
        product_id: string;
        variant_name: string;
        sku: string;
        colour_name: string | null;
        size_name: string | null;
        cost_price: number;
        selling_price: number | null;
        is_active: boolean;
        deleted_at: string | null;
        products: {
          id: string;
          name: string;
          brand: string | null;
          base_selling_price: number;
          track_inventory: boolean;
          is_active: boolean;
          deleted_at: string | null;
        } | null;
      },
    ]),
  );

  const stockMap = new Map(
    (stockRows ?? []).map((s) => [
      s.variant_id,
      Math.max(0, Number(s.quantity_on_hand ?? 0) - Number(s.quantity_reserved ?? 0)),
    ]),
  );

  // Aggregate requested quantities per variant to prevent overselling across split lines
  const requestedQtyByVariant = new Map<string, number>();
  let serverSubtotal = 0;

  const rpcItems: Array<{
    variant_id: string;
    quantity: number;
    unit_price: number;
    original_unit_price: number;
    line_discount_amount: number;
    note?: string;
  }> = [];

  for (const item of itemsInput) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'All line quantities must be positive.' }, { status: 400 });
    }

    const v = variantMap.get(item.variantId);
    if (!v || v.deleted_at || !v.products || v.products.deleted_at) {
      return NextResponse.json({ error: 'One or more footwear variants no longer exist.' }, { status: 404 });
    }
    if (!v.is_active || !v.products.is_active) {
      return NextResponse.json(
        { error: `"${v.products.name} (${v.variant_name})" is inactive and cannot be sold.` },
        { status: 400 },
      );
    }

    const authoritativePrice = Number(v.selling_price ?? v.products.base_selling_price ?? 0);
    let finalUnitPrice = authoritativePrice;

    if (
      item.unitPrice !== undefined &&
      Number.isFinite(Number(item.unitPrice)) &&
      Number(item.unitPrice) !== authoritativePrice
    ) {
      if (!canOverridePrice) {
        return NextResponse.json(
          { error: 'You do not have permission to override product selling prices.' },
          { status: 403 },
        );
      }
      if (Number(item.unitPrice) < 0) {
        return NextResponse.json({ error: 'Unit price cannot be negative.' }, { status: 400 });
      }
      finalUnitPrice = Number(item.unitPrice);
    }

    const lineDiscount = Math.max(0, Number(item.lineDiscountAmount ?? 0));
    if (lineDiscount > 0 && !canApplyDiscount) {
      return NextResponse.json(
        { error: 'You do not have permission to apply item discounts.' },
        { status: 403 },
      );
    }
    if (lineDiscount > finalUnitPrice * qty) {
      return NextResponse.json(
        { error: `Line discount for "${v.products.name}" exceeds line subtotal.` },
        { status: 400 },
      );
    }

    const prevReq = requestedQtyByVariant.get(v.id) ?? 0;
    const totalReq = prevReq + qty;
    requestedQtyByVariant.set(v.id, totalReq);

    if (v.products.track_inventory) {
      const available = stockMap.get(v.id) ?? 0;
      if (totalReq > available) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${v.products.name} (${v.variant_name}): only ${available} pair(s) available in ${branch.name}.`,
          },
          { status: 409 },
        );
      }
    }

    const lineTotal = Math.max(0, finalUnitPrice * qty - lineDiscount);
    serverSubtotal += lineTotal;

    rpcItems.push({
      variant_id: v.id,
      quantity: qty,
      unit_price: finalUnitPrice,
      original_unit_price: authoritativePrice,
      line_discount_amount: lineDiscount,
      ...(item.note ? { note: item.note } : {}),
    });
  }

  // Server-authoritative bill discount calculation
  let billDiscountAmount = 0;
  if (body.discountPayload && Number(body.discountPayload.value) > 0) {
    if (!canApplyDiscount) {
      return NextResponse.json(
        { error: 'You do not have permission to apply bill discounts.' },
        { status: 403 },
      );
    }
    const rawVal = Number(body.discountPayload.value);
    if (body.discountPayload.mode === 'pct') {
      billDiscountAmount = Math.round((serverSubtotal * Math.min(100, Math.max(0, rawVal))) / 100);
    } else {
      billDiscountAmount = Math.round(Math.max(0, rawVal));
    }
    billDiscountAmount = Math.min(billDiscountAmount, serverSubtotal);
  }

  const taxRatePct = Math.max(0, Number(body.taxRatePct ?? 0));
  const taxableBase = Math.max(0, serverSubtotal - billDiscountAmount);
  const taxAmount = taxRatePct > 0 ? Math.round((taxableBase * taxRatePct) / 100) : 0;
  const serverTotal = Math.max(0, taxableBase + taxAmount);

  // Validate payments
  const rawPayments = body.payments ?? [];
  const rpcPayments: Array<{
    method_code: string;
    amount: number;
    tendered_amount?: number;
    reference_no?: string;
  }> = [];

  let sumPaid = 0;
  let hasKhata = false;

  for (const p of rawPayments) {
    if (!VALID_METHODS.has(p.methodCode)) {
      return NextResponse.json({ error: `Unsupported payment method "${p.methodCode}".` }, { status: 400 });
    }
    const amt = Number(p.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      continue;
    }
    if (p.methodCode === 'khata') hasKhata = true;
    sumPaid += amt;
    rpcPayments.push({
      method_code: p.methodCode,
      amount: amt,
      ...(p.tenderedAmount !== undefined ? { tendered_amount: Number(p.tenderedAmount) } : {}),
      ...(p.referenceNo ? { reference_no: p.referenceNo.trim() } : {}),
    });
  }

  // Handle partial payment on customer account by putting unpaid remainder into Khata leg
  if (sumPaid < serverTotal) {
    if (body.allowPartialKhata && body.customerId) {
      const remaining = Math.round((serverTotal - sumPaid) * 100) / 100;
      rpcPayments.push({
        method_code: 'khata',
        amount: remaining,
        reference_no: 'Partial payment balance due',
      });
      sumPaid += remaining;
      hasKhata = true;
    } else {
      return NextResponse.json(
        {
          error: `Total payment (Rs ${sumPaid.toLocaleString()}) is less than bill total (Rs ${serverTotal.toLocaleString()}). Select a customer for partial/Khata credit.`,
        },
        { status: 400 },
      );
    }
  }

  if (hasKhata && !body.customerId) {
    return NextResponse.json(
      { error: 'Please select a customer before charging Khata credit or partial payment.' },
      { status: 400 },
    );
  }

  const clientSyncId =
    body.clientSyncId?.trim() ||
    `pos-${branchId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_sale', {
    p_payload: {
      business_id: businessId,
      branch_id: branchId,
      customer_id: body.customerId || null,
      client_sync_id: clientSyncId,
      discount_amount: billDiscountAmount,
      discount_payload: body.discountPayload || null,
      tax_amount: taxAmount,
      allow_partial_khata: Boolean(body.allowPartialKhata),
      notes: body.notes?.trim() || null,
      items: rpcItems,
      payments: rpcPayments,
    },
  });

  if (rpcError || !rpcResult) {
    return NextResponse.json(
      { error: rpcError?.message || 'Checkout failed while saving the sale.' },
      { status: 400 },
    );
  }

  const saleId = (rpcResult as { sale_id: string }).sale_id;

  // If this checkout resumed a held bill, remove the held bill record now
  if (body.heldBillId) {
    await supabase
      .from('held_bills')
      .delete()
      .eq('id', body.heldBillId)
      .eq('business_id', businessId);
  }

  // Hydrate full sale + receipt for immediate thermal receipt rendering
  const { data: saleRow } = await supabase
    .from('sales')
    .select(
      `
      id, branch_id, bill_number, status, customer_id, cashier_member_id,
      subtotal_amount, discount_amount, tax_amount, total_amount,
      paid_amount, due_amount, change_given, refunded_amount, notes, sold_at,
      customers:customer_id ( full_name, phone, khata_balance ),
      sale_items (
        id, product_id, variant_id, product_name_snapshot, variant_label_snapshot,
        sku_snapshot, unit_price, original_unit_price, quantity, line_discount_amount,
        line_total, returned_quantity, note
      ),
      sale_payments (
        id, method_code, amount, tendered_amount, reference_no, paid_at
      ),
      receipts ( id, receipt_number, payload )
    `,
    )
    .eq('id', saleId)
    .single();

  const cust = saleRow?.customers as unknown as {
    full_name: string;
    phone: string | null;
    khata_balance: number;
  } | null;
  const receiptsList = (saleRow?.receipts ?? []) as Array<{
    id: string;
    receipt_number: string;
    payload: Record<string, unknown>;
  }>;
  const receipt = receiptsList[0] ?? null;

  return NextResponse.json(
    {
      sale: saleRow
        ? {
            id: saleRow.id,
            branchId: saleRow.branch_id,
            branchName: branch.name,
            billNumber: Number(saleRow.bill_number),
            status: saleRow.status,
            customerId: saleRow.customer_id,
            customerName: cust?.full_name ?? null,
            customerPhone: cust?.phone ?? null,
            cashierMemberId: saleRow.cashier_member_id,
            cashierName: userFullName,
            subtotalAmount: Number(saleRow.subtotal_amount),
            discountAmount: Number(saleRow.discount_amount),
            taxAmount: Number(saleRow.tax_amount),
            totalAmount: Number(saleRow.total_amount),
            paidAmount: Number(saleRow.paid_amount),
            dueAmount: Number(saleRow.due_amount),
            changeGiven: Number(saleRow.change_given),
            refundedAmount: Number(saleRow.refunded_amount),
            paymentStatus:
              Number(saleRow.due_amount) <= 0
                ? 'paid'
                : Number(saleRow.paid_amount) > 0
                  ? 'partial'
                  : 'unpaid',
            notes: saleRow.notes,
            soldAt: saleRow.sold_at,
            items: ((saleRow.sale_items ?? []) as Array<Record<string, unknown>>).map((it) => ({
              id: String(it.id),
              productId: String(it.product_id),
              variantId: String(it.variant_id),
              productName: String(it.product_name_snapshot),
              variantLabel: String(it.variant_label_snapshot),
              sku: String(it.sku_snapshot ?? ''),
              unitPrice: Number(it.unit_price),
              originalUnitPrice: Number(it.original_unit_price),
              quantity: Number(it.quantity),
              lineDiscountAmount: Number(it.line_discount_amount ?? 0),
              lineTotal: Number(it.line_total),
              returnedQuantity: Number(it.returned_quantity ?? 0),
              returnableQuantity: Math.max(0, Number(it.quantity) - Number(it.returned_quantity ?? 0)),
              note: (it.note as string | null) ?? null,
            })),
            payments: ((saleRow.sale_payments ?? []) as Array<Record<string, unknown>>).map((p) => ({
              id: String(p.id),
              methodCode: String(p.method_code),
              amount: Number(p.amount),
              tenderedAmount: p.tendered_amount != null ? Number(p.tendered_amount) : null,
              referenceNo: (p.reference_no as string | null) ?? null,
              paidAt: String(p.paid_at),
            })),
            receiptNumber: receipt?.receipt_number ?? `RCP-${saleRow.bill_number}`,
            receiptPayload: receipt?.payload ?? null,
            printStatus: 'queued',
          }
        : rpcResult,
      rpcResult,
    },
    { status: 201 },
  );
}
