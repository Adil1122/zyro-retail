import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

const REFUND_METHODS = new Set(['cash', 'jazz', 'easy', 'raast', 'card', 'bank', 'khata_credit', 'other']);

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['pos.returns.process', 'pos.bills.view', 'reports.view'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;

  const { data, error } = await supabase
    .from('sales_returns')
    .select(
      `
      id, return_number, original_sale_id, customer_id, return_type, status,
      total_return_amount, reason, created_at,
      sales:original_sale_id ( bill_number ),
      customers:customer_id ( full_name ),
      processor:processed_by (
        invited_name,
        user_profiles:user_id ( full_name )
      ),
      sales_return_items (
        id, variant_id, product_name_snapshot, variant_label_snapshot,
        quantity, unit_price, line_total, condition, restocked
      ),
      refunds ( id, refund_number, total_amount, paid_amount, status )
    `,
    )
    .eq('business_id', businessId)
    .eq('branch_id', resolvedBranchId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const returns = (data ?? []).map((r) => {
    const sale = r.sales as unknown as { bill_number: number } | null;
    const cust = r.customers as unknown as { full_name: string } | null;
    const proc = r.processor as unknown as {
      invited_name: string | null;
      user_profiles: { full_name: string } | null;
    } | null;
    const refundsList = (r.refunds ?? []) as Array<{
      id: string;
      refund_number: string;
      total_amount: number;
      paid_amount: number;
      status: string;
    }>;

    return {
      id: r.id,
      returnNumber: r.return_number,
      originalSaleId: r.original_sale_id,
      originalBillNumber: sale ? Number(sale.bill_number) : null,
      customerId: r.customer_id,
      customerName: cust?.full_name ?? null,
      returnType: r.return_type,
      status: r.status,
      totalReturnAmount: Number(r.total_return_amount ?? 0),
      reason: r.reason,
      processedByName: proc?.user_profiles?.full_name || proc?.invited_name || 'Staff',
      createdAt: r.created_at,
      items: ((r.sales_return_items ?? []) as Array<Record<string, unknown>>).map((it) => ({
        id: String(it.id),
        variantId: String(it.variant_id),
        productName: String(it.product_name_snapshot),
        variantLabel: String(it.variant_label_snapshot),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
        condition: String(it.condition),
        restocked: Boolean(it.restocked),
      })),
      refund: refundsList[0]
        ? {
            id: refundsList[0].id,
            refundNumber: refundsList[0].refund_number,
            totalAmount: Number(refundsList[0].total_amount),
            paidAmount: Number(refundsList[0].paid_amount),
            status: refundsList[0].status,
          }
        : null,
    };
  });

  return NextResponse.json({ returns, branchId: resolvedBranchId });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    originalSaleId?: string | null;
    customerId?: string | null;
    reason?: string;
    refundMethod?: string; // cash | bank | card | jazz | easy | raast | khata_credit | owe_later
    items?: Array<{
      originalSaleItemId?: string | null;
      variantId: string;
      quantity: number;
      unitPrice?: number;
      condition: 'resellable' | 'damaged';
    }>;
  } | null;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Select at least one footwear item to return.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['pos.returns.process'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, hasPermission } = guard.ctx;

  // Validate return items against original sale items when linked to a bill
  const rpcItems: Array<{
    original_sale_item_id?: string;
    variant_id: string;
    quantity: number;
    unit_price: number;
    condition: 'resellable' | 'damaged';
    restocked: boolean;
  }> = [];

  let resolvedCustomerId = body.customerId || null;

  if (body.originalSaleId) {
    const { data: saleRow, error: sErr } = await supabase
      .from('sales')
      .select('id, customer_id, sale_items ( id, variant_id, quantity, returned_quantity, line_total )')
      .eq('id', body.originalSaleId)
      .eq('business_id', businessId)
      .eq('branch_id', branchId)
      .maybeSingle();

    if (sErr || !saleRow) {
      return NextResponse.json({ error: 'Original bill not found on this branch.' }, { status: 404 });
    }

    if (!resolvedCustomerId) {
      resolvedCustomerId = saleRow.customer_id;
    }

    const saleItemMap = new Map(
      ((saleRow.sale_items ?? []) as Array<{
        id: string;
        variant_id: string;
        quantity: number;
        returned_quantity: number;
        line_total: number;
      }>).map((si) => [si.id, si]),
    );

    for (const item of body.items) {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json({ error: 'Return quantity must be positive.' }, { status: 400 });
      }
      const orig = item.originalSaleItemId ? saleItemMap.get(item.originalSaleItemId) : null;
      if (!orig) {
        return NextResponse.json({ error: 'Returned line does not belong to the selected bill.' }, { status: 400 });
      }
      const remaining = Number(orig.quantity) - Number(orig.returned_quantity);
      if (qty > remaining) {
        return NextResponse.json(
          { error: `Cannot return ${qty} pair(s); only ${remaining} pair(s) remain returnable.` },
          { status: 400 },
        );
      }
      const effectiveUnitPrice =
        Number(orig.quantity) > 0 ? Math.round((Number(orig.line_total) / Number(orig.quantity)) * 100) / 100 : 0;
      const cond = item.condition === 'damaged' ? 'damaged' : 'resellable';
      rpcItems.push({
        original_sale_item_id: orig.id,
        variant_id: orig.variant_id,
        quantity: qty,
        unit_price: effectiveUnitPrice,
        condition: cond,
        // CRITICAL: Damaged returned footwear NEVER returns to sellable stock
        restocked: cond === 'resellable',
      });
    }
  } else {
    // Return without bill: resolve authoritative variant selling price from DB
    const varIds = body.items.map((i) => i.variantId);
    const { data: varRows } = await supabase
      .from('product_variants')
      .select('id, selling_price, products:product_id ( base_selling_price )')
      .eq('business_id', businessId)
      .in('id', varIds);

    const varPriceMap = new Map(
      (varRows ?? []).map((v) => {
        const p = v.products as unknown as { base_selling_price: number } | null;
        return [v.id, Number(v.selling_price ?? p?.base_selling_price ?? 0)];
      }),
    );

    for (const item of body.items) {
      const qty = Number(item.quantity);
      const price = varPriceMap.get(item.variantId);
      if (price === undefined || !Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json({ error: 'Invalid return variant or quantity.' }, { status: 400 });
      }
      const cond = item.condition === 'damaged' ? 'damaged' : 'resellable';
      rpcItems.push({
        variant_id: item.variantId,
        quantity: qty,
        unit_price: price,
        condition: cond,
        restocked: cond === 'resellable',
      });
    }
  }

  const returnNumber = `RET-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;

  const { data: returnRes, error: retErr } = await supabase.rpc('process_sales_return', {
    p_payload: {
      business_id: businessId,
      branch_id: branchId,
      original_sale_id: body.originalSaleId || null,
      customer_id: resolvedCustomerId,
      return_number: returnNumber,
      return_type: body.originalSaleId ? 'with_bill' : 'without_bill',
      reason: body.reason?.trim() || 'Customer footwear return',
      items: rpcItems,
    },
  });

  if (retErr || !returnRes) {
    return NextResponse.json(
      { error: retErr?.message || 'Failed to process footwear return.' },
      { status: 400 },
    );
  }

  const parsedReturn = returnRes as {
    sales_return_id: string;
    refund_id: string | null;
    total_return_amount: number;
  };

  let refundPayoutResult: unknown = null;
  const refundMethod = body.refundMethod?.trim() || '';

  if (
    parsedReturn.refund_id &&
    parsedReturn.total_return_amount > 0 &&
    refundMethod &&
    refundMethod !== 'owe_later' &&
    REFUND_METHODS.has(refundMethod) &&
    hasPermission('pos.refunds.pay')
  ) {
    // Khata credit requires a customer
    if (refundMethod !== 'khata_credit' || resolvedCustomerId) {
      const { data: payRes, error: payErr } = await supabase.rpc('issue_refund', {
        p_payload: {
          business_id: businessId,
          branch_id: branchId,
          refund_id: parsedReturn.refund_id,
          method_code: refundMethod,
          amount: parsedReturn.total_return_amount,
          reference_no: `Refund for ${returnNumber}`,
        },
      });
      if (!payErr) {
        refundPayoutResult = payRes;
      }
    }
  }

  return NextResponse.json(
    {
      returnNumber,
      result: parsedReturn,
      refundPayout: refundPayoutResult,
    },
    { status: 201 },
  );
}
