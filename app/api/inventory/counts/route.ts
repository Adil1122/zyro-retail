import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['inventory.view', 'inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;

  const { data, error } = await supabase
    .from('stock_counts')
    .select(
      `
      id,
      branch_id,
      count_number,
      status,
      notes,
      completed_at,
      created_at,
      counter:counted_by (
        invited_name,
        user_profiles:user_id ( full_name )
      ),
      stock_count_items (
        id,
        expected_qty,
        counted_qty,
        variance_qty
      )
    `,
    )
    .eq('business_id', businessId)
    .eq('branch_id', resolvedBranchId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = (data ?? []).map((c) => {
    const items = (c.stock_count_items ?? []) as Array<{
      id: string;
      expected_qty: number;
      counted_qty: number | null;
      variance_qty: number;
    }>;
    const counter = c.counter as unknown as {
      invited_name: string | null;
      user_profiles: { full_name: string } | null;
    } | null;

    return {
      id: c.id,
      branchId: c.branch_id,
      countNumber: c.count_number,
      status: c.status,
      notes: c.notes,
      countedByName: counter?.user_profiles?.full_name || counter?.invited_name || 'Staff',
      completedAt: c.completed_at,
      createdAt: c.created_at,
      itemCount: items.length,
      discrepancyCount: items.filter((i) => Number(i.variance_qty) !== 0).length,
      netVariance: items.reduce((s, i) => s + Number(i.variance_qty ?? 0), 0),
    };
  });

  return NextResponse.json({ counts, branchId: resolvedBranchId });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    notes?: string;
    items?: Array<{ variantId: string; countedQty: number; notes?: string }>;
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

  const items = (body.items ?? []).filter(
    (i) => i.variantId && Number.isFinite(Number(i.countedQty)) && Number(i.countedQty) >= 0,
  );

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'Enter a counted quantity for at least one footwear variant.' },
      { status: 400 },
    );
  }

  const countNumber = `CNT-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;

  // Prefer atomic PostgreSQL RPC from migration 0012
  const { data: rpcData, error: rpcError } = await supabase.rpc('complete_stock_count', {
    p_payload: {
      business_id: businessId,
      branch_id: branchId,
      count_number: countNumber,
      notes: body.notes?.trim() || null,
      items: items.map((i) => ({
        variant_id: i.variantId,
        counted_qty: Number(i.countedQty),
        notes: i.notes ?? null,
      })),
    },
  });

  if (!rpcError && rpcData) {
    return NextResponse.json({ result: rpcData }, { status: 201 });
  }

  const isMissingRpc =
    rpcError?.code === 'PGRST202' ||
    (rpcError?.message ?? '').includes('Could not find the function');

  if (!isMissingRpc) {
    return NextResponse.json(
      { error: rpcError?.message || 'Failed to complete stock count.' },
      { status: 400 },
    );
  }

  // Graceful RLS-enforced fallback if migration 0012 hasn't been executed yet
  const nowIso = new Date().toISOString();
  const { data: countRow, error: countErr } = await supabase
    .from('stock_counts')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      count_number: countNumber,
      status: 'approved',
      counted_by: membership.memberId,
      approved_by: membership.memberId,
      started_at: nowIso,
      completed_at: nowIso,
      notes: body.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (countErr || !countRow) {
    return NextResponse.json({ error: countErr?.message || 'Failed to create stock count.' }, { status: 400 });
  }

  const variantIds = items.map((i) => i.variantId);
  const [{ data: stockRows }, { data: variantRows }] = await Promise.all([
    supabase
      .from('stock_levels')
      .select('id, variant_id, quantity_on_hand')
      .eq('business_id', businessId)
      .eq('branch_id', branchId)
      .in('variant_id', variantIds),
    supabase
      .from('product_variants')
      .select('id, cost_price')
      .eq('business_id', businessId)
      .in('id', variantIds),
  ]);

  const stockByVar = new Map((stockRows ?? []).map((s) => [s.variant_id, s]));
  const costByVar = new Map((variantRows ?? []).map((v) => [v.id, Number(v.cost_price ?? 0)]));

  let adjustedVariants = 0;

  for (const item of items) {
    const existingStock = stockByVar.get(item.variantId);
    const expectedQty = Number(existingStock?.quantity_on_hand ?? 0);
    const countedQty = Number(item.countedQty);
    const variance = countedQty - expectedQty;
    const cost = costByVar.get(item.variantId) ?? 0;

    await supabase.from('stock_count_items').insert({
      business_id: businessId,
      stock_count_id: countRow.id,
      variant_id: item.variantId,
      expected_qty: expectedQty,
      counted_qty: countedQty,
      notes: item.notes ?? null,
    });

    if (existingStock) {
      await supabase
        .from('stock_levels')
        .update({ quantity_on_hand: countedQty })
        .eq('id', existingStock.id);
    } else {
      await supabase.from('stock_levels').insert({
        business_id: businessId,
        branch_id: branchId,
        variant_id: item.variantId,
        quantity_on_hand: countedQty,
        average_cost: cost,
      });
    }

    if (variance !== 0) {
      adjustedVariants += 1;
      await supabase.from('stock_movements').insert({
        business_id: businessId,
        branch_id: branchId,
        variant_id: item.variantId,
        movement_type: 'stock_count',
        quantity_delta: variance,
        unit_cost: cost,
        reference_type: 'stock_count',
        reference_id: countRow.id,
        reason: body.notes?.trim() || `Stock count ${countNumber}`,
        performed_by: membership.memberId,
      });
    }
  }

  return NextResponse.json(
    {
      result: {
        stock_count_id: countRow.id,
        count_number: countNumber,
        adjusted_variants: adjustedVariants,
        status: 'approved',
      },
    },
    { status: 201 },
  );
}
