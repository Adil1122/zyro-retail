'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  FolderKanban,
  History,
  Layers,
  Plus,
  Printer,
  RefreshCw,
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
import { SWATCHES } from '@/constants/kits';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  footwearInventoryService,
  type InventoryProductsResponse,
} from '@/features/inventory/services/footwear-inventory.service';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import {
  FOOTWEAR_TYPES,
  type FootwearProductRecord,
  type StockMovementRecord,
} from '@/types/footwear';

const ADJUSTMENT_TYPES: Array<{
  value: 'damage' | 'shrinkage' | 'adjustment' | 'opening_stock';
  label: string;
  defaultReason: string;
}> = [
  { value: 'damage', label: 'Damaged footwear (−)', defaultReason: 'Damaged box or sole defect' },
  { value: 'shrinkage', label: 'Lost / shrinkage (−)', defaultReason: 'Missing pair during shelf check' },
  { value: 'adjustment', label: 'Found / manual correction (+/−)', defaultReason: 'Found during shelf check' },
  { value: 'opening_stock', label: 'Opening / restock entry (+)', defaultReason: 'Opening stock count entry' },
];

export function InventoryHub() {
  const { notify } = useZyro();
  const { activeMembership, hasPermission } = useAuth();

  const [branchId, setBranchId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [colourFilter, setColourFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<InventoryProductsResponse | null>(null);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<FootwearProductRecord | null>(null);
  const [selectedMovements, setSelectedMovements] = useState<StockMovementRecord[]>([]);

  // Modals inside drawer
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjVariantId, setAdjVariantId] = useState('');
  const [adjType, setAdjType] = useState<'damage' | 'shrinkage' | 'adjustment' | 'opening_stock'>('damage');
  const [adjDelta, setAdjDelta] = useState('-1');
  const [adjReason, setAdjReason] = useState(ADJUSTMENT_TYPES[0].defaultReason);
  const [savingAdj, setSavingAdj] = useState(false);

  const [priceOpen, setPriceOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const [tagVariantId, setTagVariantId] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canManageStock = hasPermission('inventory.manage');
  const canManageCategories = hasPermission('inventory.categories') || canManageStock;
  const isOwner =
    activeMembership?.roleName.toLowerCase() === 'owner' ||
    hasPermission('settings.manage') ||
    hasPermission('reports.view');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const stockFilterParam =
        tab === 'low' ? 'low' : tab === 'out' ? 'out' : 'all';
      const res = await footwearInventoryService.listProducts({
        branchId: branchId || undefined,
        q: query.trim() || undefined,
        footwearType: typeFilter !== 'all' ? typeFilter : undefined,
        brand: brandFilter !== 'all' ? brandFilter : undefined,
        size: sizeFilter !== 'all' ? sizeFilter : undefined,
        colour: colourFilter !== 'all' ? colourFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        stockFilter: stockFilterParam,
        sort: sortBy,
        page,
        pageSize: 25,
      });
      setData(res);
      if (!branchId && res.branch?.id) {
        setBranchId(res.branch.id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load footwear inventory');
    } finally {
      setLoading(false);
    }
  }, [branchId, query, typeFilter, brandFilter, sizeFilter, colourFilter, statusFilter, sortBy, page, tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Load movements when Movements tab is selected
  useEffect(() => {
    if (tab !== 'movements') return;
    setMovementsLoading(true);
    footwearInventoryService
      .listMovements({ branchId: branchId || undefined, limit: 80 })
      .then((res) => setMovements(res.movements))
      .catch((err) => notify(err instanceof Error ? err.message : 'Failed to load movements', 'err'))
      .finally(() => setMovementsLoading(false));
  }, [tab, branchId, notify]);

  // Deep-link ?item=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('item');
    if (id) setSelectedId(id);
  }, []);

  // Load full detail (multi-branch stock + movements) when drawer opens
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      setSelectedMovements([]);
      return;
    }
    let cancelled = false;
    footwearInventoryService
      .getProduct(selectedId, branchId || undefined)
      .then((res) => {
        if (cancelled) return;
        setSelectedDetail(res.product);
        if (res.product.variants[0]) {
          setTagVariantId(res.product.variants[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedDetail(null);
      });

    footwearInventoryService
      .listMovements({ branchId: branchId || undefined, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setSelectedMovements(res.movements.filter((m) => m.productId === selectedId).slice(0, 10));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selectedId, branchId]);

  const products = useMemo(() => {
    const list = data?.products ?? [];
    if (tab === 'gaps') {
      return list.filter((p) => p.outOfStockVariants > 0 && p.totalStock > 0);
    }
    return list;
  }, [data?.products, tab]);

  const selected = useMemo(() => {
    if (selectedDetail && selectedDetail.id === selectedId) return selectedDetail;
    return products.find((p) => p.id === selectedId) ?? null;
  }, [selectedDetail, products, selectedId]);

  const summary = data?.summary;
  const branches = data?.branches ?? [];

  const getStockBadge = (p: FootwearProductRecord) => {
    if (!p.isActive) return { text: 'Inactive', tone: 'neutral' as const };
    if (p.totalStock <= 0) return { text: 'Out of stock', tone: 'err' as const };
    if (p.lowStockVariants > 0 || p.totalStock <= 5) {
      return { text: `${p.totalStock} pairs · ${p.lowStockVariants} low`, tone: 'warn' as const };
    }
    return { text: `${p.totalStock} pairs`, tone: 'ok' as const };
  };

  const openAdjustFor = (p: FootwearProductRecord) => {
    const firstVar = p.variants[0];
    setAdjVariantId(firstVar?.id ?? '');
    setAdjType('damage');
    setAdjDelta('-1');
    setAdjReason(ADJUSTMENT_TYPES[0].defaultReason);
    setAdjustOpen(true);
  };

  const openPriceFor = (p: FootwearProductRecord) => {
    setNewPrice(String(p.baseSellingPrice));
    setNewCost(String(p.baseCostPrice));
    setPriceOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selected || !adjVariantId) return;
    let delta = parseInt(adjDelta, 10);
    if (Number.isNaN(delta) || delta === 0) {
      notify('Enter a non-zero quantity change', 'err');
      return;
    }
    if ((adjType === 'damage' || adjType === 'shrinkage') && delta > 0) {
      delta = -Math.abs(delta);
    }
    if (adjType === 'opening_stock' && delta < 0) {
      delta = Math.abs(delta);
    }
    setSavingAdj(true);
    try {
      await footwearInventoryService.adjustStock({
        branchId: branchId || undefined,
        variantId: adjVariantId,
        quantityDelta: delta,
        movementType: adjType,
        reason: adjReason.trim() || 'Manual footwear stock adjustment',
      });
      notify(`Adjusted ${selected.name} (${delta > 0 ? `+${delta}` : delta} pair)`, 'ok');
      setAdjustOpen(false);
      await loadProducts();
      const refreshed = await footwearInventoryService.getProduct(selected.id, branchId || undefined);
      setSelectedDetail(refreshed.product);
      const movs = await footwearInventoryService.listMovements({ branchId: branchId || undefined, limit: 50 });
      setSelectedMovements(movs.movements.filter((m) => m.productId === selected.id).slice(0, 10));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Stock adjustment failed', 'err');
    } finally {
      setSavingAdj(false);
    }
  };

  const handleSavePrice = async () => {
    if (!selected) return;
    const p = Number(newPrice);
    const c = Number(newCost);
    if (!Number.isFinite(p) || p <= 0) {
      notify('Enter a valid selling price', 'err');
      return;
    }
    setSavingPrice(true);
    try {
      const updated = await footwearInventoryService.updateProduct(selected.id, {
        branchId: branchId || undefined,
        baseSellingPrice: p,
        baseCostPrice: Number.isFinite(c) && c >= 0 ? c : selected.baseCostPrice,
        variants: selected.variants.map((v) => ({
          id: v.id,
          colourName: v.colourName,
          sizeName: v.sizeName,
          sizingSystem: v.sizingSystem,
          sku: v.sku,
          barcode: v.primaryBarcode || undefined,
          costPrice: Number.isFinite(c) && c >= 0 ? c : v.costPrice,
          sellingPrice: p,
          reorderLevel: v.reorderLevel,
          isActive: v.isActive,
        })),
      });
      setSelectedDetail(updated.product);
      notify(`Updated pricing for ${selected.name} to ${formatRs(p)}`, 'ok');
      setPriceOpen(false);
      await loadProducts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Price update failed', 'err');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selected) return;
    try {
      await footwearInventoryService.deleteProduct(selected.id, branchId || undefined);
      notify(`Archived ${selected.name} from active footwear catalog`, 'info');
      setSelectedId(null);
      setSelectedDetail(null);
      setDeleteOpen(false);
      await loadProducts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to archive product', 'err');
    }
  };

  const handlePrintTag = () => {
    window.print();
  };

  const groupedByColour = useMemo(() => {
    if (!selected) return [];
    const map = new Map<string, FootwearProductRecord['variants']>();
    for (const v of selected.variants) {
      const list = map.get(v.colourName) ?? [];
      list.push(v);
      map.set(v.colourName, list);
    }
    return Array.from(map.entries());
  }, [selected]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={canManageStock ? 'Footwear stock room & catalog' : 'Cashier footwear stock lookup'}
        title="Stock & footwear"
        subtitle={
          canManageStock
            ? 'Track footwear pairs by size (EU/UK/US) and colour across branches, adjust stock, and print barcodes.'
            : 'Read-only lookup to check footwear sizes, colours, barcodes, and branch stock.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 1 && (
              <div className="w-[180px]">
                <Select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setPage(1);
                  }}
                  options={branches.map((b) => ({
                    value: b.id,
                    label: b.city ? `${b.name} (${b.city})` : b.name,
                  }))}
                />
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={() => void loadProducts()} title="Refresh live stock">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {canManageStock ? (
              <>
                {canManageCategories && (
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
                <Link href="/inventory/items/new">
                  <Button variant="dark" size="lg">
                    <Plus className="w-4 h-4" /> Add footwear
                  </Button>
                </Link>
              </>
            ) : (
              <Badge tone="neutral">View only · Ask Stockkeeper to adjust</Badge>
            )}
          </div>
        }
      />

      {/* Summary metrics */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <StatCard
          label="Footwear products"
          value={summary?.totalProducts ?? 0}
          sub={`${summary?.totalVariants ?? 0} size/colour variants`}
          icon={<Boxes className="w-4 h-4" />}
        />
        <StatCard
          label="Pairs on shelf"
          value={summary?.totalPairsOnHand ?? 0}
          sub={data?.branch?.name ? `Branch: ${data.branch.name}` : 'Active branch'}
          icon={<Layers className="w-4 h-4" />}
        />
        <StatCard
          label="Low or out of stock"
          value={(summary?.lowStockCount ?? 0) + (summary?.outOfStockCount ?? 0)}
          tone={(summary?.outOfStockCount ?? 0) > 0 ? 'err' : (summary?.lowStockCount ?? 0) > 0 ? 'warn' : 'ok'}
          sub={`${summary?.lowStockCount ?? 0} low · ${summary?.outOfStockCount ?? 0} out`}
          onClick={() => {
            setTab('low');
            setPage(1);
          }}
        />
        {isOwner && (
          <StatCard
            label="Stock value (at cost)"
            value={formatRs(Math.round(summary?.costValuation ?? 0))}
            sub={`Retail value ${formatRs(Math.round(summary?.retailValuation ?? 0))}`}
          />
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-[12px] bg-[#FDF0EF] border border-[#F0C8C3] text-[13px] text-[#B42318] font-medium">
          {errorMsg}
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="space-y-3">
        <Tabs
          activeId={tab}
          onChange={(id) => {
            setTab(id);
            setPage(1);
          }}
          tabs={[
            { id: 'all', label: 'All footwear', count: summary?.totalProducts ?? 0 },
            {
              id: 'low',
              label: 'Low stock',
              count: summary?.lowStockCount ?? 0,
              badgeTone: (summary?.lowStockCount ?? 0) > 0 ? 'warn' : 'neutral',
            },
            {
              id: 'out',
              label: 'Out of stock',
              count: summary?.outOfStockCount ?? 0,
              badgeTone: (summary?.outOfStockCount ?? 0) > 0 ? 'err' : 'neutral',
            },
            { id: 'gaps', label: 'Size gaps' },
            { id: 'movements', label: 'Stock movements' },
          ]}
        />

        {tab !== 'movements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <div className="sm:col-span-2">
              <SearchInput
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  setPage(1);
                }}
                placeholder="Search footwear, brand, model, SKU, or barcode..."
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All footwear types' },
                ...FOOTWEAR_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
            <Select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All brands' },
                ...(data?.facets.brands ?? []).map((b) => ({ value: b, label: b })),
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={sizeFilter}
                onChange={(e) => {
                  setSizeFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All sizes' },
                  ...(data?.facets.sizes ?? []).map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                value={colourFilter}
                onChange={(e) => {
                  setColourFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All colours' },
                  ...(data?.facets.colours ?? []).map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'name_asc', label: 'Name A–Z' },
                  { value: 'price_asc', label: 'Price low–high' },
                  { value: 'price_desc', label: 'Price high–low' },
                  { value: 'stock_asc', label: 'Stock low–high' },
                  { value: 'stock_desc', label: 'Stock high–low' },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Products Table OR Stock Movements Ledger */}
      {tab === 'movements' ? (
        <DataTable<StockMovementRecord>
          rows={movements}
          rowKey={(m) => m.id}
          emptyState={
            <EmptyState
              title={movementsLoading ? 'Loading stock ledger...' : 'No stock movements yet'}
              body="Opening stock, POS sales, returns, exchanges, adjustments, and counts appear here automatically."
            />
          }
          columns={[
            {
              key: 'when',
              header: 'Date & time',
              render: (m) => (
                <span className="text-[12px] text-[#52666A] num">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'item',
              header: 'Footwear variant',
              render: (m) => (
                <div>
                  <div className="font-semibold text-[#0B2A2F]">{m.productName}</div>
                  <div className="text-[12px] text-[#52666A]">
                    {m.variantLabel} · <span className="mono">{m.sku}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Movement',
              render: (m) => (
                <Badge
                  tone={
                    m.quantityDelta > 0
                      ? 'ok'
                      : m.movementType === 'damage' || m.movementType === 'shrinkage'
                        ? 'err'
                        : 'neutral'
                  }
                >
                  {m.movementType.replace(/_/g, ' ')}
                </Badge>
              ),
            },
            {
              key: 'reason',
              header: 'Reason / Reference',
              render: (m) => (
                <div className="text-[13px] text-[#3D5357]">
                  <div>{m.reason || '—'}</div>
                  <div className="text-[11px] text-[#52666A]">By {m.performedByName}</div>
                </div>
              ),
            },
            {
              key: 'delta',
              header: 'Change',
              align: 'end',
              render: (m) => (
                <span
                  className={`font-bold num ${
                    m.quantityDelta >= 0 ? 'text-[#14532D]' : 'text-[#B42318]'
                  }`}
                >
                  {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta} pair
                </span>
              ),
            },
          ]}
        />
      ) : (
        <>
          <DataTable<FootwearProductRecord>
            rows={products}
            rowKey={(p) => p.id}
            onRowClick={(p) => setSelectedId(p.id)}
            emptyState={
              <EmptyState
                title={loading ? 'Loading footwear inventory...' : 'No footwear items found'}
                body={
                  loading
                    ? 'Fetching live catalog and branch stock from Supabase...'
                    : 'Clear filters or add your first footwear product with sizes and colours.'
                }
                action={
                  !loading && canManageStock ? (
                    <Link href="/inventory/items/new">
                      <Button variant="primary">Add footwear</Button>
                    </Link>
                  ) : undefined
                }
              />
            }
            columns={[
              {
                key: 'item',
                header: 'Footwear',
                render: (p) => (
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <ProductArtwork
                      artId={p.artId}
                      colourName={p.colours[0]}
                      imageUrl={p.primaryImageUrl}
                      alt={p.name}
                      size={42}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#0B2A2F] truncate">{p.name}</div>
                      <div className="text-[12px] text-[#52666A] truncate">
                        {[p.brand, p.model, p.gender].filter(Boolean).join(' · ') || p.sku}{' '}
                        <span className="mono text-[11px]">({p.sku})</span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (p) => (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#F1E6D6] text-[#6B4A1E]">
                    {p.footwearType}
                  </span>
                ),
              },
              {
                key: 'variants',
                header: 'Sizes & colours',
                render: (p) => (
                  <div className="text-[13px] text-[#52666A]">
                    <div>
                      {p.colours.length} colour{p.colours.length === 1 ? '' : 's'} · {p.sizes.length} size
                      {p.sizes.length === 1 ? '' : 's'} ({p.sizingSystem})
                    </div>
                    <div className="text-[11px] text-[#5F7174] truncate max-w-[200px]">
                      {p.sizes.slice(0, 6).join(', ')}
                      {p.sizes.length > 6 ? '…' : ''}
                    </div>
                  </div>
                ),
              },
              {
                key: 'stock',
                header: 'Branch stock',
                render: (p) => {
                  const st = getStockBadge(p);
                  return <Badge tone={st.tone}>{st.text}</Badge>;
                },
              },
              ...(isOwner
                ? [
                    {
                      key: 'cost',
                      header: 'Cost',
                      align: 'end' as const,
                      render: (p: FootwearProductRecord) => (
                        <span className="num text-[#52666A]">{formatRs(p.baseCostPrice)}</span>
                      ),
                    },
                  ]
                : []),
              {
                key: 'price',
                header: 'Selling price',
                align: 'end',
                render: (p) => (
                  <span className="font-bold num">
                    {formatRs(p.baseSellingPrice)}
                    <span className="text-[11px] font-normal text-[#52666A]"> / pair</span>
                  </span>
                ),
              },
            ]}
          />

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-[13px] text-[#52666A]">
              <span>
                Showing page {data.page} of {data.totalPages} ({data.total} footwear products)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footwear Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name || ''}
        subtitle={
          selected
            ? `${selected.brand ? `${selected.brand} · ` : ''}SKU ${selected.sku} · ${formatRs(selected.baseSellingPrice)} / pair`
            : ''
        }
        badge={
          selected ? (
            <Badge tone={getStockBadge(selected).tone}>{getStockBadge(selected).text}</Badge>
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
                <Button variant="primary">Edit footwear</Button>
              </Link>
              {isOwner && (
                <Button
                  variant="ghost"
                  onClick={() => setDeleteOpen(true)}
                  aria-label={`Archive ${selected.name}`}
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
            <div className="flex items-start gap-4 p-3.5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7]">
              <ProductArtwork
                artId={selected.artId}
                colourName={selected.colours[0]}
                imageUrl={selected.primaryImageUrl}
                alt={selected.name}
                size={68}
              />
              <div className="space-y-1 text-[13px] text-[#52666A] flex-1">
                <div>
                  Type: <strong className="text-[#0B2A2F]">{selected.footwearType}</strong>
                  {selected.gender ? ` · ${selected.gender}` : ''}
                  {` · ${selected.sizingSystem} sizing`}
                </div>
                {(selected.brand || selected.model) && (
                  <div>
                    Brand / Model:{' '}
                    <strong className="text-[#0B2A2F]">
                      {[selected.brand, selected.model].filter(Boolean).join(' — ')}
                    </strong>
                  </div>
                )}
                {(selected.material || selected.upperMaterial || selected.soleMaterial) && (
                  <div className="text-[12px]">
                    {[
                      selected.material ? `Material: ${selected.material}` : null,
                      selected.upperMaterial ? `Upper: ${selected.upperMaterial}` : null,
                      selected.soleMaterial ? `Sole: ${selected.soleMaterial}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                {isOwner && (
                  <div>
                    Cost: <strong className="text-[#0B2A2F] num">{formatRs(selected.baseCostPrice)}</strong>
                    {' · '}Retail: <strong className="text-[#0B2A2F] num">{formatRs(selected.baseSellingPrice)}</strong>
                  </div>
                )}
                {selected.description && (
                  <p className="text-[12px] text-[#3D5357] pt-1">{selected.description}</p>
                )}
              </div>
            </div>

            {/* Variant breakdown by colour & size */}
            <div className="space-y-3">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                Stock by colour &amp; size ({data?.branch?.name || 'Active branch'})
              </h3>
              {groupedByColour.map(([colour, list]) => (
                <Card key={colour} padding="sm" className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: SWATCHES[colour] || '#8C918E' }}
                      />
                      <span className="font-semibold text-[14px] text-[#0B2A2F]">{colour}</span>
                    </div>
                    <span className="text-[12px] text-[#52666A] num">
                      {list.reduce((s, v) => s + v.stockOnHand, 0)} pairs
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {list.map((v) => (
                      <div
                        key={v.id}
                        className={`p-2 rounded-[8px] border text-center ${
                          v.stockOnHand <= 0
                            ? 'bg-[#FDF0EF] border-[#F0C8C3] text-[#B42318]'
                            : v.stockOnHand <= Math.max(v.reorderLevel, 2)
                              ? 'bg-[#FFF9E6] border-[#EBD892] text-[#6B4E00]'
                              : 'bg-[#FBF8F4] border-[#E7E0D7] text-[#0B2A2F]'
                        }`}
                      >
                        <div className="text-[11px] font-semibold">
                          {v.sizingSystem} {v.sizeName || 'Std'}
                        </div>
                        <div className="text-[14px] font-bold num">{v.stockOnHand}</div>
                        <div className="text-[10px] text-[#52666A] num">{formatRs(v.sellingPrice)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Variant Barcode Label */}
            {selected.variants.length > 0 && (() => {
              const activeVar =
                selected.variants.find((v) => v.id === tagVariantId) ?? selected.variants[0];
              const code = activeVar.primaryBarcode || activeVar.sku;
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                      Variant Barcode Label
                    </h3>
                    <Button size="sm" variant="secondary" onClick={handlePrintTag}>
                      <Printer className="w-3.5 h-3.5" /> Print barcode
                    </Button>
                  </div>
                  <Select
                    label="Select size / colour variant"
                    value={activeVar.id}
                    onChange={(e) => setTagVariantId(e.target.value)}
                    options={selected.variants.map((v) => ({
                      value: v.id,
                      label: `${v.variantName} (${v.primaryBarcode || v.sku})`,
                    }))}
                  />
                  <div className="zyro-print-area">
                    <BarcodePreview
                      code={code}
                      label={`${selected.name} · ${activeVar.variantName}`}
                      priceText={formatRs(activeVar.sellingPrice)}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Recent Stock Movements for this product */}
            {selectedMovements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Recent stock movements
                </h3>
                <div className="space-y-1.5">
                  {selectedMovements.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-[9px] border border-[#E7E0D7] text-[12px] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-[#0B2A2F]">
                          {m.variantLabel} · {m.movementType.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[#52666A]">
                          {m.reason || 'Recorded movement'} · {m.performedByName}
                        </div>
                      </div>
                      <span
                        className={`font-bold num ${
                          m.quantityDelta >= 0 ? 'text-[#14532D]' : 'text-[#B42318]'
                        }`}
                      >
                        {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
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
        subtitle="Record damaged pairs, lost inventory, found shelf stock, or manual corrections."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={savingAdj} onClick={() => void handleSaveAdjustment()}>
              {savingAdj ? 'Saving...' : 'Save adjustment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selected && (
            <Select
              label="Size & colour variant"
              value={adjVariantId}
              onChange={(e) => setAdjVariantId(e.target.value)}
              options={selected.variants.map((v) => ({
                value: v.id,
                label: `${v.variantName} (${v.stockOnHand} pairs on shelf)`,
              }))}
            />
          )}
          <Select
            label="Adjustment type"
            value={adjType}
            onChange={(e) => {
              const next = e.target.value as typeof adjType;
              setAdjType(next);
              const found = ADJUSTMENT_TYPES.find((t) => t.value === next);
              if (found) setAdjReason(found.defaultReason);
              if (next === 'damage' || next === 'shrinkage') {
                setAdjDelta((prev) => String(-Math.abs(parseInt(prev, 10) || 1)));
              } else if (next === 'opening_stock') {
                setAdjDelta((prev) => String(Math.abs(parseInt(prev, 10) || 1)));
              }
            }}
            options={ADJUSTMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input
            label="Quantity change (pairs)"
            type="number"
            value={adjDelta}
            onChange={(e) => setAdjDelta(e.target.value)}
            hint="Use negative (−) to remove damaged/lost pairs, positive (+) to add found stock"
          />
          <Input
            label="Reason"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Describe why stock is being adjusted"
          />
        </div>
      </Modal>

      {/* Owner Price Edit Modal */}
      <Modal
        open={priceOpen && !!selected}
        onClose={() => setPriceOpen(false)}
        title={`Edit pricing · ${selected?.name || ''}`}
        subtitle="Updates selling & cost prices across all variants on the POS register."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={savingPrice} onClick={() => void handleSavePrice()}>
              {savingPrice ? 'Updating...' : 'Update price'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Selling price per pair (Rs)"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <Input
            label="Cost price per pair (Rs)"
            type="number"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen && !!selected}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDeleteProduct()}
        title={`Archive ${selected?.name || 'footwear'}?`}
        body="This hides the footwear product from the POS counter and active stock. Historical sales and receipts remain intact."
        confirmLabel="Archive footwear"
      />
    </div>
  );
}
