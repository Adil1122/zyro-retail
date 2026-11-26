import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneToE164 } from '@/lib/auth/phone';
import { getClientIpFromRequest } from '@/lib/auth/server-context';
import { createSupabaseServiceClient, isSupabaseAdminConfigured } from '@/lib/supabase/server';
import { OtpService, OtpServiceError } from '@/features/auth/services/otp.service';
import type { OtpPurpose } from '@/features/auth/types/auth.types';

const VALID_PURPOSES = new Set<OtpPurpose>(['owner_register', 'staff_invite', 'password_reset']);

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
      purpose?: OtpPurpose;
      isResend?: boolean;
      invitationToken?: string;
    } | null;

    if (!body?.phone || !body?.purpose || !VALID_PURPOSES.has(body.purpose)) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REQUEST', error: 'Mobile number and valid purpose are required.' },
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
    const admin = createSupabaseServiceClient();

    // Purpose-specific pre-checks before issuing OTP
    if (body.purpose === 'owner_register') {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('id')
        .eq('phone', phoneE164)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          {
            ok: false,
            code: 'PHONE_ALREADY_REGISTERED',
            error: 'This mobile number already has a Zyro account. Sign in instead.',
          },
          { status: 409 },
        );
      }
    } else if (body.purpose === 'staff_invite') {
      // Ensure a valid pending invitation exists for this mobile number
      const { data: invite } = await admin
        .from('business_invitations')
        .select('id, expires_at, status')
        .eq('invited_phone_e164', phoneE164)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!invite) {
        return NextResponse.json(
          {
            ok: false,
            code: 'NO_ACTIVE_INVITATION',
            error:
              'No active shop invitation was found for this number. Ask your shop owner to invite you from Staff settings.',
          },
          { status: 404 },
        );
      }
    } else if (body.purpose === 'password_reset') {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('id')
        .eq('phone', phoneE164)
        .maybeSingle();

      if (!existingProfile) {
        return NextResponse.json(
          {
            ok: false,
            code: 'ACCOUNT_NOT_FOUND',
            error: 'No Zyro account was found with this mobile number.',
          },
          { status: 404 },
        );
      }
    }

    const otpService = new OtpService();
    const result = await otpService.requestOtp({
      phone: phoneE164,
      purpose: body.purpose,
      requestIp: getClientIpFromRequest(req),
      userAgent: req.headers.get('user-agent'),
      isResend: Boolean(body.isResend),
    });

    return NextResponse.json(result, { status: 200 });
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
        code: 'OTP_REQUEST_FAILED',
        error: err instanceof Error ? err.message : 'Unable to send verification code.',
      },
      { status: 500 },
    );
  }
}
