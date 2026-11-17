'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
      const tone = preset
        ? { bg: preset.bg, fg: preset.fg }
        : AVATAR_TONES[idx % AVATAR_TONES.length];
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
    <Card padding="lg" className="w-full max-w-[460px] space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-[#08343A] text-[#E58A4E] flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Counter sign-in</h1>
          <p className="text-[13px] text-[#52666A]">Tap your name and enter your 4-digit PIN</p>
        </div>
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
              className={`p-3 rounded-[12px] border text-center transition-all ${
                active
                  ? 'border-[#C9682E] bg-[#FCEFE4]'
                  : 'border-[#E7E0D7] bg-white hover:bg-[#FBF8F4]'
              }`}
            >
              <div
                style={{ backgroundColor: s.bg, color: s.fg }}
                className="w-10 h-10 rounded-full font-bold text-[13px] flex items-center justify-center mx-auto mb-1.5"
              >
                {s.ini}
              </div>
              <div className="font-semibold text-[13px] text-[#0B2A2F] truncate">{s.short}</div>
              <div className="text-[11px] text-[#52666A] truncate">{s.role}</div>
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
                idx < pin.length
                  ? 'bg-[#08343A] border-[#08343A]'
                  : 'bg-white border-[#8A8276]'
              }`}
            />
          ))}
        </div>
        {selected && (
          <div className="text-[12px] text-[#52666A]">
            Demo PIN for {selected.short}: <span className="mono font-semibold">{selected.pin}</span>
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

      <Button
        variant="secondary"
        fullWidth
        onClick={() => router.push(session.isAuthenticated ? '/dashboard' : '/welcome')}
      >
        {session.isAuthenticated ? 'Back to dashboard' : 'Back to welcome'}
      </Button>
    </Card>
  );
}
