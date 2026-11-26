'use client';

import React from 'react';
import Link from 'next/link';
import {
  Boxes,
  Check,
  ChevronRight,
  Plus,
  Ruler,
  Send,
  Tag,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { useZyro } from '@/hooks/useZyro';
import { getTotalStock } from '@/lib/inventory';

export function StockkeeperDashboard() {
  const { state, user } = useZyro();
  const soldOut = state.items.filter((it) => !it.measured && getTotalStock(it) === 0);
  const lowStock = state.items.filter(
    (it) => !it.measured && getTotalStock(it) > 0 && getTotalStock(it) <= 5
  );
  const pendingReceives = state.purchaseOrders.filter(
    (po) => po.status === 'ordered' || po.status === 'partial' || po.status === 'approved'
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Saturday, 14 November · Main branch"
        title={`Good afternoon, ${user.shortName}`}
        actions={
          <Link href="/inventory/count" className="w-full sm:w-auto">
            <Button variant="dark" size="counter" fullWidth>
              <Check className="w-5 h-5" />
              Count stock
            </Button>
          </Link>
        }
      />

      {/* 3 KPI cards matching StockHome.html */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Sold out"
          value={soldOut.length}
          sub="Sizes or items at 0"
          tone={soldOut.length > 0 ? 'err' : 'ok'}
        />
        <StatCard
          label="Low stock watch"
          value={lowStock.length}
          sub="5 or fewer remaining"
          tone="warn"
        />
        <StatCard
          label="Deliveries waiting"
          value={pendingReceives.length}
          sub="Orders from suppliers"
          tone="default"
        />
      </div>

      {/* Main 2-column layout matching StockHome.html */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left: Sold out list */}
        <section
          aria-labelledby="so-t"
          className="w-full lg:flex-[1.3] min-w-0 bg-white border border-[#E7E0D7] rounded-[20px] overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-2.5">
            <h2 id="so-t" className="flex-1 font-display text-[20px] font-bold text-[#0B2A2F]">
              Sold out
            </h2>
            <Link
              href="/inventory"
              className="h-[40px] px-1 inline-flex items-center text-[15px] font-semibold text-[#0E5E66] hover:text-[#08343A] hover:underline"
            >
              Open stock
            </Link>
          </div>

          <div>
            {(soldOut.length > 0 ? soldOut : lowStock).slice(0, 6).map((it) => {
              const qty = getTotalStock(it);
              return (
                <Link
                  key={it.id}
                  href={`/inventory?item=${it.id}`}
                  className="row w-full flex items-center gap-3 min-h-[60px] py-2 px-[18px] border-t border-[#F1EBE3] bg-white"
                >
                  <span className="w-[40px] h-[40px] rounded-[10px] bg-[#FCEFE4] text-[#8A3D12] flex items-center justify-center shrink-0">
                    <Boxes className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-[#0B2A2F] truncate">
                      {it.name}
                    </span>
                    <span className="mono text-[12px] text-[#52666A]">{it.sku}</span>
                  </span>
                  <span
                    className={`h-[24px] px-[9px] rounded-full text-[13px] font-semibold inline-flex items-center ${
                      qty === 0
                        ? 'bg-[#FDF0EF] text-[#B42318]'
                        : 'bg-[#FFF3C4] text-[#6B4E00]'
                    }`}
                  >
                    {qty} left
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="px-[18px] pt-2.5 pb-3.5 border-t border-[#F1EBE3] text-[13px] text-[#52666A]">
            Recount a size before reordering it. A sold-out size can just be on the wrong shelf.
          </div>
        </section>

        {/* Right: Deliveries + Measured pilot + Quick actions */}
        <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-4">
          <section
            aria-labelledby="dl-t"
            className="bg-white border border-[#E7E0D7] rounded-[20px] overflow-hidden"
          >
            <div className="px-[18px] pt-4 pb-2.5">
              <h2 id="dl-t" className="font-display text-[20px] font-bold text-[#0B2A2F]">
                Deliveries to receive
              </h2>
            </div>

            <div>
              {pendingReceives.map((po) => {
                const sup = state.suppliers.find((s) => s.id === po.sup);
                return (
                  <div
                    key={po.no}
                    className="flex items-center gap-3 min-h-[64px] py-2 px-[18px] border-t border-[#F1EBE3]"
                  >
                    <span className="w-[40px] h-[40px] rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center shrink-0">
                      <Truck className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-[#0B2A2F] truncate">
                        PO-{po.no} · {sup?.name || 'Supplier'}
                      </span>
                      <span className="num text-[13px] text-[#52666A]">
                        {po.lines.length} lines · {po.status}
                      </span>
                    </span>
                    <Link
                      href={`/purchasing/receive/${po.no}`}
                      className="bs h-[40px] px-3 rounded-[10px] border border-[#D6CDC1] bg-white text-[#0B2A2F] text-[15px] font-semibold inline-flex items-center shrink-0"
                    >
                      Receive
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="px-[18px] pt-2.5 pb-3.5 border-t border-[#F1EBE3] flex items-center gap-2">
              <span className="flex-1 text-[13px] text-[#52666A]">
                Orders Hamza has sent to suppliers.
              </span>
              <Link
                href="/purchasing"
                className="h-[40px] px-1 inline-flex items-center text-[15px] font-semibold text-[#0E5E66] hover:text-[#08343A] hover:underline"
              >
                All orders
              </Link>
            </div>
          </section>

          {/* Measured pilot card */}
          <Link
            href="/inventory/measured"
            className="opt flex items-center gap-3 px-[18px] py-4 border border-[#EBD892] rounded-[20px] bg-[#FBF8F4] text-[#0B2A2F]"
          >
            <span className="w-[44px] h-[44px] rounded-full bg-[#FFF3C4] text-[#6B4E00] flex items-center justify-center shrink-0">
              <Ruler className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">Fabric by the metre · pilot</span>
              <span className="text-[13px] text-[#6B4E00]">
                Delivery of 40 m waiting for the owner’s OK
              </span>
            </span>
            <ChevronRight className="w-[18px] h-[18px] text-[#6B4E00] shrink-0 rtl:rotate-180" />
          </Link>

          {/* Quick actions matching StockHome.html */}
          <section className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-4 pb-[18px] flex flex-col gap-2.5">
            <h2 className="font-display text-[20px] font-bold text-[#0B2A2F]">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/inventory/items/new"
                className="opt min-h-[76px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
              >
                <span className="w-[34px] h-[34px] rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                  <Plus className="w-[17px] h-[17px]" />
                </span>
                <span className="text-[15px] font-semibold text-[#0B2A2F]">Add item</span>
              </Link>
              <Link
                href="/inventory"
                className="opt min-h-[76px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-[#E7E0D7] rounded-[16px] bg-white"
              >
                <span className="w-[34px] h-[34px] rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                  <Boxes className="w-[17px] h-[17px]" />
                </span>
                <span className="text-[15px] font-semibold text-[#0B2A2F]">Change stock</span>
              </Link>
              <div className="min-h-[76px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-dashed border-[#C9C1B6] rounded-[16px] bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-[34px] h-[34px] rounded-full bg-[#F1EBE3] text-[#52666A] flex items-center justify-center">
                    <Tag className="w-[17px] h-[17px]" />
                  </span>
                  <span className="h-[20px] px-[7px] rounded-full bg-[#F1EBE3] text-[#3D5357] text-[12px] font-semibold inline-flex items-center">
                    Planned
                  </span>
                </div>
                <span className="text-[15px] font-semibold text-[#52666A]">Print labels</span>
              </div>
              <div className="min-h-[76px] flex flex-col justify-center items-start gap-1.5 px-3.5 py-3 border border-dashed border-[#C9C1B6] rounded-[16px] bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-[34px] h-[34px] rounded-full bg-[#F1EBE3] text-[#52666A] flex items-center justify-center">
                    <Send className="w-[17px] h-[17px]" />
                  </span>
                  <span className="h-[20px] px-[7px] rounded-full bg-[#F1EBE3] text-[#3D5357] text-[12px] font-semibold inline-flex items-center">
                    Planned
                  </span>
                </div>
                <span className="text-[15px] font-semibold text-[#52666A]">Move to a branch</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
