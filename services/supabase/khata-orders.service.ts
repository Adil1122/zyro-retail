import type { Json, TableInsert, TableRow } from '@/types/database';
import type { ZyroSupabaseClient } from './business.service';

export async function listCustomers(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'customers'>[]> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('full_name');

  if (error) throw error;
  return data ?? [];
}

export async function createCustomer(
  client: ZyroSupabaseClient,
  customer: TableInsert<'customers'>,
): Promise<TableRow<'customers'>> {
  const { data, error } = await client
    .from('customers')
    .insert(customer)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listCustomerKhataLedger(
  client: ZyroSupabaseClient,
  customerId: string,
): Promise<TableRow<'customer_ledger'>[]> {
  const { data, error } = await client
    .from('customer_ledger')
    .select('*')
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function collectKhataPayment(
  client: ZyroSupabaseClient,
  payload: {
    business_id: string;
    branch_id: string;
    customer_id: string;
    shift_id?: string | null;
    payment_number: string;
    method_code: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'other';
    amount: number;
    reference_no?: string;
    notes?: string;
    debit_ledger_ids?: string[];
  },
): Promise<Json> {
  const { data, error } = await client.rpc('collect_khata_payment', {
    p_payload: payload as unknown as Json,
  });

  if (error) throw error;
  return data;
}

export async function listCustomerOrders(
  client: ZyroSupabaseClient,
  branchId: string,
) {
  const { data, error } = await client
    .from('customer_orders')
    .select(
      `
      *,
      customer_order_items(*),
      shipments(*)
    `,
    )
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateCustomerOrderStatus(
  client: ZyroSupabaseClient,
  orderId: string,
  status: TableRow<'customer_orders'>['status'],
  businessId: string,
  actorMemberId?: string | null,
): Promise<void> {
  const { error: orderErr } = await client
    .from('customer_orders')
    .update({
      status,
      confirmed_by: status === 'confirmed' ? actorMemberId ?? null : undefined,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : undefined,
    })
    .eq('id', orderId);

  if (orderErr) throw orderErr;

  const { error: eventErr } = await client.from('order_events').insert({
    business_id: businessId,
    order_id: orderId,
    event_type: `status.${status}`,
    actor_member_id: actorMemberId ?? null,
    payload: { status },
  });

  if (eventErr) throw eventErr;
}
