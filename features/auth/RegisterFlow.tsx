'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Footprints,
  Gem,
  Layers,
  Phone,
  Pill,
  RefreshCw,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { categoriesForKit, kitById } from '@/constants/kits';
import { isNavModuleEnabled } from '@/constants/navigation';
import { DevOtpNotice } from '@/features/auth/components/DevOtpNotice';
import { PhoneInputField } from '@/features/auth/components/PhoneInputField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthApiError, authService } from '@/features/auth/services/auth.service';
import { COUNTRY_OPTIONS, SUPPORTED_CURRENCIES } from '@/features/auth/types/auth.types';
import { useZyro } from '@/hooks/useZyro';
import { formatE164ForDisplay, normalizePhoneToE164, validatePasswordStrength } from '@/lib/auth/phone';
import type { ShopKitId } from '@/types';
import { AuthFlowShell } from './AuthFlowShell';

type RegStep = 'phone' | 'code' | 'you' | 'shop' | 'kind' | 'building' | 'ready';

const STEP_LIST: Array<{ id: Exclude<RegStep, 'building'>; label: string }> = [
  { id: 'phone', label: 'Your number' },
  { id: 'code', label: 'SMS code' },
  { id: 'you', label: 'About you' },
  { id: 'shop', label: 'Your shop' },
  { id: 'kind', label: 'What you sell' },
  { id: 'ready', label: 'Ready' },
];

const KIT_ORDER: ShopKitId[] = [
  'clothing',
  'shoes',
  'jewellery',
  'pharmacy',
  'grocery',
  'cosmetics',
  'mobile',
  'other',
];

/**
 * Temporary restriction: only show Footwear during registration.
 * Switch back to `KIT_ORDER` when other retail categories are enabled.
 */
const VISIBLE_REGISTER_KITS: ShopKitId[] = ['shoes'];

const KIT_META: Record<
  ShopKitId,
  {
    name: string;
    sub: string;
    asks: string;
    counts: string;
    barcodes: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  clothing: {
    name: 'Clothing and fashion',
    sub: 'Suits, kurtas, lawn, kids wear',
    asks: 'colours, sizes and how many of each',
    counts: 'Pieces',
    barcodes: 'Zyro prints a label for each one',
    icon: Shirt,
  },
  shoes: {
    name: 'Footwear',
    sub: 'Shoes, chappals, khussas, sandals',
    asks: 'colours, sizes and how many of each',
    counts: 'Pairs',
    barcodes: 'Zyro prints a label for each one',
    icon: Footprints,
  },
  jewellery: {
    name: 'Jewellery',
    sub: 'Gold, silver, artificial',
    asks: 'karat, weight and making charge of each piece',
    counts: 'Pieces',
    barcodes: 'Zyro prints a label for each one',
    icon: Gem,
  },
  pharmacy: {
    name: 'Pharmacy',
    sub: 'Medicines and personal care',
    asks: 'batch, expiry and packs in each batch',
    counts: 'Packs and strips',
    barcodes: 'Scan the barcode already on the pack',
    icon: Pill,
  },
  grocery: {
    name: 'Grocery and general store',
    sub: 'Kiryana, mart, daily items',
    asks: 'pack size, or price per kg or litre',
    counts: 'Packs and strips',
    barcodes: 'Scan the barcode already on the pack',
    icon: ShoppingBasket,
  },
  cosmetics: {
    name: 'Cosmetics and beauty',
    sub: 'Makeup, skin and hair care',
    asks: 'shade names and how many of each',
    counts: 'Pieces',
    barcodes: 'Scan the barcode already on the pack',
    icon: Sparkles,
  },
  mobile: {
    name: 'Mobiles and electronics',
    sub: 'Phones, chargers, accessories',
    asks: 'the IMEI or serial of every unit',
    counts: 'Pieces',
    barcodes: 'Scan the IMEI or serial',
    icon: Smartphone,
  },
  other: {
    name: 'Something else',
    sub: 'Start empty and add your own',
    asks: 'only how many you have',
    counts: 'Pieces',
    barcodes: 'Zyro prints a label for each one',
    icon: Layers,
  },
};

const CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Sialkot',
  'Gujranwala',
  'Other',
];

export function RegisterFlow({ initialStep = 'phone' }: { initialStep?: RegStep }) {
  const router = useRouter();
  const auth = useAuth();
  const { completeAuthSignIn, updateSettings, setKit, notify } = useZyro();

  const [step, setStep] = useState<RegStep>(initialStep);
  const [dialCode, setDialCode] = useState('+92');
  const [phone, setPhone] = useState('');
  const [phoneE164, setPhoneE164] = useState('');
  const [agree, setAgree] = useState(true);
  const [taken, setTaken] = useState(false);

  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwShown, setPwShown] = useState(false);

  const [shop, setShop] = useState('');
  const [branchName, setBranchName] = useState('Main branch');
  const [businessPhone, setBusinessPhone] = useState('');
  const [countryCode, setCountryCode] = useState('PK');
  const [currency, setCurrency] = useState<string>('PKR');
  const [city, setCity] = useState('Lahore');
  const [cityName, setCityName] = useState('');
  const [area, setArea] = useState('');
  const [branches, setBranches] = useState<1 | 2 | 4>(1);
  const [hasLogo, setHasLogo] = useState(false);

  const [selectedKit, setSelectedKit] = useState<ShopKitId>('shoes');
  const [builtCount, setBuiltCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedPhone = normalizePhoneToE164(phone, dialCode);
  const phoneOk = normalizedPhone.valid;
  const resolvedPhoneE164 = phoneE164 || normalizedPhone.e164 || '';
  const phoneFormatted = resolvedPhoneE164
    ? formatE164ForDisplay(resolvedPhoneE164)
    : `${dialCode} ${phone || '300 1234567'}`;

  const codeOk = /^\d{6}$/.test(code);
  const pwValidation = validatePasswordStrength(pw, resolvedPhoneE164);
  const pwMatch = pw.length > 0 && confirmPw === pw;
  const pwOk = pwValidation.valid && pwMatch;

  const cityShown = city === 'Other' ? cityName.trim() || '—' : city;
  const shopName = shop.trim() || 'Your Shop';
  const shopInitial = (shopName[0] || 'Z').toUpperCase();
  const kitMeta = KIT_META[selectedKit];
  const kitCats = categoriesForKit(selectedKit).map((c) => c.label);

  // Resend cooldown & expiry timers
  useEffect(() => {
    if (resendCooldown <= 0 && otpExpirySeconds <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown, otpExpirySeconds]);

  const handleRequestOtp = async (isResend = false) => {
    if (!normalizedPhone.valid || !normalizedPhone.e164) return;
    setBusy(true);
    setErrorMsg(null);
    setTaken(false);

    try {
      const res = await authService.requestOtp({
        phone: normalizedPhone.e164,
        dialCode,
        purpose: 'owner_register',
        isResend,
      });

      setPhoneE164(res.phoneE164);
      setBusinessPhone((prev) => prev || formatE164ForDisplay(res.phoneE164));
      setDevOtp(res.devOtp ?? null);
      setResendCooldown(res.resendCooldownSeconds || 60);
      setOtpExpirySeconds(res.expiresInSeconds || 300);
      setCode('');
      setStep('code');
      notify(isResend ? 'New verification code generated' : 'Verification code sent', 'info');
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'PHONE_ALREADY_REGISTERED') {
        setTaken(true);
      } else if (err instanceof AuthApiError && err.code === 'OTP_COOLDOWN') {
        const retryAfter = Number(err.details?.retryAfterSeconds) || 60;
        setResendCooldown(retryAfter);
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to send verification code.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!codeOk || !resolvedPhoneE164) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const res = await authService.verifyOtp({
        phone: resolvedPhoneE164,
        purpose: 'owner_register',
        code,
      });

      setVerificationToken(res.verificationToken);
      setDevOtp(null);
      setStep('you');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification code did not match.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAccount = async () => {
    setBusy(true);
    setErrorMsg(null);
    setStep('building');
    setBuiltCount(1);

    const progressTimer = setInterval(() => {
      setBuiltCount((prev) => (prev < 4 ? prev + 1 : prev));
    }, 350);

    try {
      const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === countryCode) || COUNTRY_OPTIONS[0];
      const res = await authService.registerOwner({
        fullName: name.trim(),
        phone: resolvedPhoneE164,
        dialCode,
        email: email.trim() || undefined,
        password: pw,
        confirmPassword: confirmPw,
        acceptedTerms: agree,
        verificationToken,
        businessName: shop.trim(),
        businessPhone: businessPhone.trim() || resolvedPhoneE164,
        businessType: selectedKit,
        country: selectedCountry.name,
        currency,
        timezone: selectedCountry.timezone,
        branchName: branchName.trim() || 'Main branch',
        city: cityShown === '—' ? undefined : cityShown,
        address: area.trim() || undefined,
      });

      clearInterval(progressTimer);
      setBuiltCount(5);

      await auth.refreshSession();

      const cfg = kitById(selectedKit);
      setKit(selectedKit);
      completeAuthSignIn('owner', shop.trim() || cfg.defaultShopName, selectedKit, name.trim());
      updateSettings({
        shopName: shop.trim(),
        phone: resolvedPhoneE164,
        city: cityShown === '—' ? 'Lahore' : cityShown,
        address: area.trim(),
      });

      setTimeout(() => {
        setStep('ready');
        notify(`${shop.trim()} is ready`, 'ok');
      }, 320);

      if (!res.signedIn) {
        notify('Account created — please sign in to open your shop.', 'info');
      }
    } catch (err) {
      clearInterval(progressTimer);
      setBuiltCount(0);
      const message = err instanceof Error ? err.message : 'Unable to create your shop right now.';
      setErrorMsg(message);

      if (err instanceof AuthApiError && err.code?.startsWith('OTP_TOKEN')) {
        setStep('phone');
      } else {
        setStep('kind');
      }
    } finally {
      setBusy(false);
    }
  };

  const curIdx = STEP_LIST.findIndex((s) => s.id === (step === 'building' ? 'ready' : step));
  const steps = STEP_LIST.map((s, i) => {
    const done = i < curIdx || (step === 'ready' && i === curIdx);
    const active = i === curIdx && !done;
    return { id: s.id, label: s.label, done, active, number: i + 1 };
  });

  let why = '';
  let nextLabel = 'Next';
  let onNext: (() => void) | undefined = undefined;
  let backHref: string | undefined = undefined;
  let onBack: (() => void) | undefined = undefined;

  if (step === 'phone') {
    why = !phoneOk
      ? normalizedPhone.error || 'Enter a valid mobile number'
      : !agree
        ? 'Tick that you agree to the terms'
        : '';
    nextLabel = busy ? 'Sending code…' : 'Send code';
    backHref = '/welcome';
    onNext = () => {
      if (!why) void handleRequestOtp(false);
    };
  } else if (step === 'code') {
    why = !codeOk ? 'Type all 6 digits' : otpExpirySeconds === 0 && devOtp ? 'Code expired — request a new one' : '';
    nextLabel = busy ? 'Checking…' : 'Verify code';
    onBack = () => {
      setErrorMsg(null);
      setStep('phone');
    };
    onNext = () => {
      if (codeOk) void handleVerifyOtp();
    };
  } else if (step === 'you') {
    why = !name.trim()
      ? 'Type your full name'
      : !pwValidation.valid
        ? pwValidation.errors[0] || 'Pick a password that meets all three rules'
        : !pwMatch
          ? 'Confirm password must match your password'
          : '';
    onBack = () => {
      setErrorMsg(null);
      setStep('code');
    };
    onNext = () => {
      if (!why) {
        setErrorMsg(null);
        setStep('shop');
      }
    };
  } else if (step === 'shop') {
    why = !shop.trim()
      ? 'Type the shop name'
      : !branchName.trim()
        ? 'Type your first branch name'
        : city === 'Other' && !cityName.trim()
          ? 'Type the city name'
          : '';
    onBack = () => {
      setErrorMsg(null);
      setStep('you');
    };
    onNext = () => {
      if (!why) {
        setErrorMsg(null);
        setStep('kind');
      }
    };
  } else if (step === 'kind') {
    nextLabel = busy ? 'Creating shop…' : 'Create my shop';
    onBack = () => {
      setErrorMsg(null);
      setStep('shop');
    };
    onNext = () => void handleCreateAccount();
  } else if (step === 'ready') {
    nextLabel = isNavModuleEnabled('home') ? 'Set up this counter' : 'Open Stock';
    onNext = () => router.push(isNavModuleEnabled('home') ? '/setup' : '/inventory');
  }

  const TITLES: Record<RegStep, { t: string; s: string }> = {
    phone: {
      t: 'What’s your mobile number?',
      s: 'You’ll sign in with it. We send a 6-digit code to verify it’s yours.',
    },
    code: {
      t: 'Verify your mobile number',
      s: 'Enter the 6-digit verification code. It works for 5 minutes.',
    },
    you: {
      t: 'About you',
      s: 'You’ll be the business owner. Staff receive separate invitations later.',
    },
    shop: {
      t: 'Your business and first branch',
      s: 'This goes on your receipts and sets up your main branch. Change it any time in Settings.',
    },
    kind: {
      t: 'What do you sell?',
      s: 'Zyro sets up categories, sizes and labels to match. You can add your own later.',
    },
    building: {
      t: `Setting up ${shopName}`,
      s: 'Creating your secure owner account, business, roles and first branch…',
    },
    ready: {
      t: `${shopName} is ready`,
      s: 'You’re signed in as the Owner. Do these next, in any order.',
    },
  };

  const buildRows = [
    `Verified owner account for ${name.trim() || 'Owner'}`,
    `${branchName.trim() || 'Main branch'} in ${cityShown}`,
    `Owner, Cashier & Stockkeeper roles and permissions`,
    `Payment methods, cash drawer and ${currency} receipt setup`,
    'Your Owner Home and live session',
  ];

  const nextCards = isNavModuleEnabled('home')
    ? [
        {
          n: 1,
          t: 'Set up this counter',
          s: 'Pick the printer and print a test receipt. About 3 minutes.',
          href: '/setup',
          hi: true,
        },
        {
          n: 2,
          t: 'Add your first items',
          s: 'Add item asks only what your kind of shop needs, then makes labels.',
          href: '/inventory/items/new',
          hi: false,
        },
        {
          n: 3,
          t: 'Invite your staff',
          s: 'Send cashiers and stockkeepers a secure invite link to join your branch.',
          href: '/staff',
          hi: false,
        },
        {
          n: 4,
          t: 'Open Owner Home',
          s: 'Review today’s sales, cash drawer, stock watch and payables.',
          href: '/home',
          hi: false,
        },
      ]
    : [
        {
          n: 1,
          t: 'Add your first footwear items',
          s: 'Add footwear products with sizes, colours, barcodes and opening stock.',
          href: '/inventory/items/new',
          hi: true,
        },
        {
          n: 2,
          t: 'Manage Stock',
          s: 'View branch stock levels, adjust quantities and run stock counts.',
          href: '/inventory',
          hi: false,
        },
        {
          n: 3,
          t: 'Open Sell register',
          s: 'Start selling footwear at the counter with barcode scanning and receipts.',
          href: '/pos',
          hi: false,
        },
      ];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <AuthFlowShell
      railTitle="Create your shop"
      railSub="About 5 minutes"
      steps={steps}
      stepOf={`Step ${Math.max(1, curIdx + 1)} of ${STEP_LIST.length}`}
      stepNo={Math.max(1, curIdx + 1)}
      stepMax={STEP_LIST.length}
      railAltLabel={step !== 'building' && step !== 'ready' ? 'Already have an account? Sign in' : undefined}
      railAltHref="/sign-in"
      helpText="Stuck? Message Zyro support and we’ll set it up with you."
      title={TITLES[step].t}
      subtitle={TITLES[step].s}
      maxWidth={step === 'kind' || step === 'shop' ? 900 : 640}
      hasFooter={step !== 'building'}
      hasBack={step !== 'building' && step !== 'ready'}
      backHref={backHref}
      onBack={onBack}
      why={why}
      nextLabel={nextLabel}
      onNext={onNext}
      nextDisabled={!!why}
      nextBusy={busy}
      secondaryLabel={step === 'ready' ? (isNavModuleEnabled('home') ? 'Go to Owner Home' : 'Open Sell register') : undefined}
      onSecondary={step === 'ready' ? () => router.push(isNavModuleEnabled('home') ? '/home' : '/pos') : undefined}
      cornerBadge={
        step === 'ready' ? (
          <span
            aria-hidden="true"
            className="hidden lg:flex absolute top-7 end-8 w-16 h-16 rounded-full bg-[#E8F6EE] text-[#2F9E63] items-center justify-center anim-up"
          >
            <Check className="w-[34px] h-[34px] stroke-[2.5]" />
          </span>
        ) : null
      }
    >
      {errorMsg && (
        <div
          role="alert"
          className="flex gap-2.5 py-3 px-3.5 rounded-[12px] bg-[#FDF0EF] text-[#B42318] max-w-[560px] text-[14px] leading-[1.5]"
        >
          <AlertTriangle className="w-[18px] h-[18px] shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: PHONE */}
      {step === 'phone' && (
        <>
          <PhoneInputField
            id="ca-ph"
            dialCode={dialCode}
            onDialCodeChange={(nextDial) => {
              setDialCode(nextDial);
              const match = COUNTRY_OPTIONS.find((c) => c.dialCode === nextDial);
              if (match) {
                setCountryCode(match.code);
                setCurrency(match.currency);
              }
              setTaken(false);
              setErrorMsg(null);
            }}
            value={phone}
            onChange={(val) => {
              setPhone(val);
              setTaken(false);
              setErrorMsg(null);
            }}
            hasError={taken}
            onEnter={() => {
              if (!why && !busy) void handleRequestOtp(false);
            }}
          />

          <div className="flex flex-col gap-0.5">
            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-[22px] h-[22px] mt-0.5 shrink-0 accent-[#08343A]"
              />
              <span className="text-[16px] leading-[1.5] text-[#0B2A2F]">
                I agree to Zyro’s terms of use and privacy policy
              </span>
            </label>
          </div>

          {taken && (
            <div
              role="alert"
              className="flex gap-3 p-[14px_16px] rounded-[14px] bg-[#FDF0EF] text-[#B42318] max-w-[560px]"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col gap-2">
                <strong className="text-[16px]">This number already has a Zyro account</strong>
                <span className="text-[14px] leading-[1.5]">
                  Sign in with it to open your shop, or use another number for a new business.
                </span>
                <Link
                  href="/sign-in"
                  className="bs self-start h-[44px] px-3.5 rounded-[12px] border border-[#B42318] bg-white text-[#B42318] text-[14px] font-bold inline-flex items-center"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {step === 'code' && (
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
                setStep('phone');
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
                if (e.key === 'Enter' && codeOk && !busy) void handleVerifyOtp();
              }}
              placeholder="••••••"
              className={`field h-[64px] rounded-[12px] bg-white px-[18px] mono text-[30px] font-medium tracking-[0.4em] text-[#0B2A2F] text-center ${
                errorMsg ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            />
            <span className="text-[14px] leading-[1.5] text-[#52666A]">
              {otpExpirySeconds > 0
                ? `Code expires in ${formatTimer(otpExpirySeconds)}. Up to 5 attempts allowed.`
                : 'Code expired. Request a fresh code below.'}
            </span>
          </div>

          <button
            type="button"
            disabled={resendCooldown > 0 || busy}
            onClick={() => void handleRequestOtp(true)}
            className="bs self-start h-[44px] px-3.5 rounded-[12px] border border-[#E7E0D7] bg-white text-[14px] font-semibold disabled:opacity-55"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Send new code'}
          </button>
        </>
      )}

      {/* STEP 3: ABOUT YOU (FULL NAME + EMAIL + PASSWORD + CONFIRM PASSWORD) */}
      {step === 'you' && (
        <>
          <div className="flex flex-col gap-1.5 max-w-[440px]">
            <label htmlFor="ca-nm" className="text-[14px] font-semibold text-[#3D5357]">
              Your full name
            </label>
            <input
              id="ca-nm"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hamza Sheikh"
              className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F]"
            />
          </div>

          <div className="flex flex-col gap-1.5 max-w-[440px]">
            <label htmlFor="ca-em" className="text-[14px] font-semibold text-[#3D5357]">
              Email · optional
            </label>
            <input
              id="ca-em"
              dir="ltr"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@yourshop.pk"
              className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F]"
            />
          </div>

          <div className="flex flex-col gap-1.5 max-w-[440px]">
            <label htmlFor="ca-pw" className="text-[14px] font-semibold text-[#3D5357]">
              Password
            </label>
            <div
              dir="ltr"
              className={`field flex items-center h-[52px] rounded-[12px] bg-white overflow-hidden ${
                pw && !pwValidation.valid ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            >
              <input
                id="ca-pw"
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

          <div className="flex flex-col gap-1.5 max-w-[440px]">
            <label htmlFor="ca-pw2" className="text-[14px] font-semibold text-[#3D5357]">
              Confirm password
            </label>
            <input
              id="ca-pw2"
              dir="ltr"
              type={pwShown ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`field h-[52px] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F] ${
                confirmPw && !pwMatch ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
              }`}
            />
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
          </div>
        </>
      )}

      {/* STEP 4: YOUR BUSINESS & FIRST BRANCH + RECEIPT PREVIEW */}
      {step === 'shop' && (
        <div className="flex gap-7 items-start flex-wrap">
          <div className="flex-1 min-w-[280px] max-w-[460px] flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ca-sn" className="text-[14px] font-semibold text-[#3D5357]">
                Business / shop name
              </label>
              <input
                id="ca-sn"
                type="text"
                autoComplete="organization"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                placeholder="Stride Footwear"
                className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F]"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <label htmlFor="ca-br" className="text-[14px] font-semibold text-[#3D5357]">
                  First branch name
                </label>
                <input
                  id="ca-br"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Main branch"
                  className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[16px] text-[#0B2A2F]"
                />
              </div>
              <div className="w-[120px] shrink-0 flex flex-col gap-1.5">
                <label htmlFor="ca-cur" className="text-[14px] font-semibold text-[#3D5357]">
                  Currency
                </label>
                <select
                  id="ca-cur"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3 text-[16px] font-semibold text-[#0B2A2F]"
                >
                  {SUPPORTED_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ca-bph" className="text-[14px] font-semibold text-[#3D5357]">
                Business phone · on receipts
              </label>
              <input
                id="ca-bph"
                dir="ltr"
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder={phoneFormatted}
                className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[16px] text-[#0B2A2F]"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <label htmlFor="ca-ct" className="text-[14px] font-semibold text-[#3D5357]">
                  City
                </label>
                <select
                  id="ca-ct"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3 text-[17px] text-[#0B2A2F]"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-[1.3] min-w-0 flex flex-col gap-1.5">
                <label htmlFor="ca-ar" className="text-[14px] font-semibold text-[#3D5357]">
                  Address or market · optional
                </label>
                <input
                  id="ca-ar"
                  type="text"
                  autoComplete="address-line1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Liberty Market, Gulberg"
                  className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F]"
                />
              </div>
            </div>

            {city === 'Other' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ca-oc" className="text-[14px] font-semibold text-[#3D5357]">
                  City name
                </label>
                <input
                  id="ca-oc"
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Sargodha"
                  className="field h-[52px] border border-[#8A8276] rounded-[12px] bg-white px-3.5 text-[17px] text-[#0B2A2F]"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-[#3D5357]">How many branches?</span>
              <div role="radiogroup" className="flex gap-2">
                {(
                  [
                    [1, 'Just one'],
                    [2, '2 or 3'],
                    [4, '4 or more'],
                  ] as const
                ).map(([val, label]) => {
                  const on = branches === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setBranches(val)}
                      className="flex-1 h-[48px] rounded-[12px] text-[14px] font-semibold text-[#0B2A2F]"
                      style={{
                        border: on ? '2px solid #C9682E' : '1px solid #D6CDC1',
                        backgroundColor: on ? '#FCEFE4' : '#FFFFFF',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[14px] text-[#52666A]">
                You start with {branchName.trim() || 'Main branch'}. Add additional branches in Settings.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-[52px] h-[52px] shrink-0 rounded-[14px] flex items-center justify-center font-display text-[22px] font-bold"
                style={{
                  backgroundColor: hasLogo ? '#08343A' : '#F1EBE3',
                  color: hasLogo ? '#E58A4E' : '#52666A',
                  border: hasLogo ? '0' : '1px dashed #C9C1B6',
                }}
              >
                {shopInitial}
              </span>
              <span className="flex-1 flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[#3D5357]">Logo · optional</span>
                <span className="text-[14px] text-[#52666A]">
                  {hasLogo ? 'Monogram badge on receipts and labels' : 'A letter stands in until you upload one'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setHasLogo((v) => !v)}
                className="bs h-[44px] px-3.5 rounded-[12px] text-[14px] font-semibold inline-flex items-center gap-1.5"
              >
                {hasLogo ? <Trash2 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {hasLogo ? 'Remove' : 'Add logo'}
              </button>
            </div>
          </div>

          <figure className="hidden md:flex m-0 w-[260px] shrink-0 flex-col gap-2">
            <figcaption className="text-[14px] font-semibold text-[#52666A]">
              Your receipt starts like this
            </figcaption>
            <div
              dir="ltr"
              className="bg-white rounded-[4px] shadow-[0_1px_2px_rgba(15,31,25,.08)] pt-[18px] px-4 pb-[22px] flex flex-col items-center gap-1 mono text-[#111111] text-center"
            >
              {hasLogo && (
                <span className="w-10 h-10 rounded-[10px] border-2 border-[#111111] flex items-center justify-center font-display text-[20px] font-bold mb-1">
                  {shopInitial}
                </span>
              )}
              <span className="font-sans text-[17px] font-bold">{shopName}</span>
              <span className="text-[12px] text-[#555555]">{branchName.trim() || 'Main branch'}</span>
              <span className="text-[12px] text-[#555555]">
                {(area.trim() ? `${area.trim()}, ` : '') + cityShown}
              </span>
              <span className="text-[12px] text-[#555555]">{businessPhone || phoneFormatted}</span>
              <span className="w-full border-t border-dashed border-[#9A9A9A] mt-2.5 mb-1.5" />
              <span className="w-full flex justify-between text-[12px] text-[#555555]">
                <span>Bill 1</span>
                <span>{currency}</span>
              </span>
            </div>
          </figure>
        </div>
      )}

      {/* STEP 5: WHAT YOU SELL */}
      {step === 'kind' && (
        <>
          <div role="radiogroup" aria-label="What do you sell?" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {VISIBLE_REGISTER_KITS.map((id) => {
              const on = id === selectedKit;
              const k = KIT_META[id];
              const Icon = k.icon;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSelectedKit(id)}
                  className="min-h-[112px] lg:min-h-[118px] flex flex-col items-start justify-center gap-1.5 py-3 px-3.5 rounded-[14px] text-start text-[#0B2A2F] transition-colors hover:border-[#E2B48F]"
                  style={{
                    border: on ? '2px solid #C9682E' : '1px solid #E7E0D7',
                    backgroundColor: on ? '#FCEFE4' : '#FFFFFF',
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#08343A]"
                    style={{ backgroundColor: on ? '#FFFFFF' : '#F1EBE3' }}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="text-[16px] font-bold leading-[1.25]">{k.name}</span>
                  <span className="text-[12px] leading-[1.35] text-[#52666A]">{k.sub}</span>
                </button>
              );
            })}
          </div>

          <section className="bg-white border border-[#E7E0D7] rounded-[16px] py-3.5 px-4 flex flex-col gap-2.5">
            <h2 className="m-0 text-[16px] font-bold">What Zyro sets up for {kitMeta.name}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-y-2.5 gap-x-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-[0.04em] uppercase text-[#52666A]">
                  Categories
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {kitCats.map((c) => (
                    <span
                      key={c}
                      className="h-[30px] px-2.5 rounded-full bg-[#F1EBE3] text-[13px] font-semibold inline-flex items-center"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-bold tracking-[0.04em] uppercase text-[#52666A]">
                  Add item asks for
                </span>
                <span className="text-[14px] leading-[1.4]">{kitMeta.asks}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-bold tracking-[0.04em] uppercase text-[#52666A]">
                  Stock counted in
                </span>
                <span className="text-[14px] leading-[1.4]">{kitMeta.counts}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-bold tracking-[0.04em] uppercase text-[#52666A]">
                  Barcodes
                </span>
                <span className="text-[14px] leading-[1.4]">{kitMeta.barcodes}</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* BUILDING */}
      {step === 'building' && (
        <ul aria-live="polite" className="m-0 p-0 list-none flex flex-col gap-1.5 max-w-[560px]">
          {buildRows.map((txt, idx) => {
            const done = idx < builtCount;
            const working = idx === builtCount;
            return (
              <li
                key={txt}
                className="flex items-center gap-3.5 min-h-[52px] py-1.5 px-3.5 rounded-[14px] border border-[#E7E0D7]"
                style={{
                  backgroundColor: done || working ? '#FFFFFF' : '#FBF8F4',
                  color: done || working ? '#0B2A2F' : '#52666A',
                }}
              >
                <span
                  className="w-[30px] h-[30px] shrink-0 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: done ? '#E8F6EE' : working ? '#EDF3FF' : '#F1EBE3',
                    color: done ? '#14532D' : working ? '#1E40AF' : '#8A8276',
                  }}
                >
                  {done ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : working ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </span>
                <span className="flex-1 text-[16px]">{txt}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* STEP 6: READY */}
      {step === 'ready' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              ['Owner', name.trim()],
              ['Shop', shopName],
              ['First branch', `${branchName.trim() || 'Main branch'} · ${cityShown}`],
              ['Sells', kitMeta.name],
            ].map(([k, v]) => (
              <div
                key={k}
                className="py-2.5 px-3 rounded-[12px] bg-white border border-[#E7E0D7] flex flex-col gap-0.5 min-w-0"
              >
                <span className="text-[12px] text-[#52666A]">{k}</span>
                <span className="text-[14px] font-bold leading-[1.35]">{v}</span>
              </div>
            ))}
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[16px] font-bold">Next</h2>
            <ol className="m-0 p-0 list-none flex flex-col gap-2">
              {nextCards.map((nx) => (
                <li key={nx.n}>
                  <button
                    type="button"
                    onClick={() => router.push(nx.href)}
                    className="w-full min-h-[64px] flex items-center gap-3.5 py-2.5 px-3.5 rounded-[14px] text-[#0B2A2F] text-start transition-colors hover:border-[#E2B48F]"
                    style={{
                      border: nx.hi ? '2px solid #C9682E' : '1px solid #E7E0D7',
                      backgroundColor: nx.hi ? '#FCEFE4' : '#FFFFFF',
                    }}
                  >
                    <span
                      className="num w-[30px] h-[30px] shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold"
                      style={{
                        backgroundColor: nx.hi ? '#08343A' : '#F1EBE3',
                        color: nx.hi ? '#FFFFFF' : '#0B2A2F',
                      }}
                    >
                      {nx.n}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[16px] font-bold">{nx.t}</span>
                      <span className="text-[14px] leading-[1.4] text-[#52666A]">{nx.s}</span>
                    </span>
                    <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#52666A]" />
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </AuthFlowShell>
  );
}
