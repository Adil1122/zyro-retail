import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['pos.returns.process', 'pos.bills.view', 'reports.view'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;

  const { data, error } = await supabase
    .from('exchanges')
    .select(
      `
      id, exchange_number, sales_return_id, replacement_sale_id,
      return_credit_amount, replacement_total_amount, net_difference_amount,
      exchanged_at, created_at,
      sales_returns:sales_return_id (
        original_sale_id, reason, status,
        orig_sale:original_sale_id ( bill_number ),
        customers:customer_id ( full_name )
      ),
      repl_sale:replacement_sale_id ( bill_number ),
      exchange_items (
        id, direction, variant_id, quantity, unit_price, line_total,
        product_variants:variant_id ( variant_name, products:product_id ( name ) )
      )
    `,
    )
    .eq('business_id', businessId)
    .eq('branch_id', resolvedBranchId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const exchanges = (data ?? []).map((e) => {
    const ret = e.sales_returns as unknown as {
      original_sale_id: string | null;
      reason: string | null;
      status: string;
      orig_sale: { bill_number: number } | null;
      customers: { full_name: string } | null;
    } | null;
    const repl = e.repl_sale as unknown as { bill_number: number } | null;
    return {
      id: e.id,
      exchangeNumber: e.exchange_number,
      originalSaleId: ret?.original_sale_id ?? '',
      originalBillNumber: ret?.orig_sale ? Number(ret.orig_sale.bill_number) : null,
      replacementSaleId: e.replacement_sale_id,
      replacementBillNumber: repl ? Number(repl.bill_number) : null,
      customerName: ret?.customers?.full_name ?? null,
      returnCreditAmount: Number(e.return_credit_amount ?? 0),
      replacementTotalAmount: Number(e.replacement_total_amount ?? 0),
      netDifferenceAmount: Number(e.net_difference_amount ?? 0),
      status: ret?.status ?? 'completed',
      notes: ret?.reason ?? null,
      createdAt: e.exchanged_at || e.created_at,
      items: ((e.exchange_items ?? []) as Array<Record<string, unknown>>).map((it) => {
        const pv = it.product_variants as unknown as {
          variant_name: string;
          products: { name: string } | null;
        } | null;
        return {
          id: String(it.id),
          direction: String(it.direction),
          variantId: String(it.variant_id),
          productName: pv?.products?.name ?? 'Footwear',
          variantLabel: pv?.variant_name ?? '',
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
          lineTotal: Number(it.line_total),
        };
      }),
    };
  });

  return NextResponse.json({ exchanges, branchId: resolvedBranchId });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    originalSaleId?: string;
    originalSaleItemId?: string;
    returnQuantity?: number;
    condition?: 'resellable' | 'damaged';
    replacementVariantId?: string;
    replacementQuantity?: number;
    reason?: string;
    settlementMethod?: 'cash' | 'card' | 'bank' | 'jazz' | 'easy' | 'raast' | 'khata' | 'other';
  } | null;

  if (!body?.originalSaleId || !body.originalSaleItemId || !body.replacementVariantId) {
    return NextResponse.json(
      { error: 'Original bill, returned footwear line, and replacement footwear variant are required.' },
      { status: 400 },
    );
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['pos.returns.process'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, membership } = guard.ctx;
  const exchangeNumber = `EXC-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
  const returnQty = Math.max(1, Number(body.returnQuantity ?? 1));
  const replQty = Math.max(1, Number(body.replacementQuantity ?? returnQty));
  const condition = body.condition === 'damaged' ? 'damaged' : 'resellable';
  const settlementMethod = body.settlementMethod || 'cash';
  const reason = body.reason?.trim() || 'Footwear size/colour exchange';

  // Prefer atomic PostgreSQL RPC from migration 0012
  const { data: rpcData, error: rpcError } = await supabase.rpc('process_footwear_exchange', {
    p_payload: {
      business_id: businessId,
      branch_id: branchId,
      original_sale_id: body.originalSaleId,
      original_sale_item_id: body.originalSaleItemId,
      return_quantity: returnQty,
      condition,
      replacement_variant_id: body.replacementVariantId,
      replacement_quantity: replQty,
      reason,
      settlement_method: settlementMethod,
      exchange_number: exchangeNumber,
    },
  });

  if (!rpcError && rpcData) {
    return NextResponse.json({ exchange: rpcData }, { status: 201 });
  }

  const isMissingRpc =
    rpcError?.code === 'PGRST202' ||
    (rpcError?.message ?? '').includes('Could not find the function');

  if (!isMissingRpc) {
    return NextResponse.json(
      { error: rpcError?.message || 'Footwear exchange failed.' },
      { status: 400 },
    );
  }

  // Graceful RLS-enforced fallback if migration 0012 has not been run yet:
  // Uses existing 0009 RPCs (process_sales_return + complete_sale/stock updates) + exchanges table
  const { data: origSale } = await supabase
    .from('sales')
    .select('id, bill_number, customer_id, sale_items ( id, variant_id, product_id, product_name_snapshot, variant_label_snapshot, quantity, returned_quantity, line_total )')
    .eq('id', body.originalSaleId)
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .maybeSingle();

  if (!origSale) {
    return NextResponse.json({ error: 'Original bill not found.' }, { status: 404 });
  }

  const origItem = ((origSale.sale_items ?? []) as Array<{
    id: string;
    variant_id: string;
    product_id: string;
    product_name_snapshot: string;
    variant_label_snapshot: string;
    quantity: number;
    returned_quantity: number;
    line_total: number;
  }>).find((x) => x.id === body.originalSaleItemId);

  if (!origItem) {
    return NextResponse.json({ error: 'Original sale item not found.' }, { status: 404 });
  }

  if (Number(origItem.returned_quantity) + returnQty > Number(origItem.quantity)) {
    return NextResponse.json(
      { error: 'Return quantity exceeds remaining exchangeable quantity on this bill.' },
      { status: 400 },
    );
  }

  const [{ data: replVar }, { data: replStock }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, product_id, variant_name, sku, cost_price, selling_price, is_active, products:product_id ( name, base_selling_price, is_active )')
      .eq('id', body.replacementVariantId)
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('stock_levels')
      .select('id, quantity_on_hand, quantity_reserved')
      .eq('business_id', businessId)
      .eq('branch_id', branchId)
      .eq('variant_id', body.replacementVariantId)
      .maybeSingle(),
  ]);

  if (!replVar || !replVar.is_active) {
    return NextResponse.json({ error: 'Replacement footwear variant is unavailable.' }, { status: 404 });
  }
  const replProd = replVar.products as unknown as {
    name: string;
    base_selling_price: number;
    is_active: boolean;
  } | null;
  const available = Number(replStock?.quantity_on_hand ?? 0) - Number(replStock?.quantity_reserved ?? 0);
  if (!replStock || available < replQty) {
    return NextResponse.json(
      { error: `Insufficient branch stock for replacement ${replProd?.name ?? ''} (${replVar.variant_name}).` },
      { status: 409 },
    );
  }

  const returnCredit = Math.round((Number(origItem.line_total) / Number(origItem.quantity)) * returnQty * 100) / 100;
  const replUnitPrice = Number(replVar.selling_price ?? replProd?.base_selling_price ?? 0);
  const replTotal = Math.round(replUnitPrice * replQty * 100) / 100;
  const netDiff = Math.round((replTotal - returnCredit) * 100) / 100;

  // 1. Process return leg via existing 0009 RPC
  const { data: retRes, error: retErr } = await supabase.rpc('process_sales_return', {
    p_payload: {
      business_id: businessId,
      branch_id: branchId,
      original_sale_id: origSale.id,
      customer_id: origSale.customer_id,
      return_number: `RET-${exchangeNumber}`,
      return_type: 'with_bill',
      reason,
      items: [
        {
          original_sale_item_id: origItem.id,
          variant_id: origItem.variant_id,
          quantity: returnQty,
          unit_price: returnCredit / returnQty,
          condition,
          restocked: condition === 'resellable',
        },
      ],
    },
  });

  if (retErr || !retRes) {
    return NextResponse.json({ error: retErr?.message || 'Exchange return step failed.' }, { status: 400 });
  }

  const parsedRet = retRes as { sales_return_id: string; refund_id: string | null };

  // 2. Deduct replacement stock and record replacement sale
  const { data: maxBillRow } = await supabase
    .from('sales')
    .select('bill_number')
    .eq('branch_id', branchId)
    .order('bill_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const replBillNo = Number(maxBillRow?.bill_number ?? 0) + 1;

  const { data: replSale, error: replSaleErr } = await supabase
    .from('sales')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      customer_id: origSale.customer_id,
      cashier_member_id: membership.memberId,
      bill_number: replBillNo,
      status: 'completed',
      subtotal_amount: replTotal,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: replTotal,
      paid_amount: netDiff > 0 && settlementMethod !== 'khata' ? netDiff : 0,
      due_amount: netDiff > 0 && settlementMethod === 'khata' ? netDiff : 0,
      notes: `Exchange ${exchangeNumber} from Bill #${origSale.bill_number}`,
    })
    .select('id')
    .single();

  if (replSaleErr || !replSale) {
    return NextResponse.json({ error: replSaleErr?.message || 'Failed to record replacement sale.' }, { status: 400 });
  }

  await Promise.all([
    supabase.from('sale_items').insert({
      business_id: businessId,
      sale_id: replSale.id,
      product_id: replVar.product_id,
      variant_id: replVar.id,
      product_name_snapshot: replProd?.name ?? 'Footwear',
      variant_label_snapshot: replVar.variant_name,
      sku_snapshot: replVar.sku,
      unit_cost_snapshot: Number(replVar.cost_price ?? 0),
      unit_price: replUnitPrice,
      original_unit_price: replUnitPrice,
      quantity: replQty,
      line_discount_amount: 0,
      line_total: replTotal,
      note: 'Exchange replacement',
    }),
    supabase
      .from('stock_levels')
      .update({ quantity_on_hand: Number(replStock.quantity_on_hand) - replQty })
      .eq('id', replStock.id),
    supabase.from('stock_movements').insert({
      business_id: businessId,
      branch_id: branchId,
      variant_id: replVar.id,
      movement_type: 'exchange_out',
      quantity_delta: -replQty,
      unit_cost: Number(replVar.cost_price ?? 0),
      reference_type: 'exchange',
      reference_id: replSale.id,
      reason: `Exchange issue ${exchangeNumber}`,
      performed_by: membership.memberId,
    }),
  ]);

  if (netDiff > 0) {
    await supabase.from('sale_payments').insert({
      business_id: businessId,
      branch_id: branchId,
      sale_id: replSale.id,
      method_code: settlementMethod,
      amount: netDiff,
      reference_no: `Exchange diff ${exchangeNumber}`,
      recorded_by: membership.memberId,
    });
  } else if (netDiff < 0 && parsedRet.refund_id) {
    await supabase.rpc('issue_refund', {
      p_payload: {
        business_id: businessId,
        branch_id: branchId,
        refund_id: parsedRet.refund_id,
        method_code: settlementMethod === 'khata' ? 'khata_credit' : settlementMethod,
        amount: Math.abs(netDiff),
        reference_no: `Exchange refund ${exchangeNumber}`,
      },
    });
  }

  const { data: exchRow } = await supabase
    .from('exchanges')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      sales_return_id: parsedRet.sales_return_id,
      replacement_sale_id: replSale.id,
      exchange_number: exchangeNumber,
      return_credit_amount: returnCredit,
      replacement_total_amount: replTotal,
      net_difference_amount: netDiff,
      processed_by: membership.memberId,
    })
    .select('id')
    .single();

  if (exchRow?.id) {
    await supabase.from('exchange_items').insert([
      {
        business_id: businessId,
        exchange_id: exchRow.id,
        direction: 'returned',
        variant_id: origItem.variant_id,
        quantity: returnQty,
        unit_price: returnCredit / returnQty,
        line_total: returnCredit,
      },
      {
        business_id: businessId,
        exchange_id: exchRow.id,
        direction: 'replacement',
        variant_id: replVar.id,
        quantity: replQty,
        unit_price: replUnitPrice,
        line_total: replTotal,
      },
    ]);
  }

  return NextResponse.json(
    {
      exchange: {
        exchange_id: exchRow?.id,
        exchange_number: exchangeNumber,
        sales_return_id: parsedRet.sales_return_id,
        replacement_sale_id: replSale.id,
        replacement_bill_number: replBillNo,
        return_credit_amount: returnCredit,
        replacement_total_amount: replTotal,
        net_difference_amount: netDiff,
        restocked: condition === 'resellable',
      },
    },
    { status: 201 },
  );
}
