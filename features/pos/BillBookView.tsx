'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Printer, RotateCcw } from 'lucide-react';
import { Receipt } from '@/components/domain/Receipt';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcBillItemCount, calcBillTotal } from '@/lib/inventory';
import type { BillRecord } from '@/types';

export function BillBookView() {
  const { state, role, reprintBill, refundBill, notify } = useZyro();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'cash' | 'khata' | 'issues'>('all');
  const [selectedBillNo, setSelectedBillNo] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('bill');
    if (b) {
      const n = parseInt(b, 10);
      if (!Number.isNaN(n)) setSelectedBillNo(n);
    }
  }, []);

  const filtered = useMemo(() => {
    return state.bills.filter((b) => {
      if (filter === 'cash' && b.pay !== 'cash') return false;
      if (filter === 'khata' && b.pay !== 'khata') return false;
      if (filter === 'issues' && b.print === 'printed' && b.refundOwed === 0) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const cust = b.cust ? state.customers.find((c) => c.id === b.cust) : null;
      return (
        String(b.no).includes(q) ||
        (cust && cust.name.toLowerCase().includes(q)) ||
        b.pay.toLowerCase().includes(q)
      );
    });
  }, [state.bills, state.customers, filter, query]);

  const selected = useMemo(
    () => state.bills.find((b) => b.no === selectedBillNo) || null,
    [state.bills, selectedBillNo]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Counter 1 · Sales history"
        title="Bill book"
        subtitle="Inspect completed bills, reprint 80 mm receipts, and pay customer refunds."
        actions={
          <Link href="/pos/printer">
            <Button variant="secondary">
              <Printer className="w-4 h-4" /> Print queue
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          activeId={filter}
          onChange={(id) => setFilter(id as typeof filter)}
          tabs={[
            { id: 'all', label: 'All bills', count: state.bills.length },
            { id: 'cash', label: 'Cash' },
            { id: 'khata', label: 'Khata' },
            {
              id: 'issues',
              label: 'Needs attention',
              count: state.bills.filter((b) => b.print !== 'printed' || b.refundOwed > 0).length,
              badgeTone: 'warn',
            },
          ]}
        />
        <div className="w-full sm:w-[280px]">
          <SearchInput value={query} onChange={setQuery} placeholder="Bill # or customer..." />
        </div>
      </div>

      <DataTable<BillRecord>
        rows={filtered}
        rowKey={(b) => String(b.no)}
        onRowClick={(b) => setSelectedBillNo(b.no)}
        columns={[
          {
            key: 'no',
            header: 'Bill',
            render: (b) => <span className="mono font-bold">#{b.no}</span>,
          },
          {
            key: 'time',
            header: 'Time',
            render: (b) => <span className="text-[#52666A]">{b.time}</span>,
          },
          {
            key: 'cust',
            header: 'Customer',
            render: (b) => {
              const cust = b.cust ? state.customers.find((c) => c.id === b.cust) : null;
              return <span>{cust ? cust.name : 'Walk-in'}</span>;
            },
          },
          {
            key: 'items',
            header: 'Items',
            render: (b) => <span className="num">{calcBillItemCount(b)}</span>,
          },
          {
            key: 'pay',
            header: 'Method',
            render: (b) => <Badge tone="neutral">{b.pay.toUpperCase()}</Badge>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (b) => (
              <div className="flex flex-wrap gap-1">
                {b.print === 'printed' ? (
                  <Badge tone="ok">Printed</Badge>
                ) : (
                  <Badge tone="err">
                    <AlertTriangle className="w-3 h-3" /> {b.print}
                  </Badge>
                )}
                {b.refundOwed > 0 && <Badge tone="warn">Refund owed {formatRs(b.refundOwed)}</Badge>}
              </div>
            ),
          },
          {
            key: 'total',
            header: 'Total',
            align: 'end',
            render: (b) => <span className="font-bold num">{formatRs(calcBillTotal(b, state.items))}</span>,
          },
        ]}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelectedBillNo(null)}
        title={selected ? `Bill #${selected.no}` : ''}
        subtitle={selected ? `${selected.time} · Paid via ${selected.pay.toUpperCase()}` : ''}
      >
        {selected && (
          <div className="space-y-5">
            {selected.refundOwed > 0 && (
              <div className="p-4 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] space-y-2.5">
                <div className="font-semibold text-[14px] text-[#6B4E00]">
                  Customer refund owed: {formatRs(selected.refundOwed)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      refundBill(selected.no, selected.refundOwed, 'cash');
                      notify(`Paid ${formatRs(selected.refundOwed)} cash refund`, 'ok');
                    }}
                  >
                    Pay cash refund
                  </Button>
                  {role === 'owner' && selected.cust && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        refundBill(selected.no, selected.refundOwed, 'khata');
                        notify(`Credited ${formatRs(selected.refundOwed)} to Khata`, 'ok');
                      }}
                    >
                      Credit to Khata
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="dark"
                size="sm"
                onClick={() => {
                  reprintBill(selected.no);
                  notify(`Reprinted Bill #${selected.no}`, 'ok');
                }}
              >
                <Printer className="w-4 h-4" /> Reprint 80 mm receipt
              </Button>
              <Link href="/pos/returns">
                <Button variant="secondary" size="sm">
                  <RotateCcw className="w-4 h-4" /> Start return
                </Button>
              </Link>
            </div>

            <Receipt bill={selected} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
