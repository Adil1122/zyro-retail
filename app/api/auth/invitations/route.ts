import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneToE164 } from '@/lib/auth/phone';
import { getServerAuthSessionPayload } from '@/lib/auth/server-context';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import {
  DEFAULT_INVITATION_TTL_HOURS,
  generateInvitationTokenPair,
} from '@/features/auth/services/invitation.service';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase is not configured.' },
        { status: 503 },
      );
    }

    const session = await getServerAuthSessionPayload();
    if (!session.authenticated || !session.activeMembership) {
      return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', error: 'Sign in required.' }, { status: 401 });
    }

    const businessId = req.nextUrl.searchParams.get('businessId') || session.activeMembership.businessId;
    const membership = session.memberships.find(
      (m) => m.businessId === businessId && m.memberStatus === 'active' && m.businessStatus === 'active',
    );

    if (
      !membership ||
      (!membership.permissions.includes('staff.manage') && !membership.permissions.includes('settings.manage'))
    ) {
      return NextResponse.json(
        { ok: false, code: 'FORBIDDEN', error: 'You do not have permission to manage staff invitations.' },
        { status: 403 },
      );
    }

    // Executes through user's RLS-enforced server client
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('business_invitations')
      .select(
        `
        id,
        business_id,
        branch_id,
        role_id,
        invited_name,
        invited_phone_e164,
        status,
        expires_at,
        created_at,
        branches:branch_id ( name ),
        roles:role_id ( name, display_name )
      `,
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const invitations = (
      (data ?? []) as unknown as Array<{
        id: string;
        business_id: string;
        branch_id: string;
        role_id: string;
        invited_name: string;
        invited_phone_e164: string;
        status: 'pending' | 'accepted' | 'revoked' | 'expired';
        expires_at: string;
        created_at: string;
        branches: { name: string } | null;
        roles: { name: string; display_name: string } | null;
      }>
    ).map((row) => ({
      id: row.id,
      businessId: row.business_id,
      branchId: row.branch_id,
      branchName: row.branches?.name || 'Main branch',
      roleId: row.role_id,
      roleName: row.roles?.name || 'cashier',
      roleDisplayName: row.roles?.display_name || 'Staff',
      invitedName: row.invited_name,
      invitedPhoneE164: row.invited_phone_e164,
      status:
        row.status === 'pending' && new Date(row.expires_at).getTime() <= Date.now()
          ? 'expired'
          : row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ ok: true, invitations }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unable to fetch invitations.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, code: 'SUPABASE_NOT_CONFIGURED', error: 'Supabase is not configured.' },
        { status: 503 },
      );
    }

    const session = await getServerAuthSessionPayload();
    if (!session.authenticated || !session.activeMembership) {
      return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', error: 'Sign in required.' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      businessId?: string;
      branchId?: string;
      roleId?: string;
      invitedName?: string;
      phone?: string;
      dialCode?: string;
      expiresInHours?: number;
    } | null;

    if (!body?.invitedName?.trim() || !body?.phone || !body?.branchId || !body?.roleId) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REQUEST', error: 'Name, mobile number, branch, and role are required.' },
        { status: 400 },
      );
    }

    const businessId = body.businessId || session.activeMembership.businessId;
    const membership = session.memberships.find(
      (m) => m.businessId === businessId && m.memberStatus === 'active' && m.businessStatus === 'active',
    );

    if (
      !membership ||
      (!membership.permissions.includes('staff.manage') && !membership.permissions.includes('settings.manage'))
    ) {
      return NextResponse.json(
        { ok: false, code: 'FORBIDDEN', error: 'You do not have permission to invite staff members.' },
        { status: 403 },
      );
    }

    const normalized = normalizePhoneToE164(body.phone, body.dialCode || '+92');
    if (!normalized.valid || !normalized.e164) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_PHONE', error: normalized.error || 'Invalid mobile number.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify target branch & role belong to this business (strict tenant isolation)
    const [{ data: branch }, { data: role }] = await Promise.all([
      supabase
        .from('branches')
        .select('id, name')
        .eq('id', body.branchId)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('roles')
        .select('id, name, display_name')
        .eq('id', body.roleId)
        .eq('business_id', businessId)
        .maybeSingle(),
    ]);

    if (!branch) {
      return NextResponse.json({ ok: false, code: 'INVALID_BRANCH', error: 'Branch not found.' }, { status: 404 });
    }
    if (!role) {
      return NextResponse.json({ ok: false, code: 'INVALID_ROLE', error: 'Role not found.' }, { status: 404 });
    }

    // Revoke any older pending invitations for the same phone in this business
    await supabase
      .from('business_invitations')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: session.user!.id,
      })
      .eq('business_id', businessId)
      .eq('invited_phone_e164', normalized.e164)
      .eq('status', 'pending');

    const { rawToken, tokenHash } = generateInvitationTokenPair();
    const ttlHours = Math.min(Math.max(Number(body.expiresInHours) || DEFAULT_INVITATION_TTL_HOURS, 1), 336);
    const expiresAt = new Date(Date.now() + ttlHours * 3_600_000).toISOString();

    const { data: created, error: insertError } = await supabase
      .from('business_invitations')
      .insert({
        business_id: businessId,
        branch_id: branch.id,
        role_id: role.id,
        invited_name: body.invitedName.trim(),
        invited_phone_e164: normalized.e164,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
        invited_by_member_id: membership.memberId,
      })
      .select('id, expires_at, created_at')
      .single();

    if (insertError || !created) {
      return NextResponse.json(
        { ok: false, error: insertError?.message || 'Unable to create invitation.' },
        { status: 500 },
      );
    }

    const origin = process.env.APP_URL || req.nextUrl.origin;
    const invitePath = `/invite/${rawToken}`;
    const inviteUrl = `${origin.replace(/\/$/, '')}${invitePath}`;

    return NextResponse.json(
      {
        ok: true,
        invitation: {
          id: created.id,
          businessId,
          branchId: branch.id,
          branchName: branch.name,
          roleId: role.id,
          roleName: role.name,
          roleDisplayName: role.display_name,
          invitedName: body.invitedName.trim(),
          invitedPhoneE164: normalized.e164,
          status: 'pending',
          expiresAt: created.expires_at,
          createdAt: created.created_at,
        },
        // Raw token is returned ONCE to the authorized inviter and never persisted in plaintext
        invitePath,
        inviteUrl,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unable to create invitation.' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
    }

    const session = await getServerAuthSessionPayload();
    if (!session.authenticated || !session.activeMembership) {
      return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      invitationId?: string;
      businessId?: string;
      action?: 'revoke';
    } | null;

    if (!body?.invitationId || body.action !== 'revoke') {
      return NextResponse.json({ ok: false, error: 'invitationId and action="revoke" are required.' }, { status: 400 });
    }

    const businessId = body.businessId || session.activeMembership.businessId;
    const membership = session.memberships.find(
      (m) => m.businessId === businessId && m.memberStatus === 'active' && m.businessStatus === 'active',
    );

    if (
      !membership ||
      (!membership.permissions.includes('staff.manage') && !membership.permissions.includes('settings.manage'))
    ) {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('business_invitations')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by_user_id: session.user!.id,
      })
      .eq('id', body.invitationId)
      .eq('business_id', businessId)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unable to revoke invitation.' },
      { status: 500 },
    );
  }
}
