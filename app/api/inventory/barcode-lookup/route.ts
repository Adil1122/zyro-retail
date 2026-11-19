import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import { fetchHydratedFootwearProducts } from '@/lib/inventory-server';

/**
 * Resolves an exact footwear variant by barcode (public.product_barcodes)
 * or exact SKU (public.product_variants.sku) for the authenticated business & branch.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim() || '';
  const branchId = req.nextUrl.searchParams.get('branchId');

  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['pos.sell', 'inventory.view', 'inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  if (!code) {
    return NextResponse.json({ error: 'Barcode or SKU code is required.' }, { status: 400 });
  }

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;

  // 1. Exact barcode match in product_barcodes
  let matchedVariantId: string | null = null;
  let matchedProductId: string | null = null;

  const { data: barcodeRow } = await supabase
    .from('product_barcodes')
    .select('variant_id, barcode, product_variants!inner(id, product_id, deleted_at)')
    .eq('business_id', businessId)
    .ilike('barcode', code)
    .maybeSingle();

  if (barcodeRow?.variant_id) {
    const pv = barcodeRow.product_variants as unknown as {
      id: string;
      product_id: string;
      deleted_at: string | null;
    };
    if (!pv.deleted_at) {
      matchedVariantId = pv.id;
      matchedProductId = pv.product_id;
    }
  }

  // 2. Fallback: exact variant SKU match
  if (!matchedVariantId) {
    const { data: variantRow } = await supabase
      .from('product_variants')
      .select('id, product_id')
      .eq('business_id', businessId)
      .ilike('sku', code)
      .is('deleted_at', null)
      .maybeSingle();

    if (variantRow) {
      matchedVariantId = variantRow.id;
      matchedProductId = variantRow.product_id;
    }
  }

  if (!matchedVariantId || !matchedProductId) {
    return NextResponse.json(
      { found: false, error: `No footwear variant matches barcode or SKU "${code}".` },
      { status: 404 },
    );
  }

  const products = await fetchHydratedFootwearProducts({
    supabase,
    businessId,
    branchId: resolvedBranchId,
    productId: matchedProductId,
  });

  const product = products[0];
  const variant = product?.variants.find((v) => v.id === matchedVariantId);

  if (!product || !variant) {
    return NextResponse.json(
      { found: false, error: `Variant for "${code}" is no longer available.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    found: true,
    product,
    variant,
    branchId: resolvedBranchId,
  });
}
