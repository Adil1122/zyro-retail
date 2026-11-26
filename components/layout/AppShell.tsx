'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useZyro } from '@/hooks/useZyro';
import { canAccessPath } from '@/lib/permissions';
import { AppHeader } from './AppHeader';
import { MobileNavigation } from './MobileNavigation';
import { NoAccessScreen } from './NoAccessScreen';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPhone, isTablet } = useBreakpoint();
  const { role, session, lang } = useZyro();
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
    if (auth.loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F4EFE9] text-[#0B2A2F]">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-[14px] bg-white border border-[#E7E0D7]">
            <span className="w-8 h-8 rounded-[9px] bg-[#E58A4E] text-[#08343A] font-display font-bold flex items-center justify-center">
              Z
            </span>
            <span className="text-[15px] font-semibold">Loading your workspace…</span>
          </div>
        </div>
      );
    }
    if (!auth.session.authenticated || auth.session.accountStatus !== 'active') {
      return null;
    }
  } else if (!session.isAuthenticated) {
    return null;
  }

  const allowed = canAccessPath(role, pathname, auth.configured ? auth.permissions : undefined);

  return (
    <div className="min-h-screen flex bg-[#F4EFE9] text-[#0B2A2F]">
      {!isPhone && <Sidebar mode={isTablet ? 'tablet' : 'desk'} />}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AppHeader isPhone={isPhone} />

        {lang !== 'en' && (
          <div
            role="note"
            className="h-[34px] px-4 bg-[#EDF3FF] border-b border-[#D0E0FF] text-[13px] font-semibold text-[#1E40AF] flex items-center justify-center gap-2"
          >
            <span>
              {lang === 'ur'
                ? 'اردو زبان فعال ہے (دائیں سے بائیں ترتیب)'
                : 'Menus, the register and first-run setup are translated · other pages stay English until the native-reader review'}
            </span>
          </div>
        )}

        <main
          className={`flex-1 w-full px-4 py-4 md:px-5 md:py-[18px] lg:px-7 lg:py-[22px] lg:pb-8 ${
            isPhone ? 'pb-24' : ''
          }`}
        >
          {allowed ? children : <NoAccessScreen pathname={pathname} />}
        </main>
      </div>

      {isPhone && <MobileNavigation />}
    </div>
  );
}
