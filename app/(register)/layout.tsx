'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NoAccessScreen } from '@/components/layout/NoAccessScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useZyro } from '@/hooks/useZyro';
import { canAccessPath } from '@/lib/permissions';

export default function RegisterGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, session } = useZyro();
  const auth = useAuth();

  useEffect(() => {
    if (auth.configured) {
      if (auth.loading) return;
      if (!auth.session.authenticated) {
        router.replace('/welcome');
        return;
      }
      if (auth.session.accountStatus === 'needs_workspace_selection') {
        router.replace('/select-workspace');
        return;
      }
      if (auth.session.accountStatus === 'disabled') {
        router.replace('/account-disabled');
        return;
      }
      if (auth.session.accountStatus === 'pending' || auth.session.accountStatus === 'no_membership') {
        router.replace('/account-pending');
        return;
      }
      return;
    }

    if (!session.isAuthenticated) {
      router.replace('/welcome');
    }
  }, [auth.configured, auth.loading, auth.session.authenticated, auth.session.accountStatus, session.isAuthenticated, router]);

  if (auth.configured) {
    if (auth.loading || !auth.session.authenticated || auth.session.accountStatus !== 'active') {
      return null;
    }
  } else if (!session.isAuthenticated) {
    return null;
  }

  if (!canAccessPath(role, pathname, auth.configured ? auth.permissions : undefined)) {
    return (
      <div className="min-h-screen bg-[#F4EFE9] flex items-center justify-center p-4">
        <NoAccessScreen pathname={pathname} />
      </div>
    );
  }

  return <div className="min-h-screen bg-[#F4EFE9] text-[#0B2A2F]">{children}</div>;
}
