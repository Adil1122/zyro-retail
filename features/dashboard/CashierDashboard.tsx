'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  Lock,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useZyro } from '@/hooks/useZyro';
import { formatNumber } from '@/lib/format';
import { calcBillTotal } from '@/lib/inventory';

export function CashierDashboard() {
  const { state, user, t } = useZyro();
  const openShift = state.shifts.find((s) => s.status === 'open');

  let cashSales = 0;
  let khataSales = 0;
  let khataCollected = 0;
  let returnsRecorded = 0;
  state.bills.forEach((b) => {
    const total = calcBillTotal(b, state.items);
    if (b.pay === 'cash') cashSales += total;
    else khataSales += total;
    khataCollected += b.collected || 0;
    returnsRecorded += b.returned || 0;
  });

  const refundsPaid = state.bills.reduce((s, b) => s + (b.returned || 0), 0);
  const flt = openShift?.float ?? 10000;
  const expectedDrawer = flt + cashSales + khataCollected - refundsPaid;

  const unknownPrints = state.bills.filter((b) => b.print === 'unknown');
  const failedPrints = state.bills.filter((b) => b.print === 'failed');
  const refundOwedBills = state.bills.filter((b) => (b.refundOwed || 0) > 0);

  const todoItems = [
    ...refundOwedBills.map((b) => {
      const cust = b.cust ? state.customers.find((c) => c.id === b.cust) : null;
      return {
        title: `${cust?.name || 'Customer'} is owed Rs ${formatNumber(b.refundOwed)}`,
        sub: `Bill ${b.no} · tell her the owner pays refunds`,
        action: 'View',
        bg: '#FCEFE4',
        fg: '#8A3D12',
        icon: <RotateCcw className="w-[18px] h-[18px]" />,
        href: `/pos/bills?bill=${b.no}`,
      };
    }),
    ...unknownPrints.map((b) => ({
      title: `Did bill ${b.no} print?`,
      sub: 'Printer didn’t confirm · check before printing again',
      action: 'Check',
      bg: '#FFF3C4',
      fg: '#6B4E00',
      icon: <Printer className="w-[18px] h-[18px]" />,
      href: `/pos/printer?job=${b.no}`,
    })),
    ...failedPrints.map((b) => ({
      title: `Bill ${b.no} receipt failed`,
      sub: 'Reprint needs the owner’s OK',
      action: 'View',
      bg: '#FDF0EF',
      fg: '#B42318',
      icon: <Printer className="w-[18px] h-[18px]" />,
      href: `/pos/printer?job=${b.no}`,
    })),
  ];

  const printLine =
    [
      unknownPrints.length ? `${unknownPrints.length} not confirmed` : '',
      failedPrints.length ? `${failedPrints.length} failed` : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'No print problems today';

  const shiftBoxes = [
    { label: 'Opening float', sign: '', value: flt },
    { label: 'Cash sales', sign: '', value: cashSales },
    { label: 'Khata collected', sign: '', value: khataCollected },
    { label: 'Refunds paid', sign: refundsPaid ? '−' : '', value: refundsPaid },
  ];

  const splitRows = [
    { label: 'Cash', value: cashSales, color: '#08343A' },
    { label: 'Khata (credit)', value: khataSales, color: '#E58A4E' },
    { label: 'Returns recorded', value: returnsRecorded, color: '#C9C1B6' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Saturday, 14 November · Counter 1"
        title={`Good afternoon, ${user.shortName}`}
        actions={
          <Link href="/pos" className="w-full sm:w-auto">
            <Button variant="dark" size="counter" fullWidth>
              <ShoppingBag className="w-5 h-5" />
              {t('openRegister')}
            </Button>
          </Link>
        }
      />

      {/* Top Grid matching CashierHome.html */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
        {/* Your shift card */}
        <section
          aria-labelledby="sh-t"
          className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] py-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 id="sh-t" className="flex-1 min-w-[140px] font-display text-[20px] font-bold text-[#0B2A2F]">
              Your shift
            </h2>
            <span className="h-[26px] px-[9px] rounded-full bg-[#E8F6EE] text-[#14532D] text-[13px] font-semibold inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2F9E63]" />
              {openShift ? `Open since ${openShift.opened}` : 'Closed'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {shiftBoxes.map((x) => (
              <div
                key={x.label}
                className="rounded-[14px] bg-[#FBF8F4] px-3 py-2.5 flex flex-col gap-0.5 min-w-0"
              >
                <span className="text-[13px] text-[#52666A] truncate">{x.label}</span>
                <span className="num text-[17px] font-bold text-[#0B2A2F] whitespace-nowrap">
                  <span className="rs">{x.sign}Rs</span>
                  {formatNumber(x.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap border-t border-[#F1EBE3] pt-3">
            <div className="flex-1 min-w-[200px] flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-[#3D5357]">
                Cash expected in the drawer
              </span>
              <span className="num font-display text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-[#0B2A2F]">
                <span className="rs">Rs</span>
                {formatNumber(expectedDrawer)}
              </span>
              <span className="text-[13px] text-[#52666A]">Recorded, not counted yet.</span>
            </div>
            <div className="flex items-center gap-2 max-w-[260px] text-[13px] leading-[1.45] text-[#3D5357]">
              <Lock className="w-[18px] h-[18px] shrink-0" />
              <span>Hamza counts the drawer and closes the shift.</span>
            </div>
          </div>
        </section>

        {/* Counter 1 sales today */}
        <section
          aria-labelledby="ms-t"
          className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] py-4 flex flex-col gap-1.5"
        >
          <h2 id="ms-t" className="text-[13px] font-semibold text-[#3D5357]">
            Counter 1 sales today
          </h2>
          <div className="num font-display text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-[#0B2A2F]">
            <span className="rs">Rs</span>
            {formatNumber(cashSales + khataSales)}
          </div>
          <div className="num text-[13px] text-[#52666A]">
            {state.bills.length} bills · before returns
          </div>

          <div className="flex flex-col mt-1">
            {splitRows.map((x) => (
              <div
                key={x.label}
                className="flex items-center gap-2 min-h-[36px] border-t border-[#F4EFE9]"
              >
                <span
                  style={{ backgroundColor: x.color }}
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                />
                <span className="flex-1 text-[15px] text-[#0B2A2F]">{x.label}</span>
                <span className="num text-[15px] font-semibold text-[#0B2A2F]">
                  <span className="rs">Rs</span>
                  {formatNumber(x.value)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom 2-column split matching CashierHome.html */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="w-full lg:flex-[1.3] min-w-0 flex flex-col gap-4">
          {/* Finish these */}
          <section
            aria-labelledby="nd-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-2.5">
              <h2 id="nd-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
                Finish these
              </h2>
              <span
                className={`num h-[26px] px-[9px] rounded-full text-[13px] font-semibold inline-flex items-center ${
                  todoItems.length > 0
                    ? 'bg-[#FCEFE4] text-[#8A3D12]'
                    : 'bg-[#E8F6EE] text-[#14532D]'
                }`}
              >
                {todoItems.length > 0 ? `${todoItems.length} to finish` : 'All done'}
              </span>
            </div>

            {todoItems.length > 0 ? (
              <div>
                {todoItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.href}
                    className="row w-full flex items-center gap-3 min-h-[68px] py-2.5 ps-[18px] pe-[14px] border-t border-[#F1EBE3] bg-white"
                  >
                    <span
                      style={{ backgroundColor: item.bg, color: item.fg }}
                      className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0"
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-[#0B2A2F] truncate">
                        {item.title}
                      </span>
                      <span className="num text-[13px] text-[#52666A] truncate">{item.sub}</span>
                    </span>
                    <span className="text-[15px] font-semibold text-[#0E5E66] whitespace-nowrap">
                      {item.action}
                    </span>
                    <ChevronRight className="w-[18px] h-[18px] text-[#0E5E66] shrink-0 rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-[18px] py-[22px] border-t border-[#F1EBE3] text-[15px] text-[#3D5357]">
                Nothing left to finish. Nice work.
              </div>
            )}
          </section>

          {/* Recent bills */}
          <section
            aria-labelledby="rb-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-2.5">
              <h2 id="rb-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
                Recent bills
              </h2>
              <Link
                href="/pos/bills"
                className="h-[40px] px-1 inline-flex items-center text-[15px] font-semibold text-[#0E5E66] hover:text-[#08343A] hover:underline"
              >
                Open bill book
              </Link>
            </div>
            <div>
              {state.bills.slice(0, 4).map((b) => {
                const cust = b.cust ? state.customers.find((c) => c.id === b.cust) : null;
                const total = calcBillTotal(b, state.items);
                const out = b.pay === 'khata' ? Math.max(0, total - (b.collected || 0)) : 0;
                let chip: { bg: string; fg: string; text: string } | null = null;
                if ((b.refundOwed || 0) > 0) chip = { bg: '#FCEFE4', fg: '#8A3D12', text: 'Refund owed' };
                else if (out > 0) chip = { bg: '#F1EBE3', fg: '#3D5357', text: `Khata · Rs ${formatNumber(out)} due` };
                else if (b.print === 'unknown') chip = { bg: '#FFF3C4', fg: '#6B4E00', text: 'Print not confirmed' };
                else if (b.print === 'failed') chip = { bg: '#FDF0EF', fg: '#B42318', text: 'Test print failed' };

                return (
                  <Link
                    key={b.no}
                    href={`/pos/bills?bill=${b.no}`}
                    className="row flex items-center gap-3 min-h-[60px] py-2 px-[18px] border-t border-[#F1EBE3] bg-white"
                  >
                    <span className="mono w-[44px] text-[14px] text-[#0B2A2F] shrink-0">
                      {b.no}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-[#0B2A2F] truncate">
                        {cust ? cust.name : 'Walk-in'}
                      </span>
                      <span className="text-[13px] text-[#52666A] truncate">
                        {b.time} · {b.lines.length} {b.lines.length === 1 ? 'item' : 'items'}
                      </span>
                    </span>
                    {chip && (
                      <span
                        style={{ backgroundColor: chip.bg, color: chip.fg }}
                        className="hidden sm:inline-flex h-[24px] px-[9px] rounded-full text-[13px] font-semibold items-center shrink-0"
                      >
                        {chip.text}
                      </span>
                    )}
                    <span className="num text-[15px] font-bold text-[#0B2A2F] text-end w-[84px] shrink-0">
                      <span className="rs">Rs</span>
                      {formatNumber(total)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right column Quick actions + Printer card matching CashierHome.html */}
        <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-4">
          <section className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-4 pb-[18px] flex flex-col gap-2.5">
            <h2 className="font-display text-[20px] font-bold text-[#0B2A2F]">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/pos/returns"
                className="opt min-h-[84px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
              >
                <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                  <RotateCcw className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[15px] font-semibold text-[#0B2A2F]">Return / exchange</span>
              </Link>
              <Link
                href="/pos/bills"
                className="opt min-h-[84px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
              >
                <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                  <Receipt className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[15px] font-semibold text-[#0B2A2F]">Bill book</span>
              </Link>
              <Link
                href="/khata"
                className="opt min-h-[84px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
              >
                <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                  <BookOpen className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[15px] font-semibold text-[#0B2A2F]">Customers</span>
              </Link>
              {state.settings.kit === 'shoes' ? (
                <Link
                  href="/pos/returns"
                  className="opt min-h-[84px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
                >
                  <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                    <RefreshCw className="w-[18px] h-[18px]" />
                  </span>
                  <span className="text-[15px] font-semibold text-[#0B2A2F]">Exchange a size</span>
                </Link>
              ) : (
                <Link
                  href="/pos/printer"
                  className="opt min-h-[84px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
                >
                  <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                    <Printer className="w-[18px] h-[18px]" />
                  </span>
                  <span className="text-[15px] font-semibold text-[#0B2A2F]">Printer</span>
                </Link>
              )}
            </div>
          </section>

          <section className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] py-4 flex items-center gap-3">
            <span className="w-[44px] h-[44px] rounded-full bg-[#FFF3C4] text-[#6B4E00] flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-[#0B2A2F]">
                Receipt printer · 80 mm
              </span>
              <span className="text-[13px] text-[#6B4E00]">{printLine}</span>
            </span>
            <Link
              href="/pos/printer"
              className="h-[40px] px-1 inline-flex items-center text-[15px] font-semibold text-[#0E5E66] hover:text-[#08343A] hover:underline"
            >
              Check
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
