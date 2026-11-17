'use client';

import React from 'react';
import { getArtVisual } from '@/lib/inventory';
import type { ProductItem } from '@/types';

export interface ProductArtworkProps {
  item: ProductItem;
  colourIdx?: number | null;
  size?: number;
  className?: string;
}

export function ProductArtwork({ item, colourIdx = 0, size = 56, className = '' }: ProductArtworkProps) {
  const art = getArtVisual(item, colourIdx);

  return (
    <div
      style={{ width: size, height: size }}
      className={`ph rounded-[12px] bg-[#F1EBE3] border border-[#E7E0D7] flex items-center justify-center shrink-0 overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 120 120" className="w-[82%] h-[82%]" aria-hidden="true">
        <path d={art.body} fill={art.fill} />
        <path d={art.shade} fill={art.shadeCol} />
        <path d={art.line} fill="none" stroke={art.lineCol} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
