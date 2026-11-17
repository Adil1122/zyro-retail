'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Boxes, ClipboardCheck, Plus, Truck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { useZyro } from '@/hooks/useZyro';
import { getTotalStock } from '@/lib/inventory';

export function StockkeeperDashboard() {
  const { state, user } = useZyro();
  const soldOut = state.items.filter((it) => !it.measured && getTotalStock(it) === 0);
  const lowStock = state.items.filter((it) => !it.measured && getTotalStock(it) > 0 && getTotalStock(it) <= 5);
  const pendingReceives = state.purchaseOrders.filter(
    (po) => po.status === 'ordered' || po.status === 'partial' || po.status === 'approved'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stock room · Inventory"
        title={`Good afternoon, ${user.shortName}`}
        subtitle="Deliveries to receive, stock counts due, and items needing labels."
        actions={
          <Link href="/inventory/items/new">
            <Button variant="primary">
              <Plus className="w-4 h-4" /> Add item
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Sold out"
          value={soldOut.length}
          sub="Needs reorder or transfer"
          tone={soldOut.length > 0 ? 'err' : 'ok'}
        />
        <StatCard
          label="Deliveries to receive"
          value={pendingReceives.length}
          sub="Purchase orders arriving"
          tone="warn"
          icon={<Truck className="w-4 h-4" />}
        />
        <StatCard
          label="Low stock watch"
          value={lowStock.length}
          sub="5 or fewer remaining"
          icon={<Boxes className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[18px] font-bold">Deliveries to receive</h2>
            <Link href="/purchasing" className="text-[13px] font-semibold text-[#0E5E66] hover:underline">
              All POs
            </Link>
          </div>
          <div className="divide-y divide-[#F1EBE3]">
            {pendingReceives.map((po) => {
              const sup = state.suppliers.find((s) => s.id === po.sup);
              return (
                <div key={po.no} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[14px]">
                      PO-{po.no} · {sup?.name || 'Supplier'}
                    </div>
                    <div className="text-[12px] text-[#52666A]">
                      {po.lines.length} lines · Status: {po.status}
                    </div>
                  </div>
                  <Link href={`/purchasing/receive/${po.no}`}>
                    <Button variant="copperTint" size="sm">
                      Receive goods
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-5 space-y-3">
          <h2 className="font-display text-[18px] font-bold">Quick actions</h2>
          <div className="space-y-2.5">
            <Link href="/inventory/count" className="block">
              <Button variant="dark" fullWidth className="justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Start stock count
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/inventory/items/new" className="block">
              <Button variant="secondary" fullWidth className="justify-between">
                <span>Add new item / style</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/purchasing/new-po" className="block">
              <Button variant="secondary" fullWidth className="justify-between">
                <span>Draft purchase order</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/inventory/photos" className="block">
              <Button variant="secondary" fullWidth className="justify-between">
                <span>Photos from phone</span>
                <Badge tone="neutral">Handoff</Badge>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
