import type { Json, TableInsert, TableRow } from '@/types/database';
import type { ZyroSupabaseClient } from './business.service';

export async function listCashShifts(
  client: ZyroSupabaseClient,
  branchId: string,
): Promise<TableRow<'cash_shifts'>[]> {
  const { data, error } = await client
    .from('cash_shifts')
    .select('*')
    .eq('branch_id', branchId)
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function openCashShift(
  client: ZyroSupabaseClient,
  shift: TableInsert<'cash_shifts'>,
): Promise<TableRow<'cash_shifts'>> {
  const { data, error } = await client
    .from('cash_shifts')
    .insert(shift)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function closeCashShift(
  client: ZyroSupabaseClient,
  payload: {
    business_id: string;
    branch_id: string;
    cash_shift_id: string;
    counted_cash: number;
    variance_reason?: string;
  },
): Promise<Json> {
  const { data, error } = await client.rpc('close_cash_shift', {
    p_payload: payload as unknown as Json,
  });

  if (error) throw error;
  return data;
}

export async function listCashTransactions(
  client: ZyroSupabaseClient,
  branchId: string,
  status?: TableRow<'cash_transactions'>['status'],
): Promise<TableRow<'cash_transactions'>[]> {
  let query = client
    .from('cash_transactions')
    .select('*')
    .eq('branch_id', branchId)
    .order('occurred_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listExpenses(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'expenses'>[]> {
  const { data, error } = await client
    .from('expenses')
    .select('*')
    .eq('business_id', businessId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listEmployees(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'employee_records'>[]> {
  const { data, error } = await client
    .from('employee_records')
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('full_name');

  if (error) throw error;
  return data ?? [];
}

export async function getDailyBranchSalesSummary(
  client: ZyroSupabaseClient,
  businessId: string,
  branchId: string,
  fromDate: string,
  toDate: string,
) {
  const { data, error } = await client
    .from('v_daily_branch_sales')
    .select('*')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .gte('business_date', fromDate)
    .lte('business_date', toDate)
    .order('business_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBusinessSettings(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'business_settings'> | null> {
  const { data, error } = await client
    .from('business_settings')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function enqueueOfflineSyncOperation(
  client: ZyroSupabaseClient,
  op: TableInsert<'sync_operations'>,
): Promise<TableRow<'sync_operations'>> {
  const { data, error } = await client
    .from('sync_operations')
    .upsert(op, { onConflict: 'business_id,device_id,idempotency_key' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
