import { NextResponse } from 'next/server';
import { ACTIVE_BRANCH_COOKIE, ACTIVE_BUSINESS_COOKIE } from '@/lib/auth/server-context';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST() {
  try {
    if (isSupabaseServerConfigured()) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set(ACTIVE_BUSINESS_COOKIE, '', { path: '/', maxAge: 0 });
    response.cookies.set(ACTIVE_BRANCH_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unable to sign out.' },
      { status: 500 },
    );
  }
}
