'use client';

import React from 'react';
import { getArtVisual } from '@/lib/inventory';
import type { ProductItem } from '@/types';

export interface ProductArtworkProps {
  item?: ProductItem;
  artId?: string;
  colourName?: string | null;
  imageUrl?: string | null;
  alt?: string;
  colourIdx?: number | null;
  size?: number;
  className?: string;
}

export function ProductArtwork({
  item,
  artId,
  colourName,
  imageUrl,
  alt,
  colourIdx = 0,
  size = 56,
  className = '',
}: ProductArtworkProps) {
  const syntheticItem: ProductItem = item ?? {
    id: 'art',
    art: (artId === 'chappal' || artId === 'khussa' || artId === 'sneaker' ? artId : 'sneaker'),
    name: alt || 'Footwear',
    cat: 'footwear',
    price: 0,
    sku: 'FTW',
    colours: [colourName || 'Black'],
  };
  const art = getArtVisual(syntheticItem, colourIdx);

  return (
    <div
      style={{ width: size, height: size }}
      className={`ph rounded-[12px] bg-[#F1EBE3] border border-[#E7E0D7] flex items-center justify-center shrink-0 overflow-hidden ${className}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt || syntheticItem.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 120 120" className="w-[82%] h-[82%]" aria-hidden="true">
          <path d={art.body} fill={art.fill} />
          <path d={art.shade} fill={art.shadeCol} />
          <path d={art.line} fill="none" stroke={art.lineCol} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
