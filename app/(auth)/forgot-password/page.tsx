import React, { Suspense } from 'react';
import { OwnerSignInForm } from '@/features/auth/OwnerSignInForm';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <OwnerSignInForm mode="forgot" />
    </Suspense>
  );
}
