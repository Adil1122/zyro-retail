'use client';

import React, { useMemo, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { SWATCHES } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { getStockStatusInfo } from '@/lib/inventory';
import type { ProductItem } from '@/types';
import { ProductArtwork } from './ProductArtwork';

export interface ProductSelectorProps {
  onSelect: (item: ProductItem) => void;
  showOutOfStock?: boolean;
  placeholder?: string;
}

export function ProductSelector({
  onSelect,
  showOutOfStock = true,
  placeholder = 'Search item name, SKU or scan barcode...',
}: ProductSelectorProps) {
  const { state } = useZyro();
  const [query, setQuery] = useState('');
  const [catId, setCatId] = useState('all');

  const categoryTabs = useMemo(
    () => [{ id: 'all', label: 'All items' }, ...state.categories.map((c) => ({ id: c.id, label: c.label }))],
    [state.categories]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.items.filter((it) => {
      if (catId !== 'all' && it.cat !== catId) return false;
      if (!showOutOfStock && getStockStatusInfo(it).kind === 'err') return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        (it.barcode && it.barcode.toLowerCase().includes(q))
      );
    });
  }, [state.items, catId, query, showOutOfStock]);

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        rightSlot={<ScanBarcode className="w-4 h-4 text-[#52666A] shrink-0" />}
      />

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categoryTabs.map((c) => {
          const active = catId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatId(c.id)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
                active
                  ? 'bg-[#08343A] text-white border-[#08343A]'
                  : 'bg-white text-[#3D5357] border-[#D6CDC1] hover:bg-[#F8F4EF]'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filtered.map((item) => {
          const st = getStockStatusInfo(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="tile text-start rounded-[14px] border border-[#E7E0D7] bg-white p-3 flex items-center gap-3 hover:shadow-xs"
            >
              <ProductArtwork item={item} size={52} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">
                  {item.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[13px] font-bold text-[#08343A] num">
                    {formatRs(item.price)}
                    {item.unit ? <span className="text-[11px] font-normal text-[#52666A]"> {item.unit}</span> : null}
                  </span>
                  {item.colours && item.colours.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      {item.colours.slice(0, 3).map((col) => (
                        <span
                          key={col}
                          style={{ backgroundColor: SWATCHES[col] || '#8C918E' }}
                          className="w-2.5 h-2.5 rounded-full border border-black/15"
                        />
                      ))}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span style={{ backgroundColor: st.dot }} className="w-2 h-2 rounded-full" />
                  <span style={{ color: st.fg }} className="text-[11px] font-semibold">
                    {st.text}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="py-8 text-center text-[14px] text-[#52666A]">
          No items match “{query}”. <Badge tone="neutral">Try SKU or barcode</Badge>
        </div>
      )}
    </div>
  );
}
