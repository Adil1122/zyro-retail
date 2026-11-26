'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Printer, RefreshCw, RotateCcw } from 'lucide-react';
import { Receipt } from '@/components/domain/Receipt';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import type { PosSaleRecord } from '@/types/footwear';
import { footwearPosService } from './services/footwear-pos.service';

export function BillBookView() {
  const { notify } = useZyro();
  const [sales, setSales] = useState<PosSaleRecord[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [branchMeta, setBranchMeta] = useState<{
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
  } | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [cashiers, setCashiers] = useState<Array<{ id: string; name: string }>>([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalSales: 0,
    totalCollected: 0,
    totalDue: 0,
    totalRefunded: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState('');
  const [paymentTab, setPaymentTab] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('current');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await footwearPosService.listSales({
        allBranches: branchFilter === 'all' ? true : undefined,
        branchId: branchFilter !== 'current' && branchFilter !== 'all' ? branchFilter : undefined,
        q: query.trim() || undefined,
        paymentStatus: paymentTab === 'all' ? undefined : paymentTab,
        method: methodFilter === 'all' ? undefined : methodFilter,
        cashierId: cashierFilter === 'all' ? undefined : cashierFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      });
      setSales(res.sales);
      setBusinessName(res.businessName);
      setBranchMeta(res.branch);
      setBranches(res.branches);
      setCashiers(res.cashiers);
      setSummary(res.summary);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to load sales history', 'err');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, query, paymentTab, methodFilter, cashierFilter, dateFrom, dateTo, notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSales();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadSales]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saleParam = params.get('saleId');
    if (saleParam) setSelectedSaleId(saleParam);
  }, []);

  const selected = useMemo(
    () => sales.find((s) => s.id === selectedSaleId) || null,
    [sales, selectedSaleId]
  );

  const handleReprint = async (sale: PosSaleRecord) => {
    try {
      await footwearPosService.recordPrintJob({
        branchId: sale.branchId,
        saleId: sale.id,
        jobType: 'reprint',
        status: 'printed',
      });
    } catch {
      // Proceed to browser print even if print_jobs insert fails
    }
    window.print();
    notify(`Prepared 80 mm copy for Bill #${sale.billNumber}`, 'ok');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${branchMeta?.name || 'Counter'} · Sales history`}
        title="Bill book"
        subtitle="Inspect completed footwear bills, filter by date, cashier, payment method or branch, and reprint 80 mm receipts."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/pos/returns">
              <Button variant="secondary">
                <RotateCcw className="w-4 h-4" /> Returns
              </Button>
            </Link>
            <Link href="/pos/exchange">
              <Button variant="secondary">
                <RefreshCw className="w-4 h-4" /> Exchanges
              </Button>
            </Link>
            <Link href="/pos">
              <Button variant="primary">Open register</Button>
            </Link>
          </div>
        }
      />

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <div className="text-[12px] text-[#52666A] font-medium">Bills shown</div>
          <div className="font-display text-[22px] font-bold text-[#0B2A2F] num mt-0.5">
            {summary.count}
          </div>
        </Card>
        <Card className="p-3.5">
          <div className="text-[12px] text-[#52666A] font-medium">Gross sales</div>
          <div className="font-display text-[22px] font-bold text-[#08343A] num mt-0.5">
            {formatRs(summary.totalSales)}
          </div>
        </Card>
        <Card className="p-3.5">
          <div className="text-[12px] text-[#52666A] font-medium">Collected</div>
          <div className="font-display text-[22px] font-bold text-[#14532D] num mt-0.5">
            {formatRs(summary.totalCollected)}
          </div>
        </Card>
        <Card className="p-3.5">
          <div className="text-[12px] text-[#52666A] font-medium">Balance due (Khata)</div>
          <div className="font-display text-[22px] font-bold text-[#8A3D12] num mt-0.5">
            {formatRs(summary.totalDue)}
          </div>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          activeId={paymentTab}
          onChange={(id) => setPaymentTab(id as typeof paymentTab)}
          tabs={[
            { id: 'all', label: 'All bills', count: summary.count },
            { id: 'paid', label: 'Paid' },
            { id: 'partial', label: 'Partial', badgeTone: 'warn' },
            { id: 'unpaid', label: 'Unpaid / Khata', badgeTone: 'warn' },
          ]}
        />
        <div className="w-full sm:w-[300px]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Bill #, receipt #, customer, SKU..."
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="Date from"
          className="h-9 px-2.5 rounded-[9px] border border-[#D6CDC1] bg-white text-[13px] text-[#0B2A2F]"
        />
        <span className="text-[12px] text-[#52666A]">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="Date to"
          className="h-9 px-2.5 rounded-[9px] border border-[#D6CDC1] bg-white text-[13px] text-[#0B2A2F]"
        />
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          aria-label="Payment method"
          className="h-9 px-2.5 rounded-[9px] border border-[#D6CDC1] bg-white text-[13px] text-[#0B2A2F]"
        >
          <option value="all">All payment methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank">Bank transfer</option>
          <option value="jazz">JazzCash</option>
          <option value="easy">Easypaisa</option>
          <option value="raast">Raast QR</option>
          <option value="khata">Khata credit</option>
          <option value="split">Split payments</option>
        </select>

        {branches.length > 1 && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Branch"
            className="h-9 px-2.5 rounded-[9px] border border-[#D6CDC1] bg-white text-[13px] text-[#0B2A2F]"
          >
            <option value="current">Current branch</option>
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {cashiers.length > 0 && (
          <select
            value={cashierFilter}
            onChange={(e) => setCashierFilter(e.target.value)}
            aria-label="Cashier"
            className="h-9 px-2.5 rounded-[9px] border border-[#D6CDC1] bg-white text-[13px] text-[#0B2A2F]"
          >
            <option value="all">All cashiers</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {(dateFrom || dateTo || methodFilter !== 'all' || cashierFilter !== 'all' || query) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setMethodFilter('all');
              setCashierFilter('all');
              setQuery('');
              setPaymentTab('all');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-[14px] text-[#52666A] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading bills from Supabase...
        </Card>
      ) : (
        <DataTable<PosSaleRecord>
          rows={sales}
          rowKey={(s) => s.id}
          onRowClick={(s) => setSelectedSaleId(s.id)}
          emptyState={
            <Card className="p-10 text-center space-y-1">
              <div className="font-semibold text-[15px] text-[#0B2A2F]">No sales found</div>
              <div className="text-[13px] text-[#52666A]">
                Complete a footwear sale on the POS register or broaden your filters.
              </div>
            </Card>
          }
          columns={[
            {
              key: 'no',
              header: 'Bill',
              render: (s) => (
                <div>
                  <div className="mono font-bold">#{s.billNumber}</div>
                  {branches.length > 1 && (
                    <div className="text-[11px] text-[#52666A]">{s.branchName}</div>
                  )}
                </div>
              ),
            },
            {
              key: 'time',
              header: 'Date & time',
              render: (s) => (
                <span className="text-[#52666A] text-[13px]">
                  {new Date(s.soldAt).toLocaleString('en-PK', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              ),
            },
            {
              key: 'cust',
              header: 'Customer',
              render: (s) => (
                <div>
                  <div className="font-medium text-[#0B2A2F]">{s.customerName || 'Walk-in'}</div>
                  <div className="text-[11px] text-[#52666A]">{s.cashierName}</div>
                </div>
              ),
            },
            {
              key: 'items',
              header: 'Pairs',
              render: (s) => (
                <span className="num">
                  {s.items.reduce((sum, it) => sum + it.quantity, 0)}
                </span>
              ),
            },
            {
              key: 'pay',
              header: 'Method',
              render: (s) => {
                const label =
                  s.payments.length > 1
                    ? 'SPLIT'
                    : s.payments[0]?.methodCode?.toUpperCase() || (s.dueAmount > 0 ? 'KHATA' : 'CASH');
                return <Badge tone="neutral">{label}</Badge>;
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (s) => (
                <div className="flex flex-wrap gap-1">
                  {s.paymentStatus === 'paid' ? (
                    <Badge tone="ok">Paid</Badge>
                  ) : s.paymentStatus === 'partial' ? (
                    <Badge tone="warn">Partial · Due {formatRs(s.dueAmount)}</Badge>
                  ) : (
                    <Badge tone="warn">Khata · Due {formatRs(s.dueAmount)}</Badge>
                  )}
                  {s.refundedAmount > 0 && (
                    <Badge tone="err">Returned {formatRs(s.refundedAmount)}</Badge>
                  )}
                </div>
              ),
            },
            {
              key: 'total',
              header: 'Total',
              align: 'end',
              render: (s) => <span className="font-bold num">{formatRs(s.totalAmount)}</span>,
            },
          ]}
        />
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelectedSaleId(null)}
        title={selected ? `Bill #${selected.billNumber}` : ''}
        subtitle={
          selected
            ? `${new Date(selected.soldAt).toLocaleString('en-PK')} · ${selected.branchName} · ${selected.cashierName}`
            : ''
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="dark" size="sm" onClick={() => void handleReprint(selected)}>
                <Printer className="w-4 h-4" /> Reprint 80 mm receipt
              </Button>
              <Link href={`/pos/returns?saleId=${encodeURIComponent(selected.id)}`}>
                <Button variant="secondary" size="sm">
                  <RotateCcw className="w-4 h-4" /> Start return
                </Button>
              </Link>
              <Link href={`/pos/exchange?saleId=${encodeURIComponent(selected.id)}`}>
                <Button variant="secondary" size="sm">
                  <RefreshCw className="w-4 h-4" /> Exchange footwear
                </Button>
              </Link>
            </div>

            <Receipt
              sale={selected}
              shopName={businessName}
              branchName={selected.branchName}
              branchAddress={branchMeta?.address}
              branchPhone={branchMeta?.phone}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
