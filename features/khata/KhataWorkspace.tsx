'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  MessageCircle,
  Plus,
  ShieldCheck,
  UserCheck,
  Wallet,
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
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { daysAgo, formatPhone, formatRs, formatShortDate } from '@/lib/format';
import type { Customer, KhataInvoice } from '@/types';

export function KhataWorkspace() {
  const {
    state,
    role,
    addCustomer,
    collectKhataPayment,
    setKhataConsent,
    settleCustomerRefund,
    addKhataReminder,
    notify,
  } = useZyro();

  const [tab, setTab] = useState<'owing' | 'all' | 'refunds' | 'messages'>('owing');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Add customer modal
  const [addOpen, setAddOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Collect payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [payInvoiceNo, setPayInvoiceNo] = useState<string | undefined>(undefined);

  // Consent evidence modal
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentEv, setConsentEv] = useState('Said yes at the counter');

  // WhatsApp reminder modal
  const [remindOpen, setRemindOpen] = useState(false);
  const [remindText, setRemindText] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('cust');
    if (id && state.customers.some((c) => c.id === id)) {
      setSelectedId(id);
    }
  }, [state.customers]);

  const totalKhata = useMemo(
    () => state.customers.reduce((s, c) => s + c.khata, 0),
    [state.customers]
  );
  const totalRefunds = useMemo(
    () => state.customers.reduce((s, c) => s + (c.refundOwed || 0), 0),
    [state.customers]
  );

  const filtered = useMemo(() => {
    return state.customers.filter((c) => {
      if (tab === 'owing' && c.khata <= 0) return false;
      if (tab === 'refunds' && !(c.refundOwed && c.refundOwed > 0)) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [state.customers, tab, query]);

  const selected = useMemo(
    () => state.customers.find((c) => c.id === selectedId) || null,
    [state.customers, selectedId]
  );

  const custInvoices = useMemo(() => {
    if (!selected) return [];
    return state.khataInvoices.filter((inv) => inv.cust === selected.id);
  }, [selected, state.khataInvoices]);

  const invSubtotal = (inv: KhataInvoice) =>
    inv.lines.reduce((s, [id, , , qty, unitPrice]) => {
      const it = state.items.find((x) => x.id === id);
      const price = unitPrice ?? (it ? it.price : 0);
      return s + price * qty;
    }, 0);

  const openReminderFor = (c: Customer) => {
    setRemindText(
      `Assalam-o-Alaikum ${c.name} ji, a gentle reminder from ${state.session.shopName}: your Khata balance is ${formatRs(c.khata)}. JazakAllah.`
    );
    setRemindOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Customer credit ledger"
        title="Khata"
        subtitle="Track customer credit balances, collect part payments, and send polite WhatsApp reminders."
        actions={
          <Button variant="dark" size="lg" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add customer
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Khata receivable"
          value={formatRs(totalKhata)}
          sub={`${state.customers.filter((c) => c.khata > 0).length} customers with open balances`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          label="Refunds owed to customers"
          value={formatRs(totalRefunds)}
          tone={totalRefunds > 0 ? 'warn' : 'ok'}
          sub="From returned items"
        />
        <StatCard
          label="WhatsApp consent verified"
          value={Object.keys(state.khataConsent).length}
          sub="Verified before sending reminders"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          activeId={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            {
              id: 'owing',
              label: 'Owing Khata',
              count: state.customers.filter((c) => c.khata > 0).length,
            },
            { id: 'all', label: 'All customers', count: state.customers.length },
            {
              id: 'refunds',
              label: 'Refunds owed',
              count: state.customers.filter((c) => (c.refundOwed || 0) > 0).length,
              badgeTone: 'warn',
            },
            {
              id: 'messages',
              label: 'Messages',
              count: state.khataMessages.length,
            },
          ]}
        />
        {tab !== 'messages' && (
          <div className="w-full sm:w-[260px]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search name or phone..." />
          </div>
        )}
      </div>

      {tab === 'messages' ? (
        <div className="space-y-3">
          {state.khataMessages.length === 0 ? (
            <Card className="p-6 text-center text-[13px] text-[#52666A]">
              No Khata reminders sent yet. Open a customer drawer and click &ldquo;Send reminder&rdquo;.
            </Card>
          ) : (
            state.khataMessages.map((m) => (
              <Card key={m.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-[14px] text-[#0B2A2F]">
                    {m.customerName} · {m.channel}
                  </div>
                  <Badge tone="ok">Sent · {m.sentAt}</Badge>
                </div>
                <p className="text-[13px] text-[#3D5357]">{m.body}</p>
                <div className="text-[11px] text-[#52666A]">
                  Balance at reminder: {formatRs(m.balanceAtSend)}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <DataTable<Customer>
          rows={filtered}
          rowKey={(c) => c.id}
          onRowClick={(c) => setSelectedId(c.id)}
          columns={[
            {
              key: 'name',
              header: 'Customer',
              render: (c) => (
                <div>
                  <div className="font-semibold text-[#0B2A2F]">{c.name}</div>
                  <div className="text-[12px] text-[#52666A] mono">
                    {role === 'owner' ? formatPhone(c.phone) : `${c.phone.slice(0, 4)} ••• ${c.phone.slice(-3)}`}
                  </div>
                </div>
              ),
            },
            {
              key: 'last',
              header: 'Last visit',
              render: (c) => <span className="text-[#52666A]">{c.last}</span>,
            },
            {
              key: 'consent',
              header: 'Reminder consent',
              render: (c) =>
                state.khataConsent[c.id]?.yes ? (
                  <Badge tone="ok">Verified</Badge>
                ) : (
                  <Badge tone="neutral">Not captured</Badge>
                ),
            },
            {
              key: 'khata',
              header: 'Balance',
              align: 'end',
              render: (c) => (
                <div className="text-end">
                  <span className={`font-bold num ${c.khata > 0 ? 'text-[#8A3D12]' : 'text-[#14532D]'}`}>
                    {c.khata > 0 ? formatRs(c.khata) : 'Clear'}
                  </span>
                  {c.refundOwed && c.refundOwed > 0 ? (
                    <div className="text-[11px] font-semibold text-[#B42318]">
                      Refund owed {formatRs(c.refundOwed)}
                    </div>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Customer Statement Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name || ''}
        subtitle={
          selected
            ? `${role === 'owner' ? formatPhone(selected.phone) : 'Customer account'} · Last activity ${selected.last}`
            : ''
        }
        badge={
          selected ? (
            <Badge tone={selected.khata > 0 ? 'warn' : 'ok'}>
              {selected.khata > 0 ? `Owes ${formatRs(selected.khata)}` : 'Balance clear'}
            </Badge>
          ) : undefined
        }
        footer={
          selected && (
            <>
              {selected.khata > 0 && (
                <>
                  <Button variant="secondary" onClick={() => openReminderFor(selected)}>
                    <MessageCircle className="w-4 h-4" /> Send reminder
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPayInvoiceNo(undefined);
                      setPayAmt(String(selected.khata));
                      setPayOpen(true);
                    }}
                  >
                    <Wallet className="w-4 h-4" /> Collect payment
                  </Button>
                </>
              )}
              {selected.refundOwed && selected.refundOwed > 0 ? (
                <Button
                  variant="dark"
                  onClick={() => {
                    const amt = selected.refundOwed || 0;
                    settleCustomerRefund(selected.id, amt, true);
                    notify(`Paid ${formatRs(amt)} refund from drawer to ${selected.name}`, 'ok');
                  }}
                >
                  Pay {formatRs(selected.refundOwed)} from drawer
                </Button>
              ) : null}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Consent box */}
            <Card padding="sm" className="bg-[#FBF8F4] flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[13px] font-semibold text-[#0B2A2F] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#08343A]" />
                  WhatsApp reminder consent
                </div>
                <div className="text-[12px] text-[#52666A]">
                  {state.khataConsent[selected.id]
                    ? `${state.khataConsent[selected.id].ev} (${formatShortDate(state.khataConsent[selected.id].d)})`
                    : 'Record permission before messaging customer'}
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setConsentOpen(true)}>
                {state.khataConsent[selected.id] ? 'Update' : 'Capture'}
              </Button>
            </Card>

            {/* Statement Timeline */}
            <div className="space-y-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
                Khata bills &amp; payments
              </h3>
              {custInvoices.length === 0 ? (
                <div className="p-4 rounded-[10px] border border-[#E7E0D7] text-[13px] text-[#52666A] text-center">
                  No open invoice timeline recorded yet.
                </div>
              ) : (
                custInvoices.map((inv) => {
                  const raw = invSubtotal(inv);
                  const colSum = inv.col.reduce((s, c) => s + c.amt, 0);
                  const retSum = inv.ret.reduce((s, r) => s + r.amt, 0);
                  const rem = Math.max(0, raw - colSum - retSum);
                  const age = daysAgo(inv.d);
                  return (
                    <Card key={inv.no} padding="sm" className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="mono font-bold text-[14px]">Bill #{inv.no}</span>
                          <span className="text-[12px] text-[#52666A] ms-2">
                            {formatShortDate(inv.d)} ({age}d ago)
                          </span>
                        </div>
                        <Badge tone={rem === 0 ? 'ok' : age > 14 ? 'err' : 'warn'}>
                          {rem === 0 ? 'Settled' : `Due ${formatRs(rem)}`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[12px] text-[#52666A]">
                        <span>
                          Total {formatRs(raw)}
                          {colSum > 0 ? ` · Collected ${formatRs(colSum)}` : ''}
                          {retSum > 0 ? ` · Returned ${formatRs(retSum)}` : ''}
                        </span>
                        {rem > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setPayInvoiceNo(inv.no);
                              setPayAmt(String(rem));
                              setPayOpen(true);
                            }}
                          >
                            Collect for this bill
                          </Button>
                        )}
                      </div>
                      {inv.col.map((c, idx) => (
                        <div key={idx} className="text-[12px] text-[#14532D] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Received {formatRs(c.amt)} on {formatShortDate(c.d)} ({c.by})
                        </div>
                      ))}
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Customer Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Khata customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!custName.trim() || custPhone.replace(/\D/g, '').length < 10) {
                  notify('Enter valid customer name and phone number', 'err');
                  return;
                }
                const c = addCustomer(custName, custPhone);
                notify(`Added ${c.name} to Khata directory`, 'ok');
                setAddOpen(false);
                setCustName('');
                setCustPhone('');
                setSelectedId(c.id);
              }}
            >
              Save customer
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Customer name" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="e.g. Tariq Mahmood" />
          <Input label="Mobile number" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="03001234567" />
        </div>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal
        open={payOpen && !!selected}
        onClose={() => {
          setPayOpen(false);
          setPayInvoiceNo(undefined);
        }}
        title={
          selected
            ? `Collect Khata · ${selected.name}${payInvoiceNo ? ` (Bill #${payInvoiceNo})` : ''}`
            : ''
        }
        subtitle={selected ? `Current balance: ${formatRs(selected.khata)}` : ''}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPayOpen(false);
                setPayInvoiceNo(undefined);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selected) return;
                const amt = parseInt(payAmt, 10) || 0;
                if (amt <= 0) return;
                collectKhataPayment(selected.id, amt, payInvoiceNo);
                notify(`Collected ${formatRs(amt)} from ${selected.name}`, 'ok');
                setPayOpen(false);
                setPayInvoiceNo(undefined);
              }}
            >
              Record payment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Amount collected (Rs)" type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
          {selected && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPayAmt(String(selected.khata))}>
                Full ({formatRs(selected.khata)})
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPayAmt(String(Math.round(selected.khata / 2)))}>
                Half ({formatRs(Math.round(selected.khata / 2))})
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Consent Evidence Modal */}
      <Modal
        open={consentOpen && !!selected}
        onClose={() => setConsentOpen(false)}
        title="Capture reminder consent"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConsentOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selected) return;
                setKhataConsent(selected.id, consentEv);
                notify(`Recorded consent for ${selected.name}`, 'ok');
                setConsentOpen(false);
              }}
            >
              Save consent proof
            </Button>
          </>
        }
      >
        <Input
          label="How customer agreed"
          value={consentEv}
          onChange={(e) => setConsentEv(e.target.value)}
        />
      </Modal>

      {/* WhatsApp Reminder Modal */}
      <Modal
        open={remindOpen && !!selected}
        onClose={() => setRemindOpen(false)}
        title={selected ? `WhatsApp reminder · ${selected.name}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemindOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(remindText).catch(() => {});
                }
                notify('Copied reminder message', 'info');
              }}
            >
              <Copy className="w-4 h-4" /> Copy text
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selected) return;
                addKhataReminder({
                  id: `km-${Date.now()}`,
                  customerId: selected.id,
                  customerName: selected.name,
                  body: remindText,
                  channel: 'WhatsApp',
                  sentAt: 'Just now',
                  balanceAtSend: selected.khata,
                });
                notify(`Logged WhatsApp reminder for ${selected.name}`, 'ok');
                setRemindOpen(false);
              }}
            >
              Send &amp; log reminder
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {selected && !state.khataConsent[selected.id] && (
            <div className="p-3 rounded-[10px] bg-[#FFF3C4] text-[12px] text-[#6B4E00]">
              Tip: Capture verbal or WhatsApp consent on the customer drawer before sending automated reminders.
            </div>
          )}
          <textarea
            rows={4}
            value={remindText}
            onChange={(e) => setRemindText(e.target.value)}
            className="field w-full rounded-[10px] border border-[#8A8276] p-3 text-[13px]"
          />
        </div>
      </Modal>
    </div>
  );
}
