'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PKR_NOTES } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { calcCashDrawerSummary } from '@/lib/cash';
import { formatRs } from '@/lib/format';

export function CloseShiftFlow() {
  const { state, closeShift, notify } = useZyro();
  const activeShift = state.shifts.find((s) => s.status === 'open') || state.shifts[0];

  const summary = useMemo(
    () =>
      calcCashDrawerSummary(
        state.bills,
        state.items,
        state.cashDrafts,
        activeShift?.float || 10000
      ),
    [state.bills, state.items, state.cashDrafts, activeShift?.float]
  );

  const expectedCash = summary.expectedCash;

  const [entryMode, setEntryMode] = useState<'notes' | 'total'>('notes');
  const [directTotal, setDirectTotal] = useState(String(expectedCash));
  const [noteCounts, setNoteCounts] = useState<Record<number, number>>({
    5000: Math.floor(expectedCash / 5000),
    1000: Math.floor((expectedCash % 5000) / 1000),
    500: Math.floor((expectedCash % 1000) / 500),
    100: Math.floor((expectedCash % 500) / 100),
    50: 0,
    20: 0,
    10: 0,
  });
  const [reason, setReason] = useState('');
  const [closedReport, setClosedReport] = useState<{
    expected: number;
    counted: number;
    variance: number;
  } | null>(null);

  const notesSum = useMemo(
    () => PKR_NOTES.reduce((s, n) => s + n.v * (noteCounts[n.v] || 0), 0),
    [noteCounts]
  );
  const countedCash =
    entryMode === 'notes' ? notesSum : Math.max(0, parseInt(directTotal, 10) || 0);
  const variance = countedCash - expectedCash;

  const handleClose = () => {
    if (variance !== 0 && !reason.trim()) {
      notify('Explain the cash difference before closing the shift', 'err');
      return;
    }
    if (activeShift) {
      closeShift(activeShift.id, countedCash, reason.trim() || undefined, expectedCash);
    }
    setClosedReport({ expected: expectedCash, counted: countedCash, variance });
    notify('Shift closed and Z-report saved', 'ok');
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <header className="h-[58px] bg-[#08343A] text-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/pos">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> Back to register
          </Button>
        </Link>
        <span className="font-display font-bold text-[15px]">Close shift · Z-Report</span>
        <span />
      </header>

      <div className="max-w-[760px] mx-auto p-4 sm:p-6">
        {closedReport ? (
          <Card className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E3F4EA] text-[#14532D] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">
              Shift {activeShift?.id} closed
            </h1>
            <div className="max-w-[360px] mx-auto p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-[#52666A]">Expected cash</span>
                <span className="font-bold num">{formatRs(closedReport.expected)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52666A]">Counted cash</span>
                <span className="font-bold num">{formatRs(closedReport.counted)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E7E0D7]">
                <span className="font-semibold">Variance</span>
                <span className="font-bold num">{formatRs(closedReport.variance)}</span>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <Link href="/dashboard">
                <Button variant="primary">Go to dashboard</Button>
              </Link>
              <Link href="/cash">
                <Button variant="secondary">Cash &amp; shifts</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] text-[#52666A]">
                    {activeShift?.reg || 'Counter 1'} · Cashier {activeShift?.cashier || 'Ali'}
                  </div>
                  <h1 className="font-display text-[20px] font-bold text-[#0B2A2F]">
                    Count cash drawer
                  </h1>
                </div>
                <Badge tone="ok">{state.bills.length} bills today</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7]">
                  <div className="text-[11px] text-[#52666A]">Opening float</div>
                  <div className="font-bold num text-[16px]">{formatRs(summary.float)}</div>
                </div>
                <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7]">
                  <div className="text-[11px] text-[#52666A]">Cash sales</div>
                  <div className="font-bold num text-[16px]">{formatRs(summary.cashSales)}</div>
                </div>
                <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7]">
                  <div className="text-[11px] text-[#52666A]">Cash moves &amp; refunds</div>
                  <div className="font-bold num text-[16px]">
                    {formatRs(summary.cashMovementsIn - summary.cashMovementsOut - summary.cashRefunds)}
                  </div>
                </div>
                <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7]">
                  <div className="text-[11px] text-[#52666A]">Digital / Khata</div>
                  <div className="font-bold num text-[16px]">{formatRs(summary.nonCashSales)}</div>
                </div>
              </div>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-[#0B2A2F]">Count cash in drawer</div>
                <div className="inline-flex rounded-[9px] border border-[#D6CDC1] bg-[#FBF8F4] p-0.5 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setEntryMode('notes')}
                    className={`px-2.5 py-1 rounded-[7px] font-semibold ${
                      entryMode === 'notes' ? 'bg-[#08343A] text-white' : 'text-[#52666A]'
                    }`}
                  >
                    PKR notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectTotal(String(notesSum));
                      setEntryMode('total');
                    }}
                    className={`px-2.5 py-1 rounded-[7px] font-semibold ${
                      entryMode === 'total' ? 'bg-[#08343A] text-white' : 'text-[#52666A]'
                    }`}
                  >
                    Enter total
                  </button>
                </div>
              </div>

              {entryMode === 'notes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PKR_NOTES.map((n) => (
                    <label
                      key={n.v}
                      className="p-2.5 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4] space-y-1"
                    >
                      <div className="text-[12px] font-bold num" style={{ color: n.tone }}>
                        Rs {n.label} notes
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={noteCounts[n.v] || 0}
                        onChange={(e) =>
                          setNoteCounts((prev) => ({
                            ...prev,
                            [n.v]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="field w-full h-[38px] px-2.5 rounded-[8px] border border-[#8A8276] bg-white font-bold num text-end"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <Input
                  label="Total cash counted in drawer (Rs)"
                  type="number"
                  min={0}
                  value={directTotal}
                  onChange={(e) => setDirectTotal(e.target.value)}
                />
              )}

              <div className="p-3.5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[12px] text-[#52666A]">
                    Expected: <strong className="num">{formatRs(expectedCash)}</strong> · Counted:{' '}
                    <strong className="num text-[#0B2A2F]">{formatRs(countedCash)}</strong>
                  </div>
                </div>
                <Badge tone={variance === 0 ? 'ok' : variance < 0 ? 'err' : 'warn'}>
                  {variance === 0
                    ? 'Exact match'
                    : variance > 0
                      ? `+${formatRs(variance)} over`
                      : `${formatRs(variance)} short`}
                </Badge>
              </div>

              {variance !== 0 && (
                <Input
                  label="Reason for cash difference (required)"
                  placeholder="e.g. Loose change error or petty expense paid from drawer"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              )}

              <Button variant="primary" size="counter" fullWidth onClick={handleClose}>
                <Lock className="w-5 h-5" /> Close shift &amp; print Z-report
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
