'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  CreditCard,
  QrCode,
  Smartphone,
  Split,
  UserPlus,
} from 'lucide-react';
import { PaymentSummary } from '@/components/domain/PaymentSummary';
import { Receipt } from '@/components/domain/Receipt';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Numpad } from '@/components/ui/Numpad';
import { PAYMENT_METHODS, PKR_NOTES } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { generateQrPath } from '@/lib/inventory';
import type { BillRecord, Customer, PaymentMethodId, PaymentSplitPart } from '@/types';

export function TenderScreen({
  subtotal,
  discountAmt,
  total,
  itemCount,
  billNo,
  customer,
  onBack,
  onNeedCustomer,
  onComplete,
}: {
  subtotal: number;
  discountAmt: number;
  total: number;
  itemCount: number;
  billNo: number;
  customer: Customer | null;
  onBack: () => void;
  onNeedCustomer: () => void;
  onComplete: (params: {
    pay: PaymentMethodId;
    recv: number;
    splits?: PaymentSplitPart[];
  }) => void;
}) {
  const [method, setMethod] = useState<PaymentMethodId>('cash');
  const [cashStr, setCashStr] = useState(String(total));
  const [walletRef, setWalletRef] = useState('');
  const [splitCash, setSplitCash] = useState(String(Math.round(total / 2)));
  const [splitSecondMethod, setSplitSecondMethod] = useState<'jazz' | 'easy' | 'card' | 'raast'>('jazz');

  const cashReceived = Number(cashStr) || 0;
  const splitCashNum = Math.min(total, Math.max(0, Number(splitCash) || 0));
  const splitRemainder = Math.max(0, total - splitCashNum);

  const methodIcon = (id: PaymentMethodId) => {
    switch (id) {
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      case 'jazz':
      case 'easy':
        return <Smartphone className="w-5 h-5" />;
      case 'raast':
        return <QrCode className="w-5 h-5" />;
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'bank':
        return <Building2 className="w-5 h-5" />;
      case 'khata':
        return <BookOpen className="w-5 h-5" />;
      case 'split':
        return <Split className="w-5 h-5" />;
    }
  };

  const canRecord =
    method === 'cash'
      ? cashReceived >= total
      : method === 'khata'
        ? !!customer
        : method === 'split'
          ? splitCashNum > 0 && splitRemainder > 0
          : true;

  const submitPayment = () => {
    if (method === 'khata' && !customer) {
      onNeedCustomer();
      return;
    }
    if (method === 'split') {
      onComplete({
        pay: 'split',
        recv: total,
        splits: [
          { method: 'cash', amount: splitCashNum },
          { method: splitSecondMethod, amount: splitRemainder, ref: walletRef || undefined },
        ],
      });
      return;
    }
    onComplete({
      pay: method,
      recv: method === 'cash' ? cashReceived : method === 'khata' ? 0 : total,
    });
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9] flex flex-col">
      <header className="h-[60px] bg-white border-b border-[#E7E0D7] px-4 sm:px-6 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to bill #{billNo}
        </Button>
        <div className="font-display font-bold text-[18px] text-[#0B2A2F]">Take payment</div>
        <div className="font-display font-bold text-[18px] text-[#08343A] num">{formatRs(total)}</div>
      </header>

      <div className="flex-1 max-w-[1040px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          {/* Payment methods grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PAYMENT_METHODS.map((m) => {
              const active = m.id === method;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`tile p-3 rounded-[12px] border text-start flex flex-col gap-1.5 ${
                    active
                      ? 'bg-[#08343A] text-white border-[#08343A]'
                      : 'bg-white text-[#0B2A2F] border-[#E7E0D7] hover:bg-[#FBF8F4]'
                  }`}
                >
                  <span className={active ? 'text-[#E58A4E]' : 'text-[#08343A]'}>
                    {methodIcon(m.id)}
                  </span>
                  <div className="font-semibold text-[13px]">{m.label}</div>
                  <div className={`text-[11px] ${active ? 'text-[#C9DADB]' : 'text-[#52666A]'}`}>
                    {m.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {method === 'cash' && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-[#52666A]">Cash received</span>
                <div className="font-display text-[28px] font-bold text-[#0B2A2F] num">
                  {formatRs(cashReceived)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCashStr(String(total))}
                  className="px-3 py-2 rounded-[9px] bg-[#FCEFE4] border border-[#E2B48F] text-[#8A3D12] font-semibold text-[13px] num"
                >
                  Exact {formatRs(total)}
                </button>
                {PKR_NOTES.slice(0, 4).map((note) => (
                  <button
                    key={note.v}
                    type="button"
                    onClick={() => setCashStr(String(cashReceived + note.v))}
                    className="px-3 py-2 rounded-[9px] bg-white border border-[#D6CDC1] hover:bg-[#F8F4EF] font-semibold text-[13px] flex items-center gap-1.5 num"
                  >
                    <span
                      style={{ backgroundColor: note.tone }}
                      className="w-2.5 h-2.5 rounded-full"
                    />
                    +{note.label}
                  </button>
                ))}
              </div>

              <Numpad
                extraKey="C"
                onDigit={(d) => setCashStr((s) => (s === '0' ? d : s + d))}
                onBackspace={() => setCashStr((s) => (s.length <= 1 ? '0' : s.slice(0, -1)))}
                onClear={() => setCashStr('0')}
              />
            </Card>
          )}

          {(method === 'jazz' || method === 'easy' || method === 'card' || method === 'bank') && (
            <Card className="space-y-4">
              <div className="font-display text-[17px] font-bold">
                {PAYMENT_METHODS.find((x) => x.id === method)?.label} · {formatRs(total)}
              </div>
              <p className="text-[13px] text-[#52666A]">
                Confirm the customer transfer on your phone or card terminal before recording the sale.
              </p>
              <Input
                label="Transaction reference / last 4 digits (optional)"
                placeholder="e.g. TXN-98412"
                value={walletRef}
                onChange={(e) => setWalletRef(e.target.value)}
              />
            </Card>
          )}

          {method === 'raast' && (
            <Card className="flex flex-col sm:flex-row items-center gap-5">
              <div className="p-3 rounded-[14px] border border-[#E7E0D7] bg-white shrink-0">
                <svg width="132" height="132" viewBox="0 0 72 72">
                  <path d={generateQrPath(billNo, 72)} fill="#08343A" />
                </svg>
              </div>
              <div className="space-y-2">
                <Badge tone="ok">Raast merchant QR</Badge>
                <div className="font-display text-[20px] font-bold num">{formatRs(total)}</div>
                <p className="text-[13px] text-[#52666A]">
                  Customer scans with any bank app, JazzCash, or Easypaisa. Confirm SMS alert before tapping Record sale.
                </p>
              </div>
            </Card>
          )}

          {method === 'khata' && (
            <Card className="space-y-4">
              <div className="font-display text-[17px] font-bold">Khata · Pay later</div>
              {customer ? (
                <div className="p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[15px]">{customer.name}</div>
                    <div className="text-[13px] text-[#52666A]">
                      Current balance: {formatRs(customer.khata)} → New balance: {formatRs(customer.khata + total)}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={onNeedCustomer}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[#6B4E00]">
                    Pick a customer to record a Khata credit bill.
                  </span>
                  <Button variant="primary" size="sm" onClick={onNeedCustomer}>
                    <UserPlus className="w-4 h-4" /> Select customer
                  </Button>
                </div>
              )}
            </Card>
          )}

          {method === 'split' && (
            <Card className="space-y-4">
              <div className="font-display text-[17px] font-bold">Split payment</div>
              <Input
                label="Part 1 · Cash amount (Rs)"
                type="number"
                value={splitCash}
                onChange={(e) => setSplitCash(e.target.value)}
              />
              <div className="space-y-2">
                <div className="text-[13px] font-semibold">Part 2 · Remaining {formatRs(splitRemainder)} via</div>
                <div className="grid grid-cols-4 gap-2">
                  {(['jazz', 'easy', 'card', 'raast'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitSecondMethod(m)}
                      className={`py-2 rounded-[9px] border text-[13px] font-semibold capitalize ${
                        splitSecondMethod === m
                          ? 'bg-[#08343A] text-white border-[#08343A]'
                          : 'bg-white border-[#D6CDC1]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <PaymentSummary
            subtotal={subtotal}
            discountAmt={discountAmt}
            total={total}
            tendered={method === 'cash' ? cashReceived : undefined}
            itemCount={itemCount}
          />
          <Button
            variant="primary"
            size="counter"
            fullWidth
            disabled={!canRecord}
            onClick={submitPayment}
          >
            <CheckCircle2 className="w-5 h-5" />
            {method === 'khata' ? 'Put on Khata' : `Record sale · ${formatRs(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SaleCompleteScreen({
  bill,
  onNewSale,
}: {
  bill: BillRecord;
  onNewSale: () => void;
}) {
  const { state, reprintBill, notify } = useZyro();
  const customer = bill.cust ? state.customers.find((c) => c.id === bill.cust) : null;

  return (
    <div className="min-h-screen bg-[#F4EFE9] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[820px] grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <Card padding="lg" className="md:col-span-6 space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#E8F6EE] text-[#14532D] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="mono text-[13px] font-semibold text-[#52666A]">BILL #{bill.no}</div>
            <h1 className="font-display text-[26px] font-bold text-[#0B2A2F] mt-0.5">Sale recorded</h1>
            <p className="text-[14px] text-[#52666A] mt-1">
              {customer ? `Linked to ${customer.name}` : 'Walk-in sale'} · Paid via{' '}
              <span className="font-semibold uppercase">{bill.pay}</span>
            </p>
          </div>

          {bill.print === 'failed' && (
            <div className="p-3.5 rounded-[12px] bg-[#FDF0EF] border border-[#F2C4BE] space-y-2">
              <div className="font-semibold text-[13px] text-[#B42318]">
                Receipt printer didn’t reply
              </div>
              <p className="text-[12px] text-[#3D5357]">
                The sale is safely saved. Check paper or USB cable and tap Reprint.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  reprintBill(bill.no);
                  notify(`Reprinted Bill #${bill.no}`, 'ok');
                }}
              >
                Retry print
              </Button>
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            <Button variant="primary" size="counter" fullWidth onClick={onNewSale}>
              Start new sale
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                reprintBill(bill.no);
                notify(`Printed 80 mm copy for Bill #${bill.no}`, 'ok');
              }}
            >
              Print receipt again
            </Button>
          </div>
        </Card>

        <div className="md:col-span-6">
          <Receipt bill={bill} />
        </div>
      </div>
    </div>
  );
}
