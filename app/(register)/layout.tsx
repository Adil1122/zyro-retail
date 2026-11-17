'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { NoAccessScreen } from '@/components/layout/NoAccessScreen';
import { useZyro } from '@/hooks/useZyro';
import { canAccessPath } from '@/lib/permissions';

export default function RegisterGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, session } = useZyro();

  useEffect(() => {
    if (!session.isAuthenticated) {
      router.replace('/welcome');
    }
  }, [session.isAuthenticated, router]);

  if (!session.isAuthenticated) {
    return null;
  }

  if (!canAccessPath(role, pathname)) {
    return (
      <div className="min-h-screen bg-[#F4EFE9] flex items-center justify-center p-4">
        <NoAccessScreen pathname={pathname} />
      </div>
    );
  }

  return <div className="min-h-screen bg-[#F4EFE9] text-[#0B2A2F]">{children}</div>;
}
