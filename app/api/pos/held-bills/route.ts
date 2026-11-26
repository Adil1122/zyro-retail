import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import type { Json } from '@/types/database';

function estimateCartTotal(
  cartPayload: unknown,
  discountPayload: { mode?: string; value?: number } | null,
): number {
  const items = Array.isArray(cartPayload) ? cartPayload : [];
  const subtotal = items.reduce((sum, raw) => {
    const it = raw as { price?: number; qty?: number; lineDiscount?: number };
    const line = Math.max(0, Number(it.price ?? 0) * Number(it.qty ?? 0) - Number(it.lineDiscount ?? 0));
    return sum + line;
  }, 0);
  if (!discountPayload || !discountPayload.value) return Math.max(0, Math.round(subtotal * 100) / 100);
  const disc =
    discountPayload.mode === 'pct'
      ? Math.round((subtotal * Math.min(100, Math.max(0, Number(discountPayload.value)))) / 100)
      : Math.max(0, Number(discountPayload.value));
  return Math.max(0, Math.round((subtotal - Math.min(disc, subtotal)) * 100) / 100);
}

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    allPermissions: ['pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;

  const { data, error } = await supabase
    .from('held_bills')
    .select(
      `
      id, branch_id, hold_number, customer_id, cart_payload, discount_payload, note, status, held_at,
      customers:customer_id ( full_name )
    `,
    )
    .eq('business_id', businessId)
    .eq('branch_id', resolvedBranchId)
    .eq('status', 'held')
    .order('held_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    heldBills: (data ?? []).map((h) => {
      const cust = h.customers as unknown as { full_name: string } | null;
      const discount = (h.discount_payload as { mode?: string; value?: number } | null) ?? null;
      return {
        id: h.id,
        branchId: h.branch_id,
        holdCode: `HLD-${h.hold_number}`,
        customerId: h.customer_id,
        customerName: cust?.full_name ?? null,
        cartPayload: Array.isArray(h.cart_payload) ? h.cart_payload : [],
        discountPayload: discount,
        totalEstimate: estimateCartTotal(h.cart_payload, discount),
        note: h.note,
        heldAt: h.held_at,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    customerId?: string | null;
    cartPayload?: unknown[];
    discountPayload?: { mode?: string; value?: number; reason?: string } | null;
    totalEstimate?: number;
    note?: string;
  } | null;

  if (!body || !Array.isArray(body.cartPayload) || body.cartPayload.length === 0) {
    return NextResponse.json({ error: 'Cannot hold an empty cart.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, membership } = guard.ctx;

  const { data: lastHold } = await supabase
    .from('held_bills')
    .select('hold_number')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .order('hold_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextHoldNumber = Number(lastHold?.hold_number ?? 100) + 1;

  const { data, error } = await supabase
    .from('held_bills')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      cashier_member_id: membership.memberId,
      customer_id: body.customerId || null,
      hold_number: nextHoldNumber,
      cart_payload: body.cartPayload as unknown as Json,
      discount_payload: (body.discountPayload ?? null) as unknown as Json,
      note: body.note?.trim() || null,
      status: 'held',
    })
    .select(
      `
      id, branch_id, hold_number, customer_id, cart_payload, discount_payload, note, held_at,
      customers:customer_id ( full_name )
    `,
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const cust = data.customers as unknown as { full_name: string } | null;
  const discount = (data.discount_payload as { mode?: string; value?: number } | null) ?? null;

  return NextResponse.json(
    {
      heldBill: {
        id: data.id,
        branchId: data.branch_id,
        holdCode: `HLD-${data.hold_number}`,
        customerId: data.customer_id,
        customerName: cust?.full_name ?? null,
        cartPayload: Array.isArray(data.cart_payload) ? data.cart_payload : [],
        discountPayload: discount,
        totalEstimate: estimateCartTotal(data.cart_payload, discount),
        note: data.note,
        heldAt: data.held_at,
      },
    },
    { status: 201 },
  );
}
