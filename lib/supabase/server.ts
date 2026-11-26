import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

function assertServerRuntime(): void {
  if (typeof window !== 'undefined') {
    throw new Error('Server Supabase client helpers must never be imported or called in browser code.');
  }
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT_REF'),
  );
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    isSupabaseServerConfigured() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('YOUR_SUPABASE_SERVICE_ROLE_KEY'),
  );
}

/**
 * Creates a cookie-backed Next.js App Router Supabase server client for
 * Route Handlers and Server Components. RLS executes as the authenticated user.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  assertServerRuntime();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate cookies directly; middleware handles refresh.
        }
      },
    },
  });
}

/**
 * Creates a request-scoped Supabase client forwarding an explicit user JWT access token.
 */
export function createSupabaseUserServerClient(accessToken: string): SupabaseClient<Database> {
  assertServerRuntime();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.',
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Creates a privileged server-only Supabase admin client using SUPABASE_SERVICE_ROLE_KEY.
 * Use strictly inside trusted API routes / background jobs (never in client bundles).
 */
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  assertServerRuntime();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY server environment variables.',
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
