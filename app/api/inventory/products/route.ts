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
import type { Json, TableInsert } from '@/types/database';
import type { FootwearMetadata, SizingSystem } from '@/types/footwear';

interface CreateVariantInput {
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

interface CreateProductInput {
  name?: string;
  brand?: string;
  model?: string;
  categoryId?: string | null;
  footwearType?: string;
  gender?: string;
  description?: string;
  material?: string;
  soleMaterial?: string;
  upperMaterial?: string;
  sizingSystem?: SizingSystem;
  sku?: string;
  baseCostPrice?: number;
  baseSellingPrice?: number;
  reorderLevel?: number;
  isActive?: boolean;
  branchId?: string;
  images?: Array<{ storagePath: string; imageUrl?: string | null; isPrimary?: boolean }>;
  variants?: CreateVariantInput[];
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const branchId = sp.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['inventory.view', 'inventory.manage', 'pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId, branch, branches, membership } = guard.ctx;

  try {
    const allProducts = await fetchHydratedFootwearProducts({
      supabase,
      businessId,
      branchId: resolvedBranchId,
      includeAllBranchStocks: sp.get('includeAllBranches') === 'true',
    });

    const q = (sp.get('q') ?? '').trim().toLowerCase();
    const categoryId = sp.get('categoryId')?.trim() || '';
    const footwearType = sp.get('footwearType')?.trim().toLowerCase() || '';
    const brand = sp.get('brand')?.trim().toLowerCase() || '';
    const size = sp.get('size')?.trim().toLowerCase() || '';
    const colour = sp.get('colour')?.trim().toLowerCase() || '';
    const stockFilter = sp.get('stockFilter')?.trim() || 'all'; // all | low | out | in | inactive
    const statusFilter = sp.get('status')?.trim() || 'all'; // all | active | inactive
    const sortBy = sp.get('sort') || 'newest';
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(sp.get('pageSize') ?? 50) || 50));

    // Extract distinct facets before filtering
    const facetBrands = Array.from(
      new Set(allProducts.map((p) => p.brand).filter((x): x is string => Boolean(x && x.trim()))),
    ).sort();
    const facetSizes = Array.from(
      new Set(allProducts.flatMap((p) => p.sizes).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const facetColours = Array.from(
      new Set(allProducts.flatMap((p) => p.colours).filter(Boolean)),
    ).sort();
    const facetTypes = Array.from(
      new Set(allProducts.map((p) => p.footwearType).filter(Boolean)),
    ).sort();

    let filtered = allProducts;

    if (q) {
      filtered = filtered.filter((p) => {
        if (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand ?? '').toLowerCase().includes(q) ||
          (p.model ?? '').toLowerCase().includes(q) ||
          p.footwearType.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        ) {
          return true;
        }
        return p.variants.some(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            v.variantName.toLowerCase().includes(q) ||
            v.colourName.toLowerCase().includes(q) ||
            v.sizeName.toLowerCase().includes(q) ||
            v.barcodes.some((b) => b.barcode.toLowerCase().includes(q)),
        );
      });
    }

    if (categoryId && categoryId !== 'all') {
      filtered = filtered.filter((p) => p.categoryId === categoryId);
    }
    if (footwearType && footwearType !== 'all') {
      filtered = filtered.filter((p) => p.footwearType.toLowerCase() === footwearType);
    }
    if (brand && brand !== 'all') {
      filtered = filtered.filter((p) => (p.brand ?? '').toLowerCase() === brand);
    }
    if (size && size !== 'all') {
      filtered = filtered.filter((p) => p.variants.some((v) => v.sizeName.toLowerCase() === size));
    }
    if (colour && colour !== 'all') {
      filtered = filtered.filter((p) => vMatchColour(p.variants, colour));
    }
    if (statusFilter === 'active') {
      filtered = filtered.filter((p) => p.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((p) => !p.isActive);
    }

    if (stockFilter === 'out') {
      filtered = filtered.filter((p) => p.totalStock <= 0 || p.outOfStockVariants > 0);
    } else if (stockFilter === 'low') {
      filtered = filtered.filter((p) => p.lowStockVariants > 0 || (p.totalStock > 0 && p.totalStock <= 5));
    } else if (stockFilter === 'in') {
      filtered = filtered.filter((p) => p.totalStock > 0);
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'price_asc':
          return a.baseSellingPrice - b.baseSellingPrice;
        case 'price_desc':
          return b.baseSellingPrice - a.baseSellingPrice;
        case 'stock_asc':
          return a.totalStock - b.totalStock;
        case 'stock_desc':
          return b.totalStock - a.totalStock;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    // Summary stats for the branch across all products
    const summary = {
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter((p) => p.isActive).length,
      totalVariants: allProducts.reduce((s, p) => s + p.variants.length, 0),
      totalPairsOnHand: allProducts.reduce((s, p) => s + p.totalStock, 0),
      lowStockCount: allProducts.reduce((s, p) => s + p.lowStockVariants, 0),
      outOfStockCount: allProducts.reduce((s, p) => s + p.outOfStockVariants, 0),
      costValuation: allProducts.reduce(
        (s, p) => s + p.variants.reduce((vs, v) => vs + v.stockOnHand * v.averageCost, 0),
        0,
      ),
      retailValuation: allProducts.reduce(
        (s, p) => s + p.variants.reduce((vs, v) => vs + v.stockOnHand * v.sellingPrice, 0),
        0,
      ),
    };

    return NextResponse.json({
      products: paginated,
      total,
      page,
      pageSize,
      totalPages,
      branch,
      branches,
      canManageInventory: membership.permissions.includes('inventory.manage'),
      canManageCategories:
        membership.permissions.includes('inventory.categories') ||
        membership.permissions.includes('inventory.manage'),
      summary,
      facets: {
        brands: facetBrands,
        sizes: facetSizes,
        colours: facetColours,
        footwearTypes: facetTypes,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load inventory products';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function vMatchColour(variants: Array<{ colourName: string }>, colour: string): boolean {
  return variants.some((v) => v.colourName.toLowerCase() === colour);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CreateProductInput | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    allPermissions: ['inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, membership } = guard.ctx;

  const name = body.name?.trim();
  const baseSku = body.sku?.trim().toUpperCase();
  const baseSellingPrice = Number(body.baseSellingPrice ?? 0);
  const baseCostPrice = Math.max(0, Number(body.baseCostPrice ?? 0));
  const sizingSystem: SizingSystem =
    body.sizingSystem === 'UK' || body.sizingSystem === 'US' ? body.sizingSystem : 'EU';
  const footwearType = body.footwearType?.trim() || 'Sneakers';

  if (!name) {
    return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
  }
  if (!baseSku) {
    return NextResponse.json({ error: 'Product SKU is required.' }, { status: 400 });
  }
  if (!Number.isFinite(baseSellingPrice) || baseSellingPrice <= 0) {
    return NextResponse.json({ error: 'Selling price must be greater than 0.' }, { status: 400 });
  }

  const variantsInput = (body.variants ?? []).filter(
    (v) => (v.colourName?.trim() || v.sizeName?.trim()),
  );
  if (variantsInput.length === 0) {
    return NextResponse.json(
      { error: 'Add at least one footwear size/colour variant.' },
      { status: 400 },
    );
  }

  // Validate duplicate variant SKUs and barcodes within the payload
  const seenSkus = new Set<string>();
  const seenBarcodes = new Set<string>();
  const normalizedVariants = variantsInput.map((v, idx) => {
    const colourName = v.colourName?.trim() || 'Standard';
    const sizeName = v.sizeName?.trim() || '';
    const vSys: SizingSystem =
      v.sizingSystem === 'UK' || v.sizingSystem === 'US' || v.sizingSystem === 'EU'
        ? v.sizingSystem
        : sizingSystem;
    const sku = (v.sku?.trim() || buildVariantSku(baseSku, colourName, sizeName)).toUpperCase();
    const barcode = (v.barcode?.trim() || generateBarcodeValue(sku, idx)).toUpperCase();

    if (seenSkus.has(sku)) {
      throw new Error(`Duplicate variant SKU "${sku}" in request.`);
    }
    seenSkus.add(sku);

    if (seenBarcodes.has(barcode)) {
      throw new Error(`Duplicate barcode "${barcode}" in request.`);
    }
    seenBarcodes.add(barcode);

    return {
      colourName,
      sizeName,
      sizingSystem: vSys,
      variantName: buildVariantName(colourName, sizeName, vSys),
      sku,
      barcode,
      barcodeType: v.barcodeType ?? 'CODE128',
      costPrice: Math.max(0, Number(v.costPrice ?? baseCostPrice)),
      sellingPrice: Math.max(0, Number(v.sellingPrice ?? baseSellingPrice)),
      reorderLevel: Math.max(0, Number(v.reorderLevel ?? body.reorderLevel ?? 3)),
      openingStock: Math.max(0, Number(v.openingStock ?? 0)),
      isActive: v.isActive ?? true,
    };
  });

  // Check duplicate product SKU / variant SKUs / barcodes against DB before inserting
  const [dupProdRes, dupVarRes, dupBcRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, sku')
      .eq('business_id', businessId)
      .ilike('sku', baseSku)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('product_variants')
      .select('id, sku')
      .eq('business_id', businessId)
      .in('sku', Array.from(seenSkus))
      .is('deleted_at', null),
    supabase
      .from('product_barcodes')
      .select('id, barcode')
      .eq('business_id', businessId)
      .in('barcode', Array.from(seenBarcodes)),
  ]);

  if (dupProdRes.data) {
    return NextResponse.json(
      { error: `Product SKU "${baseSku}" already exists in this business.` },
      { status: 409 },
    );
  }
  if ((dupVarRes.data ?? []).length > 0) {
    return NextResponse.json(
      { error: `Variant SKU "${dupVarRes.data![0].sku}" already exists.` },
      { status: 409 },
    );
  }
  if ((dupBcRes.data ?? []).length > 0) {
    return NextResponse.json(
      { error: `Barcode "${dupBcRes.data![0].barcode}" is already assigned to another variant.` },
      { status: 409 },
    );
  }

  // Resolve or auto-create Footwear category if not provided
  let categoryId = body.categoryId || null;
  if (!categoryId) {
    const { data: existingCat } = await supabase
      .from('categories')
      .select('id')
      .eq('business_id', businessId)
      .ilike('name', footwearType)
      .is('deleted_at', null)
      .maybeSingle();
    if (existingCat?.id) {
      categoryId = existingCat.id;
    } else {
      const { data: createdCat } = await supabase
        .from('categories')
        .insert({
          business_id: businessId,
          name: footwearType,
          category_type: 'sc',
          art_id: inferFootwearArt(footwearType),
          counter_visible: true,
          attribute_schema: { category_scope: 'footwear', default_sizing_system: sizingSystem },
        })
        .select('id')
        .maybeSingle();
      categoryId = createdCat?.id ?? null;
    }
  }

  const metadata: FootwearMetadata = {
    category_scope: 'footwear',
    model: body.model?.trim() || null,
    footwear_type: footwearType,
    gender: body.gender?.trim() || null,
    material: body.material?.trim() || null,
    sole_material: body.soleMaterial?.trim() || null,
    upper_material: body.upperMaterial?.trim() || null,
    sizing_system: sizingSystem,
    reorder_level: Math.max(0, Number(body.reorderLevel ?? 3)),
  };

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      business_id: businessId,
      category_id: categoryId,
      sku: baseSku,
      name,
      brand: body.brand?.trim() || null,
      art_id: inferFootwearArt(footwearType),
      description: body.description?.trim() || null,
      unit_of_measure: 'pair',
      is_measured: false,
      track_inventory: true,
      allow_negative_stock: false,
      has_variants: true,
      base_cost_price: baseCostPrice,
      base_selling_price: baseSellingPrice,
      is_active: body.isActive ?? true,
      metadata: metadata as unknown as Json,
    })
    .select('id')
    .single();

  if (prodErr || !product) {
    return NextResponse.json(
      { error: prodErr?.message || 'Failed to create footwear product.' },
      { status: 400 },
    );
  }

  // Insert product images if provided
  if (body.images && body.images.length > 0) {
    const imgRows = body.images.map((img, idx) => ({
      business_id: businessId,
      product_id: product.id,
      storage_path: img.storagePath,
      image_url: img.imageUrl ?? null,
      is_primary: img.isPrimary ?? idx === 0,
      sort_order: idx,
    }));
    await supabase.from('product_images').insert(imgRows);
  }

  // Insert variants
  const variantInsertRows = normalizedVariants.map((v, idx) => ({
    business_id: businessId,
    product_id: product.id,
    variant_name: v.variantName,
    sku: v.sku,
    colour_name: v.colourName,
    size_name: v.sizeName || null,
    cost_price: v.costPrice,
    selling_price: v.sellingPrice,
    reorder_level: v.reorderLevel,
    is_default: idx === 0,
    is_active: v.isActive,
  }));

  const { data: insertedVariants, error: varErr } = await supabase
    .from('product_variants')
    .insert(variantInsertRows)
    .select('id, sku');

  if (varErr || !insertedVariants) {
    // Clean up orphaned product
    await supabase.from('products').delete().eq('id', product.id);
    return NextResponse.json(
      { error: varErr?.message || 'Failed to create footwear variants.' },
      { status: 400 },
    );
  }

  const variantIdBySku = new Map(insertedVariants.map((v) => [v.sku, v.id]));
  const sizingAttrId = await ensureSizingSystemAttribute(supabase, businessId);

  const barcodeRows: Array<TableInsert<'product_barcodes'>> = [];
  const stockRows: Array<TableInsert<'stock_levels'>> = [];
  const movementRows: Array<TableInsert<'stock_movements'>> = [];
  const attrValRows: Array<TableInsert<'variant_attribute_values'>> = [];

  for (const v of normalizedVariants) {
    const variantId = variantIdBySku.get(v.sku);
    if (!variantId) continue;

    barcodeRows.push({
      business_id: businessId,
      variant_id: variantId,
      barcode: v.barcode,
      barcode_type: v.barcodeType,
      is_primary: true,
    });

    stockRows.push({
      business_id: businessId,
      branch_id: branchId,
      variant_id: variantId,
      quantity_on_hand: v.openingStock,
      quantity_reserved: 0,
      reorder_level: v.reorderLevel,
      average_cost: v.costPrice,
    });

    if (v.openingStock > 0) {
      movementRows.push({
        business_id: businessId,
        branch_id: branchId,
        variant_id: variantId,
        movement_type: 'opening_stock',
        quantity_delta: v.openingStock,
        unit_cost: v.costPrice,
        reference_type: 'product_creation',
        reference_id: product.id,
        reason: 'Opening footwear stock',
        performed_by: membership.memberId,
      });
    }

    if (sizingAttrId) {
      attrValRows.push({
        business_id: businessId,
        variant_id: variantId,
        attribute_id: sizingAttrId,
        attribute_value: v.sizingSystem,
      });
    }
  }

  await Promise.all([
    barcodeRows.length > 0 ? supabase.from('product_barcodes').insert(barcodeRows) : Promise.resolve(),
    stockRows.length > 0 ? supabase.from('stock_levels').insert(stockRows) : Promise.resolve(),
    movementRows.length > 0 ? supabase.from('stock_movements').insert(movementRows) : Promise.resolve(),
    attrValRows.length > 0
      ? supabase.from('variant_attribute_values').insert(attrValRows)
      : Promise.resolve(),
  ]);

  const hydrated = await fetchHydratedFootwearProducts({
    supabase,
    businessId,
    branchId,
    productId: product.id,
  });

  return NextResponse.json({ product: hydrated[0] }, { status: 201 });
}
