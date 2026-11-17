'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { getTotalStock } from '@/lib/inventory';

export function StockCountSession() {
  const { state, adjustStock, notify } = useZyro();
  const countable = useMemo(() => state.items.filter((i) => !i.measured), [state.items]);

  const [counts, setCounts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    countable.forEach((it) => {
      init[it.id] = String(getTotalStock(it));
    });
    return init;
  });
  const [filter, setFilter] = useState<'all' | 'diff'>('all');
  const [committed, setCommitted] = useState(false);

  const diffs = useMemo(() => {
    return countable
      .map((it) => {
        const expected = getTotalStock(it);
        const counted = parseInt(counts[it.id] ?? String(expected), 10);
        const validCount = Number.isNaN(counted) ? expected : counted;
        return { item: it, expected, counted: validCount, delta: validCount - expected };
      })
      .filter((r) => (filter === 'diff' ? r.delta !== 0 : true));
  }, [countable, counts, filter]);

  const varianceCount = useMemo(
    () =>
      countable.filter((it) => {
        const exp = getTotalStock(it);
        const cnt = parseInt(counts[it.id] ?? String(exp), 10);
        return !Number.isNaN(cnt) && cnt !== exp;
      }).length,
    [countable, counts]
  );

  const handleCommit = () => {
    diffs.forEach((row) => {
      if (row.delta !== 0) {
        adjustStock(row.item.id, 'Physical count', row.delta, 'Shelf stock count');
      }
    });
    setCommitted(true);
    notify('Stock count posted and discrepancies recorded', 'ok');
  };

  if (committed) {
    return (
      <div className="max-w-[600px] space-y-5">
        <PageHeader eyebrow="Stock count" title="Count saved" />
        <Card className="p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#E3F4EA] text-[#14532D] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-display text-[20px] font-bold text-[#0B2A2F]">
            Shelf count posted
          </h2>
          <p className="text-[14px] text-[#52666A]">
            {varianceCount} item variances have been logged in your stock audit history.
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
        eyebrow="Physical verification"
        title="Count stock"
        subtitle="Walk the shelves and type actual counts. Differences update after review."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" /> Cancel
              </Button>
            </Link>
            <Button variant="primary" onClick={handleCommit}>
              <ClipboardCheck className="w-4 h-4" /> Post count ({varianceCount} diff)
            </Button>
          </div>
        }
      />

      <Tabs
        activeId={filter}
        onChange={(id) => setFilter(id as 'all' | 'diff')}
        tabs={[
          { id: 'all', label: 'All countable items', count: countable.length },
          {
            id: 'diff',
            label: 'Variances only',
            count: varianceCount,
            badgeTone: varianceCount > 0 ? 'warn' : 'neutral',
          },
        ]}
      />

      <div className="space-y-2.5">
        {diffs.map(({ item, expected, counted, delta }) => (
          <Card key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProductArtwork item={item} size={44} />
              <div className="min-w-0">
                <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">{item.name}</div>
                <div className="text-[12px] text-[#52666A] mono">
                  {item.sku} · Expected {expected}
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
                  value={counts[item.id] ?? String(counted)}
                  onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="field w-24 h-[40px] px-3 rounded-[9px] border border-[#8A8276] bg-white text-end font-bold num"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
