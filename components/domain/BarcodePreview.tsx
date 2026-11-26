'use client';

import React from 'react';
import { generateBarcodeBars } from '@/lib/inventory';

export interface BarcodePreviewProps {
  code: string;
  label?: string;
  priceText?: string;
  width?: number;
  height?: number;
}

export function BarcodePreview({
  code,
  label,
  priceText,
  width = 200,
  height = 44,
}: BarcodePreviewProps) {
  const bars = generateBarcodeBars(code || 'ZYRO-001', width);

  return (
    <div className="inline-flex flex-col items-center p-3 rounded-[10px] border border-[#E7E0D7] bg-white text-[#111111]">
      {label && <div className="text-[11px] font-semibold text-[#0B2A2F] mb-1 truncate max-w-[200px]">{label}</div>}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={`Barcode ${code}`}>
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#111111" />
        ))}
      </svg>
      <div className="flex items-center justify-between w-full mt-1 text-[11px] mono">
        <span>{code}</span>
        {priceText && <span className="font-bold">{priceText}</span>}
      </div>
    </div>
  );
}
