'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { MANAGER_PIN } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcBillTotal, getVariantText } from '@/lib/inventory';

const REASONS = ['Wrong size', 'Customer changed mind', 'Faulty or damaged', 'Colour mismatch'];

export function ReturnsFlow() {
  const { state, role, refundBill, notify } = useZyro();
  const [query, setQuery] = useState('1040');
  const [selectedBillNo, setSelectedBillNo] = useState<number | null>(1040);
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [noBillMode, setNoBillMode] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'khata'>('cash');
  const [done, setDone] = useState(false);

  const bill = state.bills.find((b) => b.no === selectedBillNo) || null;
  const refundAmt = bill ? calcBillTotal(bill, state.items) : 2500;

  const handleSearch = () => {
    const num = parseInt(query.replace(/\D/g, ''), 10);
    const found = state.bills.find((b) => b.no === num);
    if (found) {
      setSelectedBillNo(found.no);
      setNoBillMode(false);
    } else {
      notify('No bill found with that number', 'warn');
    }
  };

  const submitReturn = () => {
    if (noBillMode && role === 'cashier' && managerPin !== MANAGER_PIN) {
      notify(`Enter Manager PIN (${MANAGER_PIN}) for a return without a bill`, 'err');
      return;
    }
    if (bill) {
      refundBill(bill.no, refundAmt, refundMethod);
    }
    setDone(true);
    notify('Return recorded and stock adjusted', 'ok');
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
        <span className="w-24" />
      </header>

      <div className="max-w-[780px] mx-auto p-4 sm:p-6 space-y-5">
        {done ? (
          <Card padding="lg" className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="font-display text-[22px] font-bold">Return recorded</h1>
            <p className="text-[14px] text-[#52666A]">
              Refund of {formatRs(refundAmt)} via {refundMethod === 'cash' ? 'Cash drawer' : 'Customer Khata'} · Reason: {selectedReason}.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDone(false)}>
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
                <Button variant="secondary" size="sm" onClick={() => setNoBillMode((v) => !v)}>
                  {noBillMode ? 'Use original bill' : 'Return without a bill'}
                </Button>
              </div>
              {!noBillMode && (
                <div className="flex gap-2">
                  <SearchInput
                    value={query}
                    onChange={setQuery}
                    onSubmit={handleSearch}
                    placeholder="Bill number (e.g. 1040, 1043)"
                  />
                  <Button variant="dark" onClick={handleSearch}>
                    Find
                  </Button>
                </div>
              )}
            </Card>

            {noBillMode && role === 'cashier' && (
              <Card className="bg-[#FFF3C4] border-[#EBD892] space-y-3">
                <div className="flex items-center gap-2 font-semibold text-[#6B4E00] text-[14px]">
                  <ShieldAlert className="w-4 h-4" />
                  Return without a bill needs a manager ({MANAGER_PIN})
                </div>
                <Input
                  label="Manager PIN"
                  type="password"
                  maxLength={4}
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                />
              </Card>
            )}

            {bill && !noBillMode && (
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mono font-bold text-[15px]">Bill #{bill.no}</div>
                    <div className="text-[12px] text-[#52666A]">{bill.time} · Paid {bill.pay}</div>
                  </div>
                  <Badge tone="neutral">{formatRs(refundAmt)}</Badge>
                </div>

                <div className="divide-y divide-[#F1EBE3]">
                  {bill.lines.map(([itemId, ci, si, qty], idx) => {
                    const it = state.items.find((x) => x.id === itemId);
                    if (!it) return null;
                    return (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-[14px]">
                        <div>
                          <div className="font-semibold">{it.name}</div>
                          <div className="text-[12px] text-[#52666A]">
                            {getVariantText(it, ci, si)} · Qty {qty}
                          </div>
                        </div>
                        <span className="font-bold num">{formatRs(it.price * qty)}</span>
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

              <div className="font-semibold text-[14px] pt-2">Refund method</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod('cash')}
                  className={`p-3 rounded-[10px] border text-[13px] font-semibold ${
                    refundMethod === 'cash'
                      ? 'bg-[#08343A] text-white border-[#08343A]'
                      : 'bg-white border-[#D6CDC1]'
                  }`}
                >
                  Cash from drawer
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethod('khata')}
                  className={`p-3 rounded-[10px] border text-[13px] font-semibold ${
                    refundMethod === 'khata'
                      ? 'bg-[#08343A] text-white border-[#08343A]'
                      : 'bg-white border-[#D6CDC1]'
                  }`}
                >
                  Credit to Khata
                </button>
              </div>

              <Button variant="primary" size="counter" fullWidth onClick={submitReturn}>
                <RotateCcw className="w-4 h-4" /> Record return · {formatRs(refundAmt)}
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
