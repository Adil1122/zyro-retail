import type { Json, TableInsert, TableRow } from '@/types/database';
import type { ZyroSupabaseClient } from './business.service';

export interface CompleteSaleItemInput {
  variant_id: string;
  batch_id?: string | null;
  serial_number_id?: string | null;
  quantity: number;
  unit_price?: number;
  original_unit_price?: number;
  line_discount_amount?: number;
  note?: string;
}

export interface CompleteSalePaymentInput {
  method_code: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'khata' | 'other';
  amount: number;
  tendered_amount?: number;
  reference_no?: string;
}

export interface CompleteSaleInput {
  business_id: string;
  branch_id: string;
  device_id?: string | null;
  shift_id?: string | null;
  customer_id?: string | null;
  client_sync_id?: string | null;
  offline_pending?: boolean;
  discount_amount?: number;
  tax_amount?: number;
  discount_payload?: { mode: 'pct' | 'rs'; value: number; reason?: string } | null;
  notes?: string;
  sold_at?: string;
  items: CompleteSaleItemInput[];
  payments: CompleteSalePaymentInput[];
}

export async function completeSale(
  client: ZyroSupabaseClient,
  payload: CompleteSaleInput,
): Promise<Json> {
  const { data, error } = await client.rpc('complete_sale', {
    p_payload: payload as unknown as Json,
  });

  if (error) throw error;
  return data;
}

export async function listBranchSales(
  client: ZyroSupabaseClient,
  branchId: string,
  limit = 100,
) {
  const { data, error } = await client
    .from('sales')
    .select(
      `
      *,
      sale_items(*),
      sale_payments(*),
      customers(id, full_name, phone)
    `,
    )
    .eq('branch_id', branchId)
    .order('sold_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function listHeldBills(
  client: ZyroSupabaseClient,
  branchId: string,
): Promise<TableRow<'held_bills'>[]> {
  const { data, error } = await client
    .from('held_bills')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'held')
    .order('held_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function holdBill(
  client: ZyroSupabaseClient,
  bill: TableInsert<'held_bills'>,
): Promise<TableRow<'held_bills'>> {
  const { data, error } = await client
    .from('held_bills')
    .insert(bill)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateHeldBillStatus(
  client: ZyroSupabaseClient,
  heldBillId: string,
  status: 'resumed' | 'discarded' | 'expired',
): Promise<void> {
  const { error } = await client
    .from('held_bills')
    .update({
      status,
      resumed_at: status === 'resumed' ? new Date().toISOString() : null,
    })
    .eq('id', heldBillId);

  if (error) throw error;
}

export async function updatePrintJobStatus(
  client: ZyroSupabaseClient,
  printJobId: string,
  status: TableRow<'print_jobs'>['status'],
  errorMessage?: string,
): Promise<void> {
  const { error } = await client
    .from('print_jobs')
    .update({
      status,
      error_message: errorMessage ?? null,
      completed_at: status === 'printed' ? new Date().toISOString() : null,
    })
    .eq('id', printJobId);

  if (error) throw error;
}
