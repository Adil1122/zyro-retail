'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import type { PosReturnRecord, PosSaleRecord } from '@/types/footwear';
import { footwearPosService } from './services/footwear-pos.service';

const REASONS = [
  'Wrong size',
  'Customer changed mind',
  'Faulty or damaged',
  'Colour mismatch',
];

const REFUND_METHODS = [
  { id: 'cash', label: 'Cash from drawer' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'card', label: 'Card reversal' },
  { id: 'jazz', label: 'JazzCash' },
  { id: 'easy', label: 'Easypaisa' },
  { id: 'khata_credit', label: 'Credit to Khata' },
  { id: 'owe_later', label: 'Owe refund (pay later)' },
] as const;

interface SelectedReturnLine {
  saleItemId: string;
  variantId: string;
  quantity: number;
  condition: 'resellable' | 'damaged';
}

export function ReturnsFlow() {
  const { notify } = useZyro();
  const [query, setQuery] = useState('');
  const [sales, setSales] = useState<PosSaleRecord[]>([]);
  const [returnsHistory, setReturnsHistory] = useState<PosReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<Record<string, SelectedReturnLine>>({});
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [refundMethod, setRefundMethod] = useState<(typeof REFUND_METHODS)[number]['id']>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<{
    returnNumber: string;
    totalAmount: number;
    method: string;
    restockedCount: number;
    damagedCount: number;
  } | null>(null);

  const loadData = useCallback(async (searchText?: string) => {
    setLoading(true);
    try {
      const [salesRes, returnsRes] = await Promise.all([
        footwearPosService.listSales({ q: searchText?.trim() || undefined, limit: 30 }),
        footwearPosService.listReturns(),
      ]);
      setSales(salesRes.sales);
      setReturnsHistory(returnsRes.returns);

      const urlSaleId = new URLSearchParams(window.location.search).get('saleId');
      if (urlSaleId) {
        const match = salesRes.sales.find((s) => s.id === urlSaleId);
        if (match) setSelectedSaleId(match.id);
      } else if (!selectedSaleId && salesRes.sales.length > 0) {
        const withReturnable = salesRes.sales.find((s) =>
          s.items.some((i) => i.returnableQuantity > 0)
        );
        if (withReturnable) setSelectedSaleId(withReturnable.id);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to load bills for return', 'err');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedSaleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedSale = useMemo(
    () => sales.find((s) => s.id === selectedSaleId) || null,
    [sales, selectedSaleId]
  );

  // Initialize selectable items whenever selectedSale changes
  useEffect(() => {
    if (!selectedSale) {
      setSelectedLines({});
      return;
    }
    const next: Record<string, SelectedReturnLine> = {};
    for (const item of selectedSale.items) {
      if (item.returnableQuantity > 0) {
        next[item.id] = {
          saleItemId: item.id,
          variantId: item.variantId,
          quantity: 1,
          condition: 'resellable',
        };
      }
    }
    setSelectedLines(next);
  }, [selectedSale]);

  const activeReturnItems = useMemo(() => {
    if (!selectedSale) return [];
    return selectedSale.items
      .map((item) => {
        const picked = selectedLines[item.id];
        if (!picked || picked.quantity <= 0) return null;
        return { item, picked };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [selectedSale, selectedLines]);

  const refundAmt = useMemo(
    () =>
      activeReturnItems.reduce(
        (sum, { item, picked }) => sum + Number((item.unitPrice * picked.quantity).toFixed(2)),
        0
      ),
    [activeReturnItems]
  );

  const handleSearch = async () => {
    await loadData(query);
    if (query.trim()) {
      const cleaned = query.trim().replace(/^#/, '');
      const found = sales.find(
        (s) =>
          String(s.billNumber) === cleaned ||
          (s.receiptNumber && s.receiptNumber.toLowerCase().includes(cleaned.toLowerCase())) ||
          (s.customerName && s.customerName.toLowerCase().includes(cleaned.toLowerCase()))
      );
      if (found) {
        setSelectedSaleId(found.id);
      }
    }
  };

  const toggleLine = (saleItemId: string, variantId: string) => {
    setSelectedLines((prev) => {
      if (prev[saleItemId]) {
        const clone = { ...prev };
        delete clone[saleItemId];
        return clone;
      }
      return {
        ...prev,
        [saleItemId]: {
          saleItemId,
          variantId,
          quantity: 1,
          condition: selectedReason === 'Faulty or damaged' ? 'damaged' : 'resellable',
        },
      };
    });
  };

  const updateLine = (saleItemId: string, patch: Partial<SelectedReturnLine>) => {
    setSelectedLines((prev) => {
      const cur = prev[saleItemId];
      if (!cur) return prev;
      return { ...prev, [saleItemId]: { ...cur, ...patch } };
    });
  };

  const submitReturn = async () => {
    if (!selectedSale) {
      notify('Select an original bill first', 'warn');
      return;
    }
    if (activeReturnItems.length === 0) {
      notify('Select at least one footwear pair to return', 'warn');
      return;
    }
    if (refundMethod === 'khata_credit' && !selectedSale.customerId) {
      notify('Walk-in bills cannot be credited to Khata. Choose Cash, Bank, Card, or Wallet.', 'warn');
      return;
    }

    setSubmitting(true);
    try {
      const res = await footwearPosService.processReturn({
        branchId: selectedSale.branchId,
        originalSaleId: selectedSale.id,
        customerId: selectedSale.customerId,
        reason: selectedReason,
        refundMethod,
        items: activeReturnItems.map(({ picked }) => ({
          originalSaleItemId: picked.saleItemId,
          variantId: picked.variantId,
          quantity: picked.quantity,
          condition: picked.condition,
        })),
      });

      const restockedCount = activeReturnItems
        .filter((x) => x.picked.condition === 'resellable')
        .reduce((s, x) => s + x.picked.quantity, 0);
      const damagedCount = activeReturnItems
        .filter((x) => x.picked.condition === 'damaged')
        .reduce((s, x) => s + x.picked.quantity, 0);

      setCompletedReturn({
        returnNumber: res.returnNumber,
        totalAmount: res.result.total_return_amount,
        method: REFUND_METHODS.find((m) => m.id === refundMethod)?.label || refundMethod,
        restockedCount,
        damagedCount,
      });
      notify(`Return ${res.returnNumber} recorded`, 'ok');
      void loadData();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Return failed', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <header className="h-[58px] bg-[#08343A] text-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/pos">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> Back to register
          </Button>
        </Link>
        <div className="font-display font-bold text-[16px]">Return from original bill</div>
        <Link href="/pos/bills">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            Bill book
          </Button>
        </Link>
      </header>

      <div className="max-w-[820px] mx-auto p-4 sm:p-6 space-y-5">
        {completedReturn ? (
          <Card padding="lg" className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="mono text-[13px] font-semibold text-[#52666A]">
              {completedReturn.returnNumber}
            </div>
            <h1 className="font-display text-[22px] font-bold">Return recorded</h1>
            <p className="text-[14px] text-[#52666A]">
              Refund of {formatRs(completedReturn.totalAmount)} via {completedReturn.method} · Reason:{' '}
              {selectedReason}.
            </p>
            <div className="flex justify-center flex-wrap gap-2">
              {completedReturn.restockedCount > 0 && (
                <Badge tone="ok">{completedReturn.restockedCount} pair(s) restocked to branch inventory</Badge>
              )}
              {completedReturn.damagedCount > 0 && (
                <Badge tone="warn">
                  {completedReturn.damagedCount} damaged pair(s) logged (not added to sellable stock)
                </Badge>
              )}
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCompletedReturn(null)}>
                Another return
              </Button>
              <Link href="/pos">
                <Button variant="primary">Back to register</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <Card className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="font-display text-[20px] font-bold">Find the original bill</h1>
                <Link href="/pos/exchange">
                  <Button variant="secondary" size="sm">
                    Need a size/colour exchange instead?
                  </Button>
                </Link>
              </div>
              <div className="flex gap-2">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  onSubmit={() => void handleSearch()}
                  placeholder="Bill number, receipt #, or customer name..."
                />
                <Button variant="dark" onClick={() => void handleSearch()} disabled={loading}>
                  Find
                </Button>
              </div>

              {loading ? (
                <div className="py-4 text-[13px] text-[#52666A] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading recent bills...
                </div>
              ) : sales.length === 0 ? (
                <div className="py-4 text-[13px] text-[#52666A]">
                  No completed bills found for this branch yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sales.slice(0, 8).map((s) => {
                    const active = s.id === selectedSaleId;
                    const hasReturnable = s.items.some((i) => i.returnableQuantity > 0);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSaleId(s.id)}
                        className={`px-3 py-1.5 rounded-[9px] border text-[12px] font-semibold transition-colors ${
                          active
                            ? 'bg-[#08343A] text-white border-[#08343A]'
                            : hasReturnable
                              ? 'bg-[#FBF8F4] text-[#0B2A2F] border-[#D6CDC1] hover:bg-[#FCEFE4]'
                              : 'bg-[#F1EBE3] text-[#5F7174] border-[#E7E0D7]'
                        }`}
                      >
                        #{s.billNumber} · {s.customerName || 'Walk-in'} ({formatRs(s.totalAmount)})
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {selectedSale && (
              <Card className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="mono font-bold text-[15px]">
                      Bill #{selectedSale.billNumber} · {selectedSale.branchName}
                    </div>
                    <div className="text-[12px] text-[#52666A]">
                      {new Date(selectedSale.soldAt).toLocaleString('en-PK')} ·{' '}
                      {selectedSale.customerName || 'Walk-in'} · Paid {formatRs(selectedSale.paidAmount)}
                    </div>
                  </div>
                  <Badge tone="neutral">Bill total {formatRs(selectedSale.totalAmount)}</Badge>
                </div>

                <div className="divide-y divide-[#F1EBE3]">
                  {selectedSale.items.map((item) => {
                    const picked = selectedLines[item.id];
                    const fullyReturned = item.returnableQuantity <= 0;
                    return (
                      <div key={item.id} className="py-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={fullyReturned}
                              checked={!!picked}
                              onChange={() => toggleLine(item.id, item.variantId)}
                              className="mt-1 w-4 h-4 accent-[#08343A]"
                            />
                            <div>
                              <div className="font-semibold text-[14px] text-[#0B2A2F]">
                                {item.productName}
                              </div>
                              <div className="text-[12px] text-[#52666A]">
                                {item.variantLabel} · <span className="mono">{item.sku}</span> · Sold {item.quantity}
                                {item.returnedQuantity > 0
                                  ? ` (${item.returnedQuantity} already returned)`
                                  : ''}
                              </div>
                            </div>
                          </label>
                          <div className="text-end shrink-0">
                            <div className="font-bold text-[14px] num">{formatRs(item.unitPrice)}</div>
                            {fullyReturned && <Badge tone="neutral">Fully returned</Badge>}
                          </div>
                        </div>

                        {picked && !fullyReturned && (
                          <div className="ps-6 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[12px]">
                              <span className="text-[#52666A] font-medium">Return qty:</span>
                              <input
                                type="number"
                                min={1}
                                max={item.returnableQuantity}
                                value={picked.quantity}
                                onChange={(e) =>
                                  updateLine(item.id, {
                                    quantity: Math.min(
                                      item.returnableQuantity,
                                      Math.max(1, Math.round(Number(e.target.value)) || 1)
                                    ),
                                  })
                                }
                                className="w-16 h-8 px-2 rounded-[8px] border border-[#D6CDC1] bg-white text-center font-bold num"
                              />
                              <span className="text-[#52666A]">of {item.returnableQuantity}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateLine(item.id, { condition: 'resellable' })}
                                className={`px-2.5 py-1 rounded-[8px] border text-[12px] font-semibold ${
                                  picked.condition === 'resellable'
                                    ? 'bg-[#E8F6EE] border-[#14532D] text-[#14532D]'
                                    : 'bg-white border-[#D6CDC1] text-[#52666A]'
                                }`}
                              >
                                Resellable (restock)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLine(item.id, { condition: 'damaged' })}
                                className={`px-2.5 py-1 rounded-[8px] border text-[12px] font-semibold ${
                                  picked.condition === 'damaged'
                                    ? 'bg-[#FDF0EF] border-[#B42318] text-[#B42318]'
                                    : 'bg-white border-[#D6CDC1] text-[#52666A]'
                                }`}
                              >
                                Damaged (do not restock)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="space-y-4">
              <div className="font-semibold text-[14px]">Why is it coming back?</div>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={`p-3 rounded-[10px] border text-start text-[13px] font-semibold ${
                      selectedReason === r
                        ? 'bg-[#FCEFE4] border-[#C9682E] text-[#8A3D12]'
                        : 'bg-white border-[#D6CDC1]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="font-semibold text-[14px] pt-2">Refund settlement</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REFUND_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.id === 'khata_credit' && !selectedSale?.customerId}
                    onClick={() => setRefundMethod(m.id)}
                    className={`p-2.5 rounded-[10px] border text-[12px] font-semibold ${
                      refundMethod === m.id
                        ? 'bg-[#08343A] text-white border-[#08343A]'
                        : 'bg-white border-[#D6CDC1] disabled:opacity-45'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                size="counter"
                fullWidth
                disabled={submitting || !selectedSale || activeReturnItems.length === 0}
                onClick={() => void submitReturn()}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {submitting ? 'Processing return...' : `Record return · ${formatRs(refundAmt)}`}
              </Button>
            </Card>
          </>
        )}

        {/* Recent Returns History */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[17px] font-bold text-[#0B2A2F]">Recent returns</h2>
            <Badge tone="neutral">{returnsHistory.length}</Badge>
          </div>
          {returnsHistory.length === 0 ? (
            <div className="text-[13px] text-[#52666A] py-3">No returns recorded for this branch yet.</div>
          ) : (
            <div className="divide-y divide-[#F1EBE3]">
              {returnsHistory.slice(0, 10).map((ret) => (
                <div key={ret.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono font-bold text-[13px]">{ret.returnNumber}</span>
                      {ret.originalBillNumber && (
                        <Badge tone="neutral">Bill #{ret.originalBillNumber}</Badge>
                      )}
                      {ret.items.some((i) => i.condition === 'damaged') && (
                        <Badge tone="warn">Damaged (not restocked)</Badge>
                      )}
                      {ret.items.some((i) => i.restocked) && (
                        <Badge tone="ok">Restocked</Badge>
                      )}
                    </div>
                    <div className="text-[12px] text-[#52666A] mt-0.5">
                      {ret.customerName || 'Walk-in'} · {ret.reason || 'Return'} ·{' '}
                      {new Date(ret.createdAt).toLocaleString('en-PK', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="font-bold text-[14px] num">{formatRs(ret.totalReturnAmount)}</div>
                    {ret.refund && (
                      <div className="text-[11px] text-[#52666A] capitalize">{ret.refund.status}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
