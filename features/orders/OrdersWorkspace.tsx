'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  PackageCheck,
  Plus,
  Send,
  ShoppingBag,
  Truck,
  XCircle,
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
import { ORDER_SRC } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { getVariantText } from '@/lib/inventory';
import type { OrderSource, OrderStatus, SalesOrder, ShipmentRecord } from '@/types';

const STATUS_BADGE: Record<OrderStatus, { label: string; tone: 'ok' | 'warn' | 'err' | 'neutral' }> = {
  draft: { label: 'Draft · Unconfirmed', tone: 'warn' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  partially_fulfilled: { label: 'Partially packed', tone: 'warn' },
  fulfilled: { label: 'Fulfilled', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'err' },
};

export function OrdersWorkspace() {
  const {
    state,
    role,
    createOrder,
    updateOrderStatus,
    packOrderLine,
    createShipment,
    completeRtoInspection,
    matchShipmentCod,
    markMessageSent,
    notify,
  } = useZyro();

  const [tab, setTab] = useState<'board' | 'ships' | 'msgs'>('board');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [query, setQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Create order modal
  const [createOpen, setCreateOpen] = useState(false);
  const [src, setSrc] = useState<OrderSource>('manual_whatsapp');
  const [refCode, setRefCode] = useState('');
  const [custName, setCustName] = useState('');
  const [city, setCity] = useState('Lahore');
  const [draftLines, setDraftLines] = useState<
    Array<{ itemId: string; colourIdx: number | null; sizeIdx: number | null; qty: number }>
  >(() => {
    const first = state.items.find((i) => !i.measured) || state.items[0];
    return [
      {
        itemId: first?.id || 'tee',
        colourIdx: first?.colours ? 0 : null,
        sizeIdx: first?.sizes ? 0 : null,
        qty: 1,
      },
    ];
  });

  // Dispatch parcel modal
  const [shipTarget, setShipTarget] = useState<SalesOrder | null>(null);
  const [shipCourier, setShipCourier] = useState('TCS');
  const [shipCod, setShipCod] = useState('');

  // Return inspection modal
  const [rtoModalOrder, setRtoModalOrder] = useState<SalesOrder | null>(null);
  const [rtoCondition, setRtoCondition] = useState<'resellable' | 'damaged'>('resellable');

  // COD match modal
  const [matchShip, setMatchShip] = useState<ShipmentRecord | null>(null);
  const [codGot, setCodGot] = useState('');
  const [codFees, setCodFees] = useState('150');
  const [codRef, setCodRef] = useState('');

  // Message editor
  const [draftBodies, setDraftBodies] = useState<Record<string, string>>({});

  const orderTotal = (o: SalesOrder) =>
    o.lines.reduce((sum, [id, , , q]) => {
      const it = state.items.find((x) => x.id === id);
      return sum + (it ? it.price : 0) * q;
    }, 0);

  const getCustomerLabel = (o: SalesOrder) => {
    if (o.cust) {
      const c = state.customers.find((x) => x.id === o.cust);
      if (c) return c.name;
    }
    return o.name || 'Customer';
  };

  const filteredOrders = useMemo(() => {
    return state.orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.ref.toLowerCase().includes(q) ||
        getCustomerLabel(o).toLowerCase().includes(q)
      );
    });
  }, [state.orders, statusFilter, query, state.customers]);

  const selectedOrder = useMemo(
    () => state.orders.find((o) => o.id === selectedOrderId) || null,
    [state.orders, selectedOrderId]
  );

  const openCount = state.orders.filter(
    (o) => o.status === 'draft' || o.status === 'confirmed' || o.status === 'partially_fulfilled'
  ).length;
  const pendingCod = state.shipments
    .filter((s) => !s.match && s.status !== 'rto_manual')
    .reduce((sum, s) => sum + s.cod, 0);
  const unsentMsgs = state.messageDrafts.filter((m) => !m.sent).length;

  const handleCreateOrder = () => {
    if (!custName.trim()) {
      notify('Enter customer name or social handle', 'err');
      return;
    }
    if (draftLines.length === 0) {
      notify('Add at least one item to the order', 'err');
      return;
    }
    const id = String(2049 + state.orders.length);
    const order: SalesOrder = {
      id,
      src,
      ref: refCode.trim() || `ORD-${id}`,
      cust: null,
      name: custName.trim(),
      city: city.trim() || 'Lahore',
      status: 'draft',
      by: state.session.user.shortName,
      when: 'Just now',
      lines: draftLines.map((l) => [l.itemId, l.colourIdx, l.sizeIdx, Math.max(1, l.qty), 0]),
    };
    createOrder(order);
    notify(`Created draft order #${id}`, 'ok');
    setCreateOpen(false);
    setCustName('');
    setRefCode('');
    setSelectedOrderId(id);
  };

  const openMatchModal = (s: ShipmentRecord) => {
    setMatchShip(s);
    setCodGot(String(s.cod - 150));
    setCodFees('150');
    setCodRef(`${s.courier.toUpperCase()}-${s.order}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="WhatsApp · Instagram · Website · Courier"
        title="Orders & deliveries"
        subtitle="Confirm online orders, pack items off shelf, and reconcile courier cash-on-delivery."
        actions={
          role !== 'inventory' ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Create order
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Open to pack or confirm"
          value={openCount}
          tone={openCount > 0 ? 'warn' : 'ok'}
          sub="Across WhatsApp, IG, Web"
          icon={<ShoppingBag className="w-4 h-4" />}
        />
        <StatCard
          label="Pending courier COD"
          value={formatRs(pendingCod)}
          sub={`${state.shipments.filter((s) => !s.match).length} shipments awaiting settlement`}
          icon={<Truck className="w-4 h-4" />}
        />
        <StatCard
          label="Draft customer messages"
          value={unsentMsgs}
          sub="Ready to send on WhatsApp"
          icon={<MessageSquare className="w-4 h-4" />}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'board', label: 'Orders board', count: state.orders.length },
          {
            id: 'ships',
            label: 'Shipments & COD',
            count: state.shipments.filter((s) => !s.match).length,
            badgeTone: 'warn',
          },
          {
            id: 'msgs',
            label: 'Message drafts',
            count: unsentMsgs,
            badgeTone: unsentMsgs > 0 ? 'warn' : 'neutral',
          },
        ]}
      />

      {tab === 'board' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', 'All'],
                  ['draft', 'Draft'],
                  ['confirmed', 'Confirmed'],
                  ['partially_fulfilled', 'Partial'],
                  ['fulfilled', 'Fulfilled'],
                  ['cancelled', 'Cancelled'],
                ] as const
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    statusFilter === id
                      ? 'bg-[#08343A] text-white border-[#08343A]'
                      : 'bg-white text-[#3D5357] border-[#D6CDC1] hover:bg-[#FBF8F4]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="w-full md:w-[260px]">
              <SearchInput value={query} onChange={setQuery} placeholder="Order #, customer, ref..." />
            </div>
          </div>

          <DataTable<SalesOrder>
            rows={filteredOrders}
            rowKey={(o) => o.id}
            onRowClick={(o) => setSelectedOrderId(o.id)}
            columns={[
              {
                key: 'id',
                header: 'Order',
                render: (o) => (
                  <div>
                    <div className="mono font-bold text-[#0B2A2F]">#{o.id}</div>
                    <div className="text-[11px] text-[#52666A]">{o.when}</div>
                  </div>
                ),
              },
              {
                key: 'src',
                header: 'Channel',
                render: (o) => (
                  <div>
                    <div className="font-semibold text-[13px]">{ORDER_SRC[o.src]}</div>
                    <div className="text-[11px] text-[#52666A] mono">{o.ref}</div>
                  </div>
                ),
              },
              {
                key: 'cust',
                header: 'Customer',
                render: (o) => <span className="font-medium">{getCustomerLabel(o)}</span>,
              },
              {
                key: 'pack',
                header: 'Packed',
                render: (o) => {
                  const totalQty = o.lines.reduce((s, l) => s + l[3], 0);
                  const shipQty = o.lines.reduce((s, l) => s + l[4], 0);
                  return (
                    <span className="num text-[13px] text-[#3D5357]">
                      {shipQty} / {totalQty} units
                    </span>
                  );
                },
              },
              {
                key: 'status',
                header: 'Status',
                render: (o) => {
                  const b = STATUS_BADGE[o.status];
                  return <Badge tone={b.tone}>{b.label}</Badge>;
                },
              },
              {
                key: 'total',
                header: 'Total',
                align: 'end',
                render: (o) => <span className="font-bold num">{formatRs(orderTotal(o))}</span>,
              },
            ]}
          />
        </div>
      )}

      {tab === 'ships' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.shipments.map((s) => (
            <Card key={s.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono font-bold text-[15px] text-[#0B2A2F]">{s.id}</span>
                    <Badge tone="neutral">{s.courier}</Badge>
                  </div>
                  <div className="text-[13px] text-[#52666A]">
                    Order #{s.order} · {s.city}
                  </div>
                </div>
                {s.status === 'delivered_manual' && <Badge tone="ok">Delivered · COD matched</Badge>}
                {s.status === 'prepared' && <Badge tone="warn">Packed · At shop</Badge>}
                {s.status === 'handed_over' && <Badge tone="warn">With courier</Badge>}
                {s.status === 'rto_manual' && <Badge tone="err">RTO · Returned</Badge>}
              </div>

              <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between text-[13px]">
                <span className="text-[#52666A]">COD amount</span>
                <span className="font-bold num text-[#0B2A2F]">{formatRs(s.cod)}</span>
              </div>

              {s.match ? (
                <div className="text-[12px] text-[#14532D] bg-[#E3F4EA] px-3 py-2 rounded-[9px]">
                  Settled {formatRs(s.match.got)} (courier fee {formatRs(s.match.fees)}) · Ref {s.match.ref}
                </div>
              ) : s.note ? (
                <div className="text-[12px] text-[#B42318] bg-[#FDF0EF] px-3 py-2 rounded-[9px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {s.note}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {!s.match && s.status !== 'rto_manual' && (
                  <Button size="sm" variant="primary" onClick={() => openMatchModal(s)}>
                    <CheckCircle2 className="w-4 h-4" /> Match COD settlement
                  </Button>
                )}
                {s.status === 'rto_manual' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const ord = state.orders.find((o) => o.id === s.order);
                      if (ord) setRtoModalOrder(ord);
                    }}
                  >
                    Inspect returned parcel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'msgs' && (
        <div className="space-y-3">
          {state.messageDrafts.map((m) => {
            const text = draftBodies[m.id] ?? m.body;
            return (
              <Card key={m.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[15px] text-[#0B2A2F]">
                      {m.customerName} · Order #{m.orderId}
                    </div>
                    <div className="text-[12px] text-[#52666A]">
                      {m.channel} · {m.template}
                    </div>
                  </div>
                  <Badge tone={m.sent ? 'ok' : 'warn'}>{m.sent ? 'Sent' : 'Draft'}</Badge>
                </div>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setDraftBodies((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  className="field w-full rounded-[10px] border border-[#D6CDC1] bg-[#FBF8F4] p-3 text-[13px] text-[#0B2A2F]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant={m.sent ? 'secondary' : 'primary'}
                    onClick={() => {
                      markMessageSent(m.id, text);
                      notify(`Marked ${m.channel} message to ${m.customerName} as sent`, 'ok');
                    }}
                  >
                    <Send className="w-4 h-4" /> {m.sent ? 'Resend message' : 'Mark as sent'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Detail Drawer */}
      <Drawer
        open={!!selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        title={selectedOrder ? `Order #${selectedOrder.id}` : ''}
        subtitle={
          selectedOrder
            ? `${ORDER_SRC[selectedOrder.src]} · ${selectedOrder.ref} · ${getCustomerLabel(selectedOrder)}`
            : ''
        }
        badge={
          selectedOrder ? (
            <Badge tone={STATUS_BADGE[selectedOrder.status].tone}>
              {STATUS_BADGE[selectedOrder.status].label}
            </Badge>
          ) : undefined
        }
        footer={
          selectedOrder && (
            <>
              {selectedOrder.status === 'draft' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'confirmed');
                    notify(`Order #${selectedOrder.id} confirmed for packing`, 'ok');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm order
                </Button>
              )}
              {(selectedOrder.status === 'confirmed' ||
                selectedOrder.status === 'partially_fulfilled' ||
                selectedOrder.status === 'fulfilled') &&
                !state.shipments.some((s) => s.order === selectedOrder.id) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShipTarget(selectedOrder);
                      setShipCod(String(orderTotal(selectedOrder)));
                    }}
                  >
                    <Truck className="w-4 h-4" /> Dispatch parcel
                  </Button>
                )}
              {selectedOrder.status === 'fulfilled' && (
                <Button variant="secondary" onClick={() => setRtoModalOrder(selectedOrder)}>
                  Record return
                </Button>
              )}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'fulfilled' && (
                <Button
                  variant="danger"
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'cancelled');
                    notify(`Order #${selectedOrder.id} cancelled`, 'info');
                  }}
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </Button>
              )}
            </>
          )
        }
      >
        {selectedOrder && (
          <div className="space-y-5">
            {selectedOrder.confirm && (
              <div className="p-3 rounded-[10px] bg-[#E3F4EA] border border-[#B2DFC4] text-[13px] text-[#14532D]">
                <strong>Confirmation proof:</strong> {selectedOrder.confirm}
              </div>
            )}

            <div className="space-y-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
                Order items &amp; packing
              </h3>
              {selectedOrder.lines.map(([itId, ci, si, ordQty, shipQty], idx) => {
                const it = state.items.find((x) => x.id === itId);
                if (!it) return null;
                const packed = shipQty >= ordQty;
                return (
                  <Card key={idx} padding="sm" className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[14px] text-[#0B2A2F]">{it.name}</div>
                      <div className="text-[12px] text-[#52666A]">
                        {getVariantText(it, ci, si)} · Qty {ordQty} · {formatRs(it.price * ordQty)}
                      </div>
                    </div>
                    {packed ? (
                      <Badge tone="ok">Packed</Badge>
                    ) : selectedOrder.status === 'confirmed' ||
                      selectedOrder.status === 'partially_fulfilled' ? (
                      <Button
                        size="sm"
                        variant="dark"
                        onClick={() => {
                          packOrderLine(selectedOrder.id, idx);
                          notify(`Packed ${it.name} for Order #${selectedOrder.id}`, 'ok');
                        }}
                      >
                        <PackageCheck className="w-4 h-4" /> Pack item
                      </Button>
                    ) : (
                      <Badge tone="neutral">Confirm first</Badge>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="p-3.5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between">
              <span className="font-semibold text-[14px] text-[#0B2A2F]">Order total</span>
              <span className="font-display font-bold text-[18px] text-[#08343A] num">
                {formatRs(orderTotal(selectedOrder))}
              </span>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New online or phone order"
        subtitle="Log an order from WhatsApp, Instagram DM, or website form."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateOrder}>Save draft order</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Channel"
              value={src}
              onChange={(e) => setSrc(e.target.value as OrderSource)}
              options={Object.entries(ORDER_SRC).map(([k, v]) => ({ value: k, label: v }))}
            />
            <Input
              label="Chat or form reference"
              placeholder="e.g. WA-1117-01"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Customer name or @handle"
              placeholder="e.g. Zara Siddiqui"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
            />
            <Input label="Delivery city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
                Order items
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const first = state.items.find((i) => !i.measured) || state.items[0];
                  setDraftLines((prev) => [
                    ...prev,
                    {
                      itemId: first?.id || 'tee',
                      colourIdx: first?.colours ? 0 : null,
                      sizeIdx: first?.sizes ? 0 : null,
                      qty: 1,
                    },
                  ]);
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add item
              </Button>
            </div>
            {draftLines.map((dl, idx) => {
              const chosen = state.items.find((i) => i.id === dl.itemId);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7] space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                    <div className="sm:col-span-3">
                      <Select
                        label="Item"
                        value={dl.itemId}
                        onChange={(e) => {
                          const nextItem = state.items.find((x) => x.id === e.target.value);
                          setDraftLines((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? {
                                    ...row,
                                    itemId: e.target.value,
                                    colourIdx: nextItem?.colours ? 0 : null,
                                    sizeIdx: nextItem?.sizes ? 0 : null,
                                  }
                                : row
                            )
                          );
                        }}
                        options={state.items
                          .filter((i) => !i.measured)
                          .map((i) => ({ value: i.id, label: `${i.name} (${formatRs(i.price)})` }))}
                      />
                    </div>
                    <Input
                      label="Qty"
                      type="number"
                      min={1}
                      value={String(dl.qty)}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? { ...row, qty: Math.max(1, parseInt(e.target.value, 10) || 1) }
                              : row
                          )
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-2.5">
                    {chosen?.colours && chosen.colours.length > 0 && (
                      <div className="flex-1 min-w-[120px]">
                        <Select
                          label="Colour"
                          value={String(dl.colourIdx ?? 0)}
                          onChange={(e) =>
                            setDraftLines((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, colourIdx: parseInt(e.target.value, 10) } : row
                              )
                            )
                          }
                          options={chosen.colours.map((c, ci) => ({ value: String(ci), label: c }))}
                        />
                      </div>
                    )}
                    {chosen?.sizes && chosen.sizes.length > 0 && (
                      <div className="flex-1 min-w-[100px]">
                        <Select
                          label={chosen.sizeLabel || 'Size'}
                          value={String(dl.sizeIdx ?? 0)}
                          onChange={(e) =>
                            setDraftLines((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, sizeIdx: parseInt(e.target.value, 10) } : row
                              )
                            )
                          }
                          options={chosen.sizes.map((s, si) => ({ value: String(si), label: s }))}
                        />
                      </div>
                    )}
                    {draftLines.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDraftLines((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Dispatch Parcel Modal */}
      <Modal
        open={!!shipTarget}
        onClose={() => setShipTarget(null)}
        title={shipTarget ? `Dispatch parcel · Order #${shipTarget.id}` : ''}
        subtitle={shipTarget ? `${getCustomerLabel(shipTarget)} · ${shipTarget.city || 'Lahore'}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShipTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!shipTarget) return;
                const shId = `SHP-${883 + state.shipments.length}`;
                createShipment({
                  id: shId,
                  order: shipTarget.id,
                  courier: shipCourier,
                  city: shipTarget.city || 'Lahore',
                  status: 'prepared',
                  cod: Math.max(0, parseInt(shipCod, 10) || 0),
                  lines: shipTarget.lines.map((_, i) => [i, shipTarget.lines[i][3]]),
                });
                notify(`Booked ${shId} with ${shipCourier} for Order #${shipTarget.id}`, 'ok');
                setShipTarget(null);
              }}
            >
              Book courier parcel
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Select
            label="Courier"
            value={shipCourier}
            onChange={(e) => setShipCourier(e.target.value)}
            options={[
              { value: 'TCS', label: 'TCS' },
              { value: 'Leopards', label: 'Leopards' },
              { value: 'M&P', label: 'M&P' },
              { value: 'Trax', label: 'Trax' },
              { value: 'Rider', label: 'Local shop rider' },
            ]}
          />
          <Input
            label="COD amount to collect (Rs)"
            type="number"
            value={shipCod}
            onChange={(e) => setShipCod(e.target.value)}
          />
        </div>
      </Modal>

      {/* Match COD Modal */}
      <Modal
        open={!!matchShip}
        onClose={() => setMatchShip(null)}
        title={matchShip ? `Match COD · ${matchShip.id}` : ''}
        subtitle={matchShip ? `Expected COD: ${formatRs(matchShip.cod)}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMatchShip(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!matchShip) return;
                matchShipmentCod(
                  matchShip.id,
                  parseInt(codGot, 10) || 0,
                  parseInt(codFees, 10) || 0,
                  codRef || matchShip.id
                );
                notify(`Matched COD for ${matchShip.id}`, 'ok');
                setMatchShip(null);
              }}
            >
              Confirm COD deposit
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Net cash received from courier (Rs)" type="number" value={codGot} onChange={(e) => setCodGot(e.target.value)} />
          <Input label="Courier delivery fee deducted (Rs)" type="number" value={codFees} onChange={(e) => setCodFees(e.target.value)} />
          <Input label="Bank / slip reference" value={codRef} onChange={(e) => setCodRef(e.target.value)} />
        </div>
      </Modal>

      {/* Return Inspection Modal */}
      <Modal
        open={!!rtoModalOrder}
        onClose={() => setRtoModalOrder(null)}
        title={rtoModalOrder ? `Inspect return · Order #${rtoModalOrder.id}` : ''}
        subtitle="Check condition before placing returned units back on the shelf."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRtoModalOrder(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!rtoModalOrder) return;
                completeRtoInspection(rtoModalOrder.id, rtoCondition);
                notify(
                  rtoCondition === 'resellable'
                    ? `Returned Order #${rtoModalOrder.id} items restocked to shelf`
                    : `Logged Order #${rtoModalOrder.id} return as damaged`,
                  'ok'
                );
                setRtoModalOrder(null);
              }}
            >
              Complete inspection
            </Button>
          </>
        }
      >
        <Select
          label="Parcel condition"
          value={rtoCondition}
          onChange={(e) => setRtoCondition(e.target.value as 'resellable' | 'damaged')}
          options={[
            { value: 'resellable', label: 'Sealed & good — return to shelf stock' },
            { value: 'damaged', label: 'Damaged or opened — write off to shrinkage' },
          ]}
        />
      </Modal>
    </div>
  );
}
