import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function assertServerRuntime(): void {
  if (typeof window !== 'undefined') {
    throw new Error('Server Supabase client helpers must never be imported or called in browser code.');
  }
}

/**
 * Creates a request-scoped Supabase client forwarding the authenticated user's
 * JWT access token so PostgreSQL RLS policies execute as that user.
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
