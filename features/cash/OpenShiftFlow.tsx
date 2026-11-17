'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { COUNTER_STAFF } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';

export function OpenShiftFlow() {
  const router = useRouter();
  const { state, openShift, notify } = useZyro();
  const existingOpen = state.shifts.find((s) => s.status === 'open') || null;
  const staffOptions = state.employees
    .filter((e) => e.active && (e.roleId === 'cashier' || e.roleId === 'manager' || e.roleId === 'owner'))
    .map((e) => ({
      value: e.name.split(' ')[0] || e.name,
      label: `${e.name} (${e.job})`,
    }));
  const options =
    staffOptions.length > 0
      ? staffOptions
      : COUNTER_STAFF.map((s) => ({ value: s.short, label: `${s.name} (${s.role})` }));

  const [floatAmt, setFloatAmt] = useState('10000');
  const [cashier, setCashier] = useState(options[0]?.value || COUNTER_STAFF[0].short);

  const handleOpen = () => {
    if (existingOpen) {
      notify(`Shift ${existingOpen.id} is already open. Close it before opening a new one.`, 'err');
      return;
    }
    const val = Math.max(0, parseInt(floatAmt, 10) || 0);
    openShift(val, cashier);
    notify(`Shift opened for ${cashier} with ${formatRs(val)} float`, 'ok');
    router.push('/pos');
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <header className="h-[58px] bg-[#08343A] text-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Button>
        </Link>
        <span className="font-display font-bold text-[15px]">Open counter shift</span>
        <span />
      </header>

      <div className="max-w-[520px] mx-auto p-4 sm:p-8">
        <Card className="p-6 space-y-5">
          <div>
            <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">
              Start Counter 1 shift
            </h1>
            <p className="text-[13px] text-[#52666A] mt-1">
              Count the starting change float inside the drawer before ringing up the first bill.
            </p>
          </div>

          {existingOpen && (
            <div className="p-3.5 rounded-[11px] bg-[#FFF3C4] border border-[#EBD892] space-y-2 text-[13px] text-[#6B4E00]">
              <div className="font-semibold">
                Shift {existingOpen.id} ({existingOpen.cashier}) is currently open.
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/cash/close-shift">
                  <Button size="sm" variant="primary">Close active shift</Button>
                </Link>
                <Link href="/pos">
                  <Button size="sm" variant="secondary">Go to register</Button>
                </Link>
              </div>
            </div>
          )}

          <Select
            label="Cashier on duty"
            value={cashier}
            onChange={(e) => setCashier(e.target.value)}
            options={options}
          />

          <div className="space-y-2">
            <Input
              label="Opening cash float (Rs)"
              type="number"
              value={floatAmt}
              onChange={(e) => setFloatAmt(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {[5000, 10000, 15000, 20000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFloatAmt(String(v))}
                  className="px-3 py-1.5 rounded-[8px] border border-[#D6CDC1] bg-[#FBF8F4] text-[12px] font-semibold num hover:bg-[#F1EBE3]"
                >
                  {formatRs(v)}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="counter"
            fullWidth
            onClick={handleOpen}
            disabled={!!existingOpen}
          >
            <Unlock className="w-5 h-5" /> Open shift &amp; go to register
          </Button>
        </Card>
      </div>
    </div>
  );
}
