'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Phone } from 'lucide-react';
import { isNavModuleEnabled } from '@/constants/navigation';
import { DevOtpNotice } from '@/features/auth/components/DevOtpNotice';
import { PhoneInputField } from '@/features/auth/components/PhoneInputField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthApiError, authService } from '@/features/auth/services/auth.service';
import { useZyro } from '@/hooks/useZyro';
import { formatE164ForDisplay, normalizePhoneToE164, validatePasswordStrength } from '@/lib/auth/phone';
import { AuthFlowShell } from './AuthFlowShell';

type SignInStep = 'signin' | 'forgot' | 'verify' | 'reset';

export function OwnerSignInForm({ mode = 'signin' }: { mode?: 'signin' | 'forgot' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { notify } = useZyro();

  const [step, setStep] = useState<SignInStep>(mode);
  const [dialCode, setDialCode] = useState('+92');
  const [identifier, setIdentifier] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwShown, setPwShown] = useState(false);
  const [keep, setKeep] = useState(true);

  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedResetPhone = normalizePhoneToE164(phone, dialCode);
  const phoneOk = normalizedResetPhone.valid;
  const resolvedResetE164 = phoneE164 || normalizedResetPhone.e164 || '';
  const phoneFormatted = resolvedResetE164
    ? formatE164ForDisplay(resolvedResetE164)
    : `${dialCode} ${phone || '300 1234567'}`;

  const codeOk = /^\d{6}$/.test(code);
  const pwValidation = validatePasswordStrength(pw, resolvedResetE164);
  const pwMatch = pw.length > 0 && confirmPw === pw;
  const pwOk = pwValidation.valid && pwMatch;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isResetFlow = step === 'forgot' || step === 'verify' || step === 'reset';

  const resetSteps = [
    {
      id: 'forgot',
      label: 'Your number',
      done: step === 'verify' || step === 'reset',
      active: step === 'forgot',
      number: 1,
    },
    {
      id: 'verify',
      label: 'Verify code',
      done: step === 'reset',
      active: step === 'verify',
      number: 2,
    },
    {
      id: 'reset',
      label: 'New password',
      done: false,
      active: step === 'reset',
      number: 3,
    },
  ];

  const handleSignIn = async () => {
    if (!identifier.trim() || !pw) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.signInWithPassword({
        identifier: identifier.trim(),
        dialCode,
        password: pw,
        rememberMe: keep,
      });

      const refreshedSession = await auth.refreshSession();

      const defaultLanding = isNavModuleEnabled('home') ? '/dashboard' : '/inventory';
      const candidateRedirect =
        (typeof res?.redirectTo === 'string' && res.redirectTo.startsWith('/') ? res.redirectTo : '') ||
        (typeof res?.session?.recommendedRedirect === 'string' && res.session.recommendedRedirect.startsWith('/')
          ? res.session.recommendedRedirect
          : '') ||
        (typeof refreshedSession?.recommendedRedirect === 'string' &&
        refreshedSession.recommendedRedirect.startsWith('/')
          ? refreshedSession.recommendedRedirect
          : '') ||
        defaultLanding;

      const nextParam = searchParams.get('next');
      const isInactiveHomeNext =
        !isNavModuleEnabled('home') &&
        Boolean(
          nextParam &&
            (nextParam === '/' ||
              nextParam === '/dashboard' ||
              nextParam === '/home' ||
              nextParam === '/cashier/home' ||
              nextParam === '/stockkeeper/home'),
        );
      const accountStatus = res?.session?.accountStatus ?? refreshedSession?.accountStatus;

      const safeNext =
        nextParam &&
        nextParam.startsWith('/') &&
        !nextParam.startsWith('//') &&
        !isInactiveHomeNext &&
        accountStatus === 'active'
          ? nextParam
          : candidateRedirect;

      notify('Signed in to Zyro POS', 'ok');
      router.push(safeNext);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'That mobile number or password did not match. Check both and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSendResetOtp = async (isResend = false) => {
    if (!normalizedResetPhone.valid || !normalizedResetPhone.e164) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.requestOtp({
        phone: normalizedResetPhone.e164,
        dialCode,
        purpose: 'password_reset',
        isResend,
      });

      setPhoneE164(res.phoneE164);
      setDevOtp(res.devOtp ?? null);
      setResendCooldown(res.resendCooldownSeconds || 60);
      setCode('');
      setStep('verify');
      notify('Password reset code sent', 'info');
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'OTP_COOLDOWN') {
        setResendCooldown(Number(err.details?.retryAfterSeconds) || 60);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send reset code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!codeOk || !resolvedResetE164) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.verifyOtp({
        phone: resolvedResetE164,
        purpose: 'password_reset',
        code,
      });

      setVerificationToken(res.verificationToken);
      setDevOtp(null);
      setPw('');
      setConfirmPw('');
      setStep('reset');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification code did not match.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!pwOk || !resolvedResetE164 || !verificationToken) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.resetPassword({
        phone: resolvedResetE164,
        dialCode,
        verificationToken,
        newPassword: pw,
        confirmPassword: confirmPw,
        autoSignIn: true,
      });

      await auth.refreshSession();
      notify('Password updated · signed in', 'ok');
      const resetTarget =
        typeof res?.redirectTo === 'string' && res.redirectTo.startsWith('/')
          ? res.redirectTo
          : '/sign-in';
      router.push(resetTarget);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update password.');
      if (err instanceof AuthApiError && err.code?.startsWith('OTP_TOKEN')) {
        setStep('forgot');
      }
    } finally {
      setBusy(false);
    }
  };

  let why = '';
  let nextLabel = busy ? 'Signing in…' : 'Sign in';
  let onNext: () => void = () => void handleSignIn();
  let backHref: string | undefined = '/welcome';
  let onBack: (() => void) | undefined = undefined;

  if (step === 'signin') {
    why = !identifier.trim() || !pw ? 'Enter your mobile number and password' : '';
  } else if (step === 'forgot') {
    why = !phoneOk ? normalizedResetPhone.error || 'Enter a valid mobile number' : '';
    nextLabel = busy ? 'Sending code…' : 'Send code';
    backHref = undefined;
    onBack = () => {
      setErrorMsg(null);
      setStep('signin');
    };
    onNext = () => {
      if (!why) void handleSendResetOtp(false);
    };
  } else if (step === 'verify') {
    why = !codeOk ? 'Type all 6 digits' : '';
    nextLabel = busy ? 'Verifying…' : 'Verify code';
    backHref = undefined;
    onBack = () => {
      setErrorMsg(null);
      setStep('forgot');
    };
    onNext = () => {
      if (codeOk) void handleVerifyResetOtp();
    };
  } else if (step === 'reset') {
    why = !pwValidation.valid
      ? pwValidation.errors[0] || 'Pick a password that meets all rules'
      : !pwMatch
        ? 'Confirm password must match'
        : '';
    nextLabel = busy ? 'Saving password…' : 'Save and sign in';
    backHref = undefined;
    onBack = () => {
      setErrorMsg(null);
      setStep('forgot');
    };
    onNext = () => {
      if (!why) void handleResetPassword();
    };
  }

  const headerText =
    step === 'signin'
      ? { title: 'Welcome back', sub: 'Sign in with your mobile number and password.' }
      : step === 'forgot'
        ? { title: 'Reset your password', sub: 'We send a 6-digit code to the mobile number on your account.' }
        : step === 'verify'
          ? { title: 'Enter the reset code', sub: 'Verify the 6-digit code before setting a new password.' }
          : { title: 'Pick a new password', sub: 'Choose a strong password for your Zyro account.' };

  const currentResetStepNo = step === 'forgot' ? 1 : step === 'verify' ? 2 : 3;

  return (
    <AuthFlowShell
      railTitle={isResetFlow ? 'Reset password' : 'Sign in'}
      railSub={isResetFlow ? 'About 2 minutes' : 'Owners, managers and staff'}
      steps={isResetFlow ? resetSteps : []}
      stepOf={isResetFlow ? `Step ${currentResetStepNo} of 3` : undefined}
      stepNo={currentResetStepNo}
      stepMax={3}
      railNote={
        !isResetFlow
          ? 'Sign in with your registered mobile number and password. Your role and branch open automatically.'
          : undefined
      }
      railAltLabel={isResetFlow ? 'Remembered it? Sign in' : 'New to Zyro? Create your shop’s account'}
      railAltHref={isResetFlow ? undefined : '/register'}
      onRailAltClick={
        isResetFlow
          ? () => {
              setErrorMsg(null);
              setStep('signin');
            }
          : undefined
      }
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
      nextBusy={busy}
    >
      {errorMsg && (
        <div
          role="alert"
          className="flex gap-2.5 py-3 px-3.5 rounded-[12px] bg-[#FDF0EF] text-[#B42318] max-w-[440px] text-[14px] leading-[1.5]"
        >
          <AlertTriangle className="w-[18px] h-[18px] shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === 'forgot' && (
        <PhoneInputField
          id="ca-ph"
          dialCode={dialCode}
          onDialCodeChange={(d) => {
            setDialCode(d);
            setErrorMsg(null);
          }}
          value={phone}
          onChange={(v) => {
            setPhone(v);
            setErrorMsg(null);
          }}
          hasError={Boolean(errorMsg)}
          onEnter={() => {
            if (!why && !busy) void handleSendResetOtp(false);
          }}
        />
      )}

      {step === 'verify' && (
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
              onClick={() => {
                setErrorMsg(null);
                setStep('forgot');
              }}
              className="h-[44px] px-1.5 text-[#0E5E66] text-[14px] font-semibold hover:underline"
            >
              Change number
            </button>
          </div>

          <DevOtpNotice devOtp={devOtp} onUseCode={(val) => setCode(val)} />

          <div className="flex flex-col gap-1.5 max-w-[360px]">
            <label htmlFor="ca-code" className="text-[14px] font-semibold text-[#3D5357]">
              6-digit verification code
            </label>
            <input
              id="ca-code"
              dir="ltr"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && codeOk && !busy) void handleVerifyResetOtp();
              }}
              placeholder="••••••"
              className={`field h-[64px] rounded-[12px] bg-white px-[18px] mono text-[30px] font-medium tracking-[0.4em] text-[#0B2A2F] text-center ${
                errorMsg ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            />
          </div>

          <button
            type="button"
            disabled={resendCooldown > 0 || busy}
            onClick={() => void handleSendResetOtp(true)}
            className="bs self-start h-[44px] px-3.5 rounded-[12px] border border-[#E7E0D7] bg-white text-[14px] font-semibold disabled:opacity-55"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Send new code'}
          </button>
        </>
      )}

      {step === 'signin' && (
        <div className="flex flex-col gap-1.5 max-w-[440px]">
          <label htmlFor="ca-us" className="text-[14px] font-semibold text-[#3D5357]">
            Mobile number
          </label>
          <input
            id="ca-us"
            dir="ltr"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="+92 300 1234567 or 0300 1234567"
            className={`field h-[52px] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F] ${
              errorMsg ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
            }`}
          />
        </div>
      )}

      {(step === 'signin' || step === 'reset') && (
        <div className="flex flex-col gap-3 max-w-[440px]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ca-pw" className="text-[14px] font-semibold text-[#3D5357]">
              {step === 'reset' ? 'New password' : 'Password'}
            </label>
            <div
              dir="ltr"
              className={`field flex items-center h-[52px] rounded-[12px] bg-white overflow-hidden ${
                errorMsg && step === 'signin' ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            >
              <input
                id="ca-pw"
                type={pwShown ? 'text' : 'password'}
                autoComplete={step === 'signin' ? 'current-password' : 'new-password'}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && step === 'signin' && !why && !busy) onNext();
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
          </div>

          {step === 'reset' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ca-pw2" className="text-[14px] font-semibold text-[#3D5357]">
                  Confirm new password
                </label>
                <input
                  id="ca-pw2"
                  dir="ltr"
                  type={pwShown ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !why && !busy) onNext();
                  }}
                  className={`field h-[52px] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F] ${
                    confirmPw && !pwMatch ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
                  }`}
                />
              </div>

              <ul className="mt-1 p-0 list-none flex flex-col gap-1">
                {[
                  { ok: pwValidation.minLengthOk, text: '8 or more characters' },
                  { ok: pwValidation.hasDigitOk, text: 'At least one number' },
                  { ok: pwValidation.notPhoneOk, text: 'Not your mobile number' },
                  { ok: pwMatch, text: 'Passwords match' },
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
            </>
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

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep('forgot');
              }}
              className="h-[44px] text-[#0E5E66] text-[16px] font-semibold hover:underline"
            >
              Forgot password?
            </button>
            <Link
              href="/staff-join"
              className="min-h-[44px] inline-flex items-center text-[#0E5E66] text-[16px] font-semibold hover:underline"
            >
              Invited staff? Join shop
            </Link>
          </div>
        </>
      )}
    </AuthFlowShell>
  );
}
