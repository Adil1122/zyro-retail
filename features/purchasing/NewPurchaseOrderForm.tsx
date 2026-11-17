'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import type { PurchaseOrder } from '@/types';

interface PoDraftLine {
  itemId: string;
  colourIdx: number | null;
  sizeIdx: number | null;
  qty: number;
  cost: number;
}

export function NewPurchaseOrderForm() {
  const router = useRouter();
  const { state, createPurchaseOrder, notify } = useZyro();
  const [supId, setSupId] = useState(state.suppliers[0]?.id || 's1');
  const [lines, setLines] = useState<PoDraftLine[]>(() => {
    const first = state.items[0];
    return [
      {
        itemId: first?.id || 'tee',
        colourIdx: first?.colours ? 0 : null,
        sizeIdx: first?.sizes ? 0 : null,
        qty: 10,
        cost: first?.costPrice ?? 780,
      },
    ];
  });

  const addLine = () => {
    const it = state.items[Math.min(lines.length, state.items.length - 1)];
    setLines((prev) => [
      ...prev,
      {
        itemId: it.id,
        colourIdx: it.colours ? 0 : null,
        sizeIdx: it.sizes ? 0 : null,
        qty: 10,
        cost: it.costPrice ?? Math.round(it.price * 0.6),
      },
    ]);
  };

  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  const submitPo = () => {
    if (lines.length === 0) {
      notify('Add at least one item line', 'err');
      return;
    }
    const nextNo = String(119 + state.purchaseOrders.length);
    const po: PurchaseOrder = {
      no: nextNo,
      sup: supId,
      status: 'draft',
      by: state.session.user.shortName,
      d: 20261117,
      lines: lines.map((l) => [l.itemId, l.colourIdx, l.sizeIdx, l.qty, l.cost, 0]),
    };
    createPurchaseOrder(po);
    notify(`Created draft PO-${nextNo} for Owner approval`, 'ok');
    router.push('/purchasing');
  };

  return (
    <div className="max-w-[820px] space-y-5">
      <PageHeader
        eyebrow="New replenishment order"
        title="New purchase order"
        subtitle="Create a draft order to send to your supplier once Owner approves."
        actions={
          <Link href="/purchasing">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to purchasing
            </Button>
          </Link>
        }
      />

      <Card className="space-y-5">
        <Select
          label="Supplier"
          value={supId}
          onChange={(e) => setSupId(e.target.value)}
          options={state.suppliers.map((s) => ({
            value: s.id,
            label: `${s.name} · ${s.city} (${s.makes})`,
          }))}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
              Order lines
            </h3>
            <Button size="sm" variant="secondary" onClick={addLine}>
              <Plus className="w-4 h-4" /> Add line
            </Button>
          </div>

          {lines.map((l, idx) => {
            const chosen = state.items.find((x) => x.id === l.itemId);
            return (
              <div
                key={idx}
                className="p-3 rounded-[11px] bg-[#FBF8F4] border border-[#E7E0D7] space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <Select
                      label="Item"
                      value={l.itemId}
                      onChange={(e) => {
                        const it = state.items.find((x) => x.id === e.target.value);
                        setLines((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? {
                                  ...row,
                                  itemId: e.target.value,
                                  colourIdx: it?.colours ? 0 : null,
                                  sizeIdx: it?.sizes ? 0 : null,
                                  cost: it?.costPrice ?? Math.round((it?.price || 1000) * 0.6),
                                }
                              : row
                          )
                        );
                      }}
                      options={state.items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }))}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      label="Qty"
                      type="number"
                      min={1}
                      value={String(l.qty)}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, qty: Math.max(1, parseInt(e.target.value, 10) || 1) } : row
                          )
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      label="Unit cost (Rs)"
                      type="number"
                      min={0}
                      value={String(l.cost)}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, cost: Math.max(0, parseInt(e.target.value, 10) || 0) } : row
                          )
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={lines.length <= 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4 text-[#B42318]" />
                    </Button>
                  </div>
                </div>
                {(chosen?.colours || chosen?.sizes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {chosen.colours && chosen.colours.length > 0 && (
                      <Select
                        label="Colour / shade"
                        value={String(l.colourIdx ?? 0)}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, colourIdx: parseInt(e.target.value, 10) } : row
                            )
                          )
                        }
                        options={chosen.colours.map((c, ci) => ({ value: String(ci), label: c }))}
                      />
                    )}
                    {chosen.sizes && chosen.sizes.length > 0 && (
                      <Select
                        label={chosen.sizeLabel || 'Size'}
                        value={String(l.sizeIdx ?? 0)}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, sizeIdx: parseInt(e.target.value, 10) } : row
                            )
                          )
                        }
                        options={chosen.sizes.map((s, si) => ({ value: String(si), label: s }))}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#F1EBE3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[12px] text-[#52666A]">Estimated PO total</div>
            <div className="font-display text-[22px] font-bold text-[#08343A] num">
              {formatRs(total)}
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={submitPo}>
            Save draft PO
          </Button>
        </div>
      </Card>
    </div>
  );
}
