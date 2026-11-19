import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient, isSupabaseAdminConfigured } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

const INTERNAL_PHONE_EMAIL_DOMAIN = 'phone.zyropos.app';

/**
 * Deterministic internal Auth email alias derived from an E.164 phone number.
 * Used transparently when Supabase's Phone Auth provider (Twilio/SMS) is not enabled,
 * while preserving mobile phone number as the user's login identifier and keeping
 * password verification + JWT session issuance 100% inside Supabase Auth.
 */
export function phoneToInternalAuthEmail(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, '');
  return `u${digits}@${INTERNAL_PHONE_EMAIL_DOMAIN}`;
}

/**
 * Returns true if an Auth email is a synthetic internal phone alias that should
 * not be surfaced as a real email address in user profiles / UI.
 */
export function isInternalAuthEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${INTERNAL_PHONE_EMAIL_DOMAIN}`);
}

export interface PhoneSignInResult {
  error: {
    code: string | null;
    message: string;
  } | null;
}

/**
 * Signs a user in with their E.164 mobile phone number and password.
 *
 * 1. Tries native Supabase `signInWithPassword({ phone, password })` first.
 * 2. If Supabase rejects it ONLY because the Phone provider (Twilio/SMS) is
 *    disabled (`phone_provider_disabled`), resolves the user's verified Auth
 *    account via `user_profiles.phone` and calls Supabase `signInWithPassword({ email, password })`
 *    so Supabase Auth still verifies the bcrypt password and mints the real SSR session cookies.
 */
export async function signInWithPhonePasswordFallback(
  serverClient: SupabaseClient<Database>,
  phoneE164: string,
  password: string,
): Promise<PhoneSignInResult> {
  const primary = await serverClient.auth.signInWithPassword({
    phone: phoneE164,
    password,
  });

  if (!primary.error) {
    return { error: null };
  }

  const isPhoneProviderDisabled =
    primary.error.code === 'phone_provider_disabled' ||
    /phone logins are disabled/i.test(primary.error.message || '');

  if (!isPhoneProviderDisabled) {
    return {
      error: {
        code: primary.error.code ?? null,
        message: primary.error.message,
      },
    };
  }

  // Fallback path when Supabase Phone provider is not enabled yet (no Twilio configured)
  if (!isSupabaseAdminConfigured()) {
    return {
      error: {
        code: 'phone_provider_disabled',
        message: primary.error.message,
      },
    };
  }

  const admin = createSupabaseServiceClient();

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('phone', phoneE164)
    .maybeSingle();

  if (!profile?.id) {
    return {
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    };
  }

  const { data: authUserResult, error: lookupError } = await admin.auth.admin.getUserById(profile.id);
  const authUser = authUserResult?.user;

  if (lookupError || !authUser) {
    return {
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    };
  }

  let loginEmail = authUser.email?.trim() || '';

  if (!loginEmail) {
    loginEmail = phoneToInternalAuthEmail(phoneE164);
    const { error: attachErr } = await admin.auth.admin.updateUserById(authUser.id, {
      email: loginEmail,
      email_confirm: true,
    });
    if (attachErr) {
      return {
        error: {
          code: 'auth_email_alias_failed',
          message: attachErr.message,
        },
      };
    }
  } else if (!authUser.email_confirmed_at && authUser.phone_confirmed_at) {
    // Account already passed phone verification; confirm its attached auth email so password login succeeds
    await admin.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
    });
  }

  const fallback = await serverClient.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (fallback.error) {
    return {
      error: {
        code: fallback.error.code ?? null,
        message: fallback.error.message,
      },
    };
  }

  return { error: null };
}
