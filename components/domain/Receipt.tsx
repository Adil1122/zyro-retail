'use client';

import React from 'react';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, formatRs } from '@/lib/format';
import { calcBillTotal, generateBarcodeBars, generateQrPath, getVariantText } from '@/lib/inventory';
import type { BillRecord, FbrMode } from '@/types';
import type { PosSaleRecord } from '@/types/footwear';

export interface ReceiptProps {
  bill?: BillRecord;
  sale?: PosSaleRecord;
  shopName?: string;
  branchName?: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  printable?: boolean;
  fbrOverride?: FbrMode;
  offlineOverride?: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazz: 'JazzCash',
  easy: 'Easypaisa',
  raast: 'Raast QR',
  card: 'Card',
  bank: 'Bank transfer',
  khata: 'Khata credit',
  other: 'Other',
};

function formatSaleTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function Receipt({
  bill,
  sale,
  shopName,
  branchName,
  branchAddress,
  branchPhone,
  printable = true,
  fbrOverride,
  offlineOverride,
}: ReceiptProps) {
  const { state, settings } = useZyro();
  const ur = settings.receipt.showUrduLabels;

  // Live Supabase PosSaleRecord rendering
  if (sale) {
    const receiptNo = sale.receiptNumber || `ZYRO-${sale.billNumber}`;
    const bars = generateBarcodeBars(receiptNo, 180);
    const nonKhataPayments = sale.payments.filter((p) => p.methodCode !== 'khata');
    const paySummaryLabel =
      sale.payments.length > 1
        ? 'SPLIT'
        : sale.payments.length === 1
          ? METHOD_LABELS[sale.payments[0].methodCode] || sale.payments[0].methodCode.toUpperCase()
          : sale.dueAmount > 0
            ? 'KHATA'
            : 'CASH';

    const displayShop = shopName || settings.shopName;
    const displayBranch = branchName || sale.branchName;
    const displayAddress = branchAddress ?? settings.address;
    const displayPhone = branchPhone ?? settings.phone;

    return (
      <div
        className={`${printable ? 'zyro-print-area ' : ''}w-full max-w-[320px] mx-auto bg-white text-[#111111] border border-[#E7E0D7] rounded-[12px] p-5 shadow-sm font-mono text-[12px] leading-relaxed`}
      >
        <div className="text-center border-b border-dashed border-[#9A9A9A] pb-3">
          <div className="font-display text-[17px] font-bold tracking-tight text-[#111111]">
            {displayShop}
          </div>
          {displayBranch && (
            <div className="text-[11px] font-semibold text-[#333333]">{displayBranch}</div>
          )}
          {settings.receipt.showAddress && displayAddress && (
            <div className="text-[11px] text-[#555555]">{displayAddress}</div>
          )}
          {settings.receipt.showPhone && displayPhone && (
            <div className="text-[11px] text-[#555555]">Tel: {formatPhone(displayPhone)}</div>
          )}
          {settings.receipt.headerNote && (
            <div className="text-[11px] text-[#555555] mt-1">{settings.receipt.headerNote}</div>
          )}
        </div>

        <div className="py-2.5 border-b border-dashed border-[#9A9A9A] space-y-0.5 text-[11px]">
          <div className="flex justify-between gap-2">
            <span>
              {ur ? 'Bill / بل #' : 'Bill #'}
              {sale.billNumber}
            </span>
            <span className="text-end">{formatSaleTime(sale.soldAt)}</span>
          </div>
          {settings.receipt.showCashier && (
            <div className="flex justify-between">
              <span>
                {ur ? 'Cashier / کیشیئر:' : 'Cashier:'} {sale.cashierName}
              </span>
              <span>{sale.receiptNumber || `#${sale.billNumber}`}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{ur ? 'Customer / گاہک:' : 'Customer:'}</span>
            <span className="truncate ps-2">
              {sale.customerName || (ur ? 'Walk-in / واک ان' : 'Walk-in')}
            </span>
          </div>
          {sale.customerPhone && (
            <div className="flex justify-between text-[#555555]">
              <span>Phone:</span>
              <span>{formatPhone(sale.customerPhone)}</span>
            </div>
          )}
        </div>

        <div className="py-2.5 border-b border-dashed border-[#9A9A9A] space-y-2">
          {sale.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between font-semibold">
                <span className="truncate pe-2">{item.productName}</span>
                <span className="num">{formatRs(item.lineTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#555555]">
                <span>
                  {item.variantLabel} · {item.quantity} × {formatRs(item.unitPrice)}
                </span>
                <span className="ps-1">{item.sku}</span>
              </div>
              {item.lineDiscountAmount > 0 && (
                <div className="flex justify-between text-[10px] text-[#555555]">
                  <span>Line discount</span>
                  <span className="num">−{formatRs(item.lineDiscountAmount)}</span>
                </div>
              )}
              {item.note && (
                <div className="text-[10px] text-[#555555] italic">Note: {item.note}</div>
              )}
            </div>
          ))}
        </div>

        <div className="py-2.5 border-b border-dashed border-[#9A9A9A] space-y-1">
          <div className="flex justify-between">
            <span>{ur ? 'Subtotal / ذیلی کل' : 'Subtotal'}</span>
            <span className="num">{formatRs(sale.subtotalAmount)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>{ur ? 'Discount / رعایت' : 'Discount'}</span>
              <span className="num">−{formatRs(sale.discountAmount)}</span>
            </div>
          )}
          {sale.taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax / GST</span>
              <span className="num">{formatRs(sale.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-[14px] font-bold pt-1">
            <span>{ur ? 'TOTAL / کل رقم' : 'TOTAL'}</span>
            <span className="num">{formatRs(sale.totalAmount)}</span>
          </div>

          <div className="flex justify-between text-[11px] text-[#555555] pt-1">
            <span className="uppercase">
              {ur ? `Paid / ادا شدہ (${paySummaryLabel})` : `Paid (${paySummaryLabel})`}
            </span>
            <span className="num">{formatRs(sale.paidAmount)}</span>
          </div>

          {sale.payments.length > 0 && (
            <div className="space-y-0.5 text-[11px] text-[#555555] ps-2">
              {sale.payments.map((sp) => (
                <div key={sp.id} className="flex justify-between">
                  <span>
                    {METHOD_LABELS[sp.methodCode] || sp.methodCode}
                    {sp.referenceNo ? ` (${sp.referenceNo})` : ''}
                  </span>
                  <span className="num">
                    {formatRs(sp.tenderedAmount && sp.tenderedAmount > sp.amount ? sp.tenderedAmount : sp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {sale.changeGiven > 0 && nonKhataPayments.length > 0 && (
            <div className="flex justify-between text-[11px] text-[#555555]">
              <span>Change</span>
              <span className="num">{formatRs(sale.changeGiven)}</span>
            </div>
          )}

          {sale.dueAmount > 0 && (
            <div className="flex justify-between text-[12px] font-bold text-[#8A3D12] pt-0.5">
              <span>Balance due (Khata)</span>
              <span className="num">{formatRs(sale.dueAmount)}</span>
            </div>
          )}

          {sale.refundedAmount > 0 && (
            <div className="flex justify-between text-[11px] font-semibold text-[#B42318]">
              <span>Returned / Refunded</span>
              <span className="num">−{formatRs(sale.refundedAmount)}</span>
            </div>
          )}
        </div>

        {sale.notes && (
          <div className="py-2 border-b border-dashed border-[#9A9A9A] text-[11px] text-[#555555]">
            Note: {sale.notes}
          </div>
        )}

        {settings.receipt.showBarcode && (
          <div className="pt-3 flex flex-col items-center gap-1">
            <svg width="180" height="28" viewBox="0 0 180 28" aria-label={receiptNo}>
              {bars.map((b, idx) => (
                <rect key={idx} x={b.x} y={0} width={b.w} height={28} fill="#111111" />
              ))}
            </svg>
            <div className="text-[10px] tracking-widest text-[#555555]">{receiptNo}</div>
          </div>
        )}

        <div className="pt-3 text-center text-[11px] text-[#555555]">
          {settings.receipt.footerNote}
        </div>
      </div>
    );
  }

  // Legacy BillRecord fallback (used in Settings preview)
  if (!bill) return null;

  const customer = bill.cust ? state.customers.find((c) => c.id === bill.cust) : null;
  const fbrMode = fbrOverride ?? bill.fbrStatus ?? settings.fbr.mode;
  const offline = offlineOverride ?? bill.offlinePending ?? settings.offlineModeSimulated;

  const subtotal = bill.lines.reduce((sum, [itemId, , , qty, unitPrice]) => {
    const it = state.items.find((x) => x.id === itemId);
    const price = unitPrice ?? (it ? it.price : 0);
    return sum + price * qty;
  }, 0);
  const total = calcBillTotal(bill, state.items);
  const qr = generateQrPath(bill.no, 72);
  const barcodeText = `ZYRO-${bill.no}`;
  const bars = generateBarcodeBars(barcodeText, 180);

  return (
    <div className="w-full max-w-[320px] mx-auto bg-white text-[#111111] border border-[#E7E0D7] rounded-[12px] p-5 shadow-sm font-mono text-[12px] leading-relaxed">
      <div className="text-center border-b border-dashed border-[#9A9A9A] pb-3">
        <div className="font-display text-[17px] font-bold tracking-tight text-[#111111]">
          {settings.shopName}
        </div>
        {settings.receipt.showAddress && (
          <div className="text-[11px] text-[#555555]">
            {settings.address}, {settings.city}
          </div>
        )}
        {settings.receipt.showPhone && (
          <div className="text-[11px] text-[#555555]">Tel: {formatPhone(settings.phone)}</div>
        )}
        {settings.receipt.headerNote && (
          <div className="text-[11px] text-[#555555] mt-1">{settings.receipt.headerNote}</div>
        )}
      </div>

      <div className="py-2.5 border-b border-dashed border-[#9A9A9A] space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span>
            {ur ? 'Bill / بل #' : 'Bill #'}
            {bill.no}
          </span>
          <span>{bill.time}</span>
        </div>
        {settings.receipt.showCashier && (
          <div className="flex justify-between">
            <span>
              {ur ? 'Cashier / کیشیئر:' : 'Cashier:'} {state.session.user.shortName}
            </span>
            <span>Counter 1</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{ur ? 'Customer / گاہک:' : 'Customer:'}</span>
          <span>{customer ? customer.name : ur ? 'Walk-in / واک ان' : 'Walk-in'}</span>
        </div>
      </div>

      <div className="py-2.5 border-b border-dashed border-[#9A9A9A] space-y-2">
        {bill.lines.map(([itemId, ci, si, qty, unitPrice], idx) => {
          const item = state.items.find((x) => x.id === itemId);
          if (!item) return null;
          const variant = getVariantText(item, ci, si);
          const price = unitPrice ?? item.price;
          return (
            <div key={idx}>
              <div className="flex justify-between font-semibold">
                <span className="truncate pe-2">{item.name}</span>
                <span className="num">{formatRs(price * qty)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#555555]">
                <span>
                  {variant} · {qty} × {formatRs(price)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="py-2.5 border-b border-dashed border-[#9A9A9A] space-y-1">
        <div className="flex justify-between">
          <span>{ur ? 'Subtotal / ذیلی کل' : 'Subtotal'}</span>
          <span className="num">{formatRs(subtotal)}</span>
        </div>
        {bill.discountAmt ? (
          <div className="flex justify-between">
            <span>{ur ? 'Discount / رعایت' : 'Discount'}</span>
            <span className="num">−{formatRs(bill.discountAmt)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-[14px] font-bold pt-1">
          <span>{ur ? 'TOTAL / کل رقم' : 'TOTAL'}</span>
          <span className="num">{formatRs(total)}</span>
        </div>
        <div className="flex justify-between text-[11px] text-[#555555] pt-1">
          <span className="uppercase">{ur ? `Paid / ادا شدہ (${bill.pay})` : `Paid (${bill.pay})`}</span>
          <span className="num">{formatRs(bill.recv || total)}</span>
        </div>
        {bill.pay === 'split' && bill.splits && bill.splits.length > 0 && (
          <div className="space-y-0.5 text-[11px] text-[#555555] ps-2">
            {bill.splits.map((sp, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="capitalize">
                  {sp.method}
                  {sp.ref ? ` (${sp.ref})` : ''}
                </span>
                <span className="num">{formatRs(sp.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {bill.recv > total && (
          <div className="flex justify-between text-[11px] text-[#555555]">
            <span>Change</span>
            <span className="num">{formatRs(bill.recv - total)}</span>
          </div>
        )}
      </div>

      {fbrMode !== 'notRequired' && (
        <div className="py-3 border-b border-dashed border-[#9A9A9A] flex items-center gap-3">
          <svg width="64" height="64" viewBox="0 0 72 72" className="shrink-0">
            <path d={qr} fill="#111111" />
          </svg>
          <div className="text-[11px] space-y-0.5">
            <div className="font-bold">FBR POS INVOICE</div>
            <div>POS ID: {settings.fbr.posId}</div>
            {fbrMode === 'connected' ? (
              <div className="font-semibold">{bill.fbrInvoiceNo || `FBR-${bill.no}`}</div>
            ) : (
              <div className="text-[#6B4E00] font-semibold">Queued — sends when online</div>
            )}
          </div>
        </div>
      )}

      {offline && (
        <div className="mt-2.5 px-2.5 py-1.5 rounded bg-[#FFF3C4] text-[#6B4E00] text-[11px] text-center font-semibold">
          Saved on this device (pending sync)
        </div>
      )}

      {settings.receipt.showBarcode && (
        <div className="pt-3 flex flex-col items-center gap-1">
          <svg width="180" height="28" viewBox="0 0 180 28" aria-label={barcodeText}>
            {bars.map((b, idx) => (
              <rect key={idx} x={b.x} y={0} width={b.w} height={28} fill="#111111" />
            ))}
          </svg>
          <div className="text-[10px] tracking-widest text-[#555555]">{barcodeText}</div>
        </div>
      )}

      <div className="pt-3 text-center text-[11px] text-[#555555]">
        {settings.receipt.footerNote}
      </div>
    </div>
  );
}
