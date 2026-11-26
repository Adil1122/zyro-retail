'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TimerOff } from 'lucide-react';
import { AuthStatusCard } from '@/features/auth/components/AuthStatusCard';

function SessionExpiredContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const signInHref = next ? `/sign-in?next=${encodeURIComponent(next)}` : '/sign-in';

  return (
    <AuthStatusCard
      railTitle="Session expired"
      railSub="Security check"
      title="Your session has expired"
      subtitle="For your shop’s security, please sign in again to continue."
      icon={<TimerOff className="w-6 h-6" />}
      iconTone="info"
      body="Your previous session ended or timed out. Sign back in with your mobile number and password to return right where you left off."
      primaryLabel="Sign in again"
      primaryHref={signInHref}
      secondaryLabel="Back to Welcome"
      secondaryHref="/welcome"
    />
  );
}

export default function SessionExpiredPage() {
  return (
    <Suspense fallback={null}>
      <SessionExpiredContent />
    </Suspense>
  );
}
