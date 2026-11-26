'use client';

import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Edit3, Plus, ShieldCheck, UserPlus, Users, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { ROLE_DEFINITIONS } from '@/constants/navigation';
import { useZyro } from '@/hooks/useZyro';
import { formatMonthName, formatPhone, formatRs, formatShortDate } from '@/lib/format';
import type { EmployeeRecord } from '@/types';

export function StaffWorkspace() {
  const {
    state,
    addEmployee,
    updateEmployee,
    addAdvance,
    postPayrollRun,
    createPayrollRun,
    updatePayrollLine,
    payPayrollEmployee,
    notify,
  } = useZyro();

  const [tab, setTab] = useState<'payroll' | 'staff' | 'advances'>('payroll');
  const [period, setPeriod] = useState(state.payrollRuns[0]?.period || '2026-11');

  // Add employee modal
  const [empOpen, setEmpOpen] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empJob, setEmpJob] = useState('Cashier');
  const [empSalary, setEmpSalary] = useState('30000');
  const [empPhone, setEmpPhone] = useState('');
  const [empPin, setEmpPin] = useState('1234');
  const [empRole, setEmpRole] = useState<EmployeeRecord['roleId']>('cashier');

  // Add advance modal
  const [advOpen, setAdvOpen] = useState(false);
  const [advEmp, setAdvEmp] = useState(state.employees[0]?.id || 'e1');
  const [advAmt, setAdvAmt] = useState('3000');
  const [advNote, setAdvNote] = useState('');

  // New payroll run modal
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newRunPeriod, setNewRunPeriod] = useState('2026-12');
  const [newRunDays, setNewRunDays] = useState('31');

  // Edit payroll line modal
  const [editLineEmp, setEditLineEmp] = useState<EmployeeRecord | null>(null);
  const [lnDays, setLnDays] = useState('30');
  const [lnAllow, setLnAllow] = useState('0');
  const [lnBonus, setLnBonus] = useState('0');
  const [lnOt, setLnOt] = useState('0');
  const [lnRed, setLnRed] = useState('0');
  const [lnAdvRec, setLnAdvRec] = useState('0');

  const activeRun = useMemo(
    () => state.payrollRuns.find((r) => r.period === period) || state.payrollRuns[0],
    [state.payrollRuns, period]
  );

  const calcNetPay = (emp: EmployeeRecord, ln: [string, number, number, number, number, number, number, number]) => {
    const [, paidDays, allow, bonus, ot, red, advRec] = ln;
    const base = Math.round((emp.salary / (activeRun?.days || 30)) * paidDays);
    return Math.max(0, base + allow + bonus + ot - red - advRec);
  };

  const totalRunPayable = useMemo(() => {
    if (!activeRun) return 0;
    return activeRun.lines.reduce((s, ln) => {
      const emp = state.employees.find((e) => e.id === ln[0]);
      return s + (emp ? calcNetPay(emp, ln) : 0);
    }, 0);
  }, [activeRun, state.employees]);

  const openAdvances = useMemo(
    () => state.advances.reduce((s, a) => s + Math.max(0, a.amt - a.rec), 0),
    [state.advances]
  );

  const handleAddEmployee = () => {
    const sal = parseInt(empSalary, 10) || 0;
    if (!empName.trim() || sal <= 0) {
      notify('Enter employee name and monthly salary', 'err');
      return;
    }
    const id = `e-${Date.now().toString(36)}`;
    const code = `${empName.trim().slice(0, 3).toUpperCase()}-0${state.employees.length + 1}`;
    addEmployee({
      id,
      code,
      name: empName.trim(),
      job: empJob,
      login: `${empJob} login`,
      salary: sal,
      rev: 1,
      active: true,
      phone: empPhone.replace(/\D/g, '') || '03001234567',
      pin: /^\d{4}$/.test(empPin) ? empPin : '1234',
      roleId: empRole,
    });
    notify(`Added ${empName.trim()} to staff directory`, 'ok');
    setEmpOpen(false);
    setEmpName('');
    setEmpPhone('');
    setEmpPin('1234');
  };

  const handleAddAdvance = () => {
    const amt = parseInt(advAmt, 10) || 0;
    if (amt <= 0) return;
    addAdvance({
      id: `ADV-${Date.now().toString().slice(-4)}`,
      emp: advEmp,
      amt,
      rec: 0,
      d: 20261117,
      note: advNote.trim() || 'Salary advance',
    });
    notify(`Recorded ${formatRs(amt)} salary advance`, 'ok');
    setAdvOpen(false);
    setAdvNote('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner only · Team & monthly pay"
        title="Staff & payroll"
        subtitle="Manage staff permissions, track salary advances, and run monthly payroll."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="lg" onClick={() => setAdvOpen(true)}>
              <Banknote className="w-4 h-4" /> Give advance
            </Button>
            <Button variant="dark" size="lg" onClick={() => setEmpOpen(true)}>
              <UserPlus className="w-4 h-4" /> Add staff
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active team members"
          value={state.employees.filter((e) => e.active).length}
          sub={`${state.employees.length} total profiles`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label={`${activeRun ? formatMonthName(activeRun.period) : 'Monthly'} payroll`}
          value={formatRs(totalRunPayable)}
          sub={activeRun?.status === 'posted' ? 'Posted run' : 'Draft · Review before paying'}
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          label="Open salary advances"
          value={formatRs(openAdvances)}
          tone={openAdvances > 0 ? 'warn' : 'ok'}
          sub="Recovered from next salary run"
        />
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'payroll', label: 'Payroll run', count: state.payrollRuns.length },
          { id: 'staff', label: 'Staff & roles', count: state.employees.length },
          { id: 'advances', label: 'Salary advances', count: state.advances.length },
        ]}
      />

      {tab === 'payroll' && activeRun && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-[240px]">
              <Select
                value={activeRun.period}
                onChange={(e) => setPeriod(e.target.value)}
                options={state.payrollRuns.map((r) => ({
                  value: r.period,
                  label: `${formatMonthName(r.period)} (${r.status})`,
                }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setNewRunOpen(true)}>
                <Plus className="w-4 h-4" /> New month run
              </Button>
              {activeRun.status === 'draft' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    postPayrollRun(activeRun.period);
                    notify(`Posted ${formatMonthName(activeRun.period)} payroll run`, 'ok');
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Post payroll run
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {activeRun.lines.map((ln) => {
              const emp = state.employees.find((e) => e.id === ln[0]);
              if (!emp) return null;
              const net = calcNetPay(emp, ln);
              const paid = ln[7];
              return (
                <Card key={emp.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] text-[#0B2A2F]">{emp.name}</span>
                      <Badge tone="neutral">{emp.job}</Badge>
                      {paid >= net ? (
                        <Badge tone="ok">Paid</Badge>
                      ) : (
                        <Badge tone="warn">Pending</Badge>
                      )}
                    </div>
                    <div className="text-[12px] text-[#52666A] flex flex-wrap gap-3">
                      <span>Base {formatRs(emp.salary)} ({ln[1]}/{activeRun.days} days)</span>
                      {ln[2] > 0 && <span>Allowance +{formatRs(ln[2])}</span>}
                      {ln[3] > 0 && <span>Bonus +{formatRs(ln[3])}</span>}
                      {ln[4] > 0 && <span>Overtime +{formatRs(ln[4])}</span>}
                      {ln[5] > 0 && <span>Deduction −{formatRs(ln[5])}</span>}
                      {ln[6] > 0 && <span>Advance recovery −{formatRs(ln[6])}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-end me-1">
                      <div className="text-[11px] text-[#52666A]">Net pay</div>
                      <div className="font-display font-bold text-[18px] num">{formatRs(net)}</div>
                    </div>
                    {activeRun.status === 'draft' && paid < net && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditLineEmp(emp);
                          setLnDays(String(ln[1]));
                          setLnAllow(String(ln[2]));
                          setLnBonus(String(ln[3]));
                          setLnOt(String(ln[4]));
                          setLnRed(String(ln[5]));
                          setLnAdvRec(String(ln[6]));
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </Button>
                    )}
                    {paid < net && (
                      <Button
                        size="sm"
                        variant="dark"
                        onClick={() => {
                          payPayrollEmployee(activeRun.period, emp.id, net);
                          notify(`Paid ${formatRs(net)} salary to ${emp.name}`, 'ok');
                        }}
                      >
                        Pay salary
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.employees.map((e) => (
              <Card key={e.id} className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[16px] text-[#0B2A2F]">{e.name}</span>
                    <Badge tone={e.active ? 'ok' : 'neutral'}>{e.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="text-[13px] text-[#3D5357]">{e.job} · {e.login}</div>
                  <div className="text-[12px] text-[#52666A] mono">
                    Code {e.code} {e.phone ? `· ${formatPhone(e.phone)}` : ''} · PIN {e.pin || '1234'}
                  </div>
                  <div className="text-[13px] font-bold num text-[#08343A] pt-1">
                    {formatRs(e.salary)} / month
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    updateEmployee(e.id, { active: !e.active });
                    notify(`${e.active ? 'Paused' : 'Reactivated'} ${e.name}`, 'info');
                  }}
                >
                  {e.active ? 'Pause' : 'Activate'}
                </Button>
              </Card>
            ))}
          </div>

          <div className="space-y-2.5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Role permissions reference
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLE_DEFINITIONS.map((r) => (
                <Card key={r.id} padding="sm" className="bg-[#FBF8F4] space-y-1">
                  <div className="font-bold text-[14px] text-[#0B2A2F]">{r.name}</div>
                  <div className="text-[12px] text-[#52666A]">{r.who}</div>
                  <div className="text-[12px] text-[#3D5357]">{r.can}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'advances' && (
        <div className="space-y-3">
          {state.advances.map((a) => {
            const emp = state.employees.find((e) => e.id === a.emp);
            const open = Math.max(0, a.amt - a.rec);
            return (
              <Card key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[15px] text-[#0B2A2F]">
                      {emp?.name || a.emp}
                    </span>
                    <Badge tone={open === 0 ? 'ok' : 'warn'}>
                      {open === 0 ? 'Recovered' : `Open ${formatRs(open)}`}
                    </Badge>
                  </div>
                  <div className="text-[12px] text-[#52666A]">
                    {a.id} · Given {formatShortDate(a.d)} · {a.note}
                  </div>
                </div>
                <div className="font-display font-bold text-[17px] num">{formatRs(a.amt)}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        open={empOpen}
        onClose={() => setEmpOpen(false)}
        title="Add staff member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmpOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddEmployee}>Save staff</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Full name" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="e.g. Bilal Raza" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Job title" value={empJob} onChange={(e) => setEmpJob(e.target.value)} />
            <Select
              label="App access role"
              value={empRole || 'cashier'}
              onChange={(e) => setEmpRole(e.target.value as EmployeeRecord['roleId'])}
              options={[
                { value: 'cashier', label: 'Cashier' },
                { value: 'inventory', label: 'Stockkeeper' },
                { value: 'manager', label: 'Manager' },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Monthly salary (Rs)" type="number" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} />
            <Input label="Mobile number" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="0300..." />
            <Input label="4-digit PIN" maxLength={4} value={empPin} onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
      </Modal>

      {/* Add Advance Modal */}
      <Modal
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        title="Record salary advance"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdvOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddAdvance}>Save advance</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Select
            label="Staff member"
            value={advEmp}
            onChange={(e) => setAdvEmp(e.target.value)}
            options={state.employees.map((e) => ({ value: e.id, label: `${e.name} (${e.job})` }))}
          />
          <Input label="Advance amount (Rs)" type="number" value={advAmt} onChange={(e) => setAdvAmt(e.target.value)} />
          <Input label="Note" value={advNote} onChange={(e) => setAdvNote(e.target.value)} placeholder="Reason for advance" />
        </div>
      </Modal>

      {/* New Payroll Run Modal */}
      <Modal
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
        title="Create monthly payroll run"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewRunOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!/^\d{4}-\d{2}$/.test(newRunPeriod)) {
                  notify('Enter period as YYYY-MM (e.g. 2026-12)', 'err');
                  return;
                }
                if (state.payrollRuns.some((r) => r.period === newRunPeriod)) {
                  notify(`Payroll run for ${newRunPeriod} already exists`, 'warn');
                  setPeriod(newRunPeriod);
                  setNewRunOpen(false);
                  return;
                }
                createPayrollRun(newRunPeriod, Math.max(1, parseInt(newRunDays, 10) || 30));
                setPeriod(newRunPeriod);
                notify(`Created draft payroll run for ${formatMonthName(newRunPeriod)}`, 'ok');
                setNewRunOpen(false);
              }}
            >
              Create draft run
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input label="Month (YYYY-MM)" value={newRunPeriod} onChange={(e) => setNewRunPeriod(e.target.value)} placeholder="2026-12" />
          <Input label="Days in month" type="number" min={28} max={31} value={newRunDays} onChange={(e) => setNewRunDays(e.target.value)} />
        </div>
      </Modal>

      {/* Edit Payroll Line Modal */}
      <Modal
        open={!!editLineEmp && !!activeRun}
        onClose={() => setEditLineEmp(null)}
        title={editLineEmp ? `Adjust pay · ${editLineEmp.name}` : ''}
        subtitle={editLineEmp ? `Base salary: ${formatRs(editLineEmp.salary)} / mo` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditLineEmp(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!editLineEmp || !activeRun) return;
                updatePayrollLine(activeRun.period, editLineEmp.id, {
                  paidDays: Math.max(0, parseInt(lnDays, 10) || 0),
                  allowance: Math.max(0, parseInt(lnAllow, 10) || 0),
                  bonus: Math.max(0, parseInt(lnBonus, 10) || 0),
                  overtime: Math.max(0, parseInt(lnOt, 10) || 0),
                  reduction: Math.max(0, parseInt(lnRed, 10) || 0),
                  advanceRecovery: Math.max(0, parseInt(lnAdvRec, 10) || 0),
                });
                notify(`Updated pay line for ${editLineEmp.name}`, 'ok');
                setEditLineEmp(null);
              }}
            >
              Save line
            </Button>
          </>
        }
      >
        {editLineEmp && activeRun && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label={`Paid days (/${activeRun.days})`} type="number" value={lnDays} onChange={(e) => setLnDays(e.target.value)} />
              <Input label="Allowance (Rs)" type="number" value={lnAllow} onChange={(e) => setLnAllow(e.target.value)} />
              <Input label="Bonus (Rs)" type="number" value={lnBonus} onChange={(e) => setLnBonus(e.target.value)} />
              <Input label="Overtime (Rs)" type="number" value={lnOt} onChange={(e) => setLnOt(e.target.value)} />
              <Input label="Deductions (Rs)" type="number" value={lnRed} onChange={(e) => setLnRed(e.target.value)} />
              <Input label="Advance recovery (Rs)" type="number" value={lnAdvRec} onChange={(e) => setLnAdvRec(e.target.value)} />
            </div>
            <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7] flex justify-between font-bold text-[14px]">
              <span>Calculated net pay</span>
              <span className="num text-[#08343A]">
                {formatRs(
                  calcNetPay(editLineEmp, [
                    editLineEmp.id,
                    Math.max(0, parseInt(lnDays, 10) || 0),
                    Math.max(0, parseInt(lnAllow, 10) || 0),
                    Math.max(0, parseInt(lnBonus, 10) || 0),
                    Math.max(0, parseInt(lnOt, 10) || 0),
                    Math.max(0, parseInt(lnRed, 10) || 0),
                    Math.max(0, parseInt(lnAdvRec, 10) || 0),
                    0,
                  ])
                )}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
