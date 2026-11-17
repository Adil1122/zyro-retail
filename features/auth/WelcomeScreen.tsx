'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, ShieldCheck, Store, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useZyro } from '@/hooks/useZyro';
import type { RoleId } from '@/types';

export function WelcomeScreen() {
  const router = useRouter();
  const { completeAuthSignIn, notify } = useZyro();

  const enterDemoAs = (role: RoleId) => {
    completeAuthSignIn(role);
    notify(`Signed in as ${role === 'owner' ? 'Owner' : role === 'cashier' ? 'Cashier' : 'Stockkeeper'}`, 'ok');
    router.push('/dashboard');
  };

  return (
    <div className="w-full max-w-[960px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <div className="lg:col-span-7 rounded-[20px] bg-[#08343A] text-white p-7 sm:p-10 flex flex-col justify-between gap-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F2B48A] text-[12px] font-semibold">
            <Store className="w-3.5 h-3.5" />
            Built for Pakistani retail shops
          </div>
          <h1 className="font-display text-[30px] sm:text-[38px] font-bold tracking-tight leading-tight">
            One shop counter. Clear books at night.
          </h1>
          <p className="text-[15px] text-[#C9DADB] leading-relaxed max-w-lg">
            Sell fast even offline, track stock by size, colour, batch or IMEI, keep clean customer Khata, and reconcile every rupee when the shift closes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => enterDemoAs('owner')}
            className="text-start p-3.5 rounded-[12px] bg-white/10 hover:bg-white/15 transition-colors border border-white/10"
          >
            <div className="text-[12px] text-[#F2B48A] font-semibold">Quick demo</div>
            <div className="font-semibold text-[14px] mt-0.5">Owner · Hamza</div>
          </button>
          <button
            type="button"
            onClick={() => enterDemoAs('cashier')}
            className="text-start p-3.5 rounded-[12px] bg-white/10 hover:bg-white/15 transition-colors border border-white/10"
          >
            <div className="text-[12px] text-[#7FD6A4] font-semibold">Counter</div>
            <div className="font-semibold text-[14px] mt-0.5">Cashier · Ali</div>
          </button>
          <button
            type="button"
            onClick={() => enterDemoAs('inventory')}
            className="text-start p-3.5 rounded-[12px] bg-white/10 hover:bg-white/15 transition-colors border border-white/10"
          >
            <div className="text-[12px] text-[#A9C6FF] font-semibold">Stock room</div>
            <div className="font-semibold text-[14px] mt-0.5">Stockkeeper · Faraz</div>
          </button>
        </div>
      </div>

      <Card padding="lg" className="lg:col-span-5 flex flex-col justify-between gap-5">
        <div className="space-y-4">
          <h2 className="font-display text-[22px] font-bold text-[#0B2A2F]">Get started</h2>
          <p className="text-[14px] text-[#52666A]">
            Set up a new shop in 2 minutes, sign into your owner account, or join your team on this device.
          </p>

          <div className="space-y-2.5 pt-2">
            <Link href="/register" className="block">
              <Button variant="primary" size="lg" fullWidth className="justify-between">
                <span>Create a shop account</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/sign-in" className="block">
              <Button variant="dark" size="lg" fullWidth className="justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Owner signs in
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/staff-join" className="block">
              <Button variant="secondary" size="lg" fullWidth className="justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Staff member joins
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-4 border-t border-[#F1EBE3] flex items-center justify-between text-[13px]">
          <Link href="/setup" className="font-semibold text-[#0E5E66] hover:underline">
            Set up this device
          </Link>
          <Link href="/counter-sign-in" className="font-semibold text-[#0B2A2F] hover:underline flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5" />
            Counter PIN
          </Link>
        </div>
      </Card>
    </div>
  );
}
