import type { Json, TableInsert, TableRow } from '@/types/database';
import type { ZyroSupabaseClient } from './business.service';

export async function listSuppliers(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'suppliers'>[]> {
  const { data, error } = await client
    .from('suppliers')
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function listPurchaseOrders(
  client: ZyroSupabaseClient,
  businessId: string,
) {
  const { data, error } = await client
    .from('purchase_orders')
    .select(
      `
      *,
      suppliers(id, name, city, phone),
      purchase_order_items(*)
    `,
    )
    .eq('business_id', businessId)
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function receivePurchaseOrder(
  client: ZyroSupabaseClient,
  payload: {
    business_id: string;
    branch_id: string;
    purchase_order_id: string;
    grn_number: string;
    notes?: string;
    create_draft_bill?: boolean;
    bill_ref?: string;
    items: Array<{
      purchase_order_item_id?: string | null;
      variant_id: string;
      quantity_received: number;
      actual_unit_cost: number;
      batch_number?: string | null;
      expiry_date?: string | null;
    }>;
  },
): Promise<Json> {
  const { data, error } = await client.rpc('receive_purchase_order', {
    p_payload: payload as unknown as Json,
  });

  if (error) throw error;
  return data;
}

export async function listSupplierBills(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'supplier_bills'>[]> {
  const { data, error } = await client
    .from('supplier_bills')
    .select('*')
    .eq('business_id', businessId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createSupplierBill(
  client: ZyroSupabaseClient,
  bill: TableInsert<'supplier_bills'>,
): Promise<TableRow<'supplier_bills'>> {
  const { data, error } = await client
    .from('supplier_bills')
    .insert(bill)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function processSalesReturn(
  client: ZyroSupabaseClient,
  payload: {
    business_id: string;
    branch_id: string;
    original_sale_id?: string | null;
    customer_id?: string | null;
    return_type?: 'with_bill' | 'without_bill';
    return_number: string;
    reason?: string;
    items: Array<{
      original_sale_item_id?: string | null;
      variant_id: string;
      batch_id?: string | null;
      quantity: number;
      unit_price: number;
      condition?: 'resellable' | 'damaged' | 'expired';
      restocked?: boolean;
    }>;
  },
): Promise<Json> {
  const { data, error } = await client.rpc('process_sales_return', {
    p_payload: payload as unknown as Json,
  });

  if (error) throw error;
  return data;
}

export async function issueRefund(
  client: ZyroSupabaseClient,
  payload: {
    business_id: string;
    branch_id: string;
    refund_id: string;
    shift_id?: string | null;
    method_code: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'khata_credit';
    amount: number;
    reference_no?: string;
  },
): Promise<Json> {
  const { data, error } = await client.rpc('issue_refund', {
    p_payload: payload as unknown as Json,
  });

  if (error) throw error;
  return data;
}
