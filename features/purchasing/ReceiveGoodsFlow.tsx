'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { getVariantText } from '@/lib/inventory';

export function ReceiveGoodsFlow({ poNo }: { poNo: string }) {
  const router = useRouter();
  const { state, receivePurchaseOrder, notify } = useZyro();

  const po = useMemo(
    () => state.purchaseOrders.find((p) => p.no === poNo) || null,
    [state.purchaseOrders, poNo]
  );

  const [inputs, setInputs] = useState<Record<number, { qty: number; cost: number }>>(() => {
    const map: Record<number, { qty: number; cost: number }> = {};
    if (po) {
      po.lines.forEach((l, idx) => {
        map[idx] = { qty: l[3], cost: l[6] ?? l[4] };
      });
    }
    return map;
  });

  if (!po) {
    return (
      <EmptyState
        title={`Purchase order PO-${poNo} not found`}
        body="Return to purchasing to pick an active purchase order."
        action={
          <Link href="/purchasing">
            <Button variant="primary">Back to purchasing</Button>
          </Link>
        }
      />
    );
  }

  const supplier = state.suppliers.find((s) => s.id === po.sup);

  const hasOverDelivery = po.lines.some((l, idx) => (inputs[idx]?.qty ?? l[5]) > l[3]);
  const hasCostVariance = po.lines.some((l, idx) => (inputs[idx]?.cost ?? l[4]) !== l[4]);

  const handleConfirm = () => {
    if (hasOverDelivery) {
      notify('Received quantity cannot exceed ordered quantity on this PO', 'err');
      return;
    }
    receivePurchaseOrder(po.no, inputs);
    notify(`Received delivery for PO-${po.no}`, 'ok');
    router.push('/purchasing');
  };

  return (
    <div className="max-w-[840px] space-y-5">
      <PageHeader
        eyebrow={`Goods receiving · ${supplier?.name || po.sup}`}
        title={`Receive PO-${po.no}`}
        subtitle="Count items unpacked from the carton and confirm actual supplier unit cost."
        actions={
          <Link href="/purchasing">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        }
      />

      {hasCostVariance && (
        <div className="p-3.5 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] flex items-center gap-2.5 text-[13px] text-[#6B4E00]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Supplier unit cost differs from original PO cost on one or more lines. Owner will see the variance on the vendor bill.
          </span>
        </div>
      )}

      {hasOverDelivery && (
        <div className="p-3.5 rounded-[12px] bg-[#FDF0EF] border border-[#F0C8C3] flex items-center gap-2.5 text-[13px] text-[#B42318]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Over-delivery guard: received units cannot exceed ordered units without an amended PO.</span>
        </div>
      )}

      <div className="space-y-3">
        {po.lines.map(([itId, ci, si, ordQty, poCost], idx) => {
          const it = state.items.find((x) => x.id === itId);
          const cur = inputs[idx] || { qty: ordQty, cost: poCost };
          const over = cur.qty > ordQty;
          const costDiff = cur.cost !== poCost;
          return (
            <Card key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-[14px] text-[#0B2A2F]">
                  {it?.name || itId} · {it ? getVariantText(it, ci, si) : ''}
                </div>
                <div className="text-[12px] text-[#52666A]">
                  Ordered: <strong className="num">{ordQty}</strong> · PO unit cost: <strong className="num">{formatRs(poCost)}</strong>
                </div>
                <div className="flex gap-1.5">
                  {over && <Badge tone="err">Exceeds ordered qty</Badge>}
                  {costDiff && <Badge tone="warn">Cost variance ({formatRs(cur.cost - poCost)})</Badge>}
                  {!over && cur.qty === ordQty && <Badge tone="ok">Full match</Badge>}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="text-[12px] text-[#52666A] flex flex-col gap-1">
                  <span>Qty received</span>
                  <input
                    type="number"
                    min={0}
                    value={cur.qty}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        [idx]: { ...cur, qty: Math.max(0, parseInt(e.target.value, 10) || 0) },
                      }))
                    }
                    className={`field w-24 h-[40px] px-3 rounded-[9px] border bg-white font-bold num text-end ${
                      over ? 'border-[#B42318]' : 'border-[#8A8276]'
                    }`}
                  />
                </label>
                <label className="text-[12px] text-[#52666A] flex flex-col gap-1">
                  <span>Invoice unit cost</span>
                  <input
                    type="number"
                    min={0}
                    value={cur.cost}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        [idx]: { ...cur, cost: Math.max(0, parseInt(e.target.value, 10) || 0) },
                      }))
                    }
                    className="field w-28 h-[40px] px-3 rounded-[9px] border border-[#8A8276] bg-white font-bold num text-end"
                  />
                </label>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="primary" size="lg" onClick={handleConfirm} disabled={hasOverDelivery}>
          <PackageCheck className="w-5 h-5" /> Confirm goods received
        </Button>
      </div>
    </div>
  );
}
