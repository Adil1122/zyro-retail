import { NextResponse } from 'next/server';
import { getServerAuthSessionPayload } from '@/lib/auth/server-context';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import type { WorkspaceBranchSummary, WorkspaceMembershipSummary } from '@/features/auth/types/auth.types';

export interface AuthorizedWorkspaceContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  userFullName: string;
  businessId: string;
  branchId: string;
  branch: WorkspaceBranchSummary;
  branches: WorkspaceBranchSummary[];
  membership: WorkspaceMembershipSummary;
  permissions: Set<string>;
  hasPermission: (key: string) => boolean;
}

export type WorkspaceGuardResult =
  | { ok: true; ctx: AuthorizedWorkspaceContext }
  | { ok: false; response: NextResponse };

/**
 * Authenticates the caller via Supabase SSR cookies, resolves their active
 * business & branch from server-side DB records (never trusting client role or
 * business_id), validates optional branch override against member_branch_access,
 * and enforces optional required permissions.
 */
export async function requireWorkspaceContext(options?: {
  branchId?: string | null;
  anyPermissions?: string[];
  allPermissions?: string[];
}): Promise<WorkspaceGuardResult> {
  if (!isSupabaseServerConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Supabase is not configured on the server.' },
        { status: 503 },
      ),
    };
  }

  const session = await getServerAuthSessionPayload();
  if (!session.authenticated || !session.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required. Please sign in.' },
        { status: 401 },
      ),
    };
  }

  if (!session.activeMembership || !session.activeBusinessId || session.accountStatus !== 'active') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No active business workspace found for this account.' },
        { status: 403 },
      ),
    };
  }

  const membership = session.activeMembership;
  const permissions = new Set(membership.permissions);

  if (options?.allPermissions && options.allPermissions.length > 0) {
    const missing = options.allPermissions.filter((perm) => !permissions.has(perm));
    if (missing.length > 0) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Permission denied. Missing required capability: ${missing.join(', ')}` },
          { status: 403 },
        ),
      };
    }
  }

  if (options?.anyPermissions && options.anyPermissions.length > 0) {
    const hasAny = options.anyPermissions.some((perm) => permissions.has(perm));
    if (!hasAny) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'You do not have permission to perform this action.' },
          { status: 403 },
        ),
      };
    }
  }

  const requestedBranchId = options?.branchId?.trim() || null;
  let resolvedBranch: WorkspaceBranchSummary | undefined;

  if (requestedBranchId) {
    resolvedBranch = membership.branches.find((b) => b.id === requestedBranchId);
    if (!resolvedBranch) {
      // Owners have implicit access to all branches of their business; verify via DB if not in list
      if (membership.roleName.toLowerCase() === 'owner') {
        const sbCheck = await createSupabaseServerClient();
        const { data: branchRow } = await sbCheck
          .from('branches')
          .select('id, name, code, city, address, phone, is_main, is_active')
          .eq('id', requestedBranchId)
          .eq('business_id', membership.businessId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle();
        if (branchRow) {
          resolvedBranch = {
            id: branchRow.id,
            name: branchRow.name,
            code: branchRow.code,
            city: branchRow.city,
            address: branchRow.address,
            phone: branchRow.phone,
            isMain: branchRow.is_main,
            isDefault: false,
          };
        }
      }
      if (!resolvedBranch) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'You do not have access to the requested branch.' },
            { status: 403 },
          ),
        };
      }
    }
  } else {
    resolvedBranch =
      membership.branches.find((b) => b.id === session.activeBranchId) ??
      membership.branches.find((b) => b.isDefault) ??
      membership.branches[0];
  }

  if (!resolvedBranch) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No active branch is assigned to your account.' },
        { status: 403 },
      ),
    };
  }

  const supabase = await createSupabaseServerClient();

  return {
    ok: true,
    ctx: {
      supabase,
      userId: session.user.id,
      userFullName: session.user.fullName,
      businessId: membership.businessId,
      branchId: resolvedBranch.id,
      branch: resolvedBranch,
      branches: membership.branches,
      membership,
      permissions,
      hasPermission: (key: string) => permissions.has(key),
    },
  };
}
