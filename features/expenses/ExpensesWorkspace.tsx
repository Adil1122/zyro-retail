'use client';

import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, CreditCard, Pause, Play, Plus, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { EXP_CATS } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import { formatRs, formatShortDate } from '@/lib/format';
import type { ExpenseBill, ExpenseCategoryId } from '@/types';

export function ExpensesWorkspace() {
  const {
    state,
    role,
    addExpenseBill,
    postExpenseBill,
    payExpenseBill,
    toggleRecurringExpense,
    generateMonthlyExpenseBill,
    notify,
  } = useZyro();
  const [tab, setTab] = useState<'bills' | 'rec'>('bills');
  const [selectedBill, setSelectedBill] = useState<ExpenseBill | null>(null);

  // New expense modal
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [payee, setPayee] = useState('');
  const [cat, setCat] = useState<ExpenseCategoryId>('electricity');
  const [amt, setAmt] = useState('');
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // Pay modal
  const [payTarget, setPayTarget] = useState<ExpenseBill | null>(null);
  const [payAmt, setPayAmt] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payFromCash, setPayFromCash] = useState(true);

  const billPaid = (b: ExpenseBill) => b.pays.reduce((s, p) => s + p.amt, 0);

  const totalMonth = useMemo(
    () => state.expenseBills.reduce((s, b) => s + b.amt, 0),
    [state.expenseBills]
  );
  const totalUnpaid = useMemo(
    () => state.expenseBills.reduce((s, b) => s + Math.max(0, b.amt - billPaid(b)), 0),
    [state.expenseBills]
  );

  const handleAdd = () => {
    const val = parseInt(amt, 10) || 0;
    if (!title.trim() || !payee.trim() || val <= 0) {
      notify('Enter title, payee, and positive amount', 'err');
      return;
    }
    const bill: ExpenseBill = {
      id: `EX${state.expenseBills.length + 1}`,
      title: title.trim(),
      payee: payee.trim(),
      cat,
      amt: val,
      svc: 20261117,
      due: 20261125,
      ref: `EXP-${Date.now().toString().slice(-4)}`,
      status: saveAsDraft ? 'draft' : 'posted',
      pays: [],
    };
    addExpenseBill(bill);
    notify(`Added ${saveAsDraft ? 'draft ' : ''}expense “${bill.title}”`, 'ok');
    setAddOpen(false);
    setTitle('');
    setPayee('');
    setAmt('');
    setSaveAsDraft(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Rent · Utilities · Shop bills"
        title="Expenses"
        subtitle="Record electricity, rent, packaging, and repairs, and schedule monthly bills."
        actions={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add expense bill
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total recorded bills"
          value={formatRs(totalMonth)}
          sub={`${state.expenseBills.length} bills`}
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatCard
          label="Unpaid expense bills"
          value={formatRs(totalUnpaid)}
          tone={totalUnpaid > 0 ? 'warn' : 'ok'}
          sub={`${state.expenseBills.filter((b) => b.amt - billPaid(b) > 0).length} bills awaiting payment`}
        />
        <StatCard
          label="Active monthly recurring"
          value={state.recurringExpenses.filter((r) => r.active).length}
          sub="Auto-reminders each month"
          icon={<CalendarClock className="w-4 h-4" />}
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'bills', label: 'Expense bills', count: state.expenseBills.length },
          { id: 'rec', label: 'Monthly bills', count: state.recurringExpenses.length },
        ]}
      />

      {tab === 'bills' && (
        <div className="space-y-3">
          {state.expenseBills.map((b) => {
            const paid = billPaid(b);
            const due = Math.max(0, b.amt - paid);
            return (
              <Card
                key={b.id}
                onClick={() => setSelectedBill(b)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px] text-[#0B2A2F]">{b.title}</span>
                    <Badge tone="neutral">{EXP_CATS[b.cat]}</Badge>
                    <Badge tone={b.status === 'posted' ? 'ok' : 'warn'}>{b.status}</Badge>
                    {due === 0 ? (
                      <Badge tone="ok">Paid</Badge>
                    ) : (
                      <Badge tone="warn">Due {formatRs(due)}</Badge>
                    )}
                  </div>
                  <div className="text-[12px] text-[#52666A]">
                    {b.payee} · Due {formatShortDate(b.due)} {b.ref ? `· Ref ${b.ref}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="font-display font-bold text-[17px] num me-1">{formatRs(b.amt)}</div>
                  {b.status === 'draft' && role === 'owner' && (
                    <Button
                      size="sm"
                      variant="dark"
                      onClick={() => {
                        postExpenseBill(b.id);
                        notify(`Posted expense bill “${b.title}”`, 'ok');
                      }}
                    >
                      Post bill
                    </Button>
                  )}
                  {due > 0 && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setPayTarget(b);
                        setPayAmt(String(due));
                        setPayRef(`PAY-${b.id}`);
                      }}
                    >
                      <CreditCard className="w-4 h-4" /> Pay
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'rec' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.recurringExpenses.map((r) => {
            const madeThisMonth = r.made.includes('2026-11');
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-bold text-[16px] text-[#0B2A2F]">{r.title}</div>
                    <div className="text-[12px] text-[#52666A]">
                      {r.payee} · {EXP_CATS[r.cat]}
                    </div>
                  </div>
                  <Badge tone={r.active ? 'ok' : 'neutral'}>{r.active ? 'Active' : 'Paused'}</Badge>
                </div>
                <div className="text-[18px] font-bold num text-[#08343A]">{formatRs(r.amt)} / mo</div>
                <div className="text-[12px] text-[#52666A]">Due every month on day {r.day}</div>
                <div className="flex flex-wrap gap-2">
                  {r.active && !madeThisMonth && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const created = generateMonthlyExpenseBill(r.id, '2026-11');
                        if (created) {
                          notify(`Generated November bill for ${r.title}`, 'ok');
                          setTab('bills');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" /> Make Nov bill
                    </Button>
                  )}
                  {madeThisMonth && (
                    <Badge tone="ok">Nov bill created</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      toggleRecurringExpense(r.id);
                      notify(`${r.active ? 'Paused' : 'Resumed'} monthly schedule for ${r.title}`, 'info');
                    }}
                  >
                    {r.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {r.active ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={selectedBill?.title || ''}
        subtitle={selectedBill ? `${selectedBill.payee} · ${EXP_CATS[selectedBill.cat]}` : ''}
      >
        {selectedBill && (
          <div className="space-y-4">
            <Card padding="sm" className="bg-[#FBF8F4] space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#52666A]">Total amount</span>
                <span className="font-bold num">{formatRs(selectedBill.amt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52666A]">Paid so far</span>
                <span className="font-bold num text-[#14532D]">{formatRs(billPaid(selectedBill))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52666A]">Due date</span>
                <span>{formatShortDate(selectedBill.due)}</span>
              </div>
            </Card>
            {selectedBill.pays.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[12px] font-semibold uppercase text-[#52666A]">Payments</div>
                {selectedBill.pays.map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-[9px] border border-[#E7E0D7] flex justify-between text-[13px]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1E7A48]" />
                      {p.ref} ({formatShortDate(p.d)})
                    </span>
                    <span className="font-bold num">{formatRs(p.amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Add Expense Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add expense bill"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd}>Save expense</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Bill description" placeholder="e.g. Generator fuel, Shop painting" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Paid to (payee)" placeholder="e.g. PSO Station, LESCO" value={payee} onChange={(e) => setPayee(e.target.value)} />
          <Select
            label="Category"
            value={cat}
            onChange={(e) => setCat(e.target.value as ExpenseCategoryId)}
            options={Object.entries(EXP_CATS).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Input label="Amount (Rs)" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#0B2A2F] cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsDraft}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
              className="w-4 h-4 accent-[#08343A]"
            />
            <span>Save as draft for review before posting</span>
          </label>
        </div>
      </Modal>

      {/* Pay Expense Modal */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={payTarget ? `Pay ${payTarget.title}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!payTarget) return;
                const val = parseInt(payAmt, 10) || 0;
                if (val <= 0) return;
                payExpenseBill(payTarget.id, val, payRef || 'CASH', payFromCash);
                notify(`Paid ${formatRs(val)} for ${payTarget.title}`, 'ok');
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
          <Input label="Payment ref" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#0B2A2F] cursor-pointer">
            <input
              type="checkbox"
              checked={payFromCash}
              onChange={(e) => setPayFromCash(e.target.checked)}
              className="w-4 h-4 accent-[#08343A]"
            />
            <span>Record cash paid out from counter cash drawer</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
