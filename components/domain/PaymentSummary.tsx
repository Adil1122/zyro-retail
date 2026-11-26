import React from 'react';
import { formatRs } from '@/lib/format';
import type { PaymentSplitPart } from '@/types';

export interface PaymentSummaryProps {
  subtotal: number;
  offerSavings?: number;
  discountAmt?: number;
  taxAmt?: number;
  total: number;
  tendered?: number;
  splits?: PaymentSplitPart[];
  itemCount?: number;
}

export function PaymentSummary({
  subtotal,
  offerSavings = 0,
  discountAmt = 0,
  taxAmt = 0,
  total,
  tendered,
  splits,
  itemCount,
}: PaymentSummaryProps) {
  const change = typeof tendered === 'number' ? Math.max(0, tendered - total) : 0;

  return (
    <div className="rounded-[12px] border border-[#E7E0D7] bg-[#FBF8F4] p-4 space-y-2 text-[14px]">
      <div className="flex items-center justify-between text-[#3D5357]">
        <span>Subtotal{typeof itemCount === 'number' ? ` (${itemCount} items)` : ''}</span>
        <span className="font-semibold num">{formatRs(subtotal + offerSavings)}</span>
      </div>
      {offerSavings > 0 && (
        <div className="flex items-center justify-between text-[#14532D]">
          <span>Bundle offer savings</span>
          <span className="font-semibold num">−{formatRs(offerSavings)}</span>
        </div>
      )}
      {discountAmt > 0 && (
        <div className="flex items-center justify-between text-[#14532D]">
          <span>Discount</span>
          <span className="font-semibold num">−{formatRs(discountAmt)}</span>
        </div>
      )}
      {taxAmt > 0 && (
        <div className="flex items-center justify-between text-[#3D5357]">
          <span>GST / Tax</span>
          <span className="font-semibold num">{formatRs(taxAmt)}</span>
        </div>
      )}
      <div className="pt-2 border-t border-[#E7E0D7] flex items-center justify-between text-[17px] font-bold text-[#0B2A2F]">
        <span>Total</span>
        <span className="font-display num">{formatRs(total)}</span>
      </div>
      {splits && splits.length > 0 && (
        <div className="pt-2 border-t border-dashed border-[#C9C1B6] space-y-1 text-[13px] text-[#52666A]">
          {splits.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="capitalize">{s.method}</span>
              <span className="num font-medium">{formatRs(s.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {typeof tendered === 'number' && tendered > 0 && (
        <>
          <div className="flex items-center justify-between text-[#3D5357] pt-1">
            <span>Received</span>
            <span className="font-semibold num">{formatRs(tendered)}</span>
          </div>
          <div className="flex items-center justify-between font-bold text-[#0E5E66]">
            <span>Change due</span>
            <span className="num">{formatRs(change)}</span>
          </div>
        </>
      )}
    </div>
  );
}
