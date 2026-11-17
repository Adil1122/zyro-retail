'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Store } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { KITS } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatPhoneIntl, isValidPkPhone } from '@/lib/format';
import type { ShopKitId } from '@/types';

type RegStep = 'phone' | 'code' | 'you' | 'shop' | 'kind' | 'building' | 'ready';

export function RegisterFlow({ initialStep = 'phone' }: { initialStep?: RegStep }) {
  const router = useRouter();
  const { completeAuthSignIn, updateOwnerPassword, updateSettings, setKit, notify } = useZyro();

  const [step, setStep] = useState<RegStep>(initialStep);
  const [phone, setPhone] = useState('03001112233');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [otp, setOtp] = useState('482910');
  const [fullName, setFullName] = useState('Hamza Sheikh');
  const [password, setPassword] = useState('ZyroShop@2026');
  const [shopName, setShopName] = useState('Hamza Fashion');
  const [city, setCity] = useState('Lahore');
  const [selectedKit, setSelectedKit] = useState<ShopKitId>('clothing');
  const [error, setError] = useState('');

  const stepIndex = ['phone', 'code', 'you', 'shop', 'kind', 'building', 'ready'].indexOf(step);

  const nextFromPhone = () => {
    if (!isValidPkPhone(phone)) {
      setError('Enter an 11-digit Pakistani mobile number starting with 03.');
      return;
    }
    if (!termsAccepted) {
      setError('Please agree to the shop account terms to continue.');
      return;
    }
    setError('');
    setStep('code');
  };

  const nextFromCode = () => {
    if (otp.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit SMS code (demo code: 482910).');
      return;
    }
    setError('');
    setStep('you');
  };

  const nextFromYou = () => {
    if (!fullName.trim() || password.length < 8) {
      setError('Enter your name and a password of at least 8 characters.');
      return;
    }
    setError('');
    setStep('shop');
  };

  const nextFromShop = () => {
    if (!shopName.trim()) {
      setError('Enter your shop name.');
      return;
    }
    setError('');
    setStep('kind');
  };

  const startBuildShop = () => {
    setKit(selectedKit);
    setStep('building');
    setTimeout(() => {
      setStep('ready');
    }, 850);
  };

  const finishSetup = () => {
    const cleanShop = shopName.trim() || 'My Shop';
    updateOwnerPassword(password);
    completeAuthSignIn('owner', cleanShop, selectedKit, fullName.trim() || 'Owner');
    updateSettings({
      phone: phone.replace(/\D/g, ''),
      city: city.trim() || 'Lahore',
    });
    notify(`${cleanShop} is ready`, 'ok');
    router.push('/dashboard');
  };

  const kitConfig = KITS.find((k) => k.id === selectedKit) || KITS[0];

  return (
    <div className="w-full max-w-[920px] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <Card padding="lg" className="lg:col-span-7 space-y-5">
        <div className="flex items-center justify-between">
          <Badge tone="copper">Step {Math.min(stepIndex + 1, 6)} of 6</Badge>
          <Link href="/sign-in" className="text-[13px] font-semibold text-[#0E5E66] hover:underline">
            Already have an account?
          </Link>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-[24px] font-bold text-[#0B2A2F]">Create your shop account</h1>
              <p className="text-[14px] text-[#52666A] mt-1">
                We’ll verify your mobile number first. This becomes your owner login.
              </p>
            </div>
            <Input
              label="Owner mobile number"
              placeholder="0300 1112233"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError('');
              }}
              error={error}
              hint="Format: 03XX XXXXXXX"
            />
            <label className="flex items-start gap-2.5 text-[13px] text-[#3D5357] cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  setError('');
                }}
                className="w-4 h-4 mt-0.5 accent-[#08343A]"
              />
              <span>
                I agree to set up this browser as an offline-capable retail counter for my shop.
              </span>
            </label>
            <div className="flex justify-between items-center pt-2">
              <Link href="/welcome">
                <Button variant="secondary">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </Link>
              <Button variant="primary" size="lg" onClick={nextFromPhone}>
                Send 6-digit code <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-[24px] font-bold text-[#0B2A2F]">Check your SMS</h1>
              <p className="text-[14px] text-[#52666A] mt-1">
                Enter the 6-digit code sent to <span className="font-semibold text-[#0B2A2F] mono">{formatPhoneIntl(phone)}</span>.
              </p>
            </div>
            <Input
              label="6-digit verification code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setError('');
              }}
              error={error}
              hint="Demo verification code prefilled: 482910"
              className="mono"
            />
            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" onClick={() => setStep('phone')}>
                <ArrowLeft className="w-4 h-4" /> Change number
              </Button>
              <Button variant="primary" size="lg" onClick={nextFromCode}>
                Verify code <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'you' && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-[24px] font-bold text-[#0B2A2F]">Your name and password</h1>
              <p className="text-[14px] text-[#52666A] mt-1">
                Only the owner signs in with a password. Cashiers use 4-digit PINs at the counter.
              </p>
            </div>
            <Input
              label="Your full name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError('');
              }}
            />
            <Input
              label="Create a password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              error={error}
              hint="At least 8 characters with letters and numbers"
            />
            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" onClick={() => setStep('code')}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="primary" size="lg" onClick={nextFromYou}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'shop' && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-[24px] font-bold text-[#0B2A2F]">Name your shop</h1>
              <p className="text-[14px] text-[#52666A] mt-1">
                Shown at the top of every 80 mm receipt and customer Khata statement.
              </p>
            </div>
            <Input
              label="Shop name"
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                setError('');
              }}
              error={error}
            />
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" onClick={() => setStep('you')}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="primary" size="lg" onClick={nextFromShop}>
                Choose shop type <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'kind' && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-[24px] font-bold text-[#0B2A2F]">What do you sell?</h1>
              <p className="text-[14px] text-[#52666A] mt-1">
                ZYRO tailors categories, sizes, expiry dates, and barcode rules to your shop type.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {KITS.map((k) => {
                const active = k.id === selectedKit;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setSelectedKit(k.id)}
                    className={`tile p-3.5 rounded-[12px] border text-start flex items-start justify-between gap-2 ${
                      active
                        ? 'bg-[#FCEFE4] border-[#C9682E]'
                        : 'bg-white border-[#E7E0D7] hover:bg-[#FBF8F4]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[14px] text-[#0B2A2F]">{k.name}</div>
                      <div className="text-[12px] text-[#52666A] mt-0.5">{k.sub}</div>
                    </div>
                    {active && <Check className="w-4 h-4 text-[#C9682E] shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" onClick={() => setStep('shop')}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button variant="primary" size="lg" onClick={startBuildShop}>
                Build my shop <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'building' && (
          <div className="py-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#EAE3D9] border-t-[#E58A4E] animate-spin mx-auto" />
            <h2 className="font-display text-[20px] font-bold text-[#0B2A2F]">Setting up {shopName}…</h2>
            <p className="text-[14px] text-[#52666A]">
              Preparing {kitConfig.name} categories, starter stock rules, and Main branch.
            </p>
          </div>
        )}

        {step === 'ready' && (
          <div className="py-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-[24px] font-bold text-[#0B2A2F]">{shopName} is ready</h1>
              <p className="text-[14px] text-[#52666A]">
                {kitConfig.name} starter kit configured in {city}. You can rename categories or add items anytime.
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={finishSetup}>
              Open shop dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Right preview card */}
      <Card tone="raised" className="lg:col-span-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-[#08343A] text-white flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-[15px] text-[#0B2A2F]">{shopName || 'Your shop'}</div>
            <div className="text-[12px] text-[#52666A]">{kitConfig.name}</div>
          </div>
        </div>
        <div className="border-t border-[#E7E0D7] pt-3 space-y-2.5">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
            What this kit sets up
          </div>
          <div className="flex flex-wrap gap-1.5">
            {kitConfig.cats.length > 0 ? (
              kitConfig.cats.map((c) => (
                <Badge key={c} tone="neutral">
                  {c}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral">Custom categories</Badge>
            )}
          </div>
          <ul className="space-y-1.5 text-[13px] text-[#3D5357] pt-1">
            {kitConfig.extras.map((ex) => (
              <li key={ex} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#2F9E63] shrink-0" />
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
