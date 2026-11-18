'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Phone } from 'lucide-react';
import { useZyro } from '@/hooks/useZyro';
import { AuthFlowShell } from './AuthFlowShell';

type SignInStep = 'signin' | 'forgot' | 'reset';

const WRONG_CODE = '481923';

export function OwnerSignInForm({ mode = 'signin' }: { mode?: 'signin' | 'forgot' }) {
  const router = useRouter();
  const { state, completeAuthSignIn, updateOwnerPassword, notify } = useZyro();

  const [step, setStep] = useState<SignInStep>(mode);
  const [user, setUser] = useState('0321 4567890');
  const [pw, setPw] = useState('Stride2026');
  const [pwShown, setPwShown] = useState(false);
  const [keep, setKeep] = useState(false);
  const [signBad, setSignBad] = useState(false);

  const [phone, setPhone] = useState('321 4567890');
  const [code, setCode] = useState('482913');
  const [codeBad, setCodeBad] = useState(false);

  const digits10 = phone.replace(/\D/g, '').slice(0, 10);
  const phoneOk = /^3\d{9}$/.test(digits10);
  const phoneFormatted =
    digits10.length >= 3 ? `+92 ${digits10.slice(0, 3)} ${digits10.slice(3)}` : '+92 321 4567890';

  const codeOk = /^\d{6}$/.test(code);
  const r1 = pw.length >= 8;
  const r2 = /\d/.test(pw);
  const r3 = !digits10 || !pw.replace(/\D/g, '').includes(digits10);
  const pwOk = r1 && r2 && r3;

  const isResetFlow = step === 'forgot' || step === 'reset';

  const resetSteps = [
    {
      id: 'forgot',
      label: 'Get a code',
      done: step === 'reset',
      active: step === 'forgot',
      number: 1,
    },
    {
      id: 'reset',
      label: 'New password',
      done: false,
      active: step === 'reset',
      number: 2,
    },
  ];

  const handleSignIn = () => {
    if (!user.trim() || !pw) return;
    const validPasswords = [state.ownerPassword, 'Stride2026', 'ZyroShop@2026', 'owner123'];
    if (!validPasswords.includes(pw)) {
      setSignBad(true);
      return;
    }
    completeAuthSignIn('owner');
    notify('Signed in · opening Home', 'ok');
    router.push('/dashboard');
  };

  let why = '';
  let nextLabel = 'Sign in';
  let onNext = handleSignIn;
  let backHref: string | undefined = '/welcome';
  let onBack: (() => void) | undefined = undefined;

  if (step === 'signin') {
    why = !user.trim() || !pw ? 'Type your number or email and password' : '';
  } else if (step === 'forgot') {
    why = !phoneOk ? 'Type a 10-digit number starting with 3' : '';
    nextLabel = 'Send code';
    backHref = undefined;
    onBack = () => setStep('signin');
    onNext = () => {
      if (why) return;
      setCode('');
      setCodeBad(false);
      setPw('');
      setStep('reset');
    };
  } else if (step === 'reset') {
    why = !codeOk ? 'Type all 6 digits' : !pwOk ? 'Pick a password that meets all three' : '';
    nextLabel = 'Save and sign in';
    backHref = undefined;
    onBack = () => setStep('forgot');
    onNext = () => {
      if (why) return;
      if (code === WRONG_CODE) {
        setCodeBad(true);
        return;
      }
      updateOwnerPassword(pw);
      completeAuthSignIn('owner');
      notify('Signed in · opening Home', 'ok');
      router.push('/dashboard');
    };
  }

  const headerText =
    step === 'signin'
      ? { title: 'Welcome back', sub: 'Use the number or email you signed up with.' }
      : step === 'forgot'
        ? { title: 'Reset your password', sub: 'We send a code to the number on your account.' }
        : { title: 'Pick a new password', sub: 'Type the code from the SMS, then your new password.' };

  return (
    <AuthFlowShell
      railTitle={isResetFlow ? 'Reset password' : 'Sign in'}
      railSub={isResetFlow ? 'About 2 minutes' : 'Owners and managers'}
      steps={isResetFlow ? resetSteps : []}
      stepOf={isResetFlow ? `Step ${step === 'forgot' ? 1 : 2} of 2` : undefined}
      stepNo={step === 'forgot' ? 1 : 2}
      stepMax={2}
      railNote={
        !isResetFlow
          ? 'Owners and managers sign in here. Cashiers and stockkeepers use the counter sign-in.'
          : undefined
      }
      railAltLabel={isResetFlow ? 'Remembered it? Sign in' : 'New to Zyro? Create your shop’s account'}
      railAltHref={isResetFlow ? undefined : '/register'}
      onRailAltClick={isResetFlow ? () => setStep('signin') : undefined}
      helpText="Stuck? Message Zyro support and we’ll set it up with you."
      title={headerText.title}
      subtitle={headerText.sub}
      maxWidth={640}
      hasFooter
      hasBack
      backHref={backHref}
      onBack={onBack}
      why={why}
      nextLabel={nextLabel}
      onNext={onNext}
      nextDisabled={!!why}
    >
      {step === 'forgot' && (
        <div className="flex flex-col gap-1.5 max-w-[440px]">
          <label htmlFor="ca-ph" className="text-[14px] font-semibold text-[#3D5357]">
            Mobile number
          </label>
          <div
            dir="ltr"
            className="field flex items-stretch h-[56px] border border-[#8A8276] rounded-[12px] bg-white overflow-hidden"
          >
            <span className="shrink-0 px-3.5 flex items-center bg-[#FBF8F4] border-r border-[#E7E0D7] text-[18px] font-semibold text-[#3D5357]">
              +92
            </span>
            <input
              id="ca-ph"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 12))}
              placeholder="300 1234567"
              className="flex-1 min-w-0 border-0 outline-none px-3.5 text-[20px] font-semibold tracking-[0.02em] bg-transparent text-[#0B2A2F]"
            />
          </div>
          <span className="text-[14px] leading-[1.5] text-[#52666A]">
            10 digits after +92, starting with 3
          </span>
        </div>
      )}

      {step === 'reset' && (
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
              onClick={() => setStep('forgot')}
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
        </>
      )}

      {step === 'signin' && (
        <div className="flex flex-col gap-1.5 max-w-[440px]">
          <label htmlFor="ca-us" className="text-[14px] font-semibold text-[#3D5357]">
            Mobile number or email
          </label>
          <input
            id="ca-us"
            dir="ltr"
            type="text"
            autoComplete="username"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setSignBad(false);
            }}
            placeholder="0300 1234567"
            className={`field h-[52px] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F] ${
              signBad ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
            }`}
          />
        </div>
      )}

      {(step === 'signin' || step === 'reset') && (
        <div className="flex flex-col gap-1.5 max-w-[440px]">
          <label htmlFor="ca-pw" className="text-[14px] font-semibold text-[#3D5357]">
            {step === 'reset' ? 'New password' : 'Password'}
          </label>
          <div
            dir="ltr"
            className={`field flex items-center h-[52px] rounded-[12px] bg-white overflow-hidden ${
              signBad && step === 'signin' ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
            }`}
          >
            <input
              id="ca-pw"
              type={pwShown ? 'text' : 'password'}
              autoComplete={step === 'signin' ? 'current-password' : 'new-password'}
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setSignBad(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !why) onNext();
              }}
              className="flex-1 min-w-0 h-full border-0 outline-none px-3.5 text-[17px] bg-transparent text-[#0B2A2F]"
            />
            <button
              type="button"
              aria-pressed={pwShown}
              onClick={() => setPwShown((v) => !v)}
              className="bs h-[40px] mx-1.5 px-3 border-0 rounded-[9px] bg-[#F1EBE3] text-[14px] font-semibold text-[#0B2A2F]"
            >
              {pwShown ? 'Hide' : 'Show'}
            </button>
          </div>

          {step === 'reset' && (
            <ul className="mt-1 p-0 list-none flex flex-col gap-1">
              {[
                { ok: r1, text: '8 or more characters' },
                { ok: r2, text: 'At least one number' },
                { ok: r3, text: 'Not your phone number' },
              ].map((rule) => (
                <li
                  key={rule.text}
                  className="flex items-center gap-2 text-[14px]"
                  style={{ color: rule.ok ? '#14532D' : '#52666A' }}
                >
                  {rule.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-current shrink-0" />
                  )}
                  <span>{rule.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 'signin' && (
        <>
          <label className="flex items-start gap-3 min-h-[44px] cursor-pointer max-w-[440px]">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
              className="w-[22px] h-[22px] mt-0.5 shrink-0 accent-[#08343A]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[16px]">Keep me signed in on this computer</span>
              <span className="text-[14px] text-[#52666A]">Leave it off on a shared counter.</span>
            </span>
          </label>

          {signBad && (
            <div
              role="alert"
              className="flex gap-2.5 py-3 px-3.5 rounded-[12px] bg-[#FDF0EF] text-[#B42318] max-w-[440px] text-[14px] leading-[1.5]"
            >
              <AlertTriangle className="w-[18px] h-[18px] shrink-0 mt-0.5" />
              <span>That number or password didn’t match. Check both and try again.</span>
            </div>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <button
              type="button"
              onClick={() => {
                setSignBad(false);
                setStep('forgot');
              }}
              className="h-[44px] text-[#0E5E66] text-[16px] font-semibold hover:underline"
            >
              Forgot password?
            </button>
            <Link
              href="/counter-sign-in"
              className="min-h-[44px] inline-flex items-center text-[#0E5E66] text-[16px] font-semibold hover:underline"
            >
              Staff: counter sign-in
            </Link>
          </div>
        </>
      )}
    </AuthFlowShell>
  );
}
