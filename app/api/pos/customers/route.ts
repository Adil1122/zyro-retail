import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').trim();
  const guard = await requireWorkspaceContext({
    branchId: sp.get('branchId'),
    anyPermissions: ['pos.sell', 'pos.bills.view', 'khata.view', 'khata.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId } = guard.ctx;

  let query = supabase
    .from('customers')
    .select('id, full_name, phone, city, address, notes, khata_balance, refund_owed')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .order('full_name', { ascending: true })
    .limit(100);

  if (q) {
    const safe = q.replace(/[%_]/g, '');
    query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    customers: (data ?? []).map((c) => ({
      id: c.id,
      fullName: c.full_name,
      phone: c.phone,
      city: c.city,
      address: c.address,
      notes: c.notes,
      khataBalance: Number(c.khata_balance ?? 0),
      refundOwed: Number(c.refund_owed ?? 0),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    fullName?: string;
    phone?: string;
    city?: string;
    address?: string;
    notes?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    anyPermissions: ['pos.sell', 'khata.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId } = guard.ctx;
  const fullName = body.fullName?.trim();
  if (!fullName) {
    return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
  }

  const phone = body.phone?.trim() || null;

  const { data, error } = await supabase
    .from('customers')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      full_name: fullName,
      phone,
      city: body.city?.trim() || null,
      address: body.address?.trim() || null,
      notes: body.notes?.trim() || null,
      last_activity_at: new Date().toISOString(),
    })
    .select('id, full_name, phone, city, address, notes, khata_balance, refund_owed')
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 400;
    return NextResponse.json(
      { error: error.code === '23505' ? 'A customer with this phone number already exists.' : error.message },
      { status },
    );
  }

  return NextResponse.json(
    {
      customer: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        city: data.city,
        address: data.address,
        notes: data.notes,
        khataBalance: Number(data.khata_balance ?? 0),
        refundOwed: Number(data.refund_owed ?? 0),
      },
    },
    { status: 201 },
  );
}
