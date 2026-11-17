'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Receipt,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { StatCard } from '@/components/ui/StatCard';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcBillTotal, getStockStatusInfo, getTotalStock } from '@/lib/inventory';

export function OwnerDashboard() {
  const {
    state,
    session,
    approvePurchaseOrder,
    reviewCashDraft,
    postVendorBill,
    notify,
    t,
  } = useZyro();
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);

  const metrics = useMemo(() => {
    const salesTotal = state.bills.reduce((sum, b) => sum + calcBillTotal(b, state.items), 0);
    const cashSales = state.bills
      .filter((b) => b.pay === 'cash')
      .reduce((sum, b) => sum + calcBillTotal(b, state.items), 0);
    const khataTotal = state.customers.reduce((sum, c) => sum + c.khata, 0);
    const openShift = state.shifts.find((s) => s.status === 'open');
    const drawerCash = (openShift?.float ?? 10000) + cashSales;
    const lowStock = state.items.filter((it) => !it.measured && getTotalStock(it) <= 5);
    const pendingCashDrafts = state.cashDrafts.filter((c) => c.status === 'draft');
    const draftPos = state.purchaseOrders.filter((p) => p.status === 'draft');
    const draftBills = state.vendorBills.filter((b) => b.status === 'draft');
    const payables = state.vendorBills.reduce((sum, b) => {
      const paid = b.pays.reduce((a, p) => a + p.amt, 0);
      return sum + Math.max(0, b.total - paid);
    }, 0);

    return {
      salesTotal,
      cashSales,
      khataTotal,
      drawerCash,
      lowStock,
      pendingCashDrafts,
      draftPos,
      draftBills,
      payables,
      decisionCount: pendingCashDrafts.length + draftPos.length + draftBills.length,
    };
  }, [state]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${session.shopName} · Main branch`}
        title={`Today at ${session.shopName}`}
        subtitle="Sales, drawer cash, pending approvals, and stock watch."
        actions={
          <>
            <Link href="/inventory/count">
              <Button variant="secondary">
                <ClipboardCheck className="w-4 h-4" /> Stock count
              </Button>
            </Link>
            <Link href="/pos">
              <Button variant="primary">
                <ShoppingBag className="w-4 h-4" /> {t('openRegister')}
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t('todaySales')}
          value={formatRs(metrics.salesTotal)}
          sub={`${state.bills.length} bills · Counter 1`}
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatCard
          label={t('cashInDrawer')}
          value={formatRs(metrics.drawerCash)}
          sub="Includes Rs 10,000 float"
          tone="ok"
          icon={<Banknote className="w-4 h-4" />}
        />
        <StatCard
          label={t('khataOwed')}
          value={formatRs(metrics.khataTotal)}
          sub={`${state.customers.filter((c) => c.khata > 0).length} customers owe`}
          tone="warn"
        />
        <StatCard
          label={t('lowStock')}
          value={metrics.lowStock.length}
          sub="Items with ≤ 5 left"
          tone={metrics.lowStock.length > 0 ? 'err' : 'ok'}
          icon={<Boxes className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Needs your decision */}
        <Card className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">Needs your decision</h2>
              <p className="text-[13px] text-[#52666A]">
                Draft cash entries, purchase orders, and supplier bills awaiting owner review
              </p>
            </div>
            <Badge tone={metrics.decisionCount > 0 ? 'warn' : 'ok'}>
              {metrics.decisionCount} pending
            </Badge>
          </div>

          <div className="divide-y divide-[#F1EBE3]">
            {metrics.pendingCashDrafts.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">
                    Cash entry · {formatRs(d.amt)}
                  </div>
                  <div className="text-[12px] text-[#52666A] truncate">
                    {d.reason} · by {d.by}
                  </div>
                </div>
                <Button
                  variant="copperTint"
                  size="sm"
                  onClick={() => {
                    reviewCashDraft(d.id, 'reviewed', 'Approved by Owner');
                    notify(`Marked ${d.id} reviewed`, 'ok');
                  }}
                >
                  Approve
                </Button>
              </div>
            ))}

            {metrics.draftPos.map((po) => (
              <div key={po.no} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[14px] text-[#0B2A2F]">
                    Purchase order PO-{po.no}
                  </div>
                  <div className="text-[12px] text-[#52666A]">Drafted by {po.by}</div>
                </div>
                <Button
                  variant="copperTint"
                  size="sm"
                  onClick={() => {
                    approvePurchaseOrder(po.no);
                    notify(`Approved PO-${po.no}`, 'ok');
                  }}
                >
                  Approve PO
                </Button>
              </div>
            ))}

            {metrics.draftBills.map((vb) => (
              <div key={vb.ref} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[14px] text-[#0B2A2F]">
                    Supplier bill {vb.ref} · {formatRs(vb.total)}
                  </div>
                  <div className="text-[12px] text-[#52666A]">From PO-{vb.po}</div>
                </div>
                <Button
                  variant="copperTint"
                  size="sm"
                  onClick={() => {
                    postVendorBill(vb.ref);
                    notify(`Posted bill ${vb.ref}`, 'ok');
                  }}
                >
                  Post bill
                </Button>
              </div>
            ))}

            {metrics.decisionCount === 0 && (
              <div className="py-6 text-center text-[14px] text-[#14532D] flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Everything reviewed for now.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#F1EBE3] flex justify-between items-center">
            <Button variant="secondary" size="sm" onClick={() => setReviewDrawerOpen(true)}>
              Open review queue
            </Button>
            <Link href="/reports" className="text-[13px] font-semibold text-[#0E5E66] hover:underline flex items-center gap-1">
              Full reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Right column: What you owe + Stock watch */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[17px] font-bold text-[#0B2A2F]">What you owe</h2>
              <Link href="/purchasing" className="text-[13px] font-semibold text-[#0E5E66] hover:underline">
                Suppliers
              </Link>
            </div>
            <div className="text-[24px] font-bold font-display text-[#0B2A2F] num">
              {formatRs(metrics.payables)}
            </div>
            <p className="text-[13px] text-[#52666A]">
              Across {state.vendorBills.length} supplier bills · {state.expenseBills.filter((e) => e.pays.length === 0).length} unpaid expense bills
            </p>
            <div className="flex gap-2 pt-1">
              <Link href="/purchasing" className="flex-1">
                <Button variant="secondary" size="sm" fullWidth>
                  <Truck className="w-4 h-4" /> Pay suppliers
                </Button>
              </Link>
              <Link href="/expenses" className="flex-1">
                <Button variant="secondary" size="sm" fullWidth>
                  Expenses
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[17px] font-bold text-[#0B2A2F]">Stock watch</h2>
              <Link href="/inventory" className="text-[13px] font-semibold text-[#0E5E66] hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#F1EBE3]">
              {metrics.lowStock.slice(0, 4).map((it) => {
                const st = getStockStatusInfo(it);
                return (
                  <div key={it.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#0B2A2F] truncate">{it.name}</div>
                      <div className="text-[12px] text-[#52666A] mono">{it.sku}</div>
                    </div>
                    <Badge tone={st.kind === 'err' ? 'err' : 'warn'}>{st.text}</Badge>
                  </div>
                );
              })}
              {metrics.lowStock.length === 0 && (
                <div className="py-4 text-[13px] text-[#52666A]">All tracked items are well stocked.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">Recent activity</h2>
          <Link href="/pos/bills" className="text-[13px] font-semibold text-[#0E5E66] hover:underline">
            Open Bill book
          </Link>
        </div>
        <div className="divide-y divide-[#F1EBE3]">
          {state.bills.slice(0, 5).map((b) => {
            const cust = b.cust ? state.customers.find((c) => c.id === b.cust) : null;
            return (
              <div key={b.no} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="mono text-[13px] font-bold text-[#08343A] bg-[#F1EBE3] px-2 py-1 rounded-[7px]">
                    #{b.no}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[#0B2A2F] truncate">
                      {cust ? cust.name : 'Walk-in customer'} · {b.pay.toUpperCase()}
                    </div>
                    <div className="text-[12px] text-[#52666A]">{b.time}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.print !== 'printed' && (
                    <Badge tone="warn">
                      <AlertTriangle className="w-3 h-3" /> {b.print}
                    </Badge>
                  )}
                  <span className="font-bold text-[14px] num">{formatRs(calcBillTotal(b, state.items))}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Drawer
        open={reviewDrawerOpen}
        onClose={() => setReviewDrawerOpen(false)}
        title="Owner review queue"
        subtitle="Everything waiting for sign-off across cash & purchasing"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] text-[13px] text-[#3D5357]">
            Approving items here updates your Cash Book, Purchase Orders, and Vendor Payables immediately.
          </div>
          {metrics.pendingCashDrafts.map((d) => (
            <Card key={d.id} padding="sm" className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-[14px]">{formatRs(d.amt)} · {d.ref}</div>
                <div className="text-[12px] text-[#52666A]">{d.reason}</div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  reviewCashDraft(d.id, 'reviewed', 'Approved');
                  notify(`Reviewed ${d.id}`, 'ok');
                }}
              >
                Review
              </Button>
            </Card>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
