import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/server';
import {
  findLatestInvitationByPhone,
  validateInvitationByRawToken,
} from '@/features/auth/services/invitation.service';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          valid: false,
          status: 'invalid',
          code: 'SUPABASE_NOT_CONFIGURED',
          message:
            'Supabase server credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 503 },
      );
    }

    const token = req.nextUrl.searchParams.get('token');
    const phone = req.nextUrl.searchParams.get('phone');
    const dialCode = req.nextUrl.searchParams.get('dialCode') || '+92';

    if (token) {
      const result = await validateInvitationByRawToken(token);
      return NextResponse.json(result, { status: result.valid ? 200 : 400 });
    }

    if (phone) {
      const result = await findLatestInvitationByPhone(phone, dialCode);
      return NextResponse.json(result, { status: result.valid ? 200 : 404 });
    }

    return NextResponse.json(
      { valid: false, status: 'invalid', message: 'Provide either an invitation token or a mobile number.' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        status: 'invalid',
        message: err instanceof Error ? err.message : 'Unable to validate invitation.',
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          valid: false,
          status: 'invalid',
          code: 'SUPABASE_NOT_CONFIGURED',
          message:
            'Supabase server credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      token?: string;
      phone?: string;
      dialCode?: string;
    } | null;

    if (body?.token) {
      const result = await validateInvitationByRawToken(body.token);
      return NextResponse.json(result, { status: result.valid ? 200 : 400 });
    }

    if (body?.phone) {
      const result = await findLatestInvitationByPhone(body.phone, body.dialCode || '+92');
      return NextResponse.json(result, { status: result.valid ? 200 : 404 });
    }

    return NextResponse.json(
      { valid: false, status: 'invalid', message: 'Provide either an invitation token or a mobile number.' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        status: 'invalid',
        message: err instanceof Error ? err.message : 'Unable to validate invitation.',
      },
      { status: 500 },
    );
  }
}
