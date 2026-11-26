import type { Json, TableInsert, TableRow, TableUpdate } from '@/types/database';
import type { ZyroSupabaseClient } from './business.service';

export async function listCategories(
  client: ZyroSupabaseClient,
  businessId: string,
): Promise<TableRow<'categories'>[]> {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('sort_order')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function saveCategory(
  client: ZyroSupabaseClient,
  category: TableInsert<'categories'>,
): Promise<TableRow<'categories'>> {
  const { data, error } = await client
    .from('categories')
    .upsert(category, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listProductsWithVariants(
  client: ZyroSupabaseClient,
  businessId: string,
) {
  const { data, error } = await client
    .from('products')
    .select(
      `
      *,
      product_variants(*, product_barcodes(*)),
      product_images(*)
    `,
    )
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function createProductWithDefaultVariant(
  client: ZyroSupabaseClient,
  product: TableInsert<'products'>,
  variantOverrides?: Partial<TableInsert<'product_variants'>>,
): Promise<{
  product: TableRow<'products'>;
  variant: TableRow<'product_variants'>;
}> {
  const { data: createdProduct, error: prodErr } = await client
    .from('products')
    .insert(product)
    .select('*')
    .single();

  if (prodErr) throw prodErr;

  const { data: createdVariant, error: varErr } = await client
    .from('product_variants')
    .insert({
      business_id: product.business_id,
      product_id: createdProduct.id,
      sku: variantOverrides?.sku ?? createdProduct.sku,
      variant_name: variantOverrides?.variant_name ?? 'Standard',
      colour_name: variantOverrides?.colour_name ?? null,
      size_name: variantOverrides?.size_name ?? null,
      shade_name: variantOverrides?.shade_name ?? null,
      cost_price: variantOverrides?.cost_price ?? createdProduct.base_cost_price,
      selling_price: variantOverrides?.selling_price ?? createdProduct.base_selling_price,
      reorder_level: variantOverrides?.reorder_level ?? 0,
      is_default: true,
    })
    .select('*')
    .single();

  if (varErr) throw varErr;
  return { product: createdProduct, variant: createdVariant };
}

export async function findVariantByBarcode(
  client: ZyroSupabaseClient,
  businessId: string,
  barcode: string,
) {
  const { data, error } = await client
    .from('product_barcodes')
    .select('*, product_variants(*, products(*))')
    .eq('business_id', businessId)
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listBranchStockValuation(
  client: ZyroSupabaseClient,
  businessId: string,
  branchId: string,
): Promise<DatabaseStockValuationRow[]> {
  const { data, error } = await client
    .from('v_stock_valuation')
    .select('*')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .order('product_name');

  if (error) throw error;
  return data ?? [];
}

type DatabaseStockValuationRow = {
  business_id: string;
  branch_id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  sku: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_qty: number;
  average_cost: number;
  selling_price: number;
  stock_cost_value: number;
  stock_retail_value: number;
};

export async function recordStockMovementAndAdjust(
  client: ZyroSupabaseClient,
  input: {
    businessId: string;
    branchId: string;
    variantId: string;
    batchId?: string | null;
    delta: number;
    movementType: TableInsert<'stock_movements'>['movement_type'];
    reason: string;
    performedBy?: string | null;
  },
): Promise<void> {
  const { data: current, error: fetchErr } = await client
    .from('stock_levels')
    .select('*')
    .eq('branch_id', input.branchId)
    .eq('variant_id', input.variantId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  const nextQty = Number(current?.quantity_on_hand ?? 0) + input.delta;
  if (nextQty < 0) {
    throw new Error('Stock adjustment would cause negative branch stock.');
  }

  const upsertPayload: TableInsert<'stock_levels'> = {
    business_id: input.businessId,
    branch_id: input.branchId,
    variant_id: input.variantId,
    quantity_on_hand: nextQty,
    average_cost: current?.average_cost ?? 0,
  };

  const { error: stockErr } = await client
    .from('stock_levels')
    .upsert(upsertPayload, { onConflict: 'branch_id,variant_id' });
  if (stockErr) throw stockErr;

  const { error: moveErr } = await client.from('stock_movements').insert({
    business_id: input.businessId,
    branch_id: input.branchId,
    variant_id: input.variantId,
    batch_id: input.batchId ?? null,
    movement_type: input.movementType,
    quantity_delta: input.delta,
    unit_cost: current?.average_cost ?? 0,
    reason: input.reason,
    performed_by: input.performedBy ?? null,
  });
  if (moveErr) throw moveErr;
}

export async function updateProduct(
  client: ZyroSupabaseClient,
  productId: string,
  patch: TableUpdate<'products'>,
): Promise<TableRow<'products'>> {
  const { data, error } = await client
    .from('products')
    .update(patch)
    .eq('id', productId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function transferStock(
  client: ZyroSupabaseClient,
  payload: {
    business_id: string;
    from_branch_id: string;
    to_branch_id: string;
    transfer_number: string;
    notes?: string;
    items: Array<{ variant_id: string; batch_id?: string | null; quantity: number }>;
  },
): Promise<Json> {
  const { data, error } = await client.rpc('transfer_stock', {
    p_payload: payload as unknown as Json,
  });
  if (error) throw error;
  return data;
}
