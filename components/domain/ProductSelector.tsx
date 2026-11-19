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
import type { FootwearProductRecord } from '@/types/footwear';
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

export interface FootwearProductSelectorProps {
  products: FootwearProductRecord[];
  categories: Array<{ id: string; name: string }>;
  brands?: string[];
  sizes?: string[];
  colours?: string[];
  loading?: boolean;
  onSelect: (product: FootwearProductRecord) => void;
  placeholder?: string;
}

function getFootwearStockBadge(product: FootwearProductRecord) {
  if (product.totalStock <= 0) {
    return { dot: '#B42318', fg: '#B42318', text: 'Out of stock' };
  }
  if (product.outOfStockVariants > 0 || product.lowStockVariants > 0) {
    return {
      dot: '#B57B00',
      fg: '#6B4E00',
      text: `${product.totalStock} pairs · ${product.outOfStockVariants > 0 ? `${product.outOfStockVariants} size out` : 'Low stock'}`,
    };
  }
  return { dot: '#14532D', fg: '#14532D', text: `${product.totalStock} pairs in stock` };
}

export function FootwearProductSelector({
  products,
  categories,
  brands = [],
  sizes = [],
  colours = [],
  loading = false,
  onSelect,
  placeholder = 'Search footwear name, brand, model, SKU or barcode...',
}: FootwearProductSelectorProps) {
  const [query, setQuery] = useState('');
  const [catId, setCatId] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [colourFilter, setColourFilter] = useState('all');

  const categoryTabs = useMemo(
    () => [{ id: 'all', label: 'All footwear' }, ...categories.map((c) => ({ id: c.id, label: c.name }))],
    [categories]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (catId !== 'all' && p.categoryId !== catId) return false;
      if (brandFilter !== 'all' && (p.brand || '') !== brandFilter) return false;
      if (sizeFilter !== 'all' && !p.sizes.includes(sizeFilter)) return false;
      if (colourFilter !== 'all' && !p.colours.includes(colourFilter)) return false;
      if (!q) return true;
      const variantMatch = p.variants.some(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.sizeName.toLowerCase().includes(q) ||
          v.colourName.toLowerCase().includes(q) ||
          (v.primaryBarcode && v.primaryBarcode.toLowerCase().includes(q)) ||
          v.barcodes.some((b) => b.barcode.toLowerCase().includes(q))
      );
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        p.footwearType.toLowerCase().includes(q) ||
        variantMatch
      );
    });
  }, [products, catId, brandFilter, sizeFilter, colourFilter, query]);

  const hasFacetFilters = brandFilter !== 'all' || sizeFilter !== 'all' || colourFilter !== 'all';

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

      {(brands.length > 0 || sizes.length > 0 || colours.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {brands.length > 0 && (
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              aria-label="Filter by brand"
              className="h-8 px-2.5 rounded-[8px] border border-[#D6CDC1] bg-white text-[12px] font-medium text-[#0B2A2F]"
            >
              <option value="all">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
          {sizes.length > 0 && (
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              aria-label="Filter by size"
              className="h-8 px-2.5 rounded-[8px] border border-[#D6CDC1] bg-white text-[12px] font-medium text-[#0B2A2F]"
            >
              <option value="all">All sizes</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  Size {s}
                </option>
              ))}
            </select>
          )}
          {colours.length > 0 && (
            <select
              value={colourFilter}
              onChange={(e) => setColourFilter(e.target.value)}
              aria-label="Filter by colour"
              className="h-8 px-2.5 rounded-[8px] border border-[#D6CDC1] bg-white text-[12px] font-medium text-[#0B2A2F]"
            >
              <option value="all">All colours</option>
              {colours.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {hasFacetFilters && (
            <button
              type="button"
              onClick={() => {
                setBrandFilter('all');
                setSizeFilter('all');
                setColourFilter('all');
              }}
              className="text-[12px] font-semibold text-[#C9682E] hover:underline px-1"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[82px] rounded-[14px] border border-[#E7E0D7] bg-white/70 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filtered.map((product) => {
            const st = getFootwearStockBadge(product);
            const prices = product.variants.map((v) => v.sellingPrice);
            const minPrice = prices.length ? Math.min(...prices) : product.baseSellingPrice;
            const maxPrice = prices.length ? Math.max(...prices) : product.baseSellingPrice;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                className="tile text-start rounded-[14px] border border-[#E7E0D7] bg-white p-3 flex items-center gap-3 hover:shadow-xs"
              >
                <ProductArtwork
                  artId={product.artId}
                  imageUrl={product.primaryImageUrl}
                  alt={product.name}
                  size={52}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">
                    {product.name}
                  </div>
                  <div className="text-[11px] text-[#52666A] truncate">
                    {[product.brand, product.footwearType, product.sizingSystem].filter(Boolean).join(' · ')}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[13px] font-bold text-[#08343A] num">
                      {minPrice === maxPrice ? formatRs(minPrice) : `${formatRs(minPrice)}+`}
                    </span>
                    {product.colours.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        {product.colours.slice(0, 4).map((col) => (
                          <span
                            key={col}
                            title={col}
                            style={{ backgroundColor: SWATCHES[col] || '#8C918E' }}
                            className="w-2.5 h-2.5 rounded-full border border-black/15"
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span style={{ backgroundColor: st.dot }} className="w-2 h-2 rounded-full" />
                    <span style={{ color: st.fg }} className="text-[11px] font-semibold truncate">
                      {st.text}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-8 text-center text-[14px] text-[#52666A]">
          {products.length === 0 ? (
            <>No active footwear products in this branch yet. Add items in Stock first.</>
          ) : (
            <>
              No footwear matches your filter. <Badge tone="neutral">Try SKU or barcode</Badge>
            </>
          )}
        </div>
      )}
    </div>
  );
}
