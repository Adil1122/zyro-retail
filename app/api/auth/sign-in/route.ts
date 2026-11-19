import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneToE164 } from '@/lib/auth/phone';
import {
  ACTIVE_BRANCH_COOKIE,
  ACTIVE_BUSINESS_COOKIE,
  getServerAuthSessionPayload,
} from '@/lib/auth/server-context';
import { signInWithPhonePasswordFallback } from '@/lib/auth/supabase-phone-signin';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          code: 'SUPABASE_NOT_CONFIGURED',
          error:
            'Supabase credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      identifier?: string;
      phone?: string;
      dialCode?: string;
      password?: string;
      rememberMe?: boolean;
    } | null;

    const rawIdentifier = (body?.identifier ?? body?.phone ?? '').trim();
    const password = body?.password ?? '';

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { ok: false, code: 'CREDENTIALS_REQUIRED', error: 'Mobile number and password are required.' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const isEmail = rawIdentifier.includes('@');

    let signInErrorMessage: string | null = null;
    let signInErrorCode: string | null = null;

    if (isEmail) {
      const { error } = await supabase.auth.signInWithPassword({
        email: rawIdentifier.toLowerCase(),
        password,
      });
      if (error) {
        signInErrorMessage = error.message;
        signInErrorCode = error.code ?? null;
      }
    } else {
      const normalized = normalizePhoneToE164(rawIdentifier, body?.dialCode || '+92');
      if (!normalized.valid || !normalized.e164) {
        return NextResponse.json(
          { ok: false, code: 'INVALID_PHONE', error: normalized.error || 'Enter a valid mobile number.' },
          { status: 400 },
        );
      }

      const { error } = await signInWithPhonePasswordFallback(supabase, normalized.e164, password);
      if (error) {
        signInErrorMessage = error.message;
        signInErrorCode = error.code ?? null;
      }
    }

    if (signInErrorMessage) {
      if (
        signInErrorCode === 'phone_provider_disabled' ||
        /phone logins are disabled/i.test(signInErrorMessage)
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: 'PHONE_PROVIDER_DISABLED',
            error:
              'Phone sign-in is disabled in Supabase. Go to Supabase Dashboard → Authentication → Providers → Phone and turn ON "Enable Phone provider".',
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_CREDENTIALS',
          error: 'That mobile number or password did not match. Check both and try again.',
        },
        { status: 401 },
      );
    }

    const session = await getServerAuthSessionPayload();

    const response = NextResponse.json(
      {
        ok: true,
        session,
        redirectTo: session.recommendedRedirect,
      },
      { status: 200 },
    );

    const maxAge = body?.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;

    if (session.activeBusinessId) {
      response.cookies.set(ACTIVE_BUSINESS_COOKIE, session.activeBusinessId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge,
      });
    }
    if (session.activeBranchId) {
      response.cookies.set(ACTIVE_BRANCH_COOKIE, session.activeBranchId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge,
      });
    }

    return response;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: 'SIGN_IN_FAILED',
        error: err instanceof Error ? err.message : 'Unable to sign in right now.',
      },
      { status: 500 },
    );
  }
}
