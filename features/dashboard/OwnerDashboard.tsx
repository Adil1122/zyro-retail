'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  Receipt,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { StatCard } from '@/components/ui/StatCard';
import { useZyro } from '@/hooks/useZyro';
import { formatMonthName, formatNumber, formatRs, formatShortDate } from '@/lib/format';
import { calcBillTotal, getTotalStock } from '@/lib/inventory';

interface ApprovalItem {
  id: string;
  kind: 'expense' | 'vendor' | 'payroll' | 'purchasing' | 'cash';
  kindLabel: string;
  title: string;
  subtitle: string;
  by: string;
  when: string;
  amount: number | null;
  ref: string;
  detail: string;
  partyLabel: string;
  lastStep: string;
  canPost: boolean;
  href?: string;
}

export function OwnerDashboard() {
  const {
    state,
    session,
    approvePurchaseOrder,
    reviewCashDraft,
    postVendorBill,
    postExpenseBill,
    notify,
    t,
  } = useZyro();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [posting, setPosting] = useState(false);

  const activeBranch =
    session.branches.find((b) => b.id === session.branchId) || session.branches[0];

  const metrics = useMemo(() => {
    const salesTotal = state.bills.reduce((sum, b) => sum + calcBillTotal(b, state.items), 0);
    const cashSales = state.bills
      .filter((b) => b.pay === 'cash')
      .reduce((sum, b) => sum + calcBillTotal(b, state.items), 0);
    const khataTotal = state.customers.reduce((sum, c) => sum + c.khata, 0);
    const openShift = state.shifts.find((s) => s.status === 'open');
    const drawerCash = (openShift?.float ?? 10000) + cashSales;
    const lowStock = state.items.filter((it) => !it.measured && getTotalStock(it) <= 5);

    const openKhataCount = state.khataInvoices.filter((inv) => {
      const sub = inv.lines.reduce((s, [itemId, , , qty, overridePrice]) => {
        const it = state.items.find((x) => x.id === itemId);
        const price = overridePrice ?? it?.price ?? 0;
        return s + price * qty;
      }, 0);
      const col = inv.col.reduce((s, c) => s + c.amt, 0);
      const ret = inv.ret.reduce((s, r) => s + r.amt, 0);
      return sub - col - ret > 0;
    }).length;

    const suppliersOwed = state.vendorBills
      .filter((b) => b.status === 'posted')
      .reduce((sum, b) => {
        const paid = b.pays.reduce((a, p) => a + p.amt, 0);
        return sum + Math.max(0, b.total - paid);
      }, 0);

    const expensesOwed = state.expenseBills
      .filter((e) => e.status === 'posted')
      .reduce((sum, e) => {
        const paid = e.pays.reduce((a, p) => a + p.amt, 0);
        return sum + Math.max(0, e.amt + e.svc - paid);
      }, 0);

    const refundsOwed = state.bills.reduce((sum, b) => sum + (b.refundOwed || 0), 0);

    const postedRuns = state.payrollRuns.filter((r) => r.status === 'posted');
    const salariesOwed = postedRuns.reduce((sum, r) => {
      return (
        sum +
        r.lines.reduce((ls, [empId, paidDays, allowance, bonus, overtime, reduction, advanceRec]) => {
          const emp = state.employees.find((e) => e.id === empId);
          const base = emp ? Math.round((emp.salary * paidDays) / (r.days || 30)) : 0;
          const net = Math.max(0, base + allowance + bonus + overtime - reduction - advanceRec);
          return ls + net;
        }, 0)
      );
    }, 0);
    const hasDraftPayroll = state.payrollRuns.some((r) => r.status === 'draft');

    const totalOwed = suppliersOwed + expensesOwed + refundsOwed + salariesOwed;

    const approvals: ApprovalItem[] = [];

    state.expenseBills
      .filter((e) => e.status === 'draft')
      .forEach((e) => {
        approvals.push({
          id: `exp:${e.id}`,
          kind: 'expense',
          kindLabel: 'Expense bill',
          title: e.title,
          subtitle: `${e.payee} · ${e.period || formatShortDate(e.due)}`,
          by: 'Faraz',
          when: `Due ${formatShortDate(e.due)}`,
          amount: e.amt + e.svc,
          ref: e.ref || e.id,
          detail:
            'Posting records this bill under Expenses so it shows in What you owe. You can pay it later from Expenses.',
          partyLabel: 'Expense',
          lastStep: 'Post to ledger',
          canPost: true,
        });
      });

    state.vendorBills
      .filter((vb) => vb.status === 'draft')
      .forEach((vb) => {
        const sup = state.suppliers.find((s) => s.id === vb.sup);
        approvals.push({
          id: `ven:${vb.ref}`,
          kind: 'vendor',
          kindLabel: 'Supplier invoice',
          title: `${vb.ref} · ${sup?.name || 'Supplier'}`,
          subtitle: `Against PO-${vb.po}`,
          by: vb.by || 'Faraz',
          when: `Due ${formatShortDate(vb.due)}`,
          amount: vb.total,
          ref: vb.ref,
          detail:
            'Posting creates a supplier liability in Purchasing. Nothing pays money until you record payment from Suppliers.',
          partyLabel: 'Supplier',
          lastStep: 'Post to ledger',
          canPost: true,
        });
      });

    state.payrollRuns
      .filter((r) => r.status === 'draft')
      .forEach((r) => {
        approvals.push({
          id: `pay:${r.period}`,
          kind: 'payroll',
          kindLabel: 'Payroll',
          title: `${formatMonthName(r.period)} payroll · ${r.lines.length} staff`,
          subtitle: 'Review payslips and post payroll run',
          by: 'you',
          when: 'Draft',
          amount: null,
          ref: r.period,
          detail:
            'Open Staff & Payroll to confirm attendance days, advances, and bonuses before posting salaries.',
          partyLabel: 'Payroll run',
          lastStep: 'Open payslips',
          canPost: false,
          href: '/staff',
        });
      });

    state.purchaseOrders
      .filter((po) => po.status === 'draft')
      .forEach((po) => {
        const sup = state.suppliers.find((s) => s.id === po.sup);
        approvals.push({
          id: `po:${po.no}`,
          kind: 'purchasing',
          kindLabel: 'Purchase order',
          title: `PO-${po.no} · ${sup?.name || 'Supplier'}`,
          subtitle: `${po.lines.length} lines · drafted for supplier`,
          by: po.by,
          when: formatShortDate(po.d),
          amount: null,
          ref: `PO-${po.no}`,
          detail:
            'Approving lets the stockkeeper send or receive against this order in Purchasing.',
          partyLabel: 'Supplier',
          lastStep: 'Open purchase order',
          canPost: false,
          href: `/purchasing?po=${po.no}`,
        });
      });

    state.cashDrafts
      .filter((d) => d.status === 'draft')
      .forEach((d) => {
        approvals.push({
          id: `cash:${d.id}`,
          kind: 'cash',
          kindLabel: 'Cash entry',
          title: `${d.reason} · ${d.ref}`,
          subtitle: `Drafted by ${d.by} · ${d.when}`,
          by: d.by,
          when: d.when,
          amount: d.amt,
          ref: d.ref,
          detail:
            'Review and approve this cash draft so it is marked checked in the Cash Book.',
          partyLabel: 'Cash entry',
          lastStep: 'Mark reviewed',
          canPost: true,
        });
      });

    const overdueItems = [
      { title: 'INV-2190 · Noor Textiles', due: '9 Nov', late: '5 days late', amt: 22500 },
      { title: 'Shop rent · November', due: '5 Nov', late: '9 days late', amt: 45000 },
    ];

    return {
      salesTotal,
      khataTotal,
      openKhataCount,
      drawerCash,
      openShift,
      lowStock,
      suppliersOwed,
      expensesOwed,
      refundsOwed,
      salariesOwed,
      hasDraftPayroll,
      totalOwed,
      approvals,
      overdueItems,
    };
  }, [state]);

  const selected = metrics.approvals.find((a) => a.id === selectedId) || null;

  const activityRows = useMemo(() => {
    const billsPart = state.bills.slice(0, 3).map((b) => {
      const cust = b.cust ? state.customers.find((c) => c.id === b.cust) : null;
      return {
        dot: '#08343A',
        text: `Bill ${b.no} · ${cust ? cust.name : 'Walk-in'} · ${formatRs(calcBillTotal(b, state.items))}`,
        who: 'Ali',
        when: b.time,
      };
    });
    return [
      ...billsPart,
      { dot: '#E58A4E', text: 'Counted 14 boxes from Noor Textiles', who: 'Faraz', when: 'Yesterday' },
      { dot: '#8A8276', text: 'Posted electricity bill · Rs 18,400', who: 'Owner', when: 'Yesterday' },
    ].slice(0, 5);
  }, [state.bills, state.customers, state.items]);

  const handleOpenApproval = (id: string) => {
    setSelectedId(id);
    setChecked(false);
    setPosting(false);
  };

  const handlePostSelected = () => {
    if (!selected || !checked || posting) return;
    setPosting(true);
    setTimeout(() => {
      const [prefix, rawId] = selected.id.split(':');
      if (prefix === 'exp') {
        postExpenseBill(rawId);
        notify(`Posted ${selected.title} · liability recorded, not paid`, 'ok');
      } else if (prefix === 'ven') {
        postVendorBill(rawId);
        notify(`Posted supplier bill ${rawId}`, 'ok');
      } else if (prefix === 'cash') {
        reviewCashDraft(rawId, 'reviewed', 'Reviewed by Owner');
        notify(`Marked cash draft ${rawId} reviewed`, 'ok');
      } else if (prefix === 'po') {
        approvePurchaseOrder(rawId);
        notify(`Approved PO-${rawId}`, 'ok');
      }
      setPosting(false);
      setSelectedId(null);
    }, 300);
  };

  const iconForKind = (kind: ApprovalItem['kind']) => {
    switch (kind) {
      case 'expense':
        return <Receipt className="w-[18px] h-[18px]" />;
      case 'vendor':
        return <FileText className="w-[18px] h-[18px]" />;
      case 'payroll':
        return <Users className="w-[18px] h-[18px]" />;
      case 'purchasing':
        return <Boxes className="w-[18px] h-[18px]" />;
      case 'cash':
        return <Banknote className="w-[18px] h-[18px]" />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={`Saturday, 14 November · ${activeBranch.name}`}
        title={`Today at ${session.shopName}`}
        actions={
          <Link href="/pos">
            <Button variant="secondary" size="lg">
              <ShoppingBag className="w-[18px] h-[18px]" />
              {t('openRegister')}
            </Button>
          </Link>
        }
      />

      <div role="note" className="flex items-start gap-2 text-[13px] leading-[1.5] text-[#3D5357]">
        <Info className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
        <span>
          This branch only. Totals are as recorded: not profit, and cash isn’t counted or bank-verified.
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Recorded sales today"
          money
          value={formatNumber(metrics.salesTotal)}
          sub={`${state.bills.length} bills · before returns`}
          chip="Not profit"
          chipTone="neutral"
          icon={<ShoppingBag className="w-[15px] h-[15px]" />}
        />
        <StatCard
          label="Customers owe you"
          money
          value={formatNumber(metrics.khataTotal)}
          sub={`Khata · ${metrics.openKhataCount} open bills`}
          chip="1 over 30 days"
          chipTone="warn"
          icon={<BookOpen className="w-[15px] h-[15px]" />}
        />
        <StatCard
          label="You owe"
          money
          value={formatNumber(metrics.totalOwed)}
          sub={
            metrics.salariesOwed > 0
              ? 'Suppliers, expenses, refunds, salaries'
              : 'Suppliers, expenses, refunds'
          }
          chip="2 overdue"
          chipTone="warn"
          icon={<FileText className="w-[15px] h-[15px]" />}
        />
        <StatCard
          label="Cash in the ledger"
          money
          value={formatNumber(metrics.drawerCash)}
          sub={
            metrics.openShift
              ? `1 shift open · ${metrics.openShift.cashier.split(' ')[0]}, Counter 1`
              : 'Shift closed'
          }
          chip="Not counted"
          chipTone="neutral"
          icon={<Banknote className="w-[15px] h-[15px]" />}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="w-full lg:flex-[1.35] min-w-0 flex flex-col gap-4">
          <section
            aria-labelledby="ap-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-2.5">
              <h2 id="ap-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
                Needs your decision
              </h2>
              <span
                className={`num h-[26px] px-[9px] rounded-full text-[13px] font-semibold inline-flex items-center ${
                  metrics.approvals.length > 0
                    ? 'bg-[#FCEFE4] text-[#8A3D12]'
                    : 'bg-[#E8F6EE] text-[#14532D]'
                }`}
              >
                {metrics.approvals.length > 0 ? `${metrics.approvals.length} waiting` : 'All clear'}
              </span>
            </div>

            {metrics.approvals.length > 0 ? (
              <div>
                {metrics.approvals.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleOpenApproval(a.id)}
                    aria-label={`Review ${a.title}`}
                    className="row w-full flex items-center gap-3 min-h-[68px] py-2.5 ps-[18px] pe-[14px] border-t border-[#F1EBE3] bg-white text-start"
                  >
                    <span className="hidden sm:flex w-[40px] h-[40px] rounded-full bg-[#F1EBE3] text-[#08343A] items-center justify-center shrink-0">
                      {iconForKind(a.kind)}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-[#0B2A2F] truncate">
                        {a.title}
                      </span>
                      <span className="num text-[13px] text-[#52666A] truncate">
                        {a.kindLabel} · drafted by {a.by}
                      </span>
                    </span>
                    {a.amount !== null && (
                      <span className="num text-[15px] font-bold text-[#0B2A2F] whitespace-nowrap">
                        <span className="rs">Rs</span>
                        {formatNumber(a.amount)}
                      </span>
                    )}
                    <ChevronRight className="w-[18px] h-[18px] text-[#52666A] shrink-0 rtl:rotate-180" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-[18px] py-7 pb-8 border-t border-[#F1EBE3] flex flex-col items-center gap-2 text-center">
                <span className="w-[64px] h-[64px] rounded-full bg-[#E8F6EE] text-[#14532D] flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </span>
                <span className="text-[17px] font-semibold text-[#0B2A2F]">Nothing waiting for you</span>
                <span className="text-[13px] text-[#52666A]">New drafts from staff appear here first.</span>
              </div>
            )}

            <div className="px-[18px] pt-2.5 pb-3.5 border-t border-[#F1EBE3] text-[13px] text-[#52666A]">
              Posting records a liability in the ledger. Nothing here pays money.
            </div>
          </section>

          <section
            aria-labelledby="act-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-3.5 pb-2"
          >
            <div className="flex items-center gap-2.5 mb-1">
              <h2 id="act-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
                Activity
              </h2>
              <Link
                href="/reports?tab=activity"
                className="h-[40px] px-1 inline-flex items-center text-[15px] font-semibold text-[#0E5E66] hover:text-[#08343A] hover:underline"
              >
                See all
              </Link>
            </div>
            <div>
              {activityRows.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 min-h-[44px] border-t border-[#F4EFE9]"
                >
                  <span
                    style={{ backgroundColor: ev.dot }}
                    className="w-2 h-2 rounded-full shrink-0"
                  />
                  <span className="flex-1 min-w-0 text-[15px] text-[#0B2A2F] truncate">
                    {ev.text}
                  </span>
                  <span className="num text-[13px] text-[#52666A] whitespace-nowrap">
                    {ev.who} · {ev.when}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-4">
          <section
            aria-labelledby="mo-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-3.5 pb-3"
          >
            <div className="flex items-baseline gap-2.5 mb-1.5">
              <h2 id="mo-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
                What you owe
              </h2>
              <span className="num text-[17px] font-bold text-[#0B2A2F]">
                <span className="rs">Rs</span>
                {formatNumber(metrics.totalOwed)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 min-h-[40px] border-t border-[#F4EFE9]">
              <span className="flex-1 text-[15px] text-[#0B2A2F]">Suppliers · posted bills</span>
              <span className="num text-[15px] font-bold text-[#0B2A2F]">
                <span className="rs">Rs</span>
                {formatNumber(metrics.suppliersOwed)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 min-h-[40px] border-t border-[#F4EFE9]">
              <span className="flex-1 text-[15px] text-[#0B2A2F]">Expenses · posted bills</span>
              <span className="num text-[15px] font-bold text-[#0B2A2F]">
                <span className="rs">Rs</span>
                {formatNumber(metrics.expensesOwed)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 min-h-[40px] border-t border-[#F4EFE9]">
              <span className="flex-1 text-[15px] text-[#0B2A2F]">Refunds to customers</span>
              <span className="num text-[15px] font-bold text-[#0B2A2F]">
                <span className="rs">Rs</span>
                {formatNumber(metrics.refundsOwed)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 min-h-[40px] border-t border-[#F4EFE9]">
              <span
                className={`flex-1 text-[15px] ${
                  metrics.salariesOwed > 0 ? 'text-[#0B2A2F]' : 'text-[#52666A]'
                }`}
              >
                Salaries
              </span>
              {metrics.hasDraftPayroll && metrics.salariesOwed === 0 && (
                <span className="h-[22px] px-2 rounded-full bg-[#F1EBE3] text-[#3D5357] text-[13px] font-semibold inline-flex items-center">
                  Payroll in draft
                </span>
              )}
              <span
                className={`num text-[15px] font-bold ${
                  metrics.salariesOwed > 0 ? 'text-[#0B2A2F]' : 'text-[#52666A]'
                }`}
              >
                <span className="rs">Rs</span>
                {formatNumber(metrics.salariesOwed)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 mb-1">
              <span className="h-[24px] px-[9px] rounded-full bg-[#FFF3C4] text-[#6B4E00] text-[13px] font-semibold inline-flex items-center gap-1.5">
                <AlertTriangle className="w-[13px] h-[13px]" />
                Overdue
              </span>
              <span className="text-[13px] text-[#52666A]">Included above</span>
            </div>

            {metrics.overdueItems.map((o, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 min-h-[52px] border-t border-[#F4EFE9]"
              >
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-[#0B2A2F] truncate">
                    {o.title}
                  </span>
                  <span className="num text-[13px] text-[#6B4E00]">
                    Due {o.due} · {o.late}
                  </span>
                </span>
                <span className="num text-[15px] font-bold text-[#0B2A2F]">
                  <span className="rs">Rs</span>
                  {formatNumber(o.amt)}
                </span>
              </div>
            ))}
          </section>

          <section
            aria-labelledby="own-sw-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-3.5 pb-2.5"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <h2 id="own-sw-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
                Stock watch
              </h2>
              <Link
                href="/inventory"
                className="text-[15px] font-semibold text-[#0E5E66] hover:text-[#08343A] hover:underline"
              >
                Open stock
              </Link>
            </div>
            <div>
              {metrics.lowStock.slice(0, 4).map((it) => {
                const qty = getTotalStock(it);
                return (
                  <div
                    key={it.id}
                    className="flex items-center gap-2.5 min-h-[44px] border-t border-[#F4EFE9]"
                  >
                    <span className="w-8 h-8 rounded-[9px] bg-[#FCEFE4] text-[#8A3D12] flex items-center justify-center shrink-0">
                      <Boxes className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0 text-[15px] text-[#0B2A2F] truncate">
                      {it.name} · {it.sku}
                    </span>
                    <span
                      className={`num h-[24px] px-[9px] rounded-full text-[13px] font-semibold inline-flex items-center ${
                        qty === 0
                          ? 'bg-[#FDF0EF] text-[#B42318]'
                          : 'bg-[#FFF3C4] text-[#6B4E00]'
                      }`}
                    >
                      {qty === 0 ? 'Sold out' : `${qty} left`}
                    </span>
                  </div>
                );
              })}
              {metrics.lowStock.length === 0 && (
                <div className="py-4 text-[13px] text-[#52666A] border-t border-[#F4EFE9]">
                  All tracked items are well stocked.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.title || 'Review item'}
        subtitle={selected ? `${selected.kindLabel} · draft` : undefined}
        footer={
          selected && (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2.5">
                <Button variant="secondary" size="counter" onClick={() => setSelectedId(null)}>
                  Not now
                </Button>
                {selected.canPost ? (
                  <Button
                    variant="dark"
                    size="counter"
                    fullWidth
                    disabled={!checked || posting}
                    loading={posting}
                    onClick={handlePostSelected}
                  >
                    {posting
                      ? 'Posting…'
                      : `Post to ledger${selected.amount !== null ? ` · Rs ${formatNumber(selected.amount)}` : ''}`}
                  </Button>
                ) : (
                  <Link href={selected.href || '/purchasing'} className="flex-1">
                    <Button variant="dark" size="counter" fullWidth>
                      {selected.lastStep}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
              {selected.canPost && (
                <p className="text-[12px] text-[#52666A] text-center">
                  {!checked
                    ? 'Tick that you checked the bill above'
                    : 'Creates a liability in the ledger. Pay it later from Suppliers or Expenses.'}
                </p>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <ol aria-label="Steps" className="flex items-center gap-2 text-[13px] font-semibold">
              <li className="flex items-center gap-1.5 text-[#14532D]">
                <span className="w-[22px] h-[22px] rounded-full bg-[#E8F6EE] flex items-center justify-center">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                Drafted
              </li>
              <li aria-hidden="true" className="flex-1 h-[2px] bg-[#E7E0D7]" />
              <li className="flex items-center gap-1.5 text-[#8A3D12]">
                <span className="num w-[22px] h-[22px] rounded-full bg-[#FCEFE4] shadow-[inset_0_0_0_2px_#C9682E] flex items-center justify-center">
                  2
                </span>
                Your review
              </li>
              <li aria-hidden="true" className="flex-1 h-[2px] bg-[#E7E0D7]" />
              <li className="flex items-center gap-1.5 text-[#52666A]">
                <span className="num w-[22px] h-[22px] rounded-full bg-[#F1EBE3] flex items-center justify-center">
                  3
                </span>
                {selected.lastStep}
              </li>
            </ol>

            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline text-[15px]">
              <span className="text-[#52666A]">{selected.partyLabel}</span>
              <span className="font-semibold text-[#0B2A2F]">{selected.subtitle}</span>
              <span className="text-[#52666A]">Drafted by</span>
              <span className="text-[#0B2A2F]">
                {selected.by === 'you' ? 'You' : selected.by} · {selected.when}
              </span>
              {selected.amount !== null && (
                <>
                  <span className="text-[#52666A]">Amount</span>
                  <span className="num font-display text-[26px] font-bold text-[#0B2A2F]">
                    <span className="rs">Rs</span>
                    {formatNumber(selected.amount)}
                  </span>
                </>
              )}
            </div>

            <div className="rounded-[14px] bg-[#EDF3FF] text-[#1E40AF] p-3 px-3.5 flex gap-2.5 text-[13px] leading-[1.5]">
              <Info className="w-[18px] h-[18px] shrink-0 mt-0.5" />
              <span>{selected.detail}</span>
            </div>

            {selected.canPost && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 rounded-[12px] bg-[#FBF8F4] px-3 py-2.5">
                  <span className="flex-1 text-[13px] text-[#52666A]">Bill reference</span>
                  <span className="mono text-[15px] font-semibold text-[#0B2A2F]">{selected.ref}</span>
                </div>

                <label className="flex items-start gap-3 min-h-[44px] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="w-[22px] h-[22px] mt-0.5 shrink-0 accent-[#08343A]"
                  />
                  <span className="text-[15px] font-semibold leading-[1.45] text-[#0B2A2F]">
                    I checked the amount against the paper bill
                  </span>
                </label>

                <div className="flex items-center gap-2 text-[13px] text-[#52666A]">
                  <span className="h-[20px] px-2 rounded-full bg-[#F1EBE3] text-[#3D5357] text-[12px] font-semibold inline-flex items-center">
                    Planned
                  </span>
                  Attaching a photo of the bill
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
