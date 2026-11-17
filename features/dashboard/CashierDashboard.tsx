'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Printer,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcBillTotal } from '@/lib/inventory';

export function CashierDashboard() {
  const { state, user, t } = useZyro();
  const openShift = state.shifts.find((s) => s.status === 'open');
  const todaySales = state.bills.reduce((s, b) => s + calcBillTotal(b, state.items), 0);
  const printIssues = state.bills.filter((b) => b.print === 'failed' || b.print === 'unknown');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Counter 1 · Cashier"
        title={`Good afternoon, ${user.shortName}`}
        subtitle={
          openShift
            ? `Shift ${openShift.id} opened at ${openShift.opened} with ${formatRs(openShift.float)} float`
            : 'No open shift on Counter 1 yet'
        }
        actions={
          <Link href="/pos">
            <Button variant="primary" size="counter">
              <ShoppingBag className="w-5 h-5" /> {t('openRegister')}
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Your shift"
          value={openShift ? 'Open' : 'Closed'}
          sub={openShift ? `Opened ${openShift.opened}` : 'Tap Open shift to start'}
          tone={openShift ? 'ok' : 'warn'}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Counter 1 sales today"
          value={formatRs(todaySales)}
          sub={`${state.bills.length} bills · ${state.heldBills.length} held`}
        />
        <StatCard
          label="Finish these"
          value={printIssues.length + state.heldBills.length}
          sub="Held bills & receipt print checks"
          tone={printIssues.length > 0 ? 'warn' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">Recent bills</h2>
            <Link href="/pos/bills" className="text-[13px] font-semibold text-[#0E5E66] hover:underline">
              All bills
            </Link>
          </div>
          <div className="divide-y divide-[#F1EBE3]">
            {state.bills.slice(0, 6).map((b) => (
              <Link
                key={b.no}
                href={`/pos/bills?bill=${b.no}`}
                className="py-3 flex items-center justify-between gap-3 hover:bg-[#FBF8F4] px-2 -mx-2 rounded-[10px]"
              >
                <div className="flex items-center gap-3">
                  <span className="mono font-bold text-[13px] bg-[#F1EBE3] px-2 py-1 rounded">
                    #{b.no}
                  </span>
                  <div>
                    <div className="font-semibold text-[14px]">
                      {b.lines.length} lines · {b.pay.toUpperCase()}
                    </div>
                    <div className="text-[12px] text-[#52666A]">{b.time}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.print !== 'printed' && (
                    <Badge tone="err">
                      <AlertTriangle className="w-3 h-3" /> {b.print}
                    </Badge>
                  )}
                  <span className="font-bold num">{formatRs(calcBillTotal(b, state.items))}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">Quick actions</h2>
          <div className="space-y-2.5">
            <Link href="/pos" className="block">
              <Button variant="dark" fullWidth className="justify-between">
                <span>Sell on register</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pos/returns" className="block">
              <Button variant="secondary" fullWidth className="justify-between">
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Return or exchange
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pos/quotes" className="block">
              <Button variant="secondary" fullWidth className="justify-between">
                <span>Create price quote</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pos/printer" className="block">
              <Button variant="secondary" fullWidth className="justify-between">
                <span className="flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print queue ({printIssues.length} need check)
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={openShift ? '/cash/close-shift' : '/cash/open-shift'} className="block">
              <Button variant="copperTint" fullWidth className="justify-between">
                <span>{openShift ? 'Close current shift' : 'Open shift'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
