import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneToE164, validatePasswordStrength } from '@/lib/auth/phone';
import { getServerAuthSessionPayload } from '@/lib/auth/server-context';
import { signInWithPhonePasswordFallback } from '@/lib/auth/supabase-phone-signin';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/server';
import { OtpService, OtpServiceError } from '@/features/auth/services/otp.service';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          code: 'SUPABASE_NOT_CONFIGURED',
          error:
            'Supabase server credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      phone?: string;
      dialCode?: string;
      verificationToken?: string;
      newPassword?: string;
      confirmPassword?: string;
      autoSignIn?: boolean;
    } | null;

    if (!body?.phone || !body?.verificationToken || !body?.newPassword) {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_REQUEST',
          error: 'Mobile number, verified OTP session, and new password are required.',
        },
        { status: 400 },
      );
    }

    const normalized = normalizePhoneToE164(body.phone, body.dialCode || '+92');
    if (!normalized.valid || !normalized.e164) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_PHONE', error: normalized.error || 'Invalid mobile number.' },
        { status: 400 },
      );
    }
    const phoneE164 = normalized.e164;

    const newPassword = body.newPassword;
    const confirmPassword = body.confirmPassword ?? newPassword;
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, code: 'PASSWORD_MISMATCH', error: 'New password and confirm password do not match.' },
        { status: 400 },
      );
    }

    const pwCheck = validatePasswordStrength(newPassword, phoneE164);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { ok: false, code: 'WEAK_PASSWORD', error: pwCheck.errors[0] || 'Choose a stronger password.' },
        { status: 400 },
      );
    }

    // 1. Validate password_reset OTP proof token before touching auth.users
    const otpService = new OtpService();
    const verifiedChallenge = await otpService.assertAndConsumeVerifiedToken({
      verificationToken: body.verificationToken,
      phoneE164,
      purpose: 'password_reset',
      consumeNow: false,
    });

    const admin = createSupabaseServiceClient();
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('phone', phoneE164)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json(
        { ok: false, code: 'ACCOUNT_NOT_FOUND', error: 'No Zyro account was found for this mobile number.' },
        { status: 404 },
      );
    }

    // 2. Update password via Supabase Admin API
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { ok: false, code: 'PASSWORD_UPDATE_FAILED', error: updateError.message },
        { status: 500 },
      );
    }

    // 3. Immediately invalidate/consume reset token so it can NEVER be reused
    await otpService.markConsumed(verifiedChallenge.id);

    // 4. Optionally establish a fresh authenticated session with the new password
    let session = null;
    let redirectTo = '/sign-in';
    if (body.autoSignIn !== false) {
      const serverClient = await createSupabaseServerClient();
      const { error: signInError } = await signInWithPhonePasswordFallback(serverClient, phoneE164, newPassword);
      if (!signInError) {
        session = await getServerAuthSessionPayload();
        redirectTo = session.recommendedRedirect;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        passwordReset: true,
        signedIn: Boolean(session?.authenticated),
        session,
        redirectTo,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof OtpServiceError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message, ...(err.meta ?? {}) },
        { status: err.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: 'PASSWORD_RESET_FAILED',
        error: err instanceof Error ? err.message : 'Unable to reset password.',
      },
      { status: 500 },
    );
  }
}
