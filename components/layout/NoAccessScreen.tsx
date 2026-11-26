'use client';

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useZyro } from '@/hooks/useZyro';
import { getNoAccessMessage } from '@/lib/permissions';

export function NoAccessScreen({ pathname }: { pathname: string }) {
  const { role } = useZyro();
  const msg = getNoAccessMessage(role, pathname);

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <Card padding="lg" className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#FCEFE4] text-[#8A3D12] border border-[#E2B48F] mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
            {msg.title}
          </div>
          <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">{msg.headline}</h1>
          <p className="text-[14px] text-[#52666A] leading-relaxed">{msg.body}</p>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/dashboard">
            <Button variant="dark">Go back home</Button>
          </Link>
          {role === 'cashier' && (
            <Link href="/pos">
              <Button variant="primary">Open register</Button>
            </Link>
          )}
          {role === 'inventory' && (
            <Link href="/inventory">
              <Button variant="primary">Open stock</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
