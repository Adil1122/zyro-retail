import { NextRequest, NextResponse } from 'next/server';
import {
  ACTIVE_BRANCH_COOKIE,
  ACTIVE_BUSINESS_COOKIE,
  getServerAuthSessionPayload,
  resolveDashboardRouteForMembership,
} from '@/lib/auth/server-context';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSessionPayload();
    if (!session.authenticated) {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHENTICATED', error: 'Sign in required.' },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      businessId?: string;
      branchId?: string;
    } | null;

    if (!body?.businessId) {
      return NextResponse.json(
        { ok: false, code: 'BUSINESS_ID_REQUIRED', error: 'businessId is required.' },
        { status: 400 },
      );
    }

    const membership = session.memberships.find(
      (m) =>
        m.businessId === body.businessId &&
        m.memberStatus === 'active' &&
        m.businessStatus === 'active',
    );

    if (!membership) {
      return NextResponse.json(
        { ok: false, code: 'WORKSPACE_FORBIDDEN', error: 'You do not have active access to that business.' },
        { status: 403 },
      );
    }

    const targetBranch = body.branchId
      ? membership.branches.find((b) => b.id === body.branchId)
      : membership.branches.find((b) => b.id === membership.defaultBranchId) || membership.branches[0];

    if (body.branchId && !targetBranch) {
      return NextResponse.json(
        { ok: false, code: 'BRANCH_FORBIDDEN', error: 'You do not have access to the requested branch.' },
        { status: 403 },
      );
    }

    const redirectTo = resolveDashboardRouteForMembership(membership);
    const response = NextResponse.json(
      {
        ok: true,
        businessId: membership.businessId,
        branchId: targetBranch?.id ?? null,
        membership,
        redirectTo,
      },
      { status: 200 },
    );

    response.cookies.set(ACTIVE_BUSINESS_COOKIE, membership.businessId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    if (targetBranch?.id) {
      response.cookies.set(ACTIVE_BRANCH_COOKIE, targetBranch.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: 'WORKSPACE_SELECT_FAILED',
        error: err instanceof Error ? err.message : 'Unable to switch workspace.',
      },
      { status: 500 },
    );
  }
}
