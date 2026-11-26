import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneToE164, validatePasswordStrength } from '@/lib/auth/phone';
import {
  ACTIVE_BRANCH_COOKIE,
  ACTIVE_BUSINESS_COOKIE,
  getServerAuthSessionPayload,
  resolveDashboardRouteForMembership,
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
import {
  findLatestInvitationByPhone,
  validateInvitationByRawToken,
} from '@/features/auth/services/invitation.service';
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
      invitationToken?: string;
      phone?: string;
      dialCode?: string;
      fullName?: string;
      password?: string;
      confirmPassword?: string;
      verificationToken?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, code: 'INVALID_BODY', error: 'Invalid request payload.' }, { status: 400 });
    }

    // 1. Resolve the trusted invitation record from the database (never trust client-supplied role or branch!)
    const invitation = body.invitationToken
      ? await validateInvitationByRawToken(body.invitationToken)
      : await findLatestInvitationByPhone(body.phone || '', body.dialCode || '+92');

    if (!invitation.valid || !invitation.invitationId || !invitation.invitedPhoneE164) {
      return NextResponse.json(
        {
          ok: false,
          code: `INVITATION_${invitation.status.toUpperCase()}`,
          error: invitation.message || 'This invitation is no longer valid.',
          invitationStatus: invitation.status,
        },
        { status: 400 },
      );
    }

    const invitedPhoneE164 = invitation.invitedPhoneE164;

    // If caller supplied a phone explicitly, verify it matches the invitation's phone
    if (body.phone) {
      const normalized = normalizePhoneToE164(body.phone, body.dialCode || '+92');
      if (!normalized.valid || normalized.e164 !== invitedPhoneE164) {
        return NextResponse.json(
          {
            ok: false,
            code: 'PHONE_MISMATCH',
            error: 'The mobile number must match the number invited by the shop owner.',
          },
          { status: 400 },
        );
      }
    }

    const password = body.password || '';
    const confirmPassword = body.confirmPassword ?? password;

    if (password !== confirmPassword) {
      return NextResponse.json(
        { ok: false, code: 'PASSWORD_MISMATCH', error: 'Password and confirm password do not match.' },
        { status: 400 },
      );
    }

    const pwCheck = validatePasswordStrength(password, invitedPhoneE164);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { ok: false, code: 'WEAK_PASSWORD', error: pwCheck.errors[0] || 'Choose a stronger password.' },
        { status: 400 },
      );
    }

    // 2. Verify server-side OTP proof token for the invited mobile number
    const otpService = new OtpService();
    const verifiedChallenge = await otpService.assertAndConsumeVerifiedToken({
      verificationToken: body.verificationToken || '',
      phoneE164: invitedPhoneE164,
      purpose: 'staff_invite',
      consumeNow: false,
    });

    const fullName = (body.fullName || invitation.invitedName || '').trim();
    const admin = createSupabaseServiceClient();

    // 3. Check if this verified phone already belongs to a Supabase user (multi-business staff member)
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('phone', invitedPhoneE164)
      .maybeSingle();

    let targetUserId: string;
    if (existingProfile?.id) {
      targetUserId = existingProfile.id;
      // Since the user proved ownership of invitedPhoneE164 via fresh OTP, update their password so sign-in succeeds cleanly
      const { error: updatePwErr } = await admin.auth.admin.updateUserById(targetUserId, {
        password,
        phone_confirm: true,
      });
      if (updatePwErr) {
        return NextResponse.json(
          { ok: false, code: 'AUTH_UPDATE_FAILED', error: updatePwErr.message },
          { status: 500 },
        );
      }
    } else {
      const { data: createdUserData, error: createUserError } = await admin.auth.admin.createUser({
        phone: invitedPhoneE164,
        password,
        phone_confirm: true,
        email: phoneToInternalAuthEmail(invitedPhoneE164),
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: invitedPhoneE164,
        },
      });

      if (createUserError || !createdUserData?.user) {
        return NextResponse.json(
          {
            ok: false,
            code: 'AUTH_USER_CREATE_FAILED',
            error: createUserError?.message || 'Unable to create employee account.',
          },
          { status: 500 },
        );
      }

      targetUserId = createdUserData.user.id;
      createdAuthUserId = targetUserId;
    }

    // 4. Atomically accept invitation & assign trusted DB role + branch via PostgreSQL RPC
    const { data: acceptResult, error: rpcError } = await admin.rpc('accept_business_invitation_for_user', {
      p_user_id: targetUserId,
      p_invitation_id: invitation.invitationId,
      p_full_name: fullName,
      p_phone_e164: invitedPhoneE164,
    });

    if (rpcError || !acceptResult) {
      if (createdAuthUserId) {
        await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
        createdAuthUserId = null;
      }

      return NextResponse.json(
        {
          ok: false,
          code: 'INVITATION_ACCEPT_FAILED',
          error: rpcError?.message || 'Unable to activate business membership.',
        },
        { status: 400 },
      );
    }

    // 5. Consume verified OTP challenge
    await otpService.markConsumed(verifiedChallenge.id);

    // 6. Sign in the activated employee with cookie-backed Supabase session
    const serverClient = await createSupabaseServerClient();
    const { error: signInError } = await signInWithPhonePasswordFallback(serverClient, invitedPhoneE164, password);

    const accepted = acceptResult as {
      business_id?: string;
      branch_id?: string;
      member_id?: string;
      role_id?: string;
      role_name?: string;
    };

    const sessionPayload = signInError ? null : await getServerAuthSessionPayload();
    const activeMembership =
      sessionPayload?.memberships.find((m) => m.businessId === accepted.business_id) ||
      sessionPayload?.activeMembership ||
      null;

    const redirectTo = activeMembership
      ? resolveDashboardRouteForMembership(activeMembership)
      : accepted.role_name === 'inventory'
        ? '/stockkeeper/home'
        : accepted.role_name === 'owner'
          ? '/home'
          : '/cashier/home';

    const response = NextResponse.json(
      {
        ok: true,
        userId: targetUserId,
        membership: {
          businessId: accepted.business_id,
          branchId: accepted.branch_id,
          memberId: accepted.member_id,
          roleId: accepted.role_id,
          roleName: accepted.role_name,
        },
        signedIn: !signInError,
        session: sessionPayload,
        redirectTo,
      },
      { status: 201 },
    );

    if (accepted.business_id) {
      response.cookies.set(ACTIVE_BUSINESS_COOKIE, accepted.business_id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (accepted.branch_id) {
      response.cookies.set(ACTIVE_BRANCH_COOKIE, accepted.branch_id, {
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
        code: 'INVITED_REGISTRATION_FAILED',
        error: err instanceof Error ? err.message : 'Unable to complete invited registration.',
      },
      { status: 500 },
    );
  }
}
