'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { AuthStatusCard } from '@/features/auth/components/AuthStatusCard';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AccountPendingPage() {
  const router = useRouter();
  const auth = useAuth();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/welcome');
  };

  return (
    <AuthStatusCard
      railTitle="Pending access"
      railSub="Account status"
      title="Waiting for shop membership"
      subtitle="Your Zyro account does not have an active business membership yet."
      icon={<Clock className="w-6 h-6" />}
      iconTone="warn"
      body="If you are a cashier or stockkeeper, open the invitation link sent by your shop owner or verify your invited mobile number. If you are a shop owner, complete business setup to start."
      details={
        auth.session.user
          ? [
              { label: 'Account', value: auth.session.user.fullName },
              { label: 'Mobile number', value: auth.session.user.phone || '—' },
            ]
          : undefined
      }
      primaryLabel="Accept staff invitation"
      primaryHref="/staff-join"
      secondaryLabel="Sign out"
      onSecondary={() => void handleSignOut()}
    />
  );
}
