'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const { role, session, lang, t } = useZyro();

  useEffect(() => {
    if (!session.isAuthenticated) {
      router.replace('/welcome');
    }
  }, [session.isAuthenticated, router]);

  if (!session.isAuthenticated) {
    return null;
  }

  const allowed = canAccessPath(role, pathname);

  return (
    <div className="min-h-screen flex bg-[#F4EFE9] text-[#0B2A2F]">
      {!isPhone && <Sidebar mode={isTablet ? 'tablet' : 'desk'} />}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AppHeader isPhone={isPhone} />

        {lang !== 'en' && (
          <div className="px-4 py-1.5 bg-[#FCEFE4] border-b border-[#E2B48F] text-[12px] font-semibold text-[#8A3D12] flex items-center justify-between">
            <span>
              {lang === 'ur'
                ? 'اردو زبان فعال ہے (دائیں سے بائیں ترتیب)'
                : 'Roman Urdu labels active'}
            </span>
            <span className="text-[11px] opacity-80">{t('mainBranch')}</span>
          </div>
        )}

        <main className={`flex-1 p-4 sm:p-6 ${isPhone ? 'pb-24' : ''} max-w-[1440px] w-full mx-auto`}>
          {allowed ? children : <NoAccessScreen pathname={pathname} />}
        </main>
      </div>

      {isPhone && <MobileNavigation />}
    </div>
  );
}
