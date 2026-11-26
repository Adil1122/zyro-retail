'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { AuthStatusCard } from '@/features/auth/components/AuthStatusCard';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AccountDisabledPage() {
  const router = useRouter();
  const auth = useAuth();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/welcome');
  };

  return (
    <AuthStatusCard
      railTitle="Access disabled"
      railSub="Account status"
      title="Your shop access is disabled"
      subtitle="Your membership has been suspended or revoked by the business owner."
      icon={<Ban className="w-6 h-6" />}
      iconTone="err"
      body="You cannot open the POS register, inventory, or back-office while your business membership is suspended or removed. Contact your shop owner to restore your access."
      details={
        auth.session.user
          ? [
              { label: 'Signed in as', value: auth.session.user.fullName },
              { label: 'Mobile number', value: auth.session.user.phone || '—' },
            ]
          : undefined
      }
      primaryLabel="Sign out"
      onPrimary={() => void handleSignOut()}
      secondaryLabel="Join another shop"
      secondaryHref="/staff-join"
    />
  );
}
