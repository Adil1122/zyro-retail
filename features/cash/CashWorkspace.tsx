'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpen,
  CheckCircle2,
  Lock,
  Plus,
  Unlock,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { CASH_CATS } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { calcCashDrawerSummary } from '@/lib/cash';
import { formatRs, formatShortDate } from '@/lib/format';
import { calcBillTotal } from '@/lib/inventory';
import type { CashCategoryId, CashDraftEntry, ShiftRecord } from '@/types';

export function CashWorkspace() {
  const { state, role, addCashDraft, reviewCashDraft, notify } = useZyro();
  const [tab, setTab] = useState<'shifts' | 'book' | 'entries'>('shifts');
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // New cash entry modal
  const [entryOpen, setEntryOpen] = useState(false);
  const [cat, setCat] = useState<CashCategoryId>('owner_cash_out');
  const [amt, setAmt] = useState('');
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');

  // Review note modal
  const [reviewTarget, setReviewTarget] = useState<{
    entry: CashDraftEntry;
    mode: 'reviewed' | 'cancelled';
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const openShift = state.shifts.find((s) => s.status === 'open') || null;
  const drawerSummary = useMemo(
    () =>
      calcCashDrawerSummary(
        state.bills,
        state.items,
        state.cashDrafts,
        openShift?.float || 0
      ),
    [state.bills, state.items, state.cashDrafts, openShift]
  );
  const draftCount = state.cashDrafts.filter((c) => c.status === 'draft').length;

  const cashBookRows = useMemo(() => {
    const rows: Array<{
      id: string;
      when: string;
      title: string;
      dir: 'in' | 'out';
      amt: number;
      ref: string;
    }> = [];
    state.bills
      .filter((b) => b.pay === 'cash')
      .slice(0, 8)
      .forEach((b) => {
        rows.push({
          id: `bill-${b.no}`,
          when: b.time,
          title: `Counter sale Bill #${b.no}`,
          dir: 'in',
          amt: calcBillTotal(b, state.items),
          ref: `BILL-${b.no}`,
        });
      });
    state.cashDrafts
      .filter((c) => c.status !== 'cancelled')
      .forEach((c) => {
        rows.push({
          id: c.id,
          when: c.when,
          title: `${CASH_CATS[c.cat].label} · ${c.reason}`,
          dir: CASH_CATS[c.cat].dir,
          amt: c.amt,
          ref: c.ref,
        });
      });
    return rows;
  }, [state.bills, state.cashDrafts, state.items]);

  const handleSaveEntry = () => {
    const numAmt = parseInt(amt, 10) || 0;
    if (numAmt <= 0 || !reason.trim()) {
      notify('Enter an amount and clear reason', 'err');
      return;
    }
    const entry: CashDraftEntry = {
      id: `CD-${state.cashDrafts.length + 1}`,
      cat,
      amt: numAmt,
      ref: ref.trim() || `CSH-${Date.now().toString().slice(-4)}`,
      src: '',
      reason: reason.trim(),
      by: state.session.user.shortName,
      when: 'Just now',
      status: 'draft',
      v: 0,
    };
    addCashDraft(entry);
    notify('Added draft cash entry for review', 'ok');
    setEntryOpen(false);
    setAmt('');
    setRef('');
    setReason('');
    setTab('entries');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Counter drawer & cash book"
        title="Cash & shifts"
        subtitle="Track opening floats, shift handovers, and manual cash movements in or out."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEntryOpen(true)}>
              <Plus className="w-4 h-4" /> New cash entry
            </Button>
            {openShift ? (
              <Link href="/cash/close-shift">
                <Button variant="primary">
                  <Lock className="w-4 h-4" /> Close active shift
                </Button>
              </Link>
            ) : (
              <Link href="/cash/open-shift">
                <Button variant="primary">
                  <Unlock className="w-4 h-4" /> Open shift
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active counter drawer"
          value={openShift ? formatRs(drawerSummary.expectedCash) : 'Closed'}
          sub={openShift ? `${openShift.reg} · Cashier ${openShift.cashier}` : 'Open a shift to start taking cash'}
          tone={openShift ? 'ok' : 'warn'}
          icon={<Banknote className="w-4 h-4" />}
        />
        <StatCard
          label="Cash sales & movements"
          value={formatRs(drawerSummary.cashSales)}
          sub={`Float ${openShift ? formatRs(openShift.float) : 'Rs 0'} · Net cash moves ${formatRs(drawerSummary.cashMovementsIn - drawerSummary.cashMovementsOut - drawerSummary.cashRefunds)}`}
          icon={<BookOpen className="w-4 h-4" />}
        />
        <StatCard
          label="Entries awaiting review"
          value={draftCount}
          tone={draftCount > 0 ? 'warn' : 'ok'}
          sub="Owner check keeps books tidy"
          onClick={() => setTab('entries')}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'shifts', label: 'Shifts & drawers', count: state.shifts.length },
          { id: 'book', label: 'Cash book', count: cashBookRows.length },
          {
            id: 'entries',
            label: 'Cash entries',
            count: draftCount,
            badgeTone: draftCount > 0 ? 'warn' : 'neutral',
          },
        ]}
      />

      {tab === 'shifts' && (
        <DataTable<ShiftRecord>
          rows={state.shifts}
          rowKey={(s) => s.id}
          onRowClick={(s) => setSelectedShift(s)}
          columns={[
            {
              key: 'id',
              header: 'Shift',
              render: (s) => (
                <div>
                  <div className="mono font-bold">{s.id}</div>
                  <div className="text-[11px] text-[#52666A]">{s.reg}</div>
                </div>
              ),
            },
            {
              key: 'date',
              header: 'Date & time',
              render: (s) => (
                <div>
                  <div className="font-medium">{formatShortDate(s.d)}</div>
                  <div className="text-[11px] text-[#52666A]">
                    {s.opened}
                    {s.closed ? ` → ${s.closed}` : ' · Active'}
                  </div>
                </div>
              ),
            },
            {
              key: 'cashier',
              header: 'Cashier',
              render: (s) => <span>{s.cashier}</span>,
            },
            {
              key: 'float',
              header: 'Opening float',
              align: 'end',
              render: (s) => <span className="num">{formatRs(s.float)}</span>,
            },
            {
              key: 'variance',
              header: 'Counted / Diff',
              align: 'end',
              render: (s) => {
                if (s.status === 'open') return <Badge tone="ok">Open now</Badge>;
                const diff = (s.counted || 0) - (s.expected || 0);
                return (
                  <div className="text-end">
                    <div className="font-bold num">{formatRs(s.counted || 0)}</div>
                    <div
                      className={`text-[11px] font-semibold num ${
                        diff === 0 ? 'text-[#14532D]' : diff < 0 ? 'text-[#B42318]' : 'text-[#6B4E00]'
                      }`}
                    >
                      {diff === 0 ? 'Balanced' : diff > 0 ? `+${formatRs(diff)} over` : `${formatRs(diff)} short`}
                    </div>
                  </div>
                );
              },
            },
          ]}
        />
      )}

      {tab === 'book' && (
        <DataTable
          rows={cashBookRows}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'when',
              header: 'Time',
              render: (r) => <span className="text-[#52666A]">{r.when}</span>,
            },
            {
              key: 'title',
              header: 'Particulars',
              render: (r) => (
                <div className="flex items-center gap-2">
                  {r.dir === 'in' ? (
                    <ArrowDownLeft className="w-4 h-4 text-[#1E7A48] shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-[#B42318] shrink-0" />
                  )}
                  <span className="font-medium text-[#0B2A2F]">{r.title}</span>
                </div>
              ),
            },
            {
              key: 'ref',
              header: 'Ref',
              render: (r) => <span className="mono text-[12px] text-[#52666A]">{r.ref}</span>,
            },
            {
              key: 'amt',
              header: 'Amount',
              align: 'end',
              render: (r) => (
                <span className={`font-bold num ${r.dir === 'in' ? 'text-[#14532D]' : 'text-[#B42318]'}`}>
                  {r.dir === 'in' ? '+' : '−'}
                  {formatRs(r.amt)}
                </span>
              ),
            },
          ]}
        />
      )}

      {tab === 'entries' && (
        <div className="space-y-3">
          {state.cashDrafts.map((c) => {
            const catInfo = CASH_CATS[c.cat];
            return (
              <Card key={c.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono font-bold text-[14px] text-[#0B2A2F]">{c.id}</span>
                    <Badge tone={catInfo.dir === 'in' ? 'ok' : 'neutral'}>{catInfo.label}</Badge>
                    <Badge
                      tone={
                        c.status === 'reviewed' ? 'ok' : c.status === 'cancelled' ? 'err' : 'warn'
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-[14px] font-medium text-[#0B2A2F]">{c.reason}</div>
                  <div className="text-[12px] text-[#52666A]">
                    By {c.by} · {c.when} · Ref <span className="mono">{c.ref}</span>
                  </div>
                  {c.note && <div className="text-[12px] text-[#14532D]">Note: {c.note}</div>}
                  {c.cancel && <div className="text-[12px] text-[#B42318]">Cancelled: {c.cancel}</div>}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-end">
                    <div className="font-display font-bold text-[18px] num text-[#0B2A2F]">
                      {catInfo.dir === 'in' ? '+' : '−'}
                      {formatRs(c.amt)}
                    </div>
                  </div>
                  {c.status === 'draft' && role === 'owner' && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="dark"
                        onClick={() => {
                          setReviewTarget({ entry: c, mode: 'reviewed' });
                          setReviewNote('Verified against slip');
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Review
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReviewTarget({ entry: c, mode: 'cancelled' });
                          setReviewNote('');
                        }}
                      >
                        <XCircle className="w-4 h-4 text-[#B42318]" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Shift Report Drawer */}
      <Drawer
        open={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        title={selectedShift ? `Shift ${selectedShift.id}` : ''}
        subtitle={
          selectedShift
            ? `${selectedShift.reg} · Cashier ${selectedShift.cashier} · ${formatShortDate(selectedShift.d)}`
            : ''
        }
        footer={
          selectedShift?.status === 'open' ? (
            <Link href="/cash/close-shift">
              <Button variant="primary">Close this shift</Button>
            </Link>
          ) : undefined
        }
      >
        {selectedShift && (
          <div className="space-y-4">
            <Card padding="sm" className="space-y-2 bg-[#FBF8F4]">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#52666A]">Opened by</span>
                <span className="font-semibold">{selectedShift.by} at {selectedShift.opened}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#52666A]">Opening float</span>
                <span className="font-bold num">{formatRs(selectedShift.float)}</span>
              </div>
              {selectedShift.expected !== undefined && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#52666A]">Expected cash</span>
                  <span className="font-bold num">{formatRs(selectedShift.expected)}</span>
                </div>
              )}
              {selectedShift.counted !== undefined && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#52666A]">Counted cash</span>
                  <span className="font-bold num">{formatRs(selectedShift.counted)}</span>
                </div>
              )}
            </Card>
            {selectedShift.varianceReason && (
              <div className="p-3 rounded-[10px] bg-[#FFF3C4] text-[13px] text-[#6B4E00]">
                Variance note: {selectedShift.varianceReason}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* New Cash Entry Modal */}
      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title="New cash entry"
        subtitle="Record cash added to or taken from the shop cash drawer."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntryOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveEntry}>Save draft entry</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Select
            label="Entry type"
            value={cat}
            onChange={(e) => setCat(e.target.value as CashCategoryId)}
            options={Object.entries(CASH_CATS).map(([k, v]) => ({
              value: k,
              label: `${v.label} (${v.dir === 'in' ? 'Cash in' : 'Cash out'})`,
            }))}
          />
          <Input label="Amount (Rs)" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <Input label="Slip or receipt ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional reference" />
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why did cash move?" />
        </div>
      </Modal>

      {/* Review Cash Draft Modal */}
      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={
          reviewTarget?.mode === 'reviewed'
            ? `Approve ${reviewTarget.entry.id}`
            : `Cancel ${reviewTarget?.entry.id || ''}`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>Back</Button>
            <Button
              variant={reviewTarget?.mode === 'reviewed' ? 'primary' : 'danger'}
              onClick={() => {
                if (!reviewTarget) return;
                reviewCashDraft(reviewTarget.entry.id, reviewTarget.mode, reviewNote.trim() || undefined);
                notify(
                  reviewTarget.mode === 'reviewed'
                    ? `Reviewed entry ${reviewTarget.entry.id}`
                    : `Cancelled entry ${reviewTarget.entry.id}`,
                  'ok'
                );
                setReviewTarget(null);
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Input
          label={reviewTarget?.mode === 'reviewed' ? 'Owner note' : 'Cancellation reason'}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
