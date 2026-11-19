'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { authService } from '@/features/auth/services/auth.service';
import type {
  AuthSessionPayload,
  WorkspaceMembershipSummary,
} from '@/features/auth/types/auth.types';
import { useZyroStore } from '@/services/zyro-store';
import type { RoleId, ShopKitId } from '@/types';

interface AuthContextValue {
  loading: boolean;
  configured: boolean;
  session: AuthSessionPayload;
  activeMembership: WorkspaceMembershipSummary | null;
  permissions: string[];
  hasPermission: (permissionKey: string) => boolean;
  refreshSession: () => Promise<AuthSessionPayload>;
  selectWorkspace: (businessId: string, branchId?: string) => Promise<string>;
  signOut: () => Promise<void>;
}

const EMPTY_SESSION: AuthSessionPayload = {
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

const AuthContext = createContext<AuthContextValue | null>(null);

function mapDbRoleToUiRole(membership: WorkspaceMembershipSummary): RoleId {
  const key = membership.roleName.toLowerCase();
  if (key === 'owner') return 'owner';
  if (key === 'inventory' || key === 'stockkeeper') return 'inventory';
  if (key === 'cashier') return 'cashier';

  const perms = new Set(membership.permissions);
  if (perms.has('dashboard.owner.view') || perms.has('settings.manage')) return 'owner';
  if (perms.has('dashboard.inventory.view') && !perms.has('pos.sell')) return 'inventory';
  return 'cashier';
}

const VALID_KITS = new Set<ShopKitId>([
  'clothing',
  'shoes',
  'jewellery',
  'pharmacy',
  'grocery',
  'cosmetics',
  'mobile',
  'other',
]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useZyroStore();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSessionPayload>(EMPTY_SESSION);

  const syncToZyroStore = useCallback(
    (payload: AuthSessionPayload) => {
      if (!payload.configured) return;

      if (!payload.authenticated) {
        store.signOut();
        return;
      }

      if (payload.activeMembership && payload.user) {
        const uiRole = mapDbRoleToUiRole(payload.activeMembership);
        const kit: ShopKitId = VALID_KITS.has(payload.activeMembership.shopKit as ShopKitId)
          ? (payload.activeMembership.shopKit as ShopKitId)
          : 'clothing';

        store.completeAuthSignIn(
          uiRole,
          payload.activeMembership.businessName,
          kit,
          payload.user.fullName,
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const refreshSession = useCallback(async (): Promise<AuthSessionPayload> => {
    try {
      const payload = await authService.getSession();
      setSession(payload);
      syncToZyroStore(payload);
      return payload;
    } catch {
      setSession(EMPTY_SESSION);
      return EMPTY_SESSION;
    } finally {
      setLoading(false);
    }
  }, [syncToZyroStore]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          void refreshSession();
        } else if (event === 'SIGNED_OUT') {
          setSession((prev) => ({
            ...EMPTY_SESSION,
            configured: prev.configured,
          }));
          store.signOut();
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // ignore client initialization errors if env not present
    }

    return () => {
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSession]);

  const selectWorkspace = useCallback(
    async (businessId: string, branchId?: string): Promise<string> => {
      const res = await authService.selectWorkspace({ businessId, branchId });
      await refreshSession();
      return res.redirectTo;
    },
    [refreshSession],
  );

  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured()) {
        await authService.signOut();
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut().catch(() => undefined);
      }
    } finally {
      setSession((prev) => ({ ...EMPTY_SESSION, configured: prev.configured }));
      store.signOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissions = useMemo(
    () => session.activeMembership?.permissions ?? [],
    [session.activeMembership],
  );

  const hasPermission = useCallback(
    (permissionKey: string) => {
      if (!session.configured) return true;
      return permissions.includes(permissionKey);
    },
    [permissions, session.configured],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      configured: session.configured,
      session,
      activeMembership: session.activeMembership,
      permissions,
      hasPermission,
      refreshSession,
      selectWorkspace,
      signOut,
    }),
    [loading, session, permissions, hasPermission, refreshSession, selectWorkspace, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
