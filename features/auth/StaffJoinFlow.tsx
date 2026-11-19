'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, Info, Lock, Phone, ShieldAlert } from 'lucide-react';
import { AuthStatusCard } from '@/features/auth/components/AuthStatusCard';
import { DevOtpNotice } from '@/features/auth/components/DevOtpNotice';
import { PhoneInputField } from '@/features/auth/components/PhoneInputField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthApiError, authService } from '@/features/auth/services/auth.service';
import type { InvitationValidationPayload } from '@/features/auth/types/auth.types';
import { useZyro } from '@/hooks/useZyro';
import { formatE164ForDisplay, normalizePhoneToE164, validatePasswordStrength } from '@/lib/auth/phone';
import { AuthFlowShell } from './AuthFlowShell';

type JoinStep = 'lookup' | 'verify' | 'account' | 'done';

const STEP_LIST: Array<{ id: JoinStep; label: string }> = [
  { id: 'lookup', label: 'Invitation' },
  { id: 'verify', label: 'Verify mobile' },
  { id: 'account', label: 'Create account' },
  { id: 'done', label: 'Ready' },
];

export function StaffJoinFlow({ invitationToken }: { invitationToken?: string }) {
  const router = useRouter();
  const auth = useAuth();
  const { notify } = useZyro();

  const [step, setStep] = useState<JoinStep>('lookup');
  const [validatingToken, setValidatingToken] = useState(Boolean(invitationToken));
  const [invitation, setInvitation] = useState<InvitationValidationPayload | null>(null);

  const [dialCode, setDialCode] = useState('+92');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [fullName, setFullName] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwShown, setPwShown] = useState(false);

  const [redirectTo, setRedirectTo] = useState('/cashier/home');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If opened via /invite/[token], validate the invitation token immediately
  useEffect(() => {
    if (!invitationToken) return;
    let active = true;

    setValidatingToken(true);
    authService
      .validateInvitation({ token: invitationToken })
      .then((res) => {
        if (!active) return;
        setInvitation(res);
        if (res.valid) {
          setFullName(res.invitedName || '');
        }
      })
      .catch((err) => {
        if (!active) return;
        setInvitation({
          valid: false,
          status: 'invalid',
          message: err instanceof Error ? err.message : 'Unable to validate this invitation link.',
        });
      })
      .finally(() => {
        if (active) setValidatingToken(false);
      });

    return () => {
      active = false;
    };
  }, [invitationToken]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Token-link invalid/expired/revoked/accepted state screens
  if (invitationToken && validatingToken) {
    return (
      <AuthFlowShell
        railTitle="Join your shop"
        railSub="Validating invitation"
        helpText="Checking your secure invitation link…"
        title="Checking your invitation"
        subtitle="Please wait a moment while we verify your shop, branch and role."
        hasFooter={false}
      >
        <div className="rounded-[16px] bg-white border border-[#E7E0D7] p-5 text-[15px] text-[#3D5357]">
          Validating invitation token…
        </div>
      </AuthFlowShell>
    );
  }

  if (invitationToken && invitation && !invitation.valid) {
    if (invitation.status === 'expired') {
      return (
        <AuthStatusCard
          railTitle="Invitation expired"
          railSub="Staff onboarding"
          title="This invitation has expired"
          subtitle="For security, staff invitation links expire automatically."
          icon={<Clock className="w-6 h-6" />}
          iconTone="warn"
          body={
            invitation.message ||
            'Ask your shop owner to send you a new invitation from Staff settings.'
          }
          details={
            invitation.businessName
              ? [
                  { label: 'Business', value: invitation.businessName },
                  { label: 'Branch', value: invitation.branchName || 'Main branch' },
                ]
              : undefined
          }
          primaryLabel="Back to Welcome"
          primaryHref="/welcome"
          secondaryLabel="Sign in instead"
          secondaryHref="/sign-in"
        />
      );
    }

    if (invitation.status === 'accepted') {
      return (
        <AuthStatusCard
          railTitle="Already joined"
          railSub="Staff onboarding"
          title="This invitation was already used"
          subtitle="Your account is already linked to this business."
          icon={<CheckCircle2 className="w-6 h-6" />}
          iconTone="ok"
          body="Sign in with your mobile number and password to open your dashboard."
          details={
            invitation.businessName
              ? [
                  { label: 'Business', value: invitation.businessName },
                  { label: 'Assigned role', value: invitation.roleDisplayName || 'Staff' },
                ]
              : undefined
          }
          primaryLabel="Sign in"
          primaryHref="/sign-in"
          secondaryLabel="Welcome"
          secondaryHref="/welcome"
        />
      );
    }

    return (
      <AuthStatusCard
        railTitle="Invalid invitation"
        railSub="Staff onboarding"
        title={invitation.status === 'revoked' ? 'Invitation was revoked' : 'Invitation link is invalid'}
        subtitle="We couldn’t activate your staff account with this link."
        icon={<ShieldAlert className="w-6 h-6" />}
        iconTone="err"
        body={
          invitation.message ||
          'Check that you opened the complete invitation link, or ask your shop owner to invite you again.'
        }
        primaryLabel="Try with mobile number"
        primaryHref="/staff-join"
        secondaryLabel="Sign in"
        secondaryHref="/sign-in"
      />
    );
  }

  const normalizedPhone = normalizePhoneToE164(phone, dialCode);
  const effectivePhoneE164 = invitation?.invitedPhoneE164 || normalizedPhone.e164 || '';
  const phoneFormatted = effectivePhoneE164
    ? formatE164ForDisplay(effectivePhoneE164)
    : `${dialCode} ${phone || '300 1234567'}`;

  const codeOk = /^\d{6}$/.test(code);
  const pwValidation = validatePasswordStrength(pw, effectivePhoneE164);
  const pwMatch = pw.length > 0 && confirmPw === pw;
  const pwOk = pwValidation.valid && pwMatch;

  const shopName = invitation?.businessName || 'Your shop';
  const branchName = invitation?.branchName || 'Main branch';
  const roleDisplayName = invitation?.roleDisplayName || 'Staff';
  const roleName = (invitation?.roleName || 'cashier').toLowerCase();
  const shopInitial = (shopName.trim()[0] || 'Z').toUpperCase();
  const firstName = (fullName || invitation?.invitedName || 'Team member').split(' ')[0];

  const handleLookupAndSendOtp = async (isResend = false) => {
    setBusy(true);
    setErrorMsg(null);

    try {
      let targetInvite = invitation;

      if (!targetInvite || !targetInvite.valid) {
        if (!normalizedPhone.valid || !normalizedPhone.e164) {
          setErrorMsg(normalizedPhone.error || 'Enter a valid mobile number.');
          return;
        }
        targetInvite = await authService.validateInvitation({
          phone: normalizedPhone.e164,
          dialCode,
        });
        setInvitation(targetInvite);

        if (!targetInvite.valid || !targetInvite.invitedPhoneE164) {
          setErrorMsg(
            targetInvite.message ||
              'No active shop invitation was found for this number. Ask your owner to invite you.',
          );
          return;
        }
        setFullName((prev) => prev || targetInvite?.invitedName || '');
      }

      const otpRes = await authService.requestOtp({
        phone: targetInvite.invitedPhoneE164!,
        purpose: 'staff_invite',
        isResend,
      });

      setDevOtp(otpRes.devOtp ?? null);
      setResendCooldown(otpRes.resendCooldownSeconds || 60);
      setCode('');
      setStep('verify');
      notify('Verification code sent to your invited number', 'info');
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'OTP_COOLDOWN') {
        setResendCooldown(Number(err.details?.retryAfterSeconds) || 60);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!codeOk || !effectivePhoneE164) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.verifyOtp({
        phone: effectivePhoneE164,
        purpose: 'staff_invite',
        code,
      });
      setVerificationToken(res.verificationToken);
      setDevOtp(null);
      setStep('account');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Incorrect verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteInvite = async () => {
    if (!fullName.trim() || !pwOk || !verificationToken) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.registerInvitedUser({
        invitationToken,
        phone: effectivePhoneE164,
        fullName: fullName.trim(),
        password: pw,
        confirmPassword: confirmPw,
        verificationToken,
      });

      await auth.refreshSession();
      setRedirectTo(res.redirectTo || '/cashier/home');
      setStep('done');
      notify(`Joined ${shopName} as ${roleDisplayName}`, 'ok');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to activate your staff account.');
    } finally {
      setBusy(false);
    }
  };

  const curIdx = STEP_LIST.findIndex((s) => s.id === step);
  const steps = STEP_LIST.map((s, i) => {
    const done = i < curIdx || (step === 'done' && i === curIdx);
    const active = i === curIdx && !done;
    return { id: s.id, label: s.label, done, active, number: i + 1 };
  });

  let why = '';
  let nextLabel = 'Send code';
  let onNext: (() => void) | undefined = undefined;
  let backHref: string | undefined = undefined;
  let onBack: (() => void) | undefined = undefined;

  if (step === 'lookup') {
    why = !invitation?.valid && !normalizedPhone.valid ? normalizedPhone.error || 'Enter your invited mobile number' : '';
    nextLabel = busy ? 'Sending code…' : 'Send verification code';
    backHref = '/welcome';
    onNext = () => {
      if (!why) void handleLookupAndSendOtp(false);
    };
  } else if (step === 'verify') {
    why = !codeOk ? 'Type all 6 digits' : '';
    nextLabel = busy ? 'Checking…' : 'Verify code';
    onBack = () => {
      setErrorMsg(null);
      setStep('lookup');
    };
    onNext = () => {
      if (codeOk) void handleVerifyOtp();
    };
  } else if (step === 'account') {
    why = !fullName.trim()
      ? 'Type your full name'
      : !pwValidation.valid
        ? pwValidation.errors[0] || 'Choose a stronger password'
        : !pwMatch
          ? 'Passwords must match'
          : '';
    nextLabel = busy ? 'Activating…' : 'Activate my account';
    onBack = () => {
      setErrorMsg(null);
      setStep('verify');
    };
    onNext = () => {
      if (!why) void handleCompleteInvite();
    };
  } else if (step === 'done') {
    nextLabel = 'Open my dashboard';
    onNext = () => router.push(redirectTo);
  }

  const TITLES: Record<JoinStep, { t: string; s: string }> = {
    lookup: {
      t: invitation?.valid ? `Join ${shopName}` : 'Join your shop as staff',
      s: invitation?.valid
        ? 'Your role and branch are set by the shop owner. Verify your invited number to continue.'
        : 'Enter the mobile number your shop owner invited. Roles are assigned by invitation only.',
    },
    verify: {
      t: 'Verify your mobile number',
      s: 'Enter the 6-digit verification code sent to your invited number.',
    },
    account: {
      t: 'Set up your sign-in password',
      s: 'Use your mobile number and this password to sign in to Zyro.',
    },
    done: {
      t: `You’re in, ${firstName}`,
      s: `Your ${roleDisplayName} access for ${shopName} · ${branchName} is active.`,
    },
  };

  return (
    <AuthFlowShell
      railTitle="Join your shop"
      railSub="For invited staff · about 2 minutes"
      steps={steps}
      stepOf={`Step ${Math.max(1, curIdx + 1)} of ${STEP_LIST.length}`}
      stepNo={Math.max(1, curIdx + 1)}
      stepMax={STEP_LIST.length}
      railAltLabel={step !== 'done' ? 'Own the shop? Create its account instead' : undefined}
      railAltHref="/register"
      helpText="Stuck? Message Zyro support or ask your shop owner."
      title={TITLES[step].t}
      subtitle={TITLES[step].s}
      maxWidth={640}
      hasFooter
      hasBack={step !== 'done'}
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
          className="flex gap-2.5 py-3 px-3.5 rounded-[12px] bg-[#FDF0EF] text-[#B42318] max-w-[540px] text-[14px] leading-[1.5]"
        >
          <AlertTriangle className="w-[18px] h-[18px] shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Trusted Invitation Card whenever validated */}
      {invitation?.valid && step !== 'done' && (
        <div className="flex items-center gap-3.5 p-[14px_16px] rounded-[16px] bg-white border border-[#E7E0D7] max-w-[540px]">
          <span className="w-[48px] h-[48px] shrink-0 rounded-[12px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display text-[20px] font-bold">
            {shopInitial}
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-[16px] truncate">
              {shopName} · {branchName}
            </strong>
            <span className="text-[14px] leading-[1.4] text-[#3D5357]">
              Assigned role: <strong>{roleDisplayName}</strong> · Invited number:{' '}
              <span dir="ltr" className="font-semibold">
                {invitation.maskedPhone || phoneFormatted}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* STEP 1: LOOKUP / CONFIRM INVITED NUMBER */}
      {step === 'lookup' && !invitation?.valid && (
        <>
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
              if (!why && !busy) void handleLookupAndSendOtp(false);
            }}
          />

          <div className="flex gap-3 p-[14px_16px] rounded-[14px] bg-[#FBF8F4] border border-[#E7E0D7] text-[#3D5357] max-w-[540px]">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#08343A]" />
            <div className="flex-1 flex flex-col gap-0.5 text-[14px] leading-[1.5]">
              <strong className="text-[#0B2A2F]">Invitation required for Cashiers and Stockkeepers</strong>
              <span>
                Your shop owner adds your mobile number and assigns your role and branch from Staff settings.
              </span>
            </div>
          </div>
        </>
      )}

      {/* STEP 2: VERIFY OTP */}
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
            {!invitationToken && (
              <button
                type="button"
                onClick={() => {
                  setInvitation(null);
                  setErrorMsg(null);
                  setStep('lookup');
                }}
                className="h-[44px] px-1.5 text-[#0E5E66] text-[14px] font-semibold hover:underline"
              >
                Change number
              </button>
            )}
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
                if (e.key === 'Enter' && codeOk && !busy) void handleVerifyOtp();
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
            onClick={() => void handleLookupAndSendOtp(true)}
            className="bs self-start h-[44px] px-3.5 rounded-[12px] border border-[#E7E0D7] bg-white text-[14px] font-semibold disabled:opacity-55"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Send new code'}
          </button>
        </>
      )}

      {/* STEP 3: FULL NAME + PASSWORD */}
      {step === 'account' && (
        <div className="flex flex-col gap-3.5 max-w-[440px]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="st-nm" className="text-[14px] font-semibold text-[#3D5357]">
              Your full name
            </label>
            <input
              id="st-nm"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ali Hassan"
              className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="st-pw" className="text-[14px] font-semibold text-[#3D5357]">
              Password
            </label>
            <div
              dir="ltr"
              className={`field flex items-center h-[52px] rounded-[12px] bg-white overflow-hidden ${
                pw && !pwValidation.valid ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            >
              <input
                id="st-pw"
                type={pwShown ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="st-pw2" className="text-[14px] font-semibold text-[#3D5357]">
              Confirm password
            </label>
            <input
              id="st-pw2"
              dir="ltr"
              type={pwShown ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`field h-[52px] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F] ${
                confirmPw && !pwMatch ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            />
          </div>

          <ul className="m-0 p-0 list-none flex flex-col gap-1">
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
        </div>
      )}

      {/* STEP 4: DONE */}
      {step === 'done' && (
        <section className="bg-white border border-[#E7E0D7] rounded-[16px] p-[16px_18px] flex flex-col gap-2.5 max-w-[560px]">
          <h2 className="m-0 text-[16px] font-bold">
            What a {roleDisplayName.toLowerCase()} can do at {shopName}
          </h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            <li className="flex items-center gap-2.5 text-[14px] text-[#14532D]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {roleName === 'inventory'
                  ? 'Receive deliveries, count stock, adjust shelf quantities and manage items'
                  : 'Sell on the register, print bills and manage your counter shift'}
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-[14px] text-[#14532D]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Assigned branch: {branchName}</span>
            </li>
            <li className="flex items-center gap-2.5 text-[14px] text-[#52666A]">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Permissions are managed securely by your shop owner</span>
            </li>
          </ul>
        </section>
      )}
    </AuthFlowShell>
  );
}
