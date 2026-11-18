'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FolderKanban,
  Layers,
  Plus,
  Printer,
  Ruler,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { BarcodePreview } from '@/components/domain/BarcodePreview';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { CATEGORY_TINTS, SWATCHES } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import {
  getSku,
  getStockStatusInfo,
  getTotalStock,
  getVariantReserved,
  getVariantStock,
} from '@/lib/inventory';
import type { ProductItem } from '@/types';

const ADJUST_REASONS = [
  'Damaged or torn',
  'Found during shelf check',
  'Sample or display unit',
  'Count correction',
  'Returned by staff',
];

export function InventoryHub() {
  const { state, role, kit, settings, saveItem, deleteItem, adjustStock, notify } = useZyro();
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [tab, setTab] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modals inside drawer
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjDelta, setAdjDelta] = useState('-1');
  const [adjVariant, setAdjVariant] = useState('Main stock');
  const [adjVariantKey, setAdjVariantKey] = useState<string | undefined>(undefined);
  const [adjReason, setAdjReason] = useState(ADJUST_REASONS[0]);

  const [priceOpen, setPriceOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');

  const [tagVariantKey, setTagVariantKey] = useState<string>('0-0');
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('item');
    if (id && state.items.some((x) => x.id === id)) {
      setSelectedId(id);
    }
  }, [state.items]);

  const canManageStock = role === 'owner' || role === 'inventory';
  const isOwner = role === 'owner';

  const getExpiryState = (it: ProductItem): 'ok' | 'expiring' | 'expired' => {
    if (!it.batches || it.batches.length === 0) return 'ok';
    const now = new Date('2026-11-17');
    let hasExpired = false;
    let hasExpiring = false;
    it.batches.forEach((b) => {
      const d = new Date(b.expiry);
      const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
      if (diffDays < 0) hasExpired = true;
      else if (diffDays <= 60) hasExpiring = true;
    });
    if (hasExpired) return 'expired';
    if (hasExpiring) return 'expiring';
    return 'ok';
  };

  const hasShoeGap = (it: ProductItem) => {
    if (!it.sizes || !it.colours) return false;
    return it.colours.some((_, ci) =>
      it.sizes!.some((__, si) => getVariantStock(it, ci, si) === 0)
    );
  };

  const filtered = useMemo(() => {
    return state.items.filter((it) => {
      if (catFilter !== 'all' && it.cat !== catFilter) return false;
      if (tab === 'low') {
        if (it.measured || getTotalStock(it) > 5) return false;
      } else if (tab === 'measured') {
        if (!it.measured) return false;
      } else if (tab === 'gaps') {
        if (!hasShoeGap(it)) return false;
      } else if (tab === 'idle') {
        if (it.cat !== 'foot' && kit !== 'shoes') return false;
        if (getTotalStock(it) < 12) return false;
      } else if (tab === 'expiring') {
        if (getExpiryState(it) !== 'expiring') return false;
      } else if (tab === 'expired') {
        if (getExpiryState(it) !== 'expired') return false;
      }

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        it.sku.toLowerCase().includes(q) ||
        (it.barcode && it.barcode.toLowerCase().includes(q))
      );
    });
  }, [state.items, catFilter, tab, query, kit]);

  const selected = useMemo(
    () => state.items.find((x) => x.id === selectedId) || null,
    [state.items, selectedId]
  );

  const totalUnits = useMemo(
    () => state.items.reduce((s, it) => s + getTotalStock(it), 0),
    [state.items]
  );
  const lowCount = useMemo(
    () => state.items.filter((it) => !it.measured && getTotalStock(it) <= 5).length,
    [state.items]
  );
  const totalValue = useMemo(
    () =>
      state.items.reduce(
        (s, it) => s + getTotalStock(it) * (it.costPrice ?? Math.round(it.price * 0.6)),
        0
      ),
    [state.items]
  );

  const tabs = useMemo(() => {
    const base: Array<{
      id: string;
      label: string;
      count?: number;
      badgeTone?: 'ok' | 'warn' | 'err' | 'neutral';
    }> = [
      { id: 'all', label: 'All items', count: state.items.length },
      { id: 'low', label: 'Low or out', count: lowCount, badgeTone: lowCount > 0 ? 'warn' : 'neutral' },
      {
        id: 'measured',
        label: 'Measured',
        count: state.items.filter((i) => i.measured).length,
      },
    ];
    if (kit === 'shoes') {
      base.push({
        id: 'gaps',
        label: 'Size gaps',
        count: state.items.filter(hasShoeGap).length,
        badgeTone: 'warn',
      });
      base.push({ id: 'idle', label: 'Slow movers' });
    }
    if (kit === 'pharmacy' || kit === 'cosmetics') {
      const expSoon = state.items.filter((i) => getExpiryState(i) === 'expiring').length;
      const expired = state.items.filter((i) => getExpiryState(i) === 'expired').length;
      base.push({ id: 'expiring', label: 'Expiring ≤60d', count: expSoon, badgeTone: 'warn' });
      base.push({ id: 'expired', label: 'Expired', count: expired, badgeTone: expired > 0 ? 'err' : 'neutral' });
    }
    return base;
  }, [state.items, lowCount, kit]);

  const getVariantOptions = (it: ProductItem | null) => {
    if (!it || !it.colours || it.colours.length === 0) return [];
    const opts: Array<{ value: string; label: string; rawLabel: string; code: string }> = [];
    it.colours.forEach((col, ci) => {
      if (it.sizes && it.sizes.length > 0) {
        it.sizes.forEach((sz, si) => {
          const qty = getVariantStock(it, ci, si);
          opts.push({
            value: `${ci}-${si}`,
            label: `${col} · ${sz} (${qty} left)`,
            rawLabel: `${col} · ${sz}`,
            code: getSku(it, ci, si),
          });
        });
      } else {
        const qty = getVariantStock(it, ci, null);
        opts.push({
          value: `${ci}-x`,
          label: `${col} (${qty} left)`,
          rawLabel: col,
          code: getSku(it, ci, null),
        });
      }
    });
    return opts;
  };

  const selectedVariants = useMemo(() => getVariantOptions(selected), [selected]);

  const openAdjustFor = (it: ProductItem) => {
    const opts = getVariantOptions(it);
    if (opts.length > 0) {
      setAdjVariantKey(opts[0].value);
      setAdjVariant(opts[0].rawLabel);
    } else {
      setAdjVariantKey(undefined);
      setAdjVariant('Main stock');
    }
    setAdjDelta('-1');
    setAdjReason(ADJUST_REASONS[0]);
    setAdjustOpen(true);
  };

  const openPriceFor = (it: ProductItem) => {
    setNewPrice(String(it.price));
    setNewCost(String(it.costPrice ?? Math.round(it.price * 0.6)));
    setPriceOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={canManageStock ? 'Stock room & catalog' : 'Cashier stock lookup'}
        title="Stock & items"
        subtitle={
          canManageStock
            ? 'Track quantities by colour and size, adjust damaged units, and print shelf barcodes.'
            : 'Read-only lookup to check sizes, colours, and prices at the counter.'
        }
        actions={
          canManageStock ? (
            <div className="flex flex-wrap items-center gap-2">
              {isOwner && (
                <Link href="/inventory/categories">
                  <Button variant="secondary" size="lg">
                    <FolderKanban className="w-4 h-4" /> Categories
                  </Button>
                </Link>
              )}
              <Link href="/inventory/count">
                <Button variant="secondary" size="lg">
                  <ClipboardCheck className="w-4 h-4" /> Count stock
                </Button>
              </Link>
              <Link href="/inventory/measured">
                <Button variant="secondary" size="lg">
                  <Ruler className="w-4 h-4" /> Measured
                </Button>
              </Link>
              <Link href="/inventory/photos">
                <Button variant="secondary" size="lg">
                  <Camera className="w-4 h-4" /> Photos
                </Button>
              </Link>
              <Link href="/inventory/items/new">
                <Button variant="dark" size="lg">
                  <Plus className="w-4 h-4" /> Add item
                </Button>
              </Link>
            </div>
          ) : (
            <Badge tone="neutral">View only · Ask Stockkeeper to adjust</Badge>
          )
        }
      />

      {/* Summary metrics */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <StatCard label="Active SKUs" value={state.items.length} sub={`${state.categories.length} categories`} icon={<Boxes className="w-4 h-4" />} />
        <StatCard label="Total units on shelf" value={totalUnits} sub="Excludes measured rolls" icon={<Layers className="w-4 h-4" />} />
        <StatCard
          label="Low or out of stock"
          value={lowCount}
          tone={lowCount > 0 ? 'warn' : 'ok'}
          sub="≤ 5 units left across variants"
          onClick={() => setTab('low')}
        />
        {isOwner && (
          <StatCard
            label="Stock value (at cost)"
            value={formatRs(totalValue)}
            sub="Owner-only cost valuation"
          />
        )}
      </div>

      {settings.offlineModeSimulated && (
        <div className="p-3.5 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[13px] text-[#6B4E00] font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Offline mode active — stock edits queue locally until reconnected.</span>
          </div>
          <Link href="/pos/sync-check">
            <Button size="sm" variant="secondary">Sync check</Button>
          </Link>
        </div>
      )}

      {/* Filters & Tabs */}
      <div className="space-y-3">
        <Tabs activeId={tab} onChange={setTab} tabs={tabs} />
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search item name, SKU, or barcode..."
            />
          </div>
          <div className="w-full sm:w-[220px]">
            <Select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All categories' },
                ...state.categories.map((c) => ({ value: c.id, label: c.label })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Inventory table */}
      <DataTable<ProductItem>
        rows={filtered}
        rowKey={(it) => it.id}
        onRowClick={(it) => setSelectedId(it.id)}
        emptyState={
          <EmptyState
            title="No matching items"
            body="Clear the search filter or add a new item to your catalog."
            action={
              canManageStock && (
                <Link href="/inventory/items/new">
                  <Button variant="primary">Add item</Button>
                </Link>
              )
            }
          />
        }
        columns={[
          {
            key: 'item',
            header: 'Item',
            render: (it) => (
              <div className="flex items-center gap-3 min-w-[200px]">
                <ProductArtwork item={it} size={42} />
                <div className="min-w-0">
                  <div className="font-semibold text-[#0B2A2F] truncate">{it.name}</div>
                  <div className="text-[12px] text-[#52666A] mono">{it.sku}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'cat',
            header: 'Category',
            render: (it) => {
              const cat = state.categories.find((c) => c.id === it.cat);
              const tint = CATEGORY_TINTS[it.cat];
              return (
                <span
                  style={tint ? { backgroundColor: tint.bg, color: tint.fg } : undefined}
                  className="inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#EAE3D9] text-[#3D5357]"
                >
                  {cat?.label || it.cat}
                </span>
              );
            },
          },
          {
            key: 'variants',
            header: 'Variants / Spec',
            render: (it) => (
              <div className="text-[13px] text-[#52666A]">
                {it.colours
                  ? `${it.colours.length} colours${it.sizes ? ` · ${it.sizes.length} sizes` : ''}`
                  : it.batches
                    ? `${it.batches.length} batches`
                    : it.serials
                      ? `${it.serials.length} IMEIs`
                      : it.measured
                        ? 'Measured by metre'
                        : 'Single SKU'}
              </div>
            ),
          },
          {
            key: 'stock',
            header: 'Stock',
            render: (it) => {
              const st = getStockStatusInfo(it);
              const exp = getExpiryState(it);
              return (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={st.kind === 'ok' ? 'ok' : st.kind === 'warn' ? 'warn' : 'err'}>
                    {st.text}
                  </Badge>
                  {exp === 'expiring' && <Badge tone="warn">Expiring soon</Badge>}
                  {exp === 'expired' && <Badge tone="err">Expired</Badge>}
                </div>
              );
            },
          },
          ...(isOwner
            ? [
                {
                  key: 'cost',
                  header: 'Cost',
                  align: 'end' as const,
                  render: (it: ProductItem) => (
                    <span className="num text-[#52666A]">
                      {formatRs(it.costPrice ?? Math.round(it.price * 0.6))}
                    </span>
                  ),
                },
              ]
            : []),
          {
            key: 'price',
            header: 'Price',
            align: 'end',
            render: (it) => (
              <span className="font-bold num">
                {formatRs(it.price)}
                {it.unit ? <span className="text-[11px] font-normal text-[#52666A]"> {it.unit}</span> : null}
              </span>
            ),
          },
        ]}
      />

      {/* Stock Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name || ''}
        subtitle={selected ? `SKU ${selected.sku} · Selling price ${formatRs(selected.price)}` : ''}
        badge={
          selected ? (
            <Badge
              tone={
                getStockStatusInfo(selected).kind === 'ok'
                  ? 'ok'
                  : getStockStatusInfo(selected).kind === 'warn'
                    ? 'warn'
                    : 'err'
              }
            >
              {getStockStatusInfo(selected).text}
            </Badge>
          ) : undefined
        }
        footer={
          selected &&
          canManageStock && (
            <>
              <Button variant="secondary" onClick={() => openAdjustFor(selected)}>
                <SlidersHorizontal className="w-4 h-4" /> Adjust stock
              </Button>
              {isOwner && (
                <Button variant="secondary" onClick={() => openPriceFor(selected)}>
                  <Edit3 className="w-4 h-4" /> Change price
                </Button>
              )}
              <Link href={`/inventory/items/${selected.id}`}>
                <Button variant="primary">Edit item</Button>
              </Link>
              {isOwner && (
                <Button
                  variant="ghost"
                  onClick={() => setDeleteOpen(true)}
                  aria-label={`Delete ${selected.name}`}
                >
                  <Trash2 className="w-4 h-4 text-[#B42318]" />
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-3.5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7]">
              <ProductArtwork item={selected} size={64} />
              <div className="space-y-1">
                <div className="text-[13px] text-[#52666A]">
                  Category: <strong className="text-[#0B2A2F]">{selected.cat}</strong>
                </div>
                {isOwner && (
                  <div className="text-[13px] text-[#52666A]">
                    Cost price:{' '}
                    <strong className="text-[#0B2A2F] num">
                      {formatRs(selected.costPrice ?? Math.round(selected.price * 0.6))}
                    </strong>
                  </div>
                )}
                {selected.karat && (
                  <div className="text-[12px] text-[#52666A]">
                    Karat {selected.karat} · {selected.weightGrams}g · Making {formatRs(selected.makingCharge || 0)}
                  </div>
                )}
              </div>
            </div>

            {selected.measured && (
              <div className="p-3.5 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] space-y-2">
                <div className="font-semibold text-[13px] text-[#6B4E00]">
                  Measured item — locked from fast counter scanning
                </div>
                <p className="text-[12px] text-[#6B4E00]">
                  Fabric and loose items sold by metre or kg are verified from the Measured Items desk.
                </p>
                <Link href="/inventory/measured">
                  <Button size="sm" variant="secondary">Open Measured Desk</Button>
                </Link>
              </div>
            )}

            {/* Variant breakdown */}
            {selected.colours && selected.colours.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                  Stock by colour &amp; size
                </h3>
                {selected.colours.map((col, ci) => (
                  <Card key={col} padding="sm" className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: SWATCHES[col] || '#8C918E' }}
                        />
                        <span className="font-semibold text-[14px] text-[#0B2A2F]">{col}</span>
                      </div>
                      <span className="text-[12px] text-[#52666A] mono">
                        {getSku(selected, ci, null)}
                      </span>
                    </div>
                    {selected.sizes && selected.sizes.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {selected.sizes.map((sz, si) => {
                          const qty = getVariantStock(selected, ci, si);
                          const res = getVariantReserved(selected, ci, si);
                          return (
                            <div
                              key={sz}
                              className={`p-2 rounded-[8px] border text-center ${
                                qty === 0
                                  ? 'bg-[#FDF0EF] border-[#F0C8C3] text-[#B42318]'
                                  : qty <= 2
                                    ? 'bg-[#FFF9E6] border-[#EBD892] text-[#6B4E00]'
                                    : 'bg-[#FBF8F4] border-[#E7E0D7] text-[#0B2A2F]'
                              }`}
                            >
                              <div className="text-[11px] font-semibold">{sz}</div>
                              <div className="text-[14px] font-bold num">{qty}</div>
                              {res > 0 && (
                                <div className="text-[10px] text-[#52666A]">{res} rsv</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[13px] text-[#0B2A2F] font-semibold num">
                        {getVariantStock(selected, ci, null)} units in stock
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* Pharmacy batches */}
            {selected.batches && selected.batches.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                  Batches &amp; Expiry
                </h3>
                {selected.batches.map((b) => (
                  <div
                    key={b.batchNo}
                    className="flex items-center justify-between p-3 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4]"
                  >
                    <div>
                      <div className="font-semibold text-[13px] mono">Batch {b.batchNo}</div>
                      <div className="text-[12px] text-[#52666A]">Expires {b.expiry}</div>
                    </div>
                    <Badge tone={b.qty === 0 ? 'err' : 'ok'}>{b.qty} packs</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Electronics IMEIs */}
            {selected.serials && selected.serials.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                  Tracked Serials / IMEIs ({selected.warrantyMonths || 12}m warranty)
                </h3>
                <div className="space-y-1.5">
                  {selected.serials.map((s) => (
                    <div key={s} className="px-3 py-2 rounded-[9px] bg-[#FBF8F4] border border-[#E7E0D7] mono text-[12px] flex items-center justify-between">
                      <span>{s}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7A48]" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Barcode label */}
            {(() => {
              const activeTag = selectedVariants.find((v) => v.value === tagVariantKey) || selectedVariants[0];
              const previewCode = activeTag?.code || selected.barcode || `${selected.sku}-01`;
              const previewLabel = activeTag ? `${selected.name} · ${activeTag.rawLabel}` : selected.name;
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                      Shelf / Tag Barcode
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {selectedVariants.length > 1 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            notify(
                              `Queued ${selectedVariants.length} variant barcode tags for ${selected.name}`,
                              'ok'
                            )
                          }
                        >
                          <Printer className="w-3.5 h-3.5" /> Print all ({selectedVariants.length})
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => notify(`Sent barcode tag (${previewCode}) to label printer`, 'ok')}
                      >
                        <Printer className="w-3.5 h-3.5" /> Print tag
                      </Button>
                    </div>
                  </div>
                  {selectedVariants.length > 0 && (
                    <Select
                      label="Variant tag"
                      value={activeTag?.value || ''}
                      onChange={(e) => setTagVariantKey(e.target.value)}
                      options={selectedVariants.map((v) => ({ value: v.value, label: `${v.rawLabel} (${v.code})` }))}
                    />
                  )}
                  <BarcodePreview
                    code={previewCode}
                    label={previewLabel}
                    priceText={formatRs(selected.price)}
                  />
                </div>
              );
            })()}

            {/* Adjustment history */}
            {state.stockAdjustments.filter((a) => a.itemId === selected.id).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                  Recent stock adjustments
                </h3>
                <div className="space-y-1.5">
                  {state.stockAdjustments
                    .filter((a) => a.itemId === selected.id)
                    .slice(0, 5)
                    .map((a) => (
                      <div key={a.id} className="p-2.5 rounded-[9px] border border-[#E7E0D7] text-[12px] flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#0B2A2F]">
                            {a.variantLabel} · {a.reason}
                          </div>
                          <div className="text-[#52666A]">
                            By {a.by} · {a.at}
                          </div>
                        </div>
                        <span className={`font-bold num ${a.delta >= 0 ? 'text-[#14532D]' : 'text-[#B42318]'}`}>
                          {a.delta >= 0 ? `+${a.delta}` : a.delta}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Adjust Stock Modal */}
      <Modal
        open={adjustOpen && !!selected}
        onClose={() => setAdjustOpen(false)}
        title={`Adjust stock · ${selected?.name || ''}`}
        subtitle="Record shrinkage, shelf discoveries, or physical damage."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selected) return;
                const d = parseInt(adjDelta, 10);
                if (Number.isNaN(d) || d === 0) {
                  notify('Enter a non-zero quantity change', 'err');
                  return;
                }
                adjustStock(selected.id, adjVariant, d, adjReason, adjVariantKey);
                notify(`Adjusted ${selected.name} (${d > 0 ? `+${d}` : d})`, 'ok');
                setAdjustOpen(false);
              }}
            >
              Save adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedVariants.length > 0 ? (
            <Select
              label="Colour / size variant"
              value={adjVariantKey || selectedVariants[0].value}
              onChange={(e) => {
                const key = e.target.value;
                setAdjVariantKey(key);
                const opt = selectedVariants.find((v) => v.value === key);
                if (opt) setAdjVariant(opt.rawLabel);
              }}
              options={selectedVariants.map((v) => ({ value: v.value, label: v.label }))}
            />
          ) : (
            <Input
              label="Variant or location"
              value={adjVariant}
              onChange={(e) => setAdjVariant(e.target.value)}
            />
          )}
          <Input
            label="Quantity change (use − for removal, + for found)"
            type="number"
            value={adjDelta}
            onChange={(e) => setAdjDelta(e.target.value)}
          />
          <Select
            label="Reason"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            options={ADJUST_REASONS.map((r) => ({ value: r, label: r }))}
          />
        </div>
      </Modal>

      {/* Owner Price Edit Modal */}
      <Modal
        open={priceOpen && !!selected}
        onClose={() => setPriceOpen(false)}
        title={`Edit pricing · ${selected?.name || ''}`}
        subtitle="Changes apply immediately on the selling register."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selected) return;
                const p = parseInt(newPrice, 10);
                const c = parseInt(newCost, 10);
                if (Number.isNaN(p) || p <= 0) {
                  notify('Enter a valid selling price', 'err');
                  return;
                }
                saveItem({
                  ...selected,
                  price: p,
                  costPrice: Number.isNaN(c) ? selected.costPrice : c,
                });
                notify(`Updated price of ${selected.name} to ${formatRs(p)}`, 'ok');
                setPriceOpen(false);
              }}
            >
              Update price
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Selling price (Rs)"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <Input
            label="Cost price (Rs)"
            type="number"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen && !!selected}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!selected) return;
          const itemName = selected.name;
          deleteItem(selected.id);
          setSelectedId(null);
          notify(`Deleted ${itemName} from catalog`, 'info');
        }}
        title={`Delete ${selected?.name || 'item'}?`}
        body="This removes the item from your active catalog. Past bills keep their record."
        confirmLabel="Delete item"
      />
    </div>
  );
}
