import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneToE164, validatePasswordStrength } from '@/lib/auth/phone';
import {
  ACTIVE_BRANCH_COOKIE,
  ACTIVE_BUSINESS_COOKIE,
  getServerAuthSessionPayload,
} from '@/lib/auth/server-context';
import {
  phoneToInternalAuthEmail,
  signInWithPhonePasswordFallback,
} from '@/lib/auth/supabase-phone-signin';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/server';
import { OtpService, OtpServiceError } from '@/features/auth/services/otp.service';

export async function POST(req: NextRequest) {
  let createdAuthUserId: string | null = null;

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
      fullName?: string;
      phone?: string;
      dialCode?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      acceptedTerms?: boolean;
      verificationToken?: string;
      businessName?: string;
      businessPhone?: string;
      businessType?: string;
      country?: string;
      currency?: string;
      timezone?: string;
      branchName?: string;
      city?: string;
      address?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, code: 'INVALID_BODY', error: 'Invalid request payload.' }, { status: 400 });
    }

    const fullName = (body.fullName || '').trim();
    const businessName = (body.businessName || '').trim();
    const password = body.password || '';
    const confirmPassword = body.confirmPassword ?? password;

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ ok: false, code: 'INVALID_NAME', error: 'Full name is required.' }, { status: 400 });
    }

    if (!businessName || businessName.length < 2) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_BUSINESS_NAME', error: 'Business name is required.' },
        { status: 400 },
      );
    }

    if (body.acceptedTerms === false) {
      return NextResponse.json(
        { ok: false, code: 'TERMS_REQUIRED', error: 'You must accept the terms of use and privacy policy.' },
        { status: 400 },
      );
    }

    const normalized = normalizePhoneToE164(body.phone || '', body.dialCode || '+92');
    if (!normalized.valid || !normalized.e164) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_PHONE', error: normalized.error || 'Invalid mobile number.' },
        { status: 400 },
      );
    }
    const phoneE164 = normalized.e164;

    if (password !== confirmPassword) {
      return NextResponse.json(
        { ok: false, code: 'PASSWORD_MISMATCH', error: 'Password and confirm password do not match.' },
        { status: 400 },
      );
    }

    const pwCheck = validatePasswordStrength(password, phoneE164);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { ok: false, code: 'WEAK_PASSWORD', error: pwCheck.errors[0] || 'Password does not meet security rules.' },
        { status: 400 },
      );
    }

    // 1. Validate verified OTP proof token BEFORE creating Auth user (do not consume until transaction succeeds)
    const otpService = new OtpService();
    const verifiedChallenge = await otpService.assertAndConsumeVerifiedToken({
      verificationToken: body.verificationToken || '',
      phoneE164,
      purpose: 'owner_register',
      consumeNow: false,
    });

    const admin = createSupabaseServiceClient();

    // 2. Prevent duplicate phone registration
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

    // 3. Create Supabase Auth user with phone_confirm: true (ONLY because OTP was verified server-side)
    const cleanEmail = body.email?.trim() ? body.email.trim().toLowerCase() : undefined;
    const authEmail = cleanEmail || phoneToInternalAuthEmail(phoneE164);
    const { data: createdUserData, error: createUserError } = await admin.auth.admin.createUser({
      phone: phoneE164,
      password,
      phone_confirm: true,
      email: authEmail,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phoneE164,
      },
    });

    if (createUserError || !createdUserData?.user) {
      const msg = createUserError?.message || 'Unable to create authentication account.';
      const isDuplicate = /already|exists|duplicate|registered/i.test(msg);
      return NextResponse.json(
        {
          ok: false,
          code: isDuplicate ? 'PHONE_ALREADY_REGISTERED' : 'AUTH_USER_CREATE_FAILED',
          error: isDuplicate
            ? 'This mobile number or email already has a Zyro account. Sign in instead.'
            : msg,
        },
        { status: isDuplicate ? 409 : 500 },
      );
    }

    createdAuthUserId = createdUserData.user.id;

    // 4. Atomically provision user_profiles, businesses, branches, system roles, owner membership, branch access, settings & audit log
    // NOTE: Role is NEVER accepted from the client; provision_owner_workspace_for_user always assigns the business's system 'owner' role.
    const businessPhoneNormalized = body.businessPhone?.trim()
      ? normalizePhoneToE164(body.businessPhone, body.dialCode || '+92').e164 || phoneE164
      : phoneE164;

    const { data: workspaceResult, error: rpcError } = await admin.rpc('provision_owner_workspace_for_user', {
      p_user_id: createdAuthUserId,
      p_payload: {
        full_name: fullName,
        phone: phoneE164,
        shop_name: businessName,
        business_phone: businessPhoneNormalized,
        email: cleanEmail ?? null,
        currency: (body.currency || 'PKR').toUpperCase(),
        timezone: body.timezone || 'Asia/Karachi',
        shop_kit: body.businessType || 'clothing',
        branch_name: (body.branchName || 'Main branch').trim() || 'Main branch',
        city: body.city?.trim() || null,
        address: body.address?.trim() || null,
      },
    });

    if (rpcError || !workspaceResult) {
      // Roll back Auth user so no orphaned Auth record remains
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
      createdAuthUserId = null;

      return NextResponse.json(
        {
          ok: false,
          code: 'WORKSPACE_PROVISION_FAILED',
          error: rpcError?.message || 'Failed to provision business workspace. No account was created.',
        },
        { status: 500 },
      );
    }

    // 5. Consume the OTP verification token so it cannot be replayed
    await otpService.markConsumed(verifiedChallenge.id);

    // 6. Establish real Supabase cookie-backed session for the newly created Owner
    const serverClient = await createSupabaseServerClient();
    const { error: signInError } = await signInWithPhonePasswordFallback(serverClient, phoneE164, password);

    const provisioned = workspaceResult as {
      business_id?: string;
      branch_id?: string;
      member_id?: string;
      role_id?: string;
    };

    const sessionPayload = signInError ? null : await getServerAuthSessionPayload();

    const response = NextResponse.json(
      {
        ok: true,
        userId: createdAuthUserId,
        workspace: {
          businessId: provisioned.business_id,
          branchId: provisioned.branch_id,
          memberId: provisioned.member_id,
          roleId: provisioned.role_id,
        },
        signedIn: !signInError,
        session: sessionPayload,
        redirectTo: '/home',
      },
      { status: 201 },
    );

    if (provisioned.business_id) {
      response.cookies.set(ACTIVE_BUSINESS_COOKIE, provisioned.business_id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (provisioned.branch_id) {
      response.cookies.set(ACTIVE_BRANCH_COOKIE, provisioned.branch_id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err) {
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseServiceClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        // best-effort rollback
      }
    }

    if (err instanceof OtpServiceError) {
      return NextResponse.json(
        { ok: false, code: err.code, error: err.message, ...(err.meta ?? {}) },
        { status: err.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: 'OWNER_REGISTRATION_FAILED',
        error: err instanceof Error ? err.message : 'Unable to complete owner registration.',
      },
      { status: 500 },
    );
  }
}
