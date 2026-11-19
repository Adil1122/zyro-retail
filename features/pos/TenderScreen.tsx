'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Printer,
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
import type { PaymentMethodId } from '@/types';
import type { PosCustomerRecord, PosSaleRecord } from '@/types/footwear';
import { footwearPosService } from './services/footwear-pos.service';

export interface CheckoutPaymentEntry {
  methodCode: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'khata' | 'other';
  amount: number;
  tenderedAmount?: number;
  referenceNo?: string;
}

export function TenderScreen({
  subtotal,
  discountAmt,
  taxAmt = 0,
  total,
  itemCount,
  customer,
  submitting = false,
  errorMessage,
  onBack,
  onNeedCustomer,
  onComplete,
}: {
  subtotal: number;
  discountAmt: number;
  taxAmt?: number;
  total: number;
  itemCount: number;
  customer: PosCustomerRecord | null;
  submitting?: boolean;
  errorMessage?: string | null;
  onBack: () => void;
  onNeedCustomer: () => void;
  onComplete: (params: {
    payments: CheckoutPaymentEntry[];
    allowPartialKhata?: boolean;
    notes?: string;
  }) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<PaymentMethodId>('cash');
  const [cashStr, setCashStr] = useState(String(Math.round(total)));
  const [walletRef, setWalletRef] = useState('');
  const [partialEnabled, setPartialEnabled] = useState(false);
  const [partialPaidStr, setPartialPaidStr] = useState(String(Math.round(total / 2)));

  // Split payment supports any 2 methods including khata
  const [splitFirstMethod, setSplitFirstMethod] = useState<'cash' | 'card' | 'bank' | 'jazz' | 'easy' | 'raast'>('cash');
  const [splitFirstAmount, setSplitFirstAmount] = useState(String(Math.round(total / 2)));
  const [splitSecondMethod, setSplitSecondMethod] = useState<'jazz' | 'easy' | 'card' | 'bank' | 'raast' | 'khata'>('jazz');
  const [saleNote, setSaleNote] = useState('');

  const cashReceived = Number(cashStr) || 0;
  const splitFirstNum = Math.min(total, Math.max(0, Number(splitFirstAmount) || 0));
  const splitRemainder = Math.max(0, Number((total - splitFirstNum).toFixed(2)));
  const partialPaidNum = Math.min(total, Math.max(0, Number(partialPaidStr) || 0));
  const partialDueNum = Math.max(0, Number((total - partialPaidNum).toFixed(2)));

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

  const usesPartial = partialEnabled && method !== 'khata' && method !== 'split';
  const needsCustomer =
    method === 'khata' ||
    (method === 'split' && splitSecondMethod === 'khata') ||
    (usesPartial && partialDueNum > 0);

  const canRecord = (() => {
    if (submitting || total < 0) return false;
    if (needsCustomer && !customer) return false;
    if (method === 'khata') return !!customer;
    if (method === 'split') {
      return splitFirstNum > 0 && splitRemainder > 0;
    }
    if (usesPartial) {
      return partialPaidNum > 0 && partialPaidNum < total;
    }
    if (method === 'cash') {
      return cashReceived >= total;
    }
    return true;
  })();

  const submitPayment = () => {
    if (needsCustomer && !customer) {
      onNeedCustomer();
      return;
    }

    if (method === 'khata') {
      void onComplete({
        payments: [{ methodCode: 'khata', amount: total }],
        allowPartialKhata: true,
        notes: saleNote.trim() || undefined,
      });
      return;
    }

    if (method === 'split') {
      const payments: CheckoutPaymentEntry[] = [
        {
          methodCode: splitFirstMethod,
          amount: splitFirstNum,
          tenderedAmount: splitFirstMethod === 'cash' ? splitFirstNum : undefined,
        },
        {
          methodCode: splitSecondMethod,
          amount: splitRemainder,
          referenceNo: walletRef.trim() || undefined,
        },
      ];
      void onComplete({
        payments,
        allowPartialKhata: splitSecondMethod === 'khata',
        notes: saleNote.trim() || undefined,
      });
      return;
    }

    if (usesPartial) {
      const payments: CheckoutPaymentEntry[] = [
        {
          methodCode: method,
          amount: partialPaidNum,
          tenderedAmount: method === 'cash' ? partialPaidNum : undefined,
          referenceNo: walletRef.trim() || undefined,
        },
        {
          methodCode: 'khata',
          amount: partialDueNum,
        },
      ];
      void onComplete({
        payments,
        allowPartialKhata: true,
        notes: saleNote.trim() || undefined,
      });
      return;
    }

    void onComplete({
      payments: [
        {
          methodCode: method,
          amount: total,
          tenderedAmount: method === 'cash' ? cashReceived : total,
          referenceNo: walletRef.trim() || undefined,
        },
      ],
      notes: saleNote.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9] flex flex-col">
      <header className="h-[60px] bg-white border-b border-[#E7E0D7] px-4 sm:px-6 flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="w-4 h-4" /> Back to register
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
                  onClick={() => {
                    setMethod(m.id);
                    if (m.id === 'khata' || m.id === 'split') setPartialEnabled(false);
                  }}
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

          {method !== 'khata' && method !== 'split' && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[12px] bg-white border border-[#E7E0D7]">
              <div>
                <div className="text-[13px] font-semibold text-[#0B2A2F]">
                  Partial payment (put balance on Khata)
                </div>
                <div className="text-[11px] text-[#52666A]">
                  Collect part now and record the remaining due against a customer
                </div>
              </div>
              <input
                type="checkbox"
                checked={partialEnabled}
                onChange={(e) => setPartialEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#08343A]"
              />
            </div>
          )}

          {usesPartial && (
            <Card className="space-y-3 border-[#E2B48F] bg-[#FFFBF7]">
              <div className="font-semibold text-[14px] text-[#8A3D12]">
                Partial payment now · Remainder to Khata
              </div>
              <Input
                label="Amount paying right now (Rs)"
                type="number"
                min={1}
                max={Math.max(1, total - 1)}
                value={partialPaidStr}
                onChange={(e) => setPartialPaidStr(e.target.value)}
              />
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#52666A]">Remaining balance on Khata:</span>
                <span className="font-bold text-[#8A3D12] num">{formatRs(partialDueNum)}</span>
              </div>
              {!customer && (
                <div className="p-3 rounded-[10px] bg-[#FFF3C4] border border-[#EBD892] flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#6B4E00]">
                    Select a customer to record the unpaid Khata balance.
                  </span>
                  <Button variant="primary" size="sm" onClick={onNeedCustomer}>
                    <UserPlus className="w-4 h-4" /> Select customer
                  </Button>
                </div>
              )}
            </Card>
          )}

          {method === 'cash' && !usesPartial && (
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
                  onClick={() => setCashStr(String(Math.round(total)))}
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
                    <span style={{ backgroundColor: note.tone }} className="w-2.5 h-2.5 rounded-full" />
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
                {PAYMENT_METHODS.find((x) => x.id === method)?.label} · {formatRs(usesPartial ? partialPaidNum : total)}
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
                  <path d={generateQrPath(Math.round(total) || 1001, 72)} fill="#08343A" />
                </svg>
              </div>
              <div className="space-y-2 flex-1">
                <Badge tone="ok">Raast merchant QR</Badge>
                <div className="font-display text-[20px] font-bold num">
                  {formatRs(usesPartial ? partialPaidNum : total)}
                </div>
                <p className="text-[13px] text-[#52666A]">
                  Customer scans with any bank app, JazzCash, or Easypaisa. Confirm SMS alert before tapping Record sale.
                </p>
                <Input
                  label="Raast reference (optional)"
                  placeholder="e.g. RAAST-7821"
                  value={walletRef}
                  onChange={(e) => setWalletRef(e.target.value)}
                />
              </div>
            </Card>
          )}

          {method === 'khata' && (
            <Card className="space-y-4">
              <div className="font-display text-[17px] font-bold">Khata · Pay later</div>
              {customer ? (
                <div className="p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[15px]">{customer.fullName}</div>
                    <div className="text-[13px] text-[#52666A]">
                      Current balance: {formatRs(customer.khataBalance)} → New balance:{' '}
                      {formatRs(customer.khataBalance + total)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-[13px] font-semibold text-[#0B2A2F]">
                  <span>Part 1 method</span>
                  <select
                    value={splitFirstMethod}
                    onChange={(e) => setSplitFirstMethod(e.target.value as typeof splitFirstMethod)}
                    className="w-full h-11 px-3 rounded-[10px] border border-[#D6CDC1] bg-white text-[14px]"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank transfer</option>
                    <option value="jazz">JazzCash</option>
                    <option value="easy">Easypaisa</option>
                    <option value="raast">Raast</option>
                  </select>
                </label>
                <Input
                  label="Part 1 amount (Rs)"
                  type="number"
                  value={splitFirstAmount}
                  onChange={(e) => setSplitFirstAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="text-[13px] font-semibold">
                  Part 2 · Remaining {formatRs(splitRemainder)} via
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['jazz', 'easy', 'card', 'bank', 'raast', 'khata'] as const).map((m) => (
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

              {splitSecondMethod === 'khata' && !customer && (
                <div className="p-3 rounded-[10px] bg-[#FFF3C4] border border-[#EBD892] flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#6B4E00]">
                    Select a customer for the Khata split leg.
                  </span>
                  <Button variant="primary" size="sm" onClick={onNeedCustomer}>
                    <UserPlus className="w-4 h-4" /> Select customer
                  </Button>
                </div>
              )}

              {splitSecondMethod !== 'khata' && (
                <Input
                  label="Part 2 reference (optional)"
                  placeholder="e.g. TXN-98412"
                  value={walletRef}
                  onChange={(e) => setWalletRef(e.target.value)}
                />
              )}
            </Card>
          )}

          <Card className="space-y-2">
            <Input
              label="Receipt note (optional)"
              placeholder="e.g. 7-day size exchange with box"
              value={saleNote}
              onChange={(e) => setSaleNote(e.target.value)}
            />
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <PaymentSummary
            subtotal={subtotal}
            discountAmt={discountAmt}
            taxAmt={taxAmt}
            total={total}
            tendered={method === 'cash' && !usesPartial ? cashReceived : undefined}
            itemCount={itemCount}
          />

          {errorMessage && (
            <div className="p-3.5 rounded-[12px] bg-[#FDF0EF] border border-[#F2C4BE] text-[13px] font-semibold text-[#B42318]">
              {errorMessage}
            </div>
          )}

          <Button
            variant="primary"
            size="counter"
            fullWidth
            disabled={!canRecord}
            onClick={submitPayment}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {submitting
              ? 'Recording sale...'
              : method === 'khata'
                ? 'Put on Khata'
                : usesPartial
                  ? `Collect ${formatRs(partialPaidNum)} + Khata ${formatRs(partialDueNum)}`
                  : `Record sale · ${formatRs(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SaleCompleteScreen({
  sale,
  shopName,
  branchAddress,
  branchPhone,
  onNewSale,
}: {
  sale: PosSaleRecord;
  shopName?: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  onNewSale: () => void;
}) {
  const { notify } = useZyro();
  const [printing, setPrinting] = useState(false);

  const handlePrint = async (jobType: 'sale_receipt' | 'reprint' = 'reprint') => {
    setPrinting(true);
    try {
      await footwearPosService.recordPrintJob({
        branchId: sale.branchId,
        saleId: sale.id,
        jobType,
        status: 'printed',
      });
    } catch {
      // Allow browser print even if print_jobs logging fails
    } finally {
      setPrinting(false);
    }
    window.print();
    notify(`Prepared 80 mm receipt for Bill #${sale.billNumber}`, 'ok');
  };

  const payLabel =
    sale.payments.length > 1
      ? 'SPLIT'
      : sale.payments[0]?.methodCode?.toUpperCase() || (sale.dueAmount > 0 ? 'KHATA' : 'CASH');

  return (
    <div className="min-h-screen bg-[#F4EFE9] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[820px] grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <Card padding="lg" className="md:col-span-6 space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#E8F6EE] text-[#14532D] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="mono text-[13px] font-semibold text-[#52666A]">
              BILL #{sale.billNumber} · {sale.receiptNumber || `RCP-${sale.billNumber}`}
            </div>
            <h1 className="font-display text-[26px] font-bold text-[#0B2A2F] mt-0.5">Sale recorded</h1>
            <p className="text-[14px] text-[#52666A] mt-1">
              {sale.customerName ? `Linked to ${sale.customerName}` : 'Walk-in sale'} · Paid via{' '}
              <span className="font-semibold uppercase">{payLabel}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="ok">Paid {formatRs(sale.paidAmount)}</Badge>
              {sale.dueAmount > 0 && <Badge tone="warn">Khata due {formatRs(sale.dueAmount)}</Badge>}
              {sale.changeGiven > 0 && <Badge tone="neutral">Change {formatRs(sale.changeGiven)}</Badge>}
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <Button variant="primary" size="counter" fullWidth onClick={onNewSale}>
              Start new sale
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={printing}
              onClick={() => void handlePrint('reprint')}
            >
              <Printer className="w-4 h-4" />
              Print 80 mm receipt
            </Button>
          </div>
        </Card>

        <div className="md:col-span-6">
          <Receipt
            sale={sale}
            shopName={shopName}
            branchName={sale.branchName}
            branchAddress={branchAddress}
            branchPhone={branchPhone}
          />
        </div>
      </div>
    </div>
  );
}
