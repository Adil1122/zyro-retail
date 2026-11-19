import React, { Suspense } from 'react';
import { OwnerSignInForm } from '@/features/auth/OwnerSignInForm';

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <OwnerSignInForm mode="signin" />
    </Suspense>
  );
}
