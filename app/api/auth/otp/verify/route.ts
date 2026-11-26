import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/server';
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
      code?: string;
    } | null;

    if (!body?.phone || !body?.purpose || !VALID_PURPOSES.has(body.purpose) || !body?.code) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_REQUEST', error: 'Mobile number, purpose, and 6-digit code are required.' },
        { status: 400 },
      );
    }

    const otpService = new OtpService();
    const result = await otpService.verifyOtp({
      phone: body.phone,
      dialCode: body.dialCode,
      purpose: body.purpose,
      code: body.code,
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
        code: 'OTP_VERIFY_FAILED',
        error: err instanceof Error ? err.message : 'Unable to verify code.',
      },
      { status: 500 },
    );
  }
}
