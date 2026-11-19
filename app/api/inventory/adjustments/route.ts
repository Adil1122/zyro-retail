import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

const ALLOWED_MOVEMENT_TYPES = new Set(['opening_stock', 'adjustment', 'damage', 'shrinkage']);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const branchId = sp.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['inventory.view', 'inventory.manage', 'reports.view'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;
  const variantId = sp.get('variantId')?.trim() || '';
  const movementType = sp.get('type')?.trim() || '';
  const limit = Math.min(200, Math.max(10, Number(sp.get('limit') ?? 80) || 80));

  let query = supabase
    .from('stock_movements')
    .select(
      `
      id,
      branch_id,
      variant_id,
      movement_type,
      quantity_delta,
      unit_cost,
      reference_type,
      reference_id,
      reason,
      created_at,
      branches:branch_id ( name ),
      product_variants:variant_id (
        id,
        product_id,
        variant_name,
        sku,
        products:product_id ( id, name, brand )
      ),
      performer:performed_by (
        invited_name,
        user_profiles:user_id ( full_name )
      )
    `,
    )
    .eq('business_id', businessId)
    .eq('branch_id', resolvedBranchId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (variantId) query = query.eq('variant_id', variantId);
  if (movementType && movementType !== 'all') query = query.eq('movement_type', movementType);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const movements = (data ?? []).map((row) => {
    const pv = row.product_variants as unknown as {
      id: string;
      product_id: string;
      variant_name: string;
      sku: string;
      products: { id: string; name: string; brand: string | null } | null;
    } | null;
    const br = row.branches as unknown as { name: string } | null;
    const perf = row.performer as unknown as {
      invited_name: string | null;
      user_profiles: { full_name: string } | null;
    } | null;

    return {
      id: row.id,
      branchId: row.branch_id,
      branchName: br?.name ?? '',
      variantId: row.variant_id,
      productId: pv?.product_id ?? '',
      productName: pv?.products?.name ?? 'Footwear item',
      variantLabel: pv?.variant_name ?? '',
      sku: pv?.sku ?? '',
      movementType: row.movement_type,
      quantityDelta: Number(row.quantity_delta),
      unitCost: Number(row.unit_cost ?? 0),
      referenceType: row.reference_type,
      referenceId: row.reference_id,
      reason: row.reason,
      performedByName: perf?.user_profiles?.full_name || perf?.invited_name || 'Staff',
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ movements, branchId: resolvedBranchId });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    variantId?: string;
    quantityDelta?: number;
    movementType?: string;
    reason?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, membership } = guard.ctx;

  const variantId = body.variantId?.trim();
  const delta = Number(body.quantityDelta);
  const movementType = (body.movementType?.trim() || 'adjustment').toLowerCase();
  const reason = body.reason?.trim() || '';

  if (!variantId) {
    return NextResponse.json({ error: 'Variant is required.' }, { status: 400 });
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'Adjustment quantity must be a non-zero number.' }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: 'Please provide a reason for this stock adjustment.' }, { status: 400 });
  }
  if (!ALLOWED_MOVEMENT_TYPES.has(movementType)) {
    return NextResponse.json({ error: `Unsupported adjustment type "${movementType}".` }, { status: 400 });
  }

  // Prefer atomic PostgreSQL RPC from migration 0012
  const { data: rpcData, error: rpcError } = await supabase.rpc('adjust_branch_stock', {
    p_payload: {
      business_id: businessId,
      branch_id: branchId,
      variant_id: variantId,
      quantity_delta: delta,
      movement_type: movementType,
      reason,
    },
  });

  if (!rpcError && rpcData) {
    return NextResponse.json({ adjustment: rpcData }, { status: 201 });
  }

  // Graceful RLS-enforced fallback ONLY if migration 0012 RPC has not been deployed yet
  const isMissingRpc =
    rpcError?.code === 'PGRST202' ||
    (rpcError?.message ?? '').includes('Could not find the function');

  if (!isMissingRpc) {
    return NextResponse.json(
      { error: rpcError?.message || 'Stock adjustment failed.' },
      { status: 400 },
    );
  }

  const { data: variantRow } = await supabase
    .from('product_variants')
    .select('id, cost_price')
    .eq('id', variantId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!variantRow) {
    return NextResponse.json({ error: 'Footwear variant not found.' }, { status: 404 });
  }

  const { data: stockRow } = await supabase
    .from('stock_levels')
    .select('id, quantity_on_hand')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .eq('variant_id', variantId)
    .maybeSingle();

  const currentQty = Number(stockRow?.quantity_on_hand ?? 0);
  const nextQty = currentQty + delta;
  if (nextQty < 0) {
    return NextResponse.json(
      { error: `Stock cannot drop below zero (current: ${currentQty}, delta: ${delta}).` },
      { status: 400 },
    );
  }

  if (stockRow) {
    const { error: updErr } = await supabase
      .from('stock_levels')
      .update({ quantity_on_hand: nextQty })
      .eq('id', stockRow.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  } else {
    const { error: insErr } = await supabase.from('stock_levels').insert({
      business_id: businessId,
      branch_id: branchId,
      variant_id: variantId,
      quantity_on_hand: nextQty,
      average_cost: Number(variantRow.cost_price ?? 0),
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  const { data: mov, error: movErr } = await supabase
    .from('stock_movements')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      variant_id: variantId,
      movement_type: movementType,
      quantity_delta: delta,
      unit_cost: Number(variantRow.cost_price ?? 0),
      reference_type: 'stock_adjustment',
      reason,
      performed_by: membership.memberId,
    })
    .select('id')
    .single();

  if (movErr) {
    return NextResponse.json({ error: movErr.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      adjustment: {
        movement_id: mov.id,
        variant_id: variantId,
        previous_qty: currentQty,
        new_qty: nextQty,
        quantity_delta: delta,
      },
    },
    { status: 201 },
  );
}
