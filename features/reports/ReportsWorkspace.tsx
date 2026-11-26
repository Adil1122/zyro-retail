'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookCheck,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { calcCashDrawerSummary, calcPaymentMix } from '@/lib/cash';
import { formatRs } from '@/lib/format';
import { calcBillTotal, getTotalStock } from '@/lib/inventory';

interface AuditIssue {
  id: string;
  severity: 'warn' | 'err';
  title: string;
  detail: string;
  href: string;
  actionLabel: string;
}

export function ReportsWorkspace() {
  const { state, notify } = useZyro();
  const [tab, setTab] = useState<'overview' | 'tb' | 'journals' | 'activity' | 'checks'>('overview');
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);

  const grossSales = useMemo(
    () => state.bills.reduce((s, b) => s + calcBillTotal(b, state.items), 0),
    [state.bills, state.items]
  );

  const totalRefunds = useMemo(
    () => state.bills.reduce((s, b) => s + (b.returned || 0), 0),
    [state.bills]
  );

  const netSales = Math.max(0, grossSales - totalRefunds);

  const cogsEstimate = useMemo(() => {
    return state.bills.reduce((sum, b) => {
      return (
        sum +
        b.lines.reduce((ls, [itemId, , , qty]) => {
          const it = state.items.find((x) => x.id === itemId);
          const cost = it ? (it.costPrice ?? Math.round(it.price * 0.6)) : 0;
          return ls + cost * qty;
        }, 0)
      );
    }, 0);
  }, [state.bills, state.items]);

  const totalExpenses = useMemo(
    () => state.expenseBills.reduce((s, e) => s + e.amt, 0),
    [state.expenseBills]
  );

  const inventoryValue = useMemo(
    () =>
      state.items.reduce(
        (s, it) => s + getTotalStock(it) * (it.costPrice ?? Math.round(it.price * 0.6)),
        0
      ),
    [state.items]
  );

  const khataTotal = useMemo(
    () => state.customers.reduce((s, c) => s + c.khata, 0),
    [state.customers]
  );

  const cashDrawerTotal = useMemo(() => {
    const open = state.shifts.find((s) => s.status === 'open');
    return calcCashDrawerSummary(
      state.bills,
      state.items,
      state.cashDrafts,
      open?.float || 10000
    ).expectedCash;
  }, [state.shifts, state.bills, state.items, state.cashDrafts]);

  const supplierPayable = useMemo(
    () =>
      state.vendorBills.reduce(
        (s, b) =>
          s +
          Math.max(
            0,
            b.total -
              b.pays.reduce((ps, p) => ps + p.amt, 0) -
              b.credits.reduce((cs, c) => cs + c.amt, 0)
          ),
        0
      ),
    [state.vendorBills]
  );

  const paymentMix = useMemo(
    () => calcPaymentMix(state.bills, state.items),
    [state.bills, state.items]
  );

  const trialRows = useMemo(() => {
    const rows = [
      { code: '1010', account: 'Cash in Counter Drawer', debit: cashDrawerTotal, credit: 0 },
      { code: '1120', account: 'Customer Khata Receivable', debit: khataTotal, credit: 0 },
      { code: '1200', account: 'Shop Stock on Shelf (at Cost)', debit: inventoryValue, credit: 0 },
      { code: '2010', account: 'Supplier Accounts Payable', debit: 0, credit: supplierPayable },
      { code: '4010', account: 'Retail Counter Sales (Net)', debit: 0, credit: netSales },
      { code: '5010', account: 'Cost of Goods Sold', debit: cogsEstimate, credit: 0 },
      { code: '6010', account: 'Rent & Shop Operating Bills', debit: totalExpenses, credit: 0 },
    ];
    const totalDr = rows.reduce((s, r) => s + r.debit, 0);
    const totalCr = rows.reduce((s, r) => s + r.credit, 0);
    const diff = totalDr - totalCr;
    rows.push({
      code: '3000',
      account: 'Owner Capital & Retained Earnings',
      debit: diff < 0 ? Math.abs(diff) : 0,
      credit: diff >= 0 ? diff : 0,
    });
    return rows;
  }, [cashDrawerTotal, khataTotal, inventoryValue, supplierPayable, netSales, cogsEstimate, totalExpenses]);

  const issues = useMemo<AuditIssue[]>(() => {
    const out: AuditIssue[] = [];
    const printFails = state.bills.filter((b) => b.print === 'failed' || b.print === 'unknown');
    if (printFails.length > 0) {
      out.push({
        id: 'iss-print',
        severity: 'warn',
        title: `${printFails.length} bills with unconfirmed or failed thermal receipt`,
        detail: `Bills ${printFails.map((b) => `#${b.no}`).join(', ')} did not report a clean print completion.`,
        href: '/pos/printer',
        actionLabel: 'Open print queue',
      });
    }
    const draftCash = state.cashDrafts.filter((c) => c.status === 'draft');
    if (draftCash.length > 0) {
      out.push({
        id: 'iss-cash',
        severity: 'warn',
        title: `${draftCash.length} cash movement entry awaiting owner sign-off`,
        detail: `Review draft entries so the counter drawer ledger matches cash taken home or paid out.`,
        href: '/cash',
        actionLabel: 'Review cash entries',
      });
    }
    const refunds = state.customers.filter((c) => (c.refundOwed || 0) > 0);
    if (refunds.length > 0) {
      out.push({
        id: 'iss-ref',
        severity: 'err',
        title: `${refunds.length} customer refund waiting to be paid`,
        detail: `${refunds.map((c) => c.name).join(', ')} still has an unsettled return credit.`,
        href: '/khata',
        actionLabel: 'Settle in Khata',
      });
    }
    return out;
  }, [state.bills, state.cashDrafts, state.customers]);

  const grossProfit = netSales - cogsEstimate;
  const netProfit = grossProfit - totalExpenses;

  const exportCsvPack = () => {
    const lines = [
      ['Code', 'Account', 'Debit (PKR)', 'Credit (PKR)'].join(','),
      ...trialRows.map((r) => [r.code, `"${r.account}"`, r.debit, r.credit].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zyro-accountant-pack-2026-11.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Downloaded CSV accountant pack', 'ok');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner books & audit"
        title="Reports & accounts"
        subtitle="Sales profit & loss, double-entry trial balance, staff journals, and books health check."
        actions={
          <Button variant="secondary" onClick={exportCsvPack}>
            Export accountant pack
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net sales" value={formatRs(netSales)} sub={`${state.bills.length} completed bills`} icon={<BarChart3 className="w-4 h-4" />} />
        <StatCard label="Estimated gross profit" value={formatRs(grossProfit)} sub={`Cost of goods ${formatRs(cogsEstimate)}`} tone="ok" />
        <StatCard label="Recorded shop expenses" value={formatRs(totalExpenses)} sub="Rent, utilities, supplies" />
        <StatCard label="Net shop surplus" value={formatRs(netProfit)} tone={netProfit >= 0 ? 'ok' : 'err'} sub="Before owner drawings" icon={<Scale className="w-4 h-4" />} />
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'overview', label: 'Sales & P&L' },
          { id: 'tb', label: 'Trial balance' },
          { id: 'journals', label: 'Journals' },
          { id: 'activity', label: 'Activity log' },
          {
            id: 'checks',
            label: 'Books check',
            count: issues.length,
            badgeTone: issues.length > 0 ? 'warn' : 'ok',
          },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <h3 className="font-display font-bold text-[16px] text-[#0B2A2F]">
              Profit &amp; Loss summary
            </h3>
            <div className="divide-y divide-[#F1EBE3] text-[14px]">
              <div className="py-2.5 flex justify-between">
                <span className="text-[#52666A]">Retail counter sales</span>
                <span className="font-bold num">{formatRs(grossSales)}</span>
              </div>
              {totalRefunds > 0 && (
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#52666A]">Less: Refunds</span>
                  <span className="font-semibold num text-[#B42318]">−{formatRs(totalRefunds)}</span>
                </div>
              )}
              <div className="py-2.5 flex justify-between">
                <span className="text-[#52666A]">Less: Cost of items sold</span>
                <span className="font-semibold num text-[#B42318]">−{formatRs(cogsEstimate)}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="font-semibold">Gross margin</span>
                <span className="font-bold num text-[#14532D]">{formatRs(grossProfit)}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#52666A]">Less: Operating bills &amp; rent</span>
                <span className="font-semibold num text-[#B42318]">−{formatRs(totalExpenses)}</span>
              </div>
              <div className="py-3 flex justify-between text-[16px]">
                <span className="font-bold text-[#0B2A2F]">Net profit</span>
                <span className="font-display font-bold num text-[#08343A]">{formatRs(netProfit)}</span>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-display font-bold text-[16px] text-[#0B2A2F]">
              Payment mix today
            </h3>
            <div className="space-y-2.5">
              {(
                [
                  ['cash', 'Cash'],
                  ['jazz', 'JazzCash'],
                  ['easy', 'Easypaisa'],
                  ['raast', 'Raast QR'],
                  ['card', 'Card'],
                  ['bank', 'Bank transfer'],
                  ['khata', 'Khata'],
                ] as const
              ).map(([m, label]) => {
                const sum = paymentMix[m] || 0;
                const pct = grossSales > 0 ? Math.round((sum / grossSales) * 100) : 0;
                return (
                  <div key={m} className="space-y-1">
                    <div className="flex justify-between text-[13px]">
                      <span className="font-semibold text-[#0B2A2F]">{label}</span>
                      <span className="num text-[#52666A]">
                        {formatRs(sum)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F1EBE3] overflow-hidden">
                      <div className="h-full bg-[#08343A] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'tb' && (
        <DataTable
          rows={trialRows}
          rowKey={(r) => r.code}
          columns={[
            { key: 'code', header: 'Code', render: (r) => <span className="mono">{r.code}</span> },
            { key: 'account', header: 'Account', render: (r) => <span className="font-medium">{r.account}</span> },
            {
              key: 'debit',
              header: 'Debit',
              align: 'end',
              render: (r) => <span className="num font-semibold">{r.debit > 0 ? formatRs(r.debit) : '—'}</span>,
            },
            {
              key: 'credit',
              header: 'Credit',
              align: 'end',
              render: (r) => <span className="num font-semibold">{r.credit > 0 ? formatRs(r.credit) : '—'}</span>,
            },
          ]}
        />
      )}

      {tab === 'journals' && (
        <div className="space-y-2.5">
          {state.bills.slice(0, 6).map((b) => {
            const total = calcBillTotal(b, state.items);
            return (
              <Card key={b.no} padding="sm" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-[14px] text-[#0B2A2F]">
                    JV-BILL-{b.no} · Counter sale ({b.time})
                  </div>
                  <div className="text-[12px] text-[#52666A]">
                    Dr {b.pay === 'khata' ? 'Khata Receivable' : 'Counter Cash'} · Cr Retail Sales
                  </div>
                </div>
                <span className="font-bold num text-[#08343A]">{formatRs(total)}</span>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-2.5">
          {[
            ...state.bills.slice(0, 4).map((b) => ({
              id: `bill-${b.no}`,
              icon: <Activity className="w-4 h-4" />,
              text: `Bill #${b.no} completed (${b.pay.toUpperCase()} · ${formatRs(calcBillTotal(b, state.items))})`,
              by: b.cashierId || state.session.user.shortName,
              when: b.time,
            })),
            ...state.stockAdjustments.map((adj) => ({
              id: adj.id,
              icon: <Activity className="w-4 h-4" />,
              text: `Stock adjustment on ${adj.itemId} (${adj.delta > 0 ? `+${adj.delta}` : adj.delta}) · ${adj.reason}`,
              by: adj.by,
              when: adj.at,
            })),
            ...state.shifts.slice(0, 2).map((sh) => ({
              id: `sh-${sh.id}`,
              icon: <Activity className="w-4 h-4" />,
              text: `Shift ${sh.id} ${sh.status === 'open' ? 'opened' : 'closed'} (${sh.cashier})`,
              by: sh.by,
              when: sh.opened,
            })),
          ].map((ev) => (
            <Card key={ev.id} padding="sm" className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[#08343A]">{ev.icon}</span>
                <div>
                  <div className="text-[14px] font-medium text-[#0B2A2F]">{ev.text}</div>
                  <div className="text-[12px] text-[#52666A]">By {ev.by} · {ev.when}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'checks' && (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <Card className="p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-[#1E7A48]" />
              <div className="font-display font-bold text-[17px] text-[#0B2A2F]">
                Books check passed cleanly
              </div>
              <p className="text-[13px] text-[#52666A]">
                All cash entries, thermal receipts, and customer refunds are reconciled.
              </p>
            </Card>
          ) : (
            issues.map((iss) => (
              <Card
                key={iss.id}
                onClick={() => setSelectedIssue(iss)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      iss.severity === 'err' ? 'text-[#B42318]' : 'text-[#C99A06]'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-[14px] text-[#0B2A2F]">{iss.title}</div>
                    <div className="text-[13px] text-[#52666A]">{iss.detail}</div>
                  </div>
                </div>
                <Badge tone={iss.severity}>Inspect</Badge>
              </Card>
            ))
          )}
        </div>
      )}

      <Drawer
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title={selectedIssue?.title || ''}
        subtitle="Books integrity check"
        footer={
          selectedIssue && (
            <Link href={selectedIssue.href}>
              <Button variant="primary">
                <BookCheck className="w-4 h-4" /> {selectedIssue.actionLabel}
              </Button>
            </Link>
          )
        }
      >
        {selectedIssue && (
          <p className="text-[14px] text-[#3D5357] leading-relaxed">{selectedIssue.detail}</p>
        )}
      </Drawer>
    </div>
  );
}
