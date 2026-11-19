import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  isSupabaseAdminConfigured,
  isSupabaseServerConfigured,
} from '@/lib/supabase/server';
import type {
  AuthSessionPayload,
  WorkspaceBranchSummary,
  WorkspaceMembershipSummary,
} from '@/features/auth/types/auth.types';

export const ACTIVE_BUSINESS_COOKIE = 'zyro_active_business_id';
export const ACTIVE_BRANCH_COOKIE = 'zyro_active_branch_id';

export function getClientIpFromRequest(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return req.headers.get('x-real-ip')?.trim() || null;
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ZU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Resolves the appropriate post-login landing path based on the user's
 * DB-backed permissions and role name — supports Owner, Cashier, Stockkeeper,
 * AND custom business roles without trusting browser-supplied role values.
 */
export function resolveDashboardRouteForMembership(membership: WorkspaceMembershipSummary): string {
  const perms = new Set(membership.permissions);
  const roleKey = membership.roleName.toLowerCase();

  if (roleKey === 'owner' || perms.has('dashboard.owner.view') || perms.has('settings.manage')) {
    return '/home';
  }
  if (roleKey === 'cashier' || (perms.has('dashboard.cashier.view') && perms.has('pos.sell'))) {
    return '/cashier/home';
  }
  if (roleKey === 'inventory' || roleKey === 'stockkeeper' || perms.has('dashboard.inventory.view')) {
    return '/stockkeeper/home';
  }

  // Custom role fallback based on granted permissions
  if (perms.has('pos.sell')) return '/pos';
  if (perms.has('inventory.view') || perms.has('inventory.manage')) return '/inventory';
  if (perms.has('orders.view') || perms.has('orders.manage')) return '/orders';
  if (perms.has('purchasing.view') || perms.has('purchasing.receive')) return '/purchasing';
  if (perms.has('reports.view')) return '/reports';

  return '/dashboard';
}

/**
 * Loads the complete server-verified session, profile, memberships, branches,
 * roles, and permissions for the currently authenticated Supabase Auth user.
 */
export async function getServerAuthSessionPayload(): Promise<AuthSessionPayload> {
  if (!isSupabaseServerConfigured()) {
    return {
      authenticated: false,
      configured: false,
      user: null,
      memberships: [],
      activeBusinessId: null,
      activeBranchId: null,
      activeMembership: null,
      accountStatus: 'unauthenticated',
      recommendedRedirect: '/welcome',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authenticated: false,
      configured: true,
      user: null,
      memberships: [],
      activeBusinessId: null,
      activeBranchId: null,
      activeMembership: null,
      accountStatus: 'unauthenticated',
      recommendedRedirect: '/welcome',
    };
  }

  // Read profile & memberships using service client if available (so suspended/invited
  // memberships are also visible for proper disabled/pending status screens),
  // otherwise fall back to the user's RLS-enforced server client.
  const reader = isSupabaseAdminConfigured() ? createSupabaseServiceClient() : supabase;

  const { data: profileRow } = await reader
    .from('user_profiles')
    .select('id, full_name, short_name, phone, avatar_bg, avatar_fg')
    .eq('id', user.id)
    .maybeSingle();

  const fullName =
    profileRow?.full_name ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ||
    user.phone ||
    'Zyro User';

  const { data: memberRows } = await reader
    .from('business_members')
    .select(
      `
      id,
      business_id,
      role_id,
      status,
      businesses:business_id (
        id,
        name,
        status,
        shop_kit,
        currency,
        timezone,
        deleted_at
      ),
      roles:role_id (
        id,
        name,
        display_name,
        is_system_role
      )
    `,
    )
    .eq('user_id', user.id)
    .is('deleted_at', null);

  const rawMembers = (memberRows ?? []) as Array<{
    id: string;
    business_id: string;
    role_id: string;
    status: 'invited' | 'active' | 'suspended' | 'removed';
    businesses: {
      id: string;
      name: string;
      status: 'active' | 'suspended' | 'archived';
      shop_kit: string;
      currency: string;
      timezone: string;
      deleted_at: string | null;
    } | null;
    roles: {
      id: string;
      name: string;
      display_name: string;
      is_system_role: boolean;
    } | null;
  }>;

  const validMembers = rawMembers.filter((m) => m.businesses && !m.businesses.deleted_at && m.roles);
  const roleIds = Array.from(new Set(validMembers.map((m) => m.role_id)));
  const memberIds = validMembers.map((m) => m.id);

  // Fetch permissions for all member roles
  const permsByRoleId = new Map<string, string[]>();
  if (roleIds.length > 0) {
    const { data: rpRows } = await reader
      .from('role_permissions')
      .select('role_id, permissions:permission_id ( permission_key )')
      .in('role_id', roleIds);

    for (const row of (rpRows ?? []) as Array<{
      role_id: string;
      permissions: { permission_key: string } | null;
    }>) {
      const key = row.permissions?.permission_key;
      if (!key) continue;
      const list = permsByRoleId.get(row.role_id) ?? [];
      list.push(key);
      permsByRoleId.set(row.role_id, list);
    }
  }

  // Fetch branch access for all memberships
  const branchesByMemberId = new Map<string, WorkspaceBranchSummary[]>();
  if (memberIds.length > 0) {
    const { data: mbaRows } = await reader
      .from('member_branch_access')
      .select(
        `
        member_id,
        is_default,
        branches:branch_id (
          id,
          name,
          code,
          city,
          address,
          phone,
          is_main,
          is_active,
          deleted_at
        )
      `,
      )
      .in('member_id', memberIds);

    for (const row of (mbaRows ?? []) as Array<{
      member_id: string;
      is_default: boolean;
      branches: {
        id: string;
        name: string;
        code: string | null;
        city: string | null;
        address: string | null;
        phone: string | null;
        is_main: boolean;
        is_active: boolean;
        deleted_at: string | null;
      } | null;
    }>) {
      if (!row.branches || row.branches.deleted_at || !row.branches.is_active) continue;
      const list = branchesByMemberId.get(row.member_id) ?? [];
      list.push({
        id: row.branches.id,
        name: row.branches.name,
        code: row.branches.code,
        city: row.branches.city,
        address: row.branches.address,
        phone: row.branches.phone,
        isMain: row.branches.is_main,
        isDefault: row.is_default,
      });
      branchesByMemberId.set(row.member_id, list);
    }
  }

  const memberships: WorkspaceMembershipSummary[] = validMembers.map((m) => {
    const branches = branchesByMemberId.get(m.id) ?? [];
    const defaultBranch = branches.find((b) => b.isDefault) ?? branches.find((b) => b.isMain) ?? branches[0] ?? null;

    return {
      memberId: m.id,
      businessId: m.business_id,
      businessName: m.businesses!.name,
      businessStatus: m.businesses!.status,
      shopKit: m.businesses!.shop_kit,
      currency: m.businesses!.currency,
      timezone: m.businesses!.timezone,
      roleId: m.roles!.id,
      roleName: m.roles!.name,
      roleDisplayName: m.roles!.display_name,
      isSystemRole: m.roles!.is_system_role,
      memberStatus: m.status,
      permissions: permsByRoleId.get(m.role_id) ?? [],
      branches,
      defaultBranchId: defaultBranch?.id ?? null,
    };
  });

  const activeMemberships = memberships.filter(
    (m) => m.memberStatus === 'active' && m.businessStatus === 'active',
  );
  const pendingMemberships = memberships.filter((m) => m.memberStatus === 'invited');
  const disabledMemberships = memberships.filter(
    (m) => m.memberStatus === 'suspended' || m.memberStatus === 'removed' || m.businessStatus !== 'active',
  );

  const cookieStore = await cookies();
  const preferredBusinessId = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value || null;
  const preferredBranchId = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value || null;

  let activeMembership: WorkspaceMembershipSummary | null = null;
  let accountStatus: AuthSessionPayload['accountStatus'] = 'no_membership';
  let recommendedRedirect = '/account-pending';

  if (activeMemberships.length === 1) {
    activeMembership = activeMemberships[0];
    accountStatus = 'active';
    recommendedRedirect = resolveDashboardRouteForMembership(activeMembership);
  } else if (activeMemberships.length > 1) {
    const matched = preferredBusinessId
      ? activeMemberships.find((m) => m.businessId === preferredBusinessId) ?? null
      : null;
    if (matched) {
      activeMembership = matched;
      accountStatus = 'active';
      recommendedRedirect = resolveDashboardRouteForMembership(activeMembership);
    } else {
      accountStatus = 'needs_workspace_selection';
      recommendedRedirect = '/select-workspace';
    }
  } else if (pendingMemberships.length > 0) {
    accountStatus = 'pending';
    recommendedRedirect = '/account-pending';
  } else if (disabledMemberships.length > 0) {
    accountStatus = 'disabled';
    recommendedRedirect = '/account-disabled';
  } else {
    accountStatus = 'no_membership';
    recommendedRedirect = '/account-pending';
  }

  const activeBranchId = activeMembership
    ? (preferredBranchId && activeMembership.branches.some((b) => b.id === preferredBranchId)
        ? preferredBranchId
        : activeMembership.defaultBranchId)
    : null;

  return {
    authenticated: true,
    configured: true,
    user: {
      id: user.id,
      fullName,
      shortName: profileRow?.short_name || fullName.split(' ')[0] || 'User',
      phone: profileRow?.phone || user.phone || null,
      email: user.email || null,
      avatarBg: profileRow?.avatar_bg || '#08343A',
      avatarFg: profileRow?.avatar_fg || '#FFFFFF',
      initials: getInitials(fullName),
    },
    memberships,
    activeBusinessId: activeMembership?.businessId ?? null,
    activeBranchId,
    activeMembership,
    accountStatus,
    recommendedRedirect,
  };
}
