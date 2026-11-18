'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Info, Lock, Phone } from 'lucide-react';
import { useZyro } from '@/hooks/useZyro';
import type { RoleId } from '@/types';
import { AuthFlowShell } from './AuthFlowShell';

type JoinStep = 'join' | 'joinCode' | 'joinPin' | 'joinDone';

const STEP_LIST: Array<{ id: JoinStep; label: string }> = [
  { id: 'join', label: 'Your number' },
  { id: 'joinCode', label: 'SMS code' },
  { id: 'joinPin', label: 'Your PIN' },
  { id: 'joinDone', label: 'Done' },
];

const EASY_PINS = ['1234', '0000', '1111', '2222', '4321', '1990', '2000'];
const WRONG_CODE = '481923';

export function StaffJoinFlow() {
  const router = useRouter();
  const { state, completeAuthSignIn, updateEmployeePin, addEmployee, notify } = useZyro();

  const [step, setStep] = useState<JoinStep>('join');
  const [phone, setPhone] = useState('321 4567890');
  const [noInvite, setNoInvite] = useState(false);
  const [code, setCode] = useState('482913');
  const [codeBad, setCodeBad] = useState(false);

  const [matchedEmpId, setMatchedEmpId] = useState<string | null>('e1');
  const [staffName, setStaffName] = useState('Ali Hassan');
  const [assignedRole, setAssignedRole] = useState<RoleId>('cashier');

  const [pin, setPin] = useState('7391');
  const [pin2, setPin2] = useState('7391');

  const digits10 = phone.replace(/\D/g, '').slice(0, 10);
  const phoneOk = /^3\d{9}$/.test(digits10);
  const phoneFormatted =
    digits10.length >= 3 ? `+92 ${digits10.slice(0, 3)} ${digits10.slice(3)}` : '+92 321 4567890';

  const codeOk = /^\d{6}$/.test(code);
  const pinEasy = EASY_PINS.includes(pin) || /^(\d)\1{3}$/.test(pin);
  const pinMatch = pin.length === 4 && pin2.length === 4 && pin === pin2;

  const shopName = state.settings.shopName || 'Stride Footwear';
  const shopInitial = (shopName.trim()[0] || 'S').toUpperCase();
  const firstName = (staffName || 'Ali Hassan').split(' ')[0];

  const curIdx = STEP_LIST.findIndex((s) => s.id === step);
  const steps = STEP_LIST.map((s, i) => {
    const done = i < curIdx || (step === 'joinDone' && i === curIdx);
    const active = i === curIdx && !done;
    return { id: s.id, label: s.label, done, active, number: i + 1 };
  });

  const lookupStaffByPhone = () => {
    if (digits10 === '3009998887') {
      setNoInvite(true);
      return false;
    }
    const normalized11 = `0${digits10}`;
    const match = state.employees.find(
      (e) => e.active && e.phone && e.phone.replace(/\D/g, '').endsWith(digits10)
    );
    if (match) {
      setMatchedEmpId(match.id);
      setStaffName(match.name);
      const nextRole: RoleId =
        match.roleId === 'inventory'
          ? 'inventory'
          : match.roleId === 'manager' || match.roleId === 'owner'
            ? 'owner'
            : 'cashier';
      setAssignedRole(nextRole);
    } else if (digits10 === '3214567890' || digits10 === '3002233445' || normalized11.startsWith('03')) {
      const def = state.employees.find((e) => e.active && e.roleId === 'cashier') || state.employees[0];
      setMatchedEmpId(def?.id ?? null);
      setStaffName(def?.name ?? 'Ali Hassan');
      setAssignedRole(def?.roleId === 'inventory' ? 'inventory' : 'cashier');
    } else {
      setNoInvite(true);
      return false;
    }
    return true;
  };

  const commitPin = () => {
    if (matchedEmpId) {
      updateEmployeePin(matchedEmpId, pin);
    } else {
      const newId = `e-join-${Date.now()}`;
      setMatchedEmpId(newId);
      addEmployee({
        id: newId,
        code: `STF-${String(state.employees.length + 1).padStart(2, '0')}`,
        name: staffName || 'Ali Hassan',
        job: assignedRole === 'inventory' ? 'Stockkeeper' : 'Cashier',
        login: assignedRole === 'inventory' ? 'Stockkeeper login' : 'Cashier login',
        salary: 30000,
        rev: 0,
        active: true,
        phone: `0${digits10}`,
        pin,
        roleId: assignedRole === 'inventory' ? 'inventory' : 'cashier',
      });
    }
    setStep('joinDone');
  };

  let why = '';
  let nextLabel = 'Send code';
  let onNext: (() => void) | undefined = undefined;
  let nextHref: string | undefined = undefined;
  let backHref: string | undefined = undefined;
  let onBack: (() => void) | undefined = undefined;

  if (step === 'join') {
    why = !phoneOk ? 'Type a 10-digit number starting with 3' : '';
    nextLabel = 'Send code';
    backHref = '/welcome';
    onNext = () => {
      if (why) return;
      if (!lookupStaffByPhone()) return;
      setCode('');
      setCodeBad(false);
      setStep('joinCode');
    };
  } else if (step === 'joinCode') {
    why = !codeOk ? 'Type all 6 digits' : '';
    nextLabel = 'Check code';
    onBack = () => setStep('join');
    onNext = () => {
      if (!codeOk) return;
      if (code === WRONG_CODE) {
        setCodeBad(true);
        return;
      }
      setPin('');
      setPin2('');
      setStep('joinPin');
    };
  } else if (step === 'joinPin') {
    why = pin.length < 4 || pin2.length < 4 || pinEasy || !pinMatch ? 'Type the same 4 digits twice' : '';
    nextLabel = 'Save my PIN';
    onBack = () => setStep('joinCode');
    onNext = () => {
      if (!why) commitPin();
    };
  } else if (step === 'joinDone') {
    nextLabel = 'Go to the counter sign-in';
    nextHref = '/counter-sign-in';
  }

  const TITLES: Record<JoinStep, { t: string; s: string }> = {
    join: {
      t: 'Join your shop',
      s: 'Use the number your shop owner added for you.',
    },
    joinCode: {
      t: 'Type the code we sent',
      s: 'It came by SMS. It works for 10 minutes.',
    },
    joinPin: {
      t: 'Pick your 4-digit PIN',
      s: 'You type it at the counter to sell. Don’t share it.',
    },
    joinDone: {
      t: `You’re in, ${firstName}`,
      s: 'At the counter, pick your name and type your PIN.',
    },
  };

  return (
    <AuthFlowShell
      railTitle="Join your shop"
      railSub="For staff · about 2 minutes"
      steps={steps}
      stepOf={`Step ${Math.max(1, curIdx + 1)} of ${STEP_LIST.length}`}
      stepNo={Math.max(1, curIdx + 1)}
      stepMax={STEP_LIST.length}
      railAltLabel={step !== 'joinDone' ? 'Own the shop? Create its account instead' : undefined}
      railAltHref="/register"
      helpText="Stuck? Message Zyro support and we’ll set it up with you."
      title={TITLES[step].t}
      subtitle={TITLES[step].s}
      maxWidth={640}
      hasFooter
      hasBack={step !== 'joinDone'}
      backHref={backHref}
      onBack={onBack}
      why={why}
      nextLabel={nextLabel}
      onNext={onNext}
      nextHref={nextHref}
      nextDisabled={!!why}
      secondaryLabel={step === 'joinDone' ? 'Go to Home' : undefined}
      onSecondary={
        step === 'joinDone'
          ? () => {
              completeAuthSignIn(assignedRole, undefined, undefined, staffName);
              notify(`Joined ${shopName}`, 'ok');
              router.push(assignedRole === 'inventory' ? '/inventory' : '/dashboard');
            }
          : undefined
      }
    >
      {/* STEP 1: STAFF PHONE NUMBER */}
      {step === 'join' && (
        <>
          <div className="flex flex-col gap-1.5 max-w-[440px]">
            <label htmlFor="ca-ph" className="text-[14px] font-semibold text-[#3D5357]">
              Mobile number
            </label>
            <div
              dir="ltr"
              className={`field flex items-stretch h-[56px] rounded-[12px] bg-white overflow-hidden ${
                noInvite ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            >
              <span className="shrink-0 px-3.5 flex items-center bg-[#FBF8F4] border-r border-[#E7E0D7] text-[18px] font-semibold text-[#3D5357]">
                +92
              </span>
              <input
                id="ca-ph"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 12));
                  setNoInvite(false);
                }}
                placeholder="300 1234567"
                className="flex-1 min-w-0 border-0 outline-none px-3.5 text-[20px] font-semibold tracking-[0.02em] bg-transparent text-[#0B2A2F]"
              />
            </div>
            <span className="text-[14px] leading-[1.5] text-[#52666A]">
              10 digits after +92, starting with 3
            </span>
          </div>

          {noInvite && (
            <div
              role="alert"
              className="flex gap-3 p-[14px_16px] rounded-[14px] bg-[#FFF3C4] text-[#6B4E00] max-w-[560px]"
            >
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col gap-1">
                <strong className="text-[16px]">This number isn’t on a shop’s staff list yet</strong>
                <span className="text-[14px] leading-[1.5]">
                  Ask the owner to add it in Settings, Staff. Then try again.
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* STEP 2: SMS CODE */}
      {step === 'joinCode' && (
        <>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              dir="ltr"
              className="h-[36px] px-3 rounded-full bg-white border border-[#E7E0D7] inline-flex items-center gap-2 text-[15px] font-semibold"
            >
              <Phone className="w-4 h-4" />
              {phoneFormatted}
            </span>
            <button
              type="button"
              onClick={() => setStep('join')}
              className="h-[44px] px-1.5 text-[#0E5E66] text-[14px] font-semibold hover:underline"
            >
              Change number
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-w-[360px]">
            <label htmlFor="ca-code" className="text-[14px] font-semibold text-[#3D5357]">
              6-digit code
            </label>
            <input
              id="ca-code"
              dir="ltr"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setCodeBad(false);
              }}
              placeholder="••••••"
              className={`field h-[64px] rounded-[12px] bg-white px-[18px] mono text-[30px] font-medium tracking-[0.4em] text-[#0B2A2F] text-center ${
                codeBad ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            />
            <span
              role={codeBad ? 'alert' : 'note'}
              className={`text-[14px] leading-[1.5] ${codeBad ? 'text-[#B42318]' : 'text-[#52666A]'}`}
            >
              {codeBad
                ? 'That code didn’t match. 4 tries left, then wait 15 minutes.'
                : 'No SMS after a minute? Check the number, then send again. (Demo: 482913)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setCode('482913');
              setCodeBad(false);
              notify('SMS code sent: 482913', 'info');
            }}
            className="bs self-start h-[44px] px-3.5 rounded-[12px] border border-[#E7E0D7] bg-white text-[14px] font-semibold"
          >
            Send again
          </button>
        </>
      )}

      {/* STEP 3: PICK 4-DIGIT PIN */}
      {step === 'joinPin' && (
        <>
          <div className="flex items-center gap-3.5 p-[14px_16px] rounded-[16px] bg-white border border-[#E7E0D7] max-w-[520px]">
            <span className="w-[48px] h-[48px] shrink-0 rounded-[12px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display text-[20px] font-bold">
              {shopInitial}
            </span>
            <div className="flex flex-col gap-0.5">
              <strong className="text-[16px]">{shopName} · Main branch</strong>
              <span className="text-[14px] leading-[1.4] text-[#3D5357]">
                You join as a {assignedRole === 'inventory' ? 'stockkeeper' : 'cashier'}. Hamza Sheikh added you.
              </span>
            </div>
          </div>

          <div className="flex gap-3 max-w-[520px]">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="ca-p1" className="text-[14px] font-semibold text-[#3D5357]">
                PIN
              </label>
              <input
                id="ca-p1"
                dir="ltr"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`field h-[60px] rounded-[12px] bg-white px-4 mono text-[28px] tracking-[0.5em] text-center text-[#0B2A2F] ${
                  pin.length === 4 && pinEasy ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
                }`}
              />
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="ca-p2" className="text-[14px] font-semibold text-[#3D5357]">
                Type it again
              </label>
              <input
                id="ca-p2"
                dir="ltr"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`field h-[60px] rounded-[12px] bg-white px-4 mono text-[28px] tracking-[0.5em] text-center text-[#0B2A2F] ${
                  pin2.length === 4 && !pinMatch ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
                }`}
              />
            </div>
          </div>

          <span
            role={pinEasy || (pin2.length === 4 && !pinMatch) ? 'alert' : 'note'}
            className="text-[14px] leading-[1.5]"
            style={{
              color:
                (pin.length === 4 && pinEasy) || (pin2.length === 4 && !pinMatch)
                  ? '#B42318'
                  : '#52666A',
            }}
          >
            {pin.length === 4 && pinEasy
              ? 'Too easy to guess. Pick another PIN.'
              : pin2.length === 4 && !pinMatch
                ? 'The two PINs don’t match. Type the second one again.'
                : '4 digits. Not 1234, 0000 or your birth year.'}
          </span>
        </>
      )}

      {/* STEP 4: DONE */}
      {step === 'joinDone' && (
        <section className="bg-white border border-[#E7E0D7] rounded-[16px] p-[14px_16px] flex flex-col gap-2 max-w-[560px]">
          <h2 className="m-0 text-[16px] font-bold">
            {assignedRole === 'inventory' ? 'What a stockkeeper can do' : 'What a cashier can do'}
          </h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            <li className="flex items-center gap-2.5 text-[14px] text-[#14532D]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {assignedRole === 'inventory'
                  ? 'Receive deliveries, count stock and add new items'
                  : 'Sell for cash and print bills'}
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-[14px] text-[#14532D]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Add customers, take WhatsApp orders, look up stock</span>
            </li>
            <li className="flex items-center gap-2.5 text-[14px] text-[#52666A]">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Khata, returns and price changes stay with the owner</span>
            </li>
          </ul>
        </section>
      )}
    </AuthFlowShell>
  );
}
