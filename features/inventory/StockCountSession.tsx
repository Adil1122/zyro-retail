'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ClipboardCheck, History } from 'lucide-react';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { footwearInventoryService } from '@/features/inventory/services/footwear-inventory.service';
import { useZyro } from '@/hooks/useZyro';
import type { FootwearProductRecord, FootwearVariantRecord, StockCountRecord } from '@/types/footwear';

interface VariantCountRow {
  product: FootwearProductRecord;
  variant: FootwearVariantRecord;
  expected: number;
  counted: number;
  delta: number;
}

export function StockCountSession() {
  const { notify } = useZyro();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<FootwearProductRecord[]>([]);
  const [pastCounts, setPastCounts] = useState<StockCountRecord[]>([]);
  const [branchName, setBranchName] = useState('');
  const [branchId, setBranchId] = useState<string | undefined>(undefined);

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'diff' | 'history'>('all');
  const [committedInfo, setCommittedInfo] = useState<{
    countNumber: string;
    adjustedVariants: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, cntRes] = await Promise.all([
        footwearInventoryService.listProducts({ pageSize: 200 }),
        footwearInventoryService.listCounts(),
      ]);
      setProducts(prodRes.products);
      setBranchName(prodRes.branch?.name || '');
      setBranchId(prodRes.branch?.id);
      setPastCounts(cntRes.counts);

      const init: Record<string, string> = {};
      for (const p of prodRes.products) {
        for (const v of p.variants) {
          init[v.id] = String(v.stockOnHand);
        }
      }
      setCounts(init);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load stock count sheet', 'err');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const allVariantRows = useMemo<VariantCountRow[]>(() => {
    const q = query.trim().toLowerCase();
    const out: VariantCountRow[] = [];
    for (const p of products) {
      for (const v of p.variants) {
        if (
          q &&
          !p.name.toLowerCase().includes(q) &&
          !(p.brand ?? '').toLowerCase().includes(q) &&
          !v.variantName.toLowerCase().includes(q) &&
          !v.sku.toLowerCase().includes(q) &&
          !(v.primaryBarcode ?? '').toLowerCase().includes(q)
        ) {
          continue;
        }
        const expected = v.stockOnHand;
        const parsed = parseInt(counts[v.id] ?? String(expected), 10);
        const counted = Number.isNaN(parsed) ? expected : Math.max(0, parsed);
        out.push({
          product: p,
          variant: v,
          expected,
          counted,
          delta: counted - expected,
        });
      }
    }
    return out;
  }, [products, counts, query]);

  const displayedRows = useMemo(
    () => (filter === 'diff' ? allVariantRows.filter((r) => r.delta !== 0) : allVariantRows),
    [allVariantRows, filter],
  );

  const varianceCount = useMemo(
    () => allVariantRows.filter((r) => r.delta !== 0).length,
    [allVariantRows],
  );

  const handleCommit = async () => {
    if (allVariantRows.length === 0) return;
    setSubmitting(true);
    try {
      const res = await footwearInventoryService.completeCount({
        branchId,
        notes: notes.trim() || 'Physical footwear shelf count',
        items: allVariantRows.map((r) => ({
          variantId: r.variant.id,
          countedQty: r.counted,
        })),
      });
      setCommittedInfo({
        countNumber: res.result.count_number,
        adjustedVariants: res.result.adjusted_variants,
      });
      notify(`Stock count ${res.result.count_number} approved and stock reconciled`, 'ok');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to post stock count', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  if (committedInfo) {
    return (
      <div className="max-w-[600px] space-y-5">
        <PageHeader eyebrow="Stock count" title="Count saved" />
        <Card className="p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#E3F4EA] text-[#14532D] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-display text-[20px] font-bold text-[#0B2A2F]">
            Shelf count {committedInfo.countNumber} posted
          </h2>
          <p className="text-[14px] text-[#52666A]">
            {committedInfo.adjustedVariants} footwear variant discrepancy(s) have been reconciled in{' '}
            {branchName || 'your branch'} and logged in stock movements.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/inventory">
              <Button variant="primary">Back to stock</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Physical verification · ${branchName || 'Active branch'}`}
        title="Count footwear stock"
        subtitle="Walk the shelves and enter actual pair counts per size and colour. Discrepancies reconcile on submit."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" /> Cancel
              </Button>
            </Link>
            <Button
              variant="primary"
              disabled={submitting || allVariantRows.length === 0}
              onClick={() => void handleCommit()}
            >
              <ClipboardCheck className="w-4 h-4" />{' '}
              {submitting ? 'Posting...' : `Post count (${varianceCount} diff)`}
            </Button>
          </div>
        }
      />

      <Tabs
        activeId={filter}
        onChange={(id) => setFilter(id as 'all' | 'diff' | 'history')}
        tabs={[
          { id: 'all', label: 'All variants', count: allVariantRows.length },
          {
            id: 'diff',
            label: 'Variances only',
            count: varianceCount,
            badgeTone: varianceCount > 0 ? 'warn' : 'neutral',
          },
          { id: 'history', label: 'Past counts', count: pastCounts.length },
        ]}
      />

      {filter === 'history' ? (
        <div className="space-y-2.5">
          {pastCounts.length === 0 ? (
            <EmptyState
              title="No past stock counts"
              body="Completed stock counts for this branch will appear here."
            />
          ) : (
            pastCounts.map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[#F1EBE3] flex items-center justify-center text-[#08343A]">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[14px] text-[#0B2A2F] mono">
                      {c.countNumber}
                    </div>
                    <div className="text-[12px] text-[#52666A]">
                      By {c.countedByName} · {new Date(c.createdAt).toLocaleString()}
                      {c.notes ? ` · ${c.notes}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{c.itemCount} variants</Badge>
                  <Badge tone={c.discrepancyCount > 0 ? 'warn' : 'ok'}>
                    {c.discrepancyCount} diff ({c.netVariance >= 0 ? `+${c.netVariance}` : c.netVariance})
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Scan barcode or search footwear, SKU, size, colour..."
            />
            <Input
              placeholder="Count session notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {loading ? (
            <Card className="p-8 text-center text-[14px] text-[#52666A]">
              Loading live branch footwear variants...
            </Card>
          ) : displayedRows.length === 0 ? (
            <EmptyState
              title={filter === 'diff' ? 'No discrepancies yet' : 'No footwear variants to count'}
              body={
                filter === 'diff'
                  ? 'Every variant currently matches its expected shelf count.'
                  : 'Add footwear products first before running a physical stock count.'
              }
            />
          ) : (
            <div className="space-y-2.5">
              {displayedRows.map(({ product, variant, expected, counted, delta }) => (
                <Card
                  key={variant.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductArtwork
                      artId={product.artId}
                      colourName={variant.colourName}
                      imageUrl={product.primaryImageUrl}
                      alt={product.name}
                      size={44}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">
                        {product.name}{' '}
                        <span className="font-normal text-[#52666A]">· {variant.variantName}</span>
                      </div>
                      <div className="text-[12px] text-[#52666A] mono">
                        {variant.sku}
                        {variant.primaryBarcode ? ` · ${variant.primaryBarcode}` : ''} · Expected {expected}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {delta !== 0 && (
                      <Badge tone={delta > 0 ? 'ok' : 'err'}>
                        {delta > 0 ? `+${delta}` : delta}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#52666A]">Counted:</span>
                      <input
                        type="number"
                        min={0}
                        value={counts[variant.id] ?? String(counted)}
                        onChange={(e) =>
                          setCounts((prev) => ({ ...prev, [variant.id]: e.target.value }))
                        }
                        className="field w-24 h-[40px] px-3 rounded-[9px] border border-[#8A8276] bg-white text-end font-bold num"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
