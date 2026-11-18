'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  PackageOpen,
  Plus,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, formatRs, formatShortDate } from '@/lib/format';
import { getVariantText } from '@/lib/inventory';
import type { PoStatus, PurchaseOrder, VendorBill } from '@/types';

const PO_BADGE: Record<PoStatus, { label: string; tone: 'ok' | 'warn' | 'err' | 'neutral' }> = {
  draft: { label: 'Draft · Needs Owner approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'neutral' },
  ordered: { label: 'Ordered · Awaiting stock', tone: 'warn' },
  partial: { label: 'Partial delivery', tone: 'warn' },
  received: { label: 'Received', tone: 'ok' },
};

export function PurchasingWorkspace() {
  const {
    state,
    role,
    approvePurchaseOrder,
    markPoOrdered,
    addSupplier,
    addVendorBill,
    postVendorBill,
    payVendorBill,
    addVendorCredit,
    notify,
  } = useZyro();

  const [tab, setTab] = useState<'orders' | 'bills' | 'suppliers'>('orders');
  const [query, setQuery] = useState('');
  const [selectedPoNo, setSelectedPoNo] = useState<string | null>(null);

  // Add supplier modal
  const [supOpen, setSupOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supCity, setSupCity] = useState('Lahore');
  const [supPhone, setSupPhone] = useState('');
  const [supMakes, setSupMakes] = useState('');

  // Enter vendor bill modal
  const [billOpen, setBillOpen] = useState(false);
  const [billRef, setBillRef] = useState('');
  const [billPo, setBillPo] = useState(state.purchaseOrders[0]?.no || '117');
  const [billTotal, setBillTotal] = useState('64000');

  // Pay vendor bill modal
  const [payTarget, setPayTarget] = useState<VendorBill | null>(null);
  const [payAmt, setPayAmt] = useState('');
  const [payRef, setPayRef] = useState('');

  // Supplier credit note modal
  const [creditTarget, setCreditTarget] = useState<VendorBill | null>(null);
  const [creditAmt, setCreditAmt] = useState('');
  const [creditReason, setCreditReason] = useState('Damaged units deducted');

  const isOwner = role === 'owner';

  const supNameById = (id: string) =>
    state.suppliers.find((s) => s.id === id)?.name || id;

  const poTotal = (po: PurchaseOrder) =>
    po.lines.reduce((s, l) => s + l[3] * l[4], 0);

  const billPaid = (b: VendorBill) =>
    b.pays.reduce((s, p) => s + p.amt, 0) + b.credits.reduce((s, c) => s + c.amt, 0);

  const totalPayable = useMemo(
    () => state.vendorBills.reduce((s, b) => s + Math.max(0, b.total - billPaid(b)), 0),
    [state.vendorBills]
  );

  const selectedPo = useMemo(
    () => state.purchaseOrders.find((p) => p.no === selectedPoNo) || null,
    [state.purchaseOrders, selectedPoNo]
  );

  const filteredPos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.purchaseOrders;
    return state.purchaseOrders.filter(
      (p) => p.no.includes(q) || supNameById(p.sup).toLowerCase().includes(q)
    );
  }, [state.purchaseOrders, query, state.suppliers]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stock in & supplier payables"
        title="Purchasing & suppliers"
        subtitle="Raise purchase orders, check deliveries on arrival, and track vendor bills."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="lg" onClick={() => setSupOpen(true)}>
              <Building2 className="w-4 h-4" /> Add supplier
            </Button>
            <Link href="/purchasing/new-po">
              <Button variant="dark" size="lg">
                <Plus className="w-4 h-4" /> New purchase order
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Open purchase orders"
          value={state.purchaseOrders.filter((p) => p.status !== 'received').length}
          sub="Draft, approved, or awaiting delivery"
          icon={<Truck className="w-4 h-4" />}
        />
        <StatCard
          label="Unpaid supplier bills"
          value={formatRs(totalPayable)}
          tone={totalPayable > 0 ? 'warn' : 'ok'}
          sub={`${state.vendorBills.filter((b) => b.total - billPaid(b) > 0).length} bills open`}
          icon={<FileSpreadsheet className="w-4 h-4" />}
        />
        <StatCard
          label="Registered suppliers"
          value={state.suppliers.length}
          sub="Active mills & wholesalers"
          icon={<Building2 className="w-4 h-4" />}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'orders', label: 'Purchase orders', count: state.purchaseOrders.length },
          { id: 'bills', label: 'Supplier bills', count: state.vendorBills.length },
          { id: 'suppliers', label: 'Suppliers', count: state.suppliers.length },
        ]}
      />

      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="max-w-[320px]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search PO # or supplier..." />
          </div>
          <DataTable<PurchaseOrder>
            rows={filteredPos}
            rowKey={(p) => p.no}
            onRowClick={(p) => setSelectedPoNo(p.no)}
            columns={[
              {
                key: 'no',
                header: 'PO #',
                render: (p) => <span className="mono font-bold">PO-{p.no}</span>,
              },
              {
                key: 'sup',
                header: 'Supplier',
                render: (p) => <span className="font-semibold">{supNameById(p.sup)}</span>,
              },
              {
                key: 'd',
                header: 'Date',
                render: (p) => <span className="text-[#52666A]">{formatShortDate(p.d)}</span>,
              },
              {
                key: 'lines',
                header: 'Units',
                render: (p) => (
                  <span className="num text-[13px]">
                    {p.lines.reduce((s, l) => s + l[5], 0)} / {p.lines.reduce((s, l) => s + l[3], 0)} rec
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => <Badge tone={PO_BADGE[p.status].tone}>{PO_BADGE[p.status].label}</Badge>,
              },
              {
                key: 'total',
                header: 'PO Value',
                align: 'end',
                render: (p) => <span className="font-bold num">{formatRs(poTotal(p))}</span>,
              },
            ]}
          />
        </div>
      )}

      {tab === 'bills' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setBillOpen(true)}>
              <Plus className="w-4 h-4" /> Enter supplier bill
            </Button>
          </div>
          <div className="space-y-3">
            {state.vendorBills.map((b) => {
              const paid = billPaid(b);
              const due = Math.max(0, b.total - paid);
              return (
                <Card key={b.ref} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="mono font-bold text-[15px] text-[#0B2A2F]">{b.ref}</span>
                      <Badge tone={b.status === 'posted' ? 'ok' : 'warn'}>{b.status}</Badge>
                      {due === 0 ? (
                        <Badge tone="ok">Paid in full</Badge>
                      ) : (
                        <Badge tone="warn">Due {formatRs(due)}</Badge>
                      )}
                    </div>
                    <div className="text-[13px] text-[#52666A]">
                      {supNameById(b.sup)} · Against PO-{b.po} · Due {formatShortDate(b.due)}
                    </div>
                    {b.pays.length > 0 && (
                      <div className="text-[12px] text-[#14532D]">
                        Paid {formatRs(b.pays.reduce((s, p) => s + p.amt, 0))} ({b.pays.map((p) => p.ref).join(', ')})
                      </div>
                    )}
                    {b.credits.length > 0 && (
                      <div className="text-[12px] text-[#0E5E66]">
                        Credits {formatRs(b.credits.reduce((s, c) => s + c.amt, 0))} ({b.credits.map((c) => c.reason).join(', ')})
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-end me-2">
                      <div className="text-[11px] text-[#52666A]">Bill total</div>
                      <div className="font-bold text-[16px] num">{formatRs(b.total)}</div>
                    </div>
                    {b.status === 'draft' && isOwner && (
                      <Button
                        size="sm"
                        variant="dark"
                        onClick={() => {
                          postVendorBill(b.ref);
                          notify(`Posted bill ${b.ref}`, 'ok');
                        }}
                      >
                        Post bill
                      </Button>
                    )}
                    {due > 0 && isOwner && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setPayTarget(b);
                          setPayAmt(String(due));
                          setPayRef(`PAY-${b.ref}`);
                        }}
                      >
                        <CreditCard className="w-4 h-4" /> Pay supplier
                      </Button>
                    )}
                    {due > 0 && isOwner && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCreditTarget(b);
                          setCreditAmt('2000');
                        }}
                      >
                        Credit note
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.suppliers.map((s) => (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold text-[16px] text-[#0B2A2F]">{s.name}</div>
                  <div className="text-[12px] text-[#52666A]">{s.city}</div>
                </div>
                <Badge tone="neutral">{formatPhone(s.phone)}</Badge>
              </div>
              <div className="text-[13px] text-[#3D5357]">Supplies: {s.makes}</div>
            </Card>
          ))}
        </div>
      )}

      {/* PO Detail Drawer */}
      <Drawer
        open={!!selectedPo}
        onClose={() => setSelectedPoNo(null)}
        title={selectedPo ? `Purchase Order PO-${selectedPo.no}` : ''}
        subtitle={
          selectedPo
            ? `${supNameById(selectedPo.sup)} · Created by ${selectedPo.by} · ${formatShortDate(selectedPo.d)}`
            : ''
        }
        badge={
          selectedPo ? (
            <Badge tone={PO_BADGE[selectedPo.status].tone}>
              {PO_BADGE[selectedPo.status].label}
            </Badge>
          ) : undefined
        }
        footer={
          selectedPo && (
            <>
              {selectedPo.status === 'draft' && isOwner && (
                <Button
                  variant="dark"
                  onClick={() => {
                    approvePurchaseOrder(selectedPo.no);
                    notify(`Approved PO-${selectedPo.no}`, 'ok');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve PO
                </Button>
              )}
              {selectedPo.status === 'approved' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    markPoOrdered(selectedPo.no);
                    notify(`Marked PO-${selectedPo.no} as sent to supplier`, 'ok');
                  }}
                >
                  <Truck className="w-4 h-4" /> Mark as ordered
                </Button>
              )}
              {selectedPo.status !== 'received' && selectedPo.status !== 'draft' && (
                <Link href={`/purchasing/receive/${selectedPo.no}`}>
                  <Button variant="primary">
                    <PackageOpen className="w-4 h-4" /> Receive goods
                  </Button>
                </Link>
              )}
            </>
          )
        }
      >
        {selectedPo && (
          <div className="space-y-4">
            <div className="space-y-2">
              {selectedPo.lines.map(([itId, ci, si, ordQty, poCost, recQty, actCost], idx) => {
                const it = state.items.find((x) => x.id === itId);
                if (!it) return null;
                const costChanged = actCost && actCost !== poCost;
                return (
                  <Card key={idx} padding="sm" className="space-y-1">
                    <div className="flex justify-between font-semibold text-[13px]">
                      <span>
                        {it.name} ({getVariantText(it, ci, si)})
                      </span>
                      <span className="num">{formatRs(ordQty * poCost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-[#52666A]">
                      <span>
                        Ordered {ordQty} × {formatRs(poCost)} · Received {recQty}
                      </span>
                      {costChanged && (
                        <Badge tone="warn">Actual {formatRs(actCost)}</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="p-3.5 rounded-[11px] bg-[#FBF8F4] border border-[#E7E0D7] flex justify-between font-bold">
              <span>PO Estimated Total</span>
              <span className="num">{formatRs(poTotal(selectedPo))}</span>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Supplier Modal */}
      <Modal
        open={supOpen}
        onClose={() => setSupOpen(false)}
        title="Add supplier"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSupOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!supName.trim()) {
                  notify('Enter supplier name', 'err');
                  return;
                }
                addSupplier({
                  id: `s-${Date.now().toString(36)}`,
                  name: supName.trim(),
                  city: supCity.trim() || 'Lahore',
                  phone: supPhone.replace(/\D/g, '') || '03001234567',
                  makes: supMakes.trim() || 'General stock',
                });
                notify(`Added supplier ${supName.trim()}`, 'ok');
                setSupOpen(false);
                setSupName('');
                setSupPhone('');
                setSupMakes('');
              }}
            >
              Save supplier
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Supplier name" value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="e.g. Chenab Mills" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="City" value={supCity} onChange={(e) => setSupCity(e.target.value)} />
            <Input label="Phone" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="0300..." />
          </div>
          <Input label="Items supplied" value={supMakes} onChange={(e) => setSupMakes(e.target.value)} placeholder="e.g. Lawn, cotton suits" />
        </div>
      </Modal>

      {/* Enter Vendor Bill Modal */}
      <Modal
        open={billOpen}
        onClose={() => setBillOpen(false)}
        title="Enter supplier bill"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBillOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const po = state.purchaseOrders.find((p) => p.no === billPo);
                if (!billRef.trim()) {
                  notify('Enter supplier invoice reference', 'err');
                  return;
                }
                addVendorBill({
                  ref: billRef.trim().toUpperCase(),
                  sup: po?.sup || state.suppliers[0].id,
                  po: billPo,
                  status: 'draft',
                  by: state.session.user.shortName,
                  inv: 20261117,
                  due: 20261217,
                  total: parseInt(billTotal, 10) || 0,
                  pays: [],
                  credits: [],
                });
                notify(`Logged draft supplier bill ${billRef.trim()}`, 'ok');
                setBillOpen(false);
                setBillRef('');
              }}
            >
              Save draft bill
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Supplier invoice #" value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="e.g. INV-2310" />
          <Select
            label="Purchase Order"
            value={billPo}
            onChange={(e) => setBillPo(e.target.value)}
            options={state.purchaseOrders.map((p) => ({
              value: p.no,
              label: `PO-${p.no} · ${supNameById(p.sup)}`,
            }))}
          />
          <Input label="Total bill amount (Rs)" type="number" value={billTotal} onChange={(e) => setBillTotal(e.target.value)} />
        </div>
      </Modal>

      {/* Pay Supplier Modal */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={payTarget ? `Pay supplier bill ${payTarget.ref}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!payTarget) return;
                const amt = parseInt(payAmt, 10) || 0;
                if (amt <= 0) {
                  notify('Enter a positive payment amount', 'err');
                  return;
                }
                payVendorBill(payTarget.ref, amt, payRef || 'CASH-SUP');
                notify(`Paid ${formatRs(amt)} against ${payTarget.ref}`, 'ok');
                setPayTarget(null);
              }}
            >
              Confirm payment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Amount paying (Rs)" type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
          <Input label="Payment / bank slip reference" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
        </div>
      </Modal>

      {/* Credit Note Modal */}
      <Modal
        open={!!creditTarget}
        onClose={() => setCreditTarget(null)}
        title={creditTarget ? `Supplier credit note · ${creditTarget.ref}` : ''}
        subtitle="Deduct short-shipped or damaged items from payable balance."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreditTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!creditTarget) return;
                const amt = parseInt(creditAmt, 10) || 0;
                if (amt <= 0) {
                  notify('Enter a positive credit amount', 'err');
                  return;
                }
                addVendorCredit(creditTarget.ref, amt, creditReason);
                notify(`Applied credit note of ${formatRs(amt)} on ${creditTarget.ref}`, 'ok');
                setCreditTarget(null);
              }}
            >
              Apply credit note
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Credit amount (Rs)" type="number" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} />
          <Input label="Reason" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
