import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import type { Json } from '@/types/database';
import {
  type FootwearMetadata,
  type ProductOffer,
} from '@/types/footwear';

interface SaveOfferBody {
  productId?: string;
  minQuantity?: number;
  bundlePrice?: number;
  branchId?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SaveOfferBody | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId } = guard.ctx;

  const productId = body.productId?.trim();
  const minQuantity = Math.floor(Number(body.minQuantity ?? 0));
  const bundlePrice = Math.round(Number(body.bundlePrice ?? 0) * 100) / 100;

  if (!productId) {
    return NextResponse.json({ error: 'Please select a product.' }, { status: 400 });
  }
  if (!Number.isFinite(minQuantity) || minQuantity < 2) {
    return NextResponse.json(
      { error: 'Offer quantity must be at least 2.' },
      { status: 400 },
    );
  }
  if (!Number.isFinite(bundlePrice) || bundlePrice <= 0) {
    return NextResponse.json(
      { error: 'Offer bundle price must be greater than 0.' },
      { status: 400 },
    );
  }

  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, base_selling_price, metadata')
    .eq('id', productId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchErr || !product) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  const basePrice = Number(product.base_selling_price ?? 0);
  const regularBundleTotal = basePrice * minQuantity;
  if (regularBundleTotal > 0 && bundlePrice >= regularBundleTotal) {
    return NextResponse.json(
      {
        error: `Offer price (Rs ${bundlePrice.toLocaleString()}) must be less than the regular price for ${minQuantity} (Rs ${regularBundleTotal.toLocaleString()}).`,
      },
      { status: 400 },
    );
  }

  const prevMeta = (product.metadata ?? {}) as FootwearMetadata;
  const offer: ProductOffer = {
    minQuantity,
    bundlePrice,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  const nextMeta: FootwearMetadata = {
    ...prevMeta,
    offer,
  };

  const { error: updErr } = await supabase
    .from('products')
    .update({ metadata: nextMeta as unknown as Json })
    .eq('id', productId)
    .eq('business_id', businessId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  return NextResponse.json({
    productId,
    productName: product.name,
    offer,
  });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let productId = sp.get('productId')?.trim() || '';
  let branchId = sp.get('branchId')?.trim() || undefined;

  if (!productId) {
    const body = (await req.json().catch(() => null)) as {
      productId?: string;
      branchId?: string;
    } | null;
    productId = body?.productId?.trim() || '';
    branchId = branchId || body?.branchId;
  }

  const guard = await requireWorkspaceContext({
    branchId,
    allPermissions: ['inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  if (!productId) {
    return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
  }

  const { supabase, businessId } = guard.ctx;

  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, metadata')
    .eq('id', productId)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchErr || !product) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  const prevMeta = (product.metadata ?? {}) as FootwearMetadata;
  const nextMeta: FootwearMetadata = {
    ...prevMeta,
    offer: null,
  };

  const { error: updErr } = await supabase
    .from('products')
    .update({ metadata: nextMeta as unknown as Json })
    .eq('id', productId)
    .eq('business_id', businessId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  return NextResponse.json({ removed: true, productId });
}
