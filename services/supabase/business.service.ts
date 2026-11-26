import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TableInsert, TableRow } from '@/types/database';

export type ZyroSupabaseClient = SupabaseClient<Database>;

export interface BusinessContext {
  business: TableRow<'businesses'>;
  member: TableRow<'business_members'>;
  role: TableRow<'roles'>;
  permissions: string[];
  branches: TableRow<'branches'>[];
}

export async function getUserProfile(
  client: ZyroSupabaseClient,
  userId: string,
): Promise<TableRow<'user_profiles'> | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(
  client: ZyroSupabaseClient,
  profile: TableInsert<'user_profiles'>,
): Promise<TableRow<'user_profiles'>> {
  const { data, error } = await client
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createBusinessWithMainBranch(
  client: ZyroSupabaseClient,
  input: {
    ownerName?: string;
    shopName: string;
    phone: string;
    shopKit: TableInsert<'businesses'>['shop_kit'];
    mainBranchName: string;
    city?: string;
    address?: string;
  },
): Promise<{
  businessId: string;
  branchId: string;
  memberId: string;
  cashDrawerId: string;
}> {
  const { data, error } = await client.rpc('create_business_workspace', {
    p_payload: {
      owner_name: input.ownerName ?? 'Shop Owner',
      shop_name: input.shopName,
      phone: input.phone,
      shop_kit: input.shopKit ?? 'clothing',
      main_branch_name: input.mainBranchName,
      city: input.city ?? null,
      address: input.address ?? null,
    },
  });

  if (error) throw error;
  const result = data as Record<string, string>;
  return {
    businessId: result.business_id,
    branchId: result.branch_id,
    memberId: result.member_id,
    cashDrawerId: result.cash_drawer_id,
  };
}

export async function listBusinessBranches(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'branches'>[]> {
  const { data, error } = await client
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('is_main', { ascending: false })
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function registerPosDevice(
  client: ZyroSupabaseClient,
  input: TableInsert<'pos_devices'>,
): Promise<TableRow<'pos_devices'>> {
  const { data, error } = await client
    .from('pos_devices')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function startDeviceSession(
  client: ZyroSupabaseClient,
  input: TableInsert<'device_sessions'>,
): Promise<TableRow<'device_sessions'>> {
  const { data, error } = await client
    .from('device_sessions')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
