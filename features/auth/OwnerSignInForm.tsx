'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useZyro } from '@/hooks/useZyro';
import { isValidPkPhone } from '@/lib/format';

export function OwnerSignInForm({ mode = 'signin' }: { mode?: 'signin' | 'forgot' }) {
  const router = useRouter();
  const { state, completeAuthSignIn, updateOwnerPassword, notify } = useZyro();
  const [view, setView] = useState<'signin' | 'forgot' | 'reset'>(mode);
  const [phone, setPhone] = useState(state.settings.phone || '03001112233');
  const [password, setPassword] = useState('ZyroShop@2026');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPkPhone(phone)) {
      setError('Enter a valid 11-digit owner phone number.');
      return;
    }
    if (password !== state.ownerPassword) {
      setError('Wrong password. Try again or reset via SMS.');
      return;
    }
    completeAuthSignIn('owner');
    notify(`Signed in to ${state.settings.shopName} (Owner)`, 'ok');
    router.push('/dashboard');
  };

  const handleSendReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPkPhone(phone)) {
      setError('Enter your registered owner mobile number.');
      return;
    }
    setError('');
    setView('reset');
    notify('Verification code sent (demo code: 482910)', 'info');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length < 4 || newPass.length < 8) {
      setError('Enter the SMS code and a new password (min 8 chars).');
      return;
    }
    updateOwnerPassword(newPass);
    completeAuthSignIn('owner');
    notify('Password updated and signed in', 'ok');
    router.push('/dashboard');
  };

  return (
    <Card padding="lg" className="w-full max-w-[440px] space-y-5">
      {view === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#08343A] text-[#E58A4E] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Owner signs in</h1>
              <p className="text-[13px] text-[#52666A]">Full access to sales, stock, Khata & reports</p>
            </div>
          </div>

          <Input
            label="Mobile number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError('');
            }}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            error={error}
          />

          <div className="flex items-center justify-between text-[13px]">
            <button
              type="button"
              onClick={() => {
                setError('');
                setView('forgot');
              }}
              className="font-semibold text-[#0E5E66] hover:underline"
            >
              Forgot password?
            </button>
            <Link href="/staff-join" className="text-[#52666A] hover:text-[#0B2A2F]">
              Staff member? Join here
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth>
            Sign in <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleSendReset} className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#FCEFE4] text-[#8A3D12] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Reset owner password</h1>
              <p className="text-[13px] text-[#52666A]">We will send a 6-digit SMS code</p>
            </div>
          </div>
          <Input
            label="Registered mobile number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError('');
            }}
            error={error}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setView('signin')}>
              Back
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Send reset code
            </Button>
          </div>
        </form>
      )}

      {view === 'reset' && (
        <form onSubmit={handleReset} className="space-y-4">
          <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Choose a new password</h1>
          <Input label="6-digit SMS code" placeholder="482910" value={otp} onChange={(e) => setOtp(e.target.value)} />
          <Input
            label="New password"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            error={error}
          />
          <Button type="submit" variant="primary" size="lg" fullWidth>
            Save password & sign in
          </Button>
        </form>
      )}
    </Card>
  );
}
