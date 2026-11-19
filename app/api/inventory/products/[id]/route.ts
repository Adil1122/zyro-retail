import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import {
  buildVariantName,
  buildVariantSku,
  ensureSizingSystemAttribute,
  fetchHydratedFootwearProducts,
  generateBarcodeValue,
  inferFootwearArt,
} from '@/lib/inventory-server';
import type { Json, TableUpdate } from '@/types/database';
import type { FootwearMetadata, SizingSystem } from '@/types/footwear';

interface UpdateVariantInput {
  id?: string;
  colourName: string;
  sizeName: string;
  sizingSystem?: SizingSystem;
  sku?: string;
  barcode?: string;
  barcodeType?: 'EAN13' | 'EAN8' | 'CODE128' | 'UPC' | 'CUSTOM';
  costPrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  openingStock?: number;
  isActive?: boolean;
}

interface UpdateProductInput {
  name?: string;
  brand?: string | null;
  model?: string | null;
  categoryId?: string | null;
  footwearType?: string;
  gender?: string | null;
  description?: string | null;
  material?: string | null;
  soleMaterial?: string | null;
  upperMaterial?: string | null;
  sizingSystem?: SizingSystem;
  sku?: string;
  baseCostPrice?: number;
  baseSellingPrice?: number;
  reorderLevel?: number;
  isActive?: boolean;
  branchId?: string;
  images?: Array<{ id?: string; storagePath: string; imageUrl?: string | null; isPrimary?: boolean }>;
  variants?: UpdateVariantInput[];
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['inventory.view', 'inventory.manage', 'pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId, branch, branches, membership } = guard.ctx;

  const products = await fetchHydratedFootwearProducts({
    supabase,
    businessId,
    branchId: resolvedBranchId,
    productId: id,
    includeAllBranchStocks: true,
  });

  if (products.length === 0) {
    return NextResponse.json({ error: 'Footwear product not found.' }, { status: 404 });
  }

  return NextResponse.json({
    product: products[0],
    branch,
    branches,
    canManageInventory: membership.permissions.includes('inventory.manage'),
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as UpdateProductInput | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, membership } = guard.ctx;

  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('id, sku, name, category_id, base_cost_price, base_selling_price, is_active, metadata')
    .eq('id', id)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Footwear product not found.' }, { status: 404 });
  }

  const prevMeta = (existing.metadata ?? {}) as FootwearMetadata;
  const sizingSystem: SizingSystem =
    body.sizingSystem === 'UK' || body.sizingSystem === 'US' || body.sizingSystem === 'EU'
      ? body.sizingSystem
      : prevMeta.sizing_system ?? 'EU';
  const footwearType = body.footwearType?.trim() || prevMeta.footwear_type || 'Sneakers';
  const existingSku = existing.sku ?? '';
  const nextSku = (body.sku?.trim() || existingSku).toUpperCase();

  // Check duplicate product SKU if changed
  if (nextSku && nextSku !== existingSku.toUpperCase()) {
    const { data: dup } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
      .ilike('sku', nextSku)
      .neq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ error: `Product SKU "${nextSku}" is already in use.` }, { status: 409 });
    }
  }

  const nextMeta: FootwearMetadata = {
    category_scope: 'footwear',
    model: body.model !== undefined ? body.model?.trim() || null : prevMeta.model ?? null,
    footwear_type: footwearType,
    gender: body.gender !== undefined ? body.gender?.trim() || null : prevMeta.gender ?? null,
    material: body.material !== undefined ? body.material?.trim() || null : prevMeta.material ?? null,
    sole_material:
      body.soleMaterial !== undefined ? body.soleMaterial?.trim() || null : prevMeta.sole_material ?? null,
    upper_material:
      body.upperMaterial !== undefined ? body.upperMaterial?.trim() || null : prevMeta.upper_material ?? null,
    sizing_system: sizingSystem,
    reorder_level: body.reorderLevel !== undefined ? Math.max(0, Number(body.reorderLevel)) : prevMeta.reorder_level ?? 3,
  };

  const productUpdate: TableUpdate<'products'> = {
    sku: nextSku || null,
    metadata: nextMeta as unknown as Json,
    art_id: inferFootwearArt(footwearType),
  };

  if (body.name !== undefined && body.name.trim()) productUpdate.name = body.name.trim();
  if (body.brand !== undefined) productUpdate.brand = body.brand?.trim() || null;
  if (body.categoryId !== undefined) productUpdate.category_id = body.categoryId || null;
  if (body.description !== undefined) productUpdate.description = body.description?.trim() || null;
  if (body.baseCostPrice !== undefined) productUpdate.base_cost_price = Math.max(0, Number(body.baseCostPrice));
  if (body.baseSellingPrice !== undefined) {
    const sp = Number(body.baseSellingPrice);
    if (!Number.isFinite(sp) || sp <= 0) {
      return NextResponse.json({ error: 'Selling price must be greater than 0.' }, { status: 400 });
    }
    productUpdate.base_selling_price = sp;
  }
  if (typeof body.isActive === 'boolean') productUpdate.is_active = body.isActive;

  const { error: updErr } = await supabase
    .from('products')
    .update(productUpdate)
    .eq('id', id)
    .eq('business_id', businessId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  // Sync images if explicitly sent
  if (Array.isArray(body.images)) {
    await supabase.from('product_images').delete().eq('business_id', businessId).eq('product_id', id);
    if (body.images.length > 0) {
      await supabase.from('product_images').insert(
        body.images.map((img, idx) => ({
          business_id: businessId,
          product_id: id,
          storage_path: img.storagePath,
          image_url: img.imageUrl ?? null,
          is_primary: img.isPrimary ?? idx === 0,
          sort_order: idx,
        })),
      );
    }
  }

  // Sync variants if explicitly sent
  if (Array.isArray(body.variants) && body.variants.length > 0) {
    const { data: currentVariants } = await supabase
      .from('product_variants')
      .select('id, sku')
      .eq('business_id', businessId)
      .eq('product_id', id)
      .is('deleted_at', null);

    const existingIds = new Set((currentVariants ?? []).map((v) => v.id));
    const keptIds = new Set<string>();
    const sizingAttrId = await ensureSizingSystemAttribute(supabase, businessId);

    const baseCost = Number(body.baseCostPrice ?? existing.base_cost_price ?? 0);
    const baseSell = Number(body.baseSellingPrice ?? existing.base_selling_price ?? 0);

    for (let idx = 0; idx < body.variants.length; idx++) {
      const v = body.variants[idx];
      const colourName = v.colourName?.trim() || 'Standard';
      const sizeName = v.sizeName?.trim() || '';
      const vSys: SizingSystem =
        v.sizingSystem === 'UK' || v.sizingSystem === 'US' || v.sizingSystem === 'EU'
          ? v.sizingSystem
          : sizingSystem;
      const vSku = (v.sku?.trim() || buildVariantSku(nextSku, colourName, sizeName)).toUpperCase();
      const vName = buildVariantName(colourName, sizeName, vSys);
      const vCost = Math.max(0, Number(v.costPrice ?? baseCost));
      const vSell = Math.max(0, Number(v.sellingPrice ?? baseSell));
      const vReorder = Math.max(0, Number(v.reorderLevel ?? body.reorderLevel ?? 3));

      let variantId: string | null = null;

      if (v.id && existingIds.has(v.id)) {
        keptIds.add(v.id);
        variantId = v.id;
        const { error: vUpdErr } = await supabase
          .from('product_variants')
          .update({
            variant_name: vName,
            sku: vSku,
            colour_name: colourName,
            size_name: sizeName || null,
            cost_price: vCost,
            selling_price: vSell,
            reorder_level: vReorder,
            is_active: v.isActive ?? true,
          })
          .eq('id', v.id)
          .eq('business_id', businessId);

        if (vUpdErr) {
          return NextResponse.json(
            { error: `Variant "${vSku}": ${vUpdErr.message}` },
            { status: vUpdErr.code === '23505' ? 409 : 400 },
          );
        }

        // Update reorder_level on branch stock_levels if row exists
        await supabase
          .from('stock_levels')
          .update({ reorder_level: vReorder })
          .eq('business_id', businessId)
          .eq('branch_id', branchId)
          .eq('variant_id', v.id);
      } else {
        const { data: createdVar, error: vInsErr } = await supabase
          .from('product_variants')
          .insert({
            business_id: businessId,
            product_id: id,
            variant_name: vName,
            sku: vSku,
            colour_name: colourName,
            size_name: sizeName || null,
            cost_price: vCost,
            selling_price: vSell,
            reorder_level: vReorder,
            is_default: idx === 0 && existingIds.size === 0,
            is_active: v.isActive ?? true,
          })
          .select('id')
          .single();

        if (vInsErr || !createdVar) {
          return NextResponse.json(
            { error: `New variant "${vSku}": ${vInsErr?.message || 'Insert failed'}` },
            { status: vInsErr?.code === '23505' ? 409 : 400 },
          );
        }

        variantId = createdVar.id;
        keptIds.add(variantId);

        const opening = Math.max(0, Number(v.openingStock ?? 0));
        await supabase.from('stock_levels').upsert(
          {
            business_id: businessId,
            branch_id: branchId,
            variant_id: variantId,
            quantity_on_hand: opening,
            quantity_reserved: 0,
            reorder_level: vReorder,
            average_cost: vCost,
          },
          { onConflict: 'branch_id,variant_id' },
        );

        if (opening > 0) {
          await supabase.from('stock_movements').insert({
            business_id: businessId,
            branch_id: branchId,
            variant_id: variantId,
            movement_type: 'opening_stock',
            quantity_delta: opening,
            unit_cost: vCost,
            reference_type: 'variant_creation',
            reference_id: variantId,
            reason: 'Opening stock for new variant',
            performed_by: membership.memberId,
          });
        }
      }

      if (variantId && sizingAttrId) {
        await supabase.from('variant_attribute_values').upsert(
          {
            business_id: businessId,
            variant_id: variantId,
            attribute_id: sizingAttrId,
            attribute_value: vSys,
          },
          { onConflict: 'variant_id,attribute_id' },
        );
      }

      // Update primary barcode if provided
      if (variantId && v.barcode?.trim()) {
        const nextBarcode = v.barcode.trim().toUpperCase();
        const { data: existingPrimary } = await supabase
          .from('product_barcodes')
          .select('id, barcode')
          .eq('business_id', businessId)
          .eq('variant_id', variantId)
          .eq('is_primary', true)
          .maybeSingle();

        if (!existingPrimary) {
          const { error: bcErr } = await supabase.from('product_barcodes').insert({
            business_id: businessId,
            variant_id: variantId,
            barcode: nextBarcode,
            barcode_type: v.barcodeType ?? 'CODE128',
            is_primary: true,
          });
          if (bcErr) {
            return NextResponse.json(
              { error: `Barcode "${nextBarcode}" is already in use.` },
              { status: 409 },
            );
          }
        } else if (existingPrimary.barcode.toUpperCase() !== nextBarcode) {
          const { error: bcErr } = await supabase
            .from('product_barcodes')
            .update({ barcode: nextBarcode })
            .eq('id', existingPrimary.id);
          if (bcErr) {
            return NextResponse.json(
              { error: `Barcode "${nextBarcode}" is already in use.` },
              { status: 409 },
            );
          }
        }
      } else if (variantId && !v.id) {
        // Auto-generate barcode for newly added variant
        await supabase.from('product_barcodes').insert({
          business_id: businessId,
          variant_id: variantId,
          barcode: generateBarcodeValue(vSku, idx),
          barcode_type: 'CODE128',
          is_primary: true,
        });
      }
    }

    // Soft-deactivate removed variants (never hard-delete to preserve historical sales snapshots)
    const removedIds = Array.from(existingIds).filter((vid) => !keptIds.has(vid));
    if (removedIds.length > 0) {
      await supabase
        .from('product_variants')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('business_id', businessId)
        .in('id', removedIds);
    }
  }

  const hydrated = await fetchHydratedFootwearProducts({
    supabase,
    businessId,
    branchId,
    productId: id,
    includeAllBranchStocks: true,
  });

  return NextResponse.json({ product: hydrated[0] });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    allPermissions: ['inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId } = guard.ctx;

  // Soft-delete product and variants so historical sale_items stay intact
  const now = new Date().toISOString();
  const [{ error: prodErr }, { error: varErr }] = await Promise.all([
    supabase
      .from('products')
      .update({ is_active: false, deleted_at: now })
      .eq('id', id)
      .eq('business_id', businessId),
    supabase
      .from('product_variants')
      .update({ is_active: false, deleted_at: now })
      .eq('product_id', id)
      .eq('business_id', businessId),
  ]);

  if (prodErr || varErr) {
    return NextResponse.json(
      { error: prodErr?.message || varErr?.message || 'Failed to archive product.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ deleted: true });
}
