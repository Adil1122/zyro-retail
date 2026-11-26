'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { SWATCHES } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import {
  formatVariantDisplay,
  formatVariantSizeLabel,
  type FootwearProductRecord,
  type FootwearVariantRecord,
  type PosExchangeRecord,
  type PosSaleItemRecord,
  type PosSaleRecord,
} from '@/types/footwear';
import { footwearPosService } from './services/footwear-pos.service';

const SETTLEMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'bank', label: 'Bank' },
  { id: 'jazz', label: 'JazzCash' },
  { id: 'easy', label: 'Easypaisa' },
  { id: 'raast', label: 'Raast' },
  { id: 'khata', label: 'Khata' },
] as const;

export function ShoeExchangeFlow() {
  const { notify } = useZyro();
  const [billQuery, setBillQuery] = useState('');
  const [sales, setSales] = useState<PosSaleRecord[]>([]);
  const [products, setProducts] = useState<FootwearProductRecord[]>([]);
  const [exchangesHistory, setExchangesHistory] = useState<PosExchangeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleItemId, setSelectedSaleItemId] = useState<string | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [condition, setCondition] = useState<'resellable' | 'damaged'>('resellable');
  const [reason, setReason] = useState<'size' | 'colour' | 'model' | 'fault'>('size');

  // Replacement selection
  const [exchangeMode, setExchangeMode] = useState<'same_product' | 'different_product'>('same_product');
  const [productSearch, setProductSearch] = useState('');
  const [selectedReplacementProductId, setSelectedReplacementProductId] = useState<string | null>(null);
  const [selectedReplacementVariantId, setSelectedReplacementVariantId] = useState<string | null>(null);
  const [replacementQty, setReplacementQty] = useState(1);
  const [settlementMethod, setSettlementMethod] = useState<(typeof SETTLEMENT_METHODS)[number]['id']>('cash');

  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<{
    exchangeNumber: string;
    replacementBillNumber: number;
    returnedLabel: string;
    replacementLabel: string;
    netDiff: number;
    restocked: boolean;
  } | null>(null);

  const loadData = useCallback(async (searchText?: string) => {
    setLoading(true);
    try {
      const [salesRes, catalogRes, exRes] = await Promise.all([
        footwearPosService.listSales({ q: searchText?.trim() || undefined, limit: 30 }),
        footwearPosService.getCatalog(),
        footwearPosService.listExchanges(),
      ]);
      setSales(salesRes.sales);
      setProducts(catalogRes.products);
      setExchangesHistory(exRes.exchanges);

      const urlSaleId = new URLSearchParams(window.location.search).get('saleId');
      if (urlSaleId) {
        const match = salesRes.sales.find((s) => s.id === urlSaleId);
        if (match) setSelectedSaleId(match.id);
      } else if (!selectedSaleId && salesRes.sales.length > 0) {
        const eligible = salesRes.sales.find((s) => s.items.some((i) => i.returnableQuantity > 0));
        if (eligible) setSelectedSaleId(eligible.id);
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to load exchange data', 'err');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedSaleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedSale = useMemo(
    () => sales.find((s) => s.id === selectedSaleId) || null,
    [sales, selectedSaleId]
  );

  // Pick first returnable item when sale changes
  useEffect(() => {
    if (!selectedSale) {
      setSelectedSaleItemId(null);
      return;
    }
    const first = selectedSale.items.find((i) => i.returnableQuantity > 0) || selectedSale.items[0] || null;
    setSelectedSaleItemId(first?.id || null);
    setReturnQty(1);
    setReplacementQty(1);
  }, [selectedSale]);

  const selectedSaleItem: PosSaleItemRecord | null = useMemo(() => {
    if (!selectedSale || !selectedSaleItemId) return null;
    return selectedSale.items.find((i) => i.id === selectedSaleItemId) || null;
  }, [selectedSale, selectedSaleItemId]);

  const originalProduct: FootwearProductRecord | null = useMemo(() => {
    if (!selectedSaleItem) return null;
    return products.find((p) => p.id === selectedSaleItem.productId) || null;
  }, [products, selectedSaleItem]);

  // Keep replacement product synced in same_product mode
  useEffect(() => {
    if (exchangeMode === 'same_product' && originalProduct) {
      setSelectedReplacementProductId(originalProduct.id);
      const alternative = originalProduct.variants.find(
        (v) => v.isActive && v.availableStock > 0 && v.id !== selectedSaleItem?.variantId
      );
      setSelectedReplacementVariantId(alternative?.id || null);
    }
  }, [exchangeMode, originalProduct, selectedSaleItem?.variantId]);

  const replacementProduct: FootwearProductRecord | null = useMemo(() => {
    if (exchangeMode === 'same_product') return originalProduct;
    return products.find((p) => p.id === selectedReplacementProductId) || null;
  }, [exchangeMode, originalProduct, products, selectedReplacementProductId]);

  const replacementVariant: FootwearVariantRecord | null = useMemo(() => {
    if (!replacementProduct || !selectedReplacementVariantId) return null;
    return replacementProduct.variants.find((v) => v.id === selectedReplacementVariantId) || null;
  }, [replacementProduct, selectedReplacementVariantId]);

  const filteredOtherProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (p.totalStock <= 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch]);

  const returnCredit = selectedSaleItem
    ? Number((selectedSaleItem.unitPrice * returnQty).toFixed(2))
    : 0;
  const replacementTotal = replacementVariant
    ? Number((replacementVariant.sellingPrice * replacementQty).toFixed(2))
    : 0;
  const netDiff = Number((replacementTotal - returnCredit).toFixed(2));

  const reasonLabelMap: Record<typeof reason, string> = {
    size: 'Needs another size',
    colour: 'Needs another colour',
    model: 'Switched to different footwear',
    fault: 'Manufacturing fault',
  };

  const handleRecordExchange = async () => {
    if (!selectedSale || !selectedSaleItem || !replacementVariant || !replacementProduct) {
      notify('Select the returned pair and an in-stock replacement variant', 'warn');
      return;
    }
    if (returnQty > selectedSaleItem.returnableQuantity) {
      notify(`Only ${selectedSaleItem.returnableQuantity} pair(s) can be returned from this line`, 'warn');
      return;
    }
    if (replacementQty > replacementVariant.availableStock) {
      notify(`Only ${replacementVariant.availableStock} pair(s) available for replacement`, 'warn');
      return;
    }
    if (settlementMethod === 'khata' && !selectedSale.customerId && netDiff !== 0) {
      notify('Khata settlement requires a linked customer on the bill. Choose Cash/Card/Bank/Wallet.', 'warn');
      return;
    }

    setSubmitting(true);
    try {
      const res = await footwearPosService.processExchange({
        branchId: selectedSale.branchId,
        originalSaleId: selectedSale.id,
        originalSaleItemId: selectedSaleItem.id,
        returnQuantity: returnQty,
        condition,
        replacementVariantId: replacementVariant.id,
        replacementQuantity: replacementQty,
        reason: reasonLabelMap[reason],
        settlementMethod,
      });

      setCompleted({
        exchangeNumber: res.exchange.exchange_number,
        replacementBillNumber: res.exchange.replacement_bill_number,
        returnedLabel: `${selectedSaleItem.productName} (${selectedSaleItem.variantLabel})`,
        replacementLabel: `${replacementProduct.name} (${formatVariantDisplay(
          replacementVariant.colourName,
          replacementVariant.sizeName,
          replacementVariant.sizingSystem,
        )})`,
        netDiff: res.exchange.net_difference_amount,
        restocked: res.exchange.restocked,
      });
      notify(`Exchange ${res.exchange.exchange_number} recorded`, 'ok');
      void loadData();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Exchange failed', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <header className="h-[58px] bg-[#08343A] text-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/pos">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> Back to register
          </Button>
        </Link>
        <div className="font-display font-bold text-[16px]">Footwear exchange</div>
        <Link href="/pos/bills">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            Bill book
          </Button>
        </Link>
      </header>

      <div className="max-w-[760px] mx-auto p-4 sm:p-6 space-y-5">
        {completed ? (
          <Card padding="lg" className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="mono text-[13px] font-semibold text-[#52666A]">
              {completed.exchangeNumber} · Replacement Bill #{completed.replacementBillNumber}
            </div>
            <h1 className="font-display text-[22px] font-bold">Exchange recorded</h1>
            <p className="text-[14px] text-[#52666A]">
              {completed.returnedLabel} returned → {completed.replacementLabel} handed to customer.
            </p>
            <div className="flex justify-center flex-wrap gap-2">
              <Badge tone={completed.restocked ? 'ok' : 'warn'}>
                {completed.restocked
                  ? 'Returned pair restocked to branch inventory'
                  : 'Damaged pair logged (not restocked)'}
              </Badge>
              <Badge tone="neutral">
                {completed.netDiff > 0
                  ? `Customer paid extra ${formatRs(completed.netDiff)}`
                  : completed.netDiff < 0
                    ? `Refunded ${formatRs(Math.abs(completed.netDiff))}`
                    : 'Even exchange (Rs 0)'}
              </Badge>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCompleted(null)}>
                Another exchange
              </Button>
              <Link href="/pos">
                <Button variant="primary" size="lg">
                  Back to register
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Step 1: Original bill & pair coming back */}
            <Card className="space-y-4">
              <h1 className="font-display text-[20px] font-bold">1. The pair coming back</h1>
              <div className="flex gap-2">
                <SearchInput
                  value={billQuery}
                  onChange={setBillQuery}
                  onSubmit={() => void loadData(billQuery)}
                  placeholder="Original bill # or customer name..."
                />
                <Button variant="dark" onClick={() => void loadData(billQuery)} disabled={loading}>
                  Find
                </Button>
              </div>

              {loading ? (
                <div className="py-3 text-[13px] text-[#52666A] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading bills...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sales.slice(0, 8).map((s) => {
                    const active = s.id === selectedSaleId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSaleId(s.id)}
                        className={`px-3 py-1.5 rounded-[9px] border text-[12px] font-semibold ${
                          active
                            ? 'bg-[#08343A] text-white border-[#08343A]'
                            : 'bg-[#FBF8F4] text-[#0B2A2F] border-[#D6CDC1] hover:bg-[#FCEFE4]'
                        }`}
                      >
                        #{s.billNumber} · {s.customerName || 'Walk-in'} ({formatRs(s.totalAmount)})
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedSale && (
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold text-[#52666A]">
                    Select footwear item from Bill #{selectedSale.billNumber}
                  </div>
                  {selectedSale.items.map((item) => {
                    const active = item.id === selectedSaleItemId;
                    const disabled = item.returnableQuantity <= 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedSaleItemId(item.id);
                          setReturnQty(1);
                        }}
                        className={`w-full p-3.5 rounded-[12px] border text-start flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-[#FCEFE4] border-[#C9682E]'
                            : 'bg-[#FBF8F4] border-[#E7E0D7] disabled:opacity-50'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-[15px] text-[#0B2A2F]">
                            {item.productName}
                          </div>
                          <div className="text-[13px] text-[#52666A]">
                            Bill #{selectedSale.billNumber} · {item.variantLabel} · Returnable:{' '}
                            {item.returnableQuantity}
                          </div>
                        </div>
                        <Badge tone="neutral">{formatRs(item.unitPrice)}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    ['size', 'Another size'],
                    ['colour', 'Another colour'],
                    ['model', 'Different shoe'],
                    ['fault', 'Faulty / damaged'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setReason(id);
                      if (id === 'fault') setCondition('damaged');
                      else setCondition('resellable');
                      if (id === 'model') setExchangeMode('different_product');
                      else if (id === 'size' || id === 'colour') setExchangeMode('same_product');
                    }}
                    className={`py-2 px-2 rounded-[9px] border text-[12px] font-semibold ${
                      reason === id
                        ? 'bg-[#08343A] text-white border-[#08343A]'
                        : 'bg-white border-[#D6CDC1]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('resellable')}
                    className={`px-3 py-1.5 rounded-[8px] border text-[12px] font-semibold ${
                      condition === 'resellable'
                        ? 'bg-[#E8F6EE] border-[#14532D] text-[#14532D]'
                        : 'bg-white border-[#D6CDC1] text-[#52666A]'
                    }`}
                  >
                    Resellable (restock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('damaged')}
                    className={`px-3 py-1.5 rounded-[8px] border text-[12px] font-semibold ${
                      condition === 'damaged'
                        ? 'bg-[#FDF0EF] border-[#B42318] text-[#B42318]'
                        : 'bg-white border-[#D6CDC1] text-[#52666A]'
                    }`}
                  >
                    Damaged (do not restock)
                  </button>
                </div>

                {selectedSaleItem && selectedSaleItem.returnableQuantity > 1 && (
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-[#52666A] font-medium">Qty returning:</span>
                    <input
                      type="number"
                      min={1}
                      max={selectedSaleItem.returnableQuantity}
                      value={returnQty}
                      onChange={(e) => {
                        const q = Math.min(
                          selectedSaleItem.returnableQuantity,
                          Math.max(1, Math.round(Number(e.target.value)) || 1)
                        );
                        setReturnQty(q);
                        setReplacementQty(q);
                      }}
                      className="w-16 h-8 px-2 rounded-[8px] border border-[#D6CDC1] bg-white text-center font-bold num"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Step 2: Replacement footwear */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display text-[18px] font-bold">2. Choose replacement pair</h2>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExchangeMode('same_product')}
                    className={`px-3 py-1.5 rounded-[9px] border text-[12px] font-semibold ${
                      exchangeMode === 'same_product'
                        ? 'bg-[#08343A] text-white border-[#08343A]'
                        : 'bg-white border-[#D6CDC1]'
                    }`}
                  >
                    Same shoe (size / colour)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExchangeMode('different_product')}
                    className={`px-3 py-1.5 rounded-[9px] border text-[12px] font-semibold ${
                      exchangeMode === 'different_product'
                        ? 'bg-[#08343A] text-white border-[#08343A]'
                        : 'bg-white border-[#D6CDC1]'
                    }`}
                  >
                    Different footwear
                  </button>
                </div>
              </div>

              {exchangeMode === 'different_product' && (
                <div className="space-y-2.5">
                  <SearchInput
                    value={productSearch}
                    onChange={setProductSearch}
                    placeholder="Search active footwear by name, brand or SKU..."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                    {filteredOtherProducts.slice(0, 12).map((p) => {
                      const active = p.id === selectedReplacementProductId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedReplacementProductId(p.id);
                            const firstAvail = p.variants.find((v) => v.isActive && v.availableStock > 0);
                            setSelectedReplacementVariantId(firstAvail?.id || null);
                          }}
                          className={`p-2.5 rounded-[10px] border text-start flex items-center justify-between gap-2 ${
                            active
                              ? 'bg-[#FCEFE4] border-[#C9682E]'
                              : 'bg-white border-[#E7E0D7] hover:bg-[#FBF8F4]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] truncate">{p.name}</div>
                            <div className="text-[11px] text-[#52666A] truncate">
                              {p.brand || p.categoryPath || p.footwearType} · {p.totalStock}{' '}
                              {p.unitOfMeasure === 'piece' ? 'pcs' : 'pairs'}
                            </div>
                          </div>
                          <span className="font-bold text-[12px] num shrink-0">
                            {formatRs(p.baseSellingPrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {replacementProduct ? (
                <div className="space-y-3">
                  <div className="text-[13px] font-semibold text-[#0B2A2F]">
                    {replacementProduct.name} · Available variants
                    {replacementProduct.sizingSystem !== 'STANDARD'
                      ? ` (${replacementProduct.sizingSystem})`
                      : ''}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {replacementProduct.variants
                      .filter((v) => v.isActive)
                      .map((v) => {
                        const active = v.id === selectedReplacementVariantId;
                        const soldOut = v.availableStock < replacementQty;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={soldOut}
                            onClick={() => setSelectedReplacementVariantId(v.id)}
                            className={`py-2.5 px-2 rounded-[10px] border text-center transition-colors ${
                              active
                                ? 'bg-[#FCEFE4] border-[#C9682E] text-[#8A3D12]'
                                : soldOut
                                  ? 'bg-[#F1EBE3] border-[#E7E0D7] text-[#5F7174]'
                                  : 'bg-white border-[#D6CDC1] hover:border-[#E2B48F]'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold">
                              <span
                                style={{ backgroundColor: SWATCHES[v.colourName] || '#8C918E' }}
                                className="w-2.5 h-2.5 rounded-full border border-black/15"
                              />
                              <span className="truncate">{v.colourName}</span>
                            </div>
                            <div className="font-bold text-[14px]">
                              {formatVariantSizeLabel(v.sizeName, v.sizingSystem)}
                            </div>
                            <div className="text-[11px] text-[#52666A] num">
                              {soldOut ? 'Sold out' : `${v.availableStock} left · ${formatRs(v.sellingPrice)}`}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-[13px] text-[#52666A] py-2">
                  Pick a bill item above to choose a replacement size, colour, or shoe.
                </div>
              )}

              {/* Price difference & settlement */}
              {selectedSaleItem && replacementVariant && (
                <div className="p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] space-y-3">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#52666A]">Returned credit ({returnQty} pair)</span>
                    <span className="font-semibold num">{formatRs(returnCredit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#52666A]">Replacement ({replacementQty} pair)</span>
                    <span className="font-semibold num">{formatRs(replacementTotal)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E7E0D7] flex items-center justify-between text-[15px] font-bold">
                    <span>
                      {netDiff > 0
                        ? 'Customer pays extra'
                        : netDiff < 0
                          ? 'Refund owed to customer'
                          : 'Price difference'}
                    </span>
                    <span
                      className={`num ${
                        netDiff > 0
                          ? 'text-[#08343A]'
                          : netDiff < 0
                            ? 'text-[#8A3D12]'
                            : 'text-[#14532D]'
                      }`}
                    >
                      {netDiff === 0 ? 'Rs 0 (Even)' : formatRs(Math.abs(netDiff))}
                    </span>
                  </div>

                  {netDiff !== 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[12px] font-semibold text-[#52666A]">
                        {netDiff > 0 ? 'Collect difference via' : 'Refund difference via'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SETTLEMENT_METHODS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            disabled={m.id === 'khata' && !selectedSale?.customerId}
                            onClick={() => setSettlementMethod(m.id)}
                            className={`px-3 py-1.5 rounded-[8px] border text-[12px] font-semibold ${
                              settlementMethod === m.id
                                ? 'bg-[#08343A] text-white border-[#08343A]'
                                : 'bg-white border-[#D6CDC1] disabled:opacity-40'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="primary"
                size="counter"
                fullWidth
                disabled={
                  submitting || !selectedSale || !selectedSaleItem || !replacementVariant
                }
                onClick={() => void handleRecordExchange()}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {submitting
                  ? 'Recording exchange...'
                  : netDiff > 0
                    ? `Record exchange · Collect ${formatRs(netDiff)}`
                    : netDiff < 0
                      ? `Record exchange · Refund ${formatRs(Math.abs(netDiff))}`
                      : 'Record exchange (Rs 0)'}
              </Button>
            </Card>
          </>
        )}

        {/* Recent Exchanges History */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[17px] font-bold text-[#0B2A2F]">Recent exchanges</h2>
            <Badge tone="neutral">{exchangesHistory.length}</Badge>
          </div>
          {exchangesHistory.length === 0 ? (
            <div className="text-[13px] text-[#52666A] py-3">No exchanges recorded for this branch yet.</div>
          ) : (
            <div className="divide-y divide-[#F1EBE3]">
              {exchangesHistory.slice(0, 10).map((ex) => {
                const retItem = ex.items.find((i) => i.direction === 'returned');
                const repItem = ex.items.find((i) => i.direction === 'replacement');
                return (
                  <div key={ex.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="mono font-bold text-[13px]">{ex.exchangeNumber}</span>
                        {ex.originalBillNumber && (
                          <Badge tone="neutral">Orig #{ex.originalBillNumber}</Badge>
                        )}
                        {ex.replacementBillNumber && (
                          <Badge tone="ok">New #{ex.replacementBillNumber}</Badge>
                        )}
                      </div>
                      <div className="text-[12px] text-[#3D5357] mt-0.5">
                        {retItem ? `${retItem.productName} (${retItem.variantLabel})` : 'Returned'} →{' '}
                        {repItem ? `${repItem.productName} (${repItem.variantLabel})` : 'Replacement'}
                      </div>
                      <div className="text-[11px] text-[#52666A]">
                        {ex.customerName || 'Walk-in'} ·{' '}
                        {new Date(ex.createdAt).toLocaleString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-end shrink-0 font-bold text-[13px] num">
                      {ex.netDifferenceAmount > 0
                        ? `+${formatRs(ex.netDifferenceAmount)}`
                        : ex.netDifferenceAmount < 0
                          ? `−${formatRs(Math.abs(ex.netDifferenceAmount))}`
                          : 'Rs 0'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
