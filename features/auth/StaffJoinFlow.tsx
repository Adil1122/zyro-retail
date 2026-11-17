'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useZyro } from '@/hooks/useZyro';
import type { RoleId } from '@/types';

export function StaffJoinFlow() {
  const router = useRouter();
  const { state, completeAuthSignIn, updateEmployeePin, addEmployee, notify } = useZyro();
  const [step, setStep] = useState<'invite' | 'pin' | 'done'>('invite');
  const [inviteCode, setInviteCode] = useState('HAMZA-418');
  const [staffName, setStaffName] = useState('');
  const [matchedEmpId, setMatchedEmpId] = useState<string | null>(null);
  const [assignedRole, setAssignedRole] = useState<RoleId>('cashier');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');

  const checkInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inviteCode.trim().toUpperCase();
    const digits = inviteCode.replace(/\D/g, '');
    const empMatch = state.employees.find(
      (emp) =>
        emp.active &&
        (emp.code.toUpperCase() === cleaned || (digits.length >= 10 && emp.phone?.replace(/\D/g, '') === digits))
    );
    const knownDemo = cleaned === 'HAMZA-418' || cleaned === 'STOCK-209' || /^[A-Z]+-\d{2,}$/.test(cleaned);
    if (cleaned.length < 5 || (!empMatch && !knownDemo)) {
      setError('No shop invite matched that code. Try HAMZA-418, STOCK-209, or a staff code like ALI-01.');
      return;
    }
    if (empMatch) {
      setMatchedEmpId(empMatch.id);
      setStaffName(empMatch.name);
      setAssignedRole(
        empMatch.roleId === 'inventory'
          ? 'inventory'
          : empMatch.roleId === 'manager' || empMatch.roleId === 'owner'
            ? 'owner'
            : 'cashier'
      );
    } else {
      setMatchedEmpId(null);
      const isStock = cleaned.includes('STOCK');
      setAssignedRole(isStock ? 'inventory' : 'cashier');
      setStaffName(isStock ? 'Invited Stockkeeper' : 'Invited Cashier');
    }
    setError('');
    setStep('pin');
  };

  const savePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError('Choose a 4-digit counter PIN.');
      return;
    }
    if (pin !== pinConfirm) {
      setError('Both PIN entries must match.');
      return;
    }
    const cleanName = staffName.trim() || (assignedRole === 'inventory' ? 'Invited Stockkeeper' : 'Invited Cashier');
    if (matchedEmpId) {
      updateEmployeePin(matchedEmpId, pin);
    } else {
      const newId = `e-join-${Date.now()}`;
      setMatchedEmpId(newId);
      addEmployee({
        id: newId,
        code: inviteCode.trim().toUpperCase(),
        name: cleanName,
        job: assignedRole === 'inventory' ? 'Stockkeeper' : 'Cashier',
        login: assignedRole === 'inventory' ? 'Stockkeeper login' : 'Cashier login',
        salary: 30000,
        rev: 0,
        active: true,
        pin,
        roleId: assignedRole === 'inventory' ? 'inventory' : 'cashier',
      });
    }
    setError('');
    setStep('done');
  };

  const enterShop = () => {
    completeAuthSignIn(assignedRole, undefined, undefined, staffName.trim() || undefined);
    notify(`Joined ${state.settings.shopName}`, 'ok');
    router.push(assignedRole === 'inventory' ? '/inventory' : '/dashboard');
  };

  return (
    <Card padding="lg" className="w-full max-w-[460px] space-y-5">
      {step === 'invite' && (
        <form onSubmit={checkInvite} className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#E1EEEE] text-[#0B4F55] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Join your shop</h1>
              <p className="text-[13px] text-[#52666A]">Enter the invite code sent by the shop owner</p>
            </div>
          </div>

          <Input
            label="Shop invite code"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value);
              setError('');
            }}
            error={error}
            hint="Example codes: HAMZA-418 (Cashier) or STOCK-209 (Stockkeeper)"
            className="mono uppercase"
          />

          <div className="flex justify-between items-center pt-1">
            <Link href="/welcome" className="text-[13px] font-semibold text-[#52666A] hover:text-[#0B2A2F]">
              Back
            </Link>
            <Button type="submit" variant="primary" size="lg">
              Find shop <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}

      {step === 'pin' && (
        <form onSubmit={savePin} className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold text-[#0E5E66]">{state.settings.shopName} · Main branch</div>
            <h1 className="font-display text-[22px] font-bold text-[#0B2A2F] mt-0.5">
              Set your 4-digit counter PIN
            </h1>
            <p className="text-[13px] text-[#52666A] mt-1">
              You will join as <span className="font-semibold text-[#0B2A2F]">{assignedRole === 'inventory' ? 'Stockkeeper' : 'Cashier'}</span>.
            </p>
          </div>
          {!matchedEmpId && (
            <Input
              label="Your name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
          )}
          <Input
            label="4-digit PIN"
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
          />
          <Input
            label="Confirm 4-digit PIN"
            type="password"
            maxLength={4}
            value={pinConfirm}
            onChange={(e) => {
              setPinConfirm(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
            error={error}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('invite')}>
              Back
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Set PIN & join
            </Button>
          </div>
        </form>
      )}

      {step === 'done' && (
        <div className="py-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">You’re in</h1>
            <p className="text-[14px] text-[#52666A] mt-1">
              Signed into {state.settings.shopName} as {assignedRole === 'inventory' ? 'Stockkeeper' : 'Cashier'}.
            </p>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={enterShop}>
            Open shop home <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
