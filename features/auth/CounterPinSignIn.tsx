'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Cloud } from 'lucide-react';
import { Numpad } from '@/components/ui/Numpad';
import { COUNTER_STAFF, PINS } from '@/constants/mock-data';
import { useZyro } from '@/hooks/useZyro';
import type { RoleId } from '@/types';

const AVATAR_TONES = [
  { bg: '#E1EEEE', fg: '#0B4F55' },
  { bg: '#F6E4DF', fg: '#7A3427' },
  { bg: '#F1E6D6', fg: '#6B4A1E' },
  { bg: '#E5EDE3', fg: '#2F4A2E' },
];

export function CounterPinSignIn() {
  const router = useRouter();
  const { state, session, completeAuthSignIn, notify } = useZyro();

  const staffProfiles = useMemo(() => {
    const active = state.employees.filter((e) => e.active);
    if (active.length === 0) {
      return COUNTER_STAFF.map((s) => ({
        ...s,
        pin: PINS[s.id] || '1234',
        roleId: (s.id === 'imran' ? 'owner' : 'cashier') as RoleId,
      }));
    }
    return active.map((emp, idx) => {
      const preset = COUNTER_STAFF.find((c) => c.name === emp.name);
      const tone = preset ? { bg: preset.bg, fg: preset.fg } : AVATAR_TONES[idx % AVATAR_TONES.length];
      const parts = emp.name.trim().split(/\s+/);
      const ini = preset?.ini || parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'ST';
      const roleId: RoleId =
        emp.roleId === 'owner' || emp.roleId === 'manager'
          ? 'owner'
          : emp.roleId === 'inventory'
            ? 'inventory'
            : 'cashier';
      return {
        id: emp.id,
        name: emp.name,
        short: parts[0] || emp.name,
        role: emp.job,
        ini,
        bg: tone.bg,
        fg: tone.fg,
        pin: emp.pin || PINS[preset?.id || ''] || '1234',
        roleId,
      };
    });
  }, [state.employees]);

  const [selectedId, setSelectedId] = useState(() => staffProfiles[0]?.id || 'e1');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const selected = staffProfiles.find((s) => s.id === selectedId) || staffProfiles[0];
  const openShift = state.shifts.find((s) => s.status === 'open');

  const handleDigit = (d: string) => {
    if (!selected || d === '00' || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) {
      if (next === selected.pin) {
        completeAuthSignIn(selected.roleId, undefined, undefined, selected.name);
        notify(`Welcome, ${selected.name}`, 'ok');
        router.push(selected.roleId === 'inventory' ? '/inventory' : '/pos');
      } else {
        setError(`Wrong PIN for ${selected.short}. Hint: ${selected.pin}`);
        setTimeout(() => setPin(''), 400);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4EFE9] text-[#0B2A2F]">
      {/* Left 440px Dark Teal Aside matching SignIn.html */}
      <aside className="w-full lg:w-[440px] shrink-0 bg-[#08343A] text-white flex flex-col p-5 lg:pt-[40px] lg:px-[40px] lg:pb-[32px]">
        <div className="flex items-center gap-3">
          <Link
            href="/welcome"
            aria-label="Zyro"
            className="w-[48px] h-[48px] shrink-0 rounded-[12px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display font-bold text-[24px] leading-none"
          >
            Z
          </Link>
          <div className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold">{session.shopName}</span>
            <span className="text-[13px] text-[#A8C3C5]">Counter 1 · Zyro Retail POS</span>
          </div>
        </div>

        <div className="mt-3.5 lg:mt-auto flex flex-row lg:flex-col items-baseline lg:items-start gap-3 lg:gap-1.5">
          <span className="num font-display text-[34px] lg:text-[64px] font-bold tracking-[-0.03em] leading-none">
            12:46
          </span>
          <span className="text-[17px] text-[#C9DADB]">Saturday, 14 November</span>
        </div>

        <div className="mt-3 lg:mt-[28px] rounded-[16px] bg-[rgba(244,239,233,0.08)] py-3 px-3.5 lg:py-4 lg:px-[18px] flex gap-3 items-start">
          <span className="w-10 h-10 shrink-0 rounded-full bg-[rgba(244,239,233,0.12)] flex items-center justify-center">
            <Banknote className="w-5 h-5 text-white" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold">
              {openShift ? 'Counter 1 shift is open' : 'Counter 1 shift is closed'}
            </span>
            <span className="text-[13px] leading-[1.5] text-[#C9DADB]">
              {openShift
                ? `${openShift.by} opened it at ${openShift.opened}. Signing in doesn’t close or change it.`
                : 'Sign in with your PIN to open a shift and start selling.'}
            </span>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-2 text-[13px] text-[#A8C3C5]">
          <Cloud className="w-4 h-4 text-[#7FD6A4]" />
          <span>Online · signed-in sessions last 8 hours</span>
        </div>
      </aside>

      {/* Right Main PIN Pad */}
      <main className="flex-1 min-w-0 flex items-start lg:items-center justify-center p-5 lg:py-8 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-[440px] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-display text-[26px] font-bold">Counter sign-in</h1>
            <p className="m-0 text-[15px] leading-[1.5] text-[#3D5357]">
              Tap your name and type your 4-digit PIN. Every sale is saved under your name.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {staffProfiles.map((s) => {
              const active = s.id === selected?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(s.id);
                    setPin('');
                    setError('');
                  }}
                  className="p-3 rounded-[14px] text-center transition-all"
                  style={{
                    border: active ? '2px solid #C9682E' : '1px solid #D6CDC1',
                    backgroundColor: active ? '#FCEFE4' : '#FFFFFF',
                  }}
                >
                  <div
                    style={{ backgroundColor: s.bg, color: s.fg }}
                    className="w-10 h-10 rounded-full font-bold text-[13px] flex items-center justify-center mx-auto mb-1.5"
                  >
                    {s.ini}
                  </div>
                  <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">{s.short}</div>
                  <div className="text-[12px] text-[#52666A] truncate">{s.role}</div>
                </button>
              );
            })}
          </div>

          <div className="text-center space-y-2">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    idx < pin.length ? 'bg-[#08343A] border-[#08343A]' : 'bg-white border-[#8A8276]'
                  }`}
                />
              ))}
            </div>
            {selected && (
              <div className="text-[13px] text-[#52666A]">
                PIN for {selected.short}: <span className="mono font-semibold">{selected.pin}</span>
              </div>
            )}
            {error && <div className="text-[13px] font-semibold text-[#B42318]">{error}</div>}
          </div>

          <Numpad
            extraKey="C"
            onDigit={handleDigit}
            onBackspace={() => setPin((p) => p.slice(0, -1))}
            onClear={() => setPin('')}
          />

          <div className="flex items-center justify-between text-[13px] text-[#52666A] pt-1">
            <button
              type="button"
              onClick={() => router.push(session.isAuthenticated ? '/dashboard' : '/welcome')}
              className="font-semibold text-[#0E5E66] hover:underline"
            >
              {session.isAuthenticated ? 'Back to Home' : 'Back to welcome'}
            </button>
            <Link href="/sign-in" className="font-semibold text-[#0E5E66] hover:underline">
              Owner email sign-in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
