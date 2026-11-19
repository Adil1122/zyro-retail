import { NextResponse } from 'next/server';
import { getServerAuthSessionPayload } from '@/lib/auth/server-context';

export async function GET() {
  try {
    const payload = await getServerAuthSessionPayload();
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        authenticated: false,
        configured: false,
        user: null,
        memberships: [],
        activeBusinessId: null,
        activeBranchId: null,
        activeMembership: null,
        accountStatus: 'unauthenticated',
        recommendedRedirect: '/welcome',
        error: err instanceof Error ? err.message : 'Failed to load session.',
      },
      { status: 500 },
    );
  }
}
