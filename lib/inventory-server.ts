import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeProductOffer,
  type FootwearBarcodeRecord,
  type FootwearMetadata,
  type FootwearProductImageRecord,
  type FootwearProductRecord,
  type FootwearVariantRecord,
  type SizingSystem,
} from '@/types/footwear';

export function normalizeSizingSystem(val: unknown): SizingSystem {
  const s = String(val ?? 'EU').toUpperCase();
  if (s === 'UK' || s === 'US' || s === 'EU' || s === 'STANDARD') return s;
  return 'EU';
}

export function isBagCategoryName(name?: string | null): boolean {
  const lower = (name ?? '').toLowerCase();
  return (
    lower.includes('bag') ||
    lower.includes('handbag') ||
    lower.includes('purse') ||
    lower.includes('clutch') ||
    lower.includes('tote') ||
    lower.includes('backpack') ||
    lower.includes('wallet')
  );
}

export function extractCategorySizeOptions(attributeSchema: unknown): string[] {
  if (!attributeSchema || typeof attributeSchema !== 'object') return [];
  const raw = (attributeSchema as Record<string, unknown>).size_options;
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((v) => String(v ?? '').trim())
        .filter(Boolean),
    ),
  );
}

export function generateBarcodeValue(sku: string, index = 0): string {
  const clean = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'PRD';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ZR-${clean}-${String(index + 1).padStart(2, '0')}${rand}`;
}

export function buildVariantName(
  colourName: string,
  sizeName: string,
  sizingSystem: SizingSystem,
): string {
  const colour = colourName.trim() || 'Standard';
  const size = sizeName.trim();
  if (!size) return colour;
  if (sizingSystem === 'STANDARD') return `${colour} · ${size}`;
  return `${colour} · ${sizingSystem} ${size}`;
}

export function buildVariantSku(baseSku: string, colourName: string, sizeName: string): string {
  const base = baseSku.trim().toUpperCase().replace(/\s+/g, '-') || 'ITEM';
  const col = (colourName.trim() || 'STD').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'STD';
  const sz = sizeName.trim().replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
  return sz ? `${base}-${col}-${sz}` : `${base}-${col}`;
}

export function inferFootwearArt(nameOrType?: string | null): 'sneaker' | 'chappal' | 'khussa' | 'bag' {
  const lower = (nameOrType ?? '').toLowerCase();
  if (isBagCategoryName(lower)) return 'bag';
  if (lower.includes('sandal') || lower.includes('slipper')) return 'chappal';
  if (lower.includes('formal') || lower.includes('heel') || lower.includes('flat') || lower.includes('khussa')) {
    return 'khussa';
  }
  return 'sneaker';
}

/**
 * Ensures the business has a 'Sizing System' attribute row in public.product_attributes
 * so variant-level sizing systems (EU / UK / US) are persisted relationally in
 * public.variant_attribute_values without altering existing schema tables.
 */
export async function ensureSizingSystemAttribute(
  supabase: SupabaseClient,
  businessId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('product_attributes')
    .select('id')
    .eq('business_id', businessId)
    .eq('name', 'Sizing System')
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created } = await supabase
    .from('product_attributes')
    .insert({
      business_id: businessId,
      name: 'Sizing System',
      display_type: 'text',
    })
    .select('id')
    .maybeSingle();

  return created?.id ?? null;
}

export async function fetchHydratedFootwearProducts(params: {
  supabase: SupabaseClient;
  businessId: string;
  branchId: string;
  productId?: string;
  activeOnly?: boolean;
  includeAllBranchStocks?: boolean;
}): Promise<FootwearProductRecord[]> {
  const { supabase, businessId, branchId, productId, activeOnly = false, includeAllBranchStocks = false } = params;

  let productQuery = supabase
    .from('products')
    .select(
      `
      id,
      business_id,
      category_id,
      sku,
      name,
      brand,
      art_id,
      description,
      unit_of_measure,
      base_cost_price,
      base_selling_price,
      is_active,
      metadata,
      created_at,
      updated_at,
      categories:category_id ( id, name, art_id )
    `,
    )
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (productId) {
    productQuery = productQuery.eq('id', productId);
  }
  if (activeOnly) {
    productQuery = productQuery.eq('is_active', true);
  }

  const { data: productRows, error: prodErr } = await productQuery;
  if (prodErr) {
    throw new Error(`Failed to load footwear products: ${prodErr.message}`);
  }

  const products = (productRows ?? []) as unknown as Array<{
    id: string;
    business_id: string;
    category_id: string | null;
    sku: string;
    name: string;
    brand: string | null;
    art_id: string | null;
    description: string | null;
    unit_of_measure: string;
    base_cost_price: number;
    base_selling_price: number;
    is_active: boolean;
    metadata: FootwearMetadata | null;
    created_at: string;
    updated_at: string;
    categories:
      | { id: string; name: string; art_id: string | null }
      | Array<{ id: string; name: string; art_id: string | null }>
      | null;
  }>;

  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  // Fetch variants, images, and sizing system attribute in parallel
  let variantQuery = supabase
    .from('product_variants')
    .select(
      'id, product_id, variant_name, sku, colour_name, size_name, cost_price, selling_price, reorder_level, is_default, is_active',
    )
    .eq('business_id', businessId)
    .in('product_id', productIds)
    .is('deleted_at', null)
    .order('colour_name', { ascending: true })
    .order('size_name', { ascending: true });

  if (activeOnly) {
    variantQuery = variantQuery.eq('is_active', true);
  }

  const [variantsRes, imagesRes, attrRes, allCategoriesRes] = await Promise.all([
    variantQuery,
    supabase
      .from('product_images')
      .select('id, product_id, storage_path, image_url, is_primary, sort_order')
      .eq('business_id', businessId)
      .in('product_id', productIds)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_attributes')
      .select('id')
      .eq('business_id', businessId)
      .eq('name', 'Sizing System')
      .maybeSingle(),
    supabase
      .from('categories')
      .select('id, name, parent_id, art_id')
      .eq('business_id', businessId)
      .is('deleted_at', null),
  ]);

  const categoryById = new Map<
    string,
    { id: string; name: string; parent_id: string | null; art_id: string | null }
  >();
  for (const c of (allCategoriesRes.data ?? []) as Array<{
    id: string;
    name: string;
    parent_id: string | null;
    art_id: string | null;
  }>) {
    categoryById.set(c.id, c);
  }

  if (variantsRes.error) {
    throw new Error(`Failed to load product variants: ${variantsRes.error.message}`);
  }

  const variantRows = (variantsRes.data ?? []) as Array<{
    id: string;
    product_id: string;
    variant_name: string;
    sku: string;
    colour_name: string | null;
    size_name: string | null;
    cost_price: number;
    selling_price: number | null;
    reorder_level: number;
    is_default: boolean;
    is_active: boolean;
  }>;

  const variantIds = variantRows.map((v) => v.id);

  // Fetch barcodes, stock_levels, and variant sizing system attribute values in parallel
  const [barcodesRes, stocksRes, vavRes] =
    variantIds.length > 0
      ? await Promise.all([
          supabase
            .from('product_barcodes')
            .select('id, variant_id, barcode, barcode_type, is_primary')
            .eq('business_id', businessId)
            .in('variant_id', variantIds)
            .order('is_primary', { ascending: false }),
          includeAllBranchStocks
            ? supabase
                .from('stock_levels')
                .select('branch_id, variant_id, quantity_on_hand, quantity_reserved, reorder_level, average_cost')
                .eq('business_id', businessId)
                .in('variant_id', variantIds)
            : supabase
                .from('stock_levels')
                .select('branch_id, variant_id, quantity_on_hand, quantity_reserved, reorder_level, average_cost')
                .eq('business_id', businessId)
                .eq('branch_id', branchId)
                .in('variant_id', variantIds),
          attrRes.data?.id
            ? supabase
                .from('variant_attribute_values')
                .select('variant_id, attribute_value')
                .eq('business_id', businessId)
                .eq('attribute_id', attrRes.data.id)
                .in('variant_id', variantIds)
            : Promise.resolve({ data: [], error: null }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  const barcodesByVariant = new Map<string, FootwearBarcodeRecord[]>();
  for (const b of (barcodesRes.data ?? []) as Array<{
    id: string;
    variant_id: string;
    barcode: string;
    barcode_type: FootwearBarcodeRecord['barcodeType'];
    is_primary: boolean;
  }>) {
    const list = barcodesByVariant.get(b.variant_id) ?? [];
    list.push({
      id: b.id,
      variantId: b.variant_id,
      barcode: b.barcode,
      barcodeType: b.barcode_type,
      isPrimary: b.is_primary,
    });
    barcodesByVariant.set(b.variant_id, list);
  }

  const branchStockByVariant = new Map<
    string,
    { onHand: number; reserved: number; reorderLevel: number; averageCost: number }
  >();
  const allBranchStocksByVariant = new Map<
    string,
    Record<string, { onHand: number; reserved: number; reorderLevel: number }>
  >();

  for (const s of (stocksRes.data ?? []) as Array<{
    branch_id: string;
    variant_id: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    reorder_level: number;
    average_cost: number;
  }>) {
    if (s.branch_id === branchId) {
      branchStockByVariant.set(s.variant_id, {
        onHand: Number(s.quantity_on_hand ?? 0),
        reserved: Number(s.quantity_reserved ?? 0),
        reorderLevel: Number(s.reorder_level ?? 0),
        averageCost: Number(s.average_cost ?? 0),
      });
    }
    if (includeAllBranchStocks) {
      const map = allBranchStocksByVariant.get(s.variant_id) ?? {};
      map[s.branch_id] = {
        onHand: Number(s.quantity_on_hand ?? 0),
        reserved: Number(s.quantity_reserved ?? 0),
        reorderLevel: Number(s.reorder_level ?? 0),
      };
      allBranchStocksByVariant.set(s.variant_id, map);
    }
  }

  const sizingSystemByVariant = new Map<string, SizingSystem>();
  for (const row of (vavRes.data ?? []) as Array<{ variant_id: string; attribute_value: string }>) {
    sizingSystemByVariant.set(row.variant_id, normalizeSizingSystem(row.attribute_value));
  }

  // Sign private storage product images when needed
  const imageRows = (imagesRes.data ?? []) as Array<{
    id: string;
    product_id: string;
    storage_path: string;
    image_url: string | null;
    is_primary: boolean;
    sort_order: number;
  }>;

  const pathsToSign = imageRows
    .filter((img) => img.storage_path && !img.storage_path.startsWith('http') && !img.image_url)
    .map((img) => img.storage_path);

  const signedUrlMap = new Map<string, string>();
  if (pathsToSign.length > 0) {
    const { data: signed } = await supabase.storage
      .from('zyro-product-images')
      .createSignedUrls(pathsToSign, 3600);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) {
        signedUrlMap.set(entry.path, entry.signedUrl);
      }
    }
  }

  const imagesByProduct = new Map<string, FootwearProductImageRecord[]>();
  for (const img of imageRows) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    const resolvedUrl =
      img.image_url || signedUrlMap.get(img.storage_path) || (img.storage_path.startsWith('http') ? img.storage_path : null);
    list.push({
      id: img.id,
      productId: img.product_id,
      storagePath: img.storage_path,
      imageUrl: img.image_url,
      signedUrl: resolvedUrl,
      isPrimary: img.is_primary,
      sortOrder: img.sort_order,
    });
    imagesByProduct.set(img.product_id, list);
  }

  const variantsByProduct = new Map<string, FootwearVariantRecord[]>();
  const productMetaById = new Map<string, FootwearMetadata>();
  const productBasePriceById = new Map<string, { cost: number; selling: number }>();

  for (const p of products) {
    productMetaById.set(p.id, (p.metadata ?? {}) as FootwearMetadata);
    productBasePriceById.set(p.id, {
      cost: Number(p.base_cost_price ?? 0),
      selling: Number(p.base_selling_price ?? 0),
    });
  }

  for (const v of variantRows) {
    const meta = productMetaById.get(v.product_id) ?? {};
    const basePrices = productBasePriceById.get(v.product_id) ?? { cost: 0, selling: 0 };
    const stock = branchStockByVariant.get(v.id);
    const barcodes = barcodesByVariant.get(v.id) ?? [];
    const primaryBarcode = barcodes.find((b) => b.isPrimary)?.barcode ?? barcodes[0]?.barcode ?? null;
    const onHand = stock?.onHand ?? 0;
    const reserved = stock?.reserved ?? 0;
    const reorderLevel = stock?.reorderLevel ?? Number(v.reorder_level ?? 3);
    const sizingSystem =
      sizingSystemByVariant.get(v.id) ?? normalizeSizingSystem(meta.sizing_system);

    const record: FootwearVariantRecord = {
      id: v.id,
      productId: v.product_id,
      variantName: v.variant_name,
      sku: v.sku,
      colourName: v.colour_name || 'Standard',
      sizeName: v.size_name || '',
      sizingSystem,
      costPrice: Number(v.cost_price ?? basePrices.cost),
      sellingPrice: Number(v.selling_price ?? basePrices.selling),
      reorderLevel,
      isDefault: v.is_default,
      isActive: v.is_active,
      barcodes,
      primaryBarcode,
      stockOnHand: onHand,
      stockReserved: reserved,
      availableStock: Math.max(0, onHand - reserved),
      averageCost: stock?.averageCost ?? Number(v.cost_price ?? basePrices.cost),
      ...(includeAllBranchStocks ? { branchStocks: allBranchStocksByVariant.get(v.id) ?? {} } : {}),
    };

    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(record);
    variantsByProduct.set(v.product_id, list);
  }

  return products.map((p) => {
    const meta = (p.metadata ?? {}) as FootwearMetadata;
    const variants = variantsByProduct.get(p.id) ?? [];
    const images = imagesByProduct.get(p.id) ?? [];
    const primaryImg = images.find((i) => i.isPrimary) ?? images[0] ?? null;

    const colours = Array.from(new Set(variants.map((v) => v.colourName).filter(Boolean)));
    const sizes = Array.from(new Set(variants.map((v) => v.sizeName).filter(Boolean)));
    const totalStock = variants.reduce((sum, v) => sum + v.stockOnHand, 0);
    const lowStockVariants = variants.filter(
      (v) => v.stockOnHand > 0 && v.stockOnHand <= Math.max(v.reorderLevel, 2),
    ).length;
    const outOfStockVariants = variants.filter((v) => v.stockOnHand <= 0).length;

    const categoryObj =
      (p.category_id ? categoryById.get(p.category_id) : null) ??
      (Array.isArray(p.categories) ? p.categories[0] ?? null : p.categories);
    const parentCatId =
      categoryObj && 'parent_id' in categoryObj && typeof categoryObj.parent_id === 'string'
        ? categoryObj.parent_id
        : null;
    const parentCatObj = parentCatId ? categoryById.get(parentCatId) ?? null : null;

    const categoryName = categoryObj?.name || meta.footwear_type || 'General';
    const parentCategoryId = parentCatObj?.id ?? null;
    const parentCategoryName = parentCatObj?.name ?? null;
    const categoryPath = parentCategoryName
      ? `${parentCategoryName} › ${categoryName}`
      : categoryName;

    const footwearType = meta.footwear_type || categoryName;
    const sizingSystem = normalizeSizingSystem(
      meta.sizing_system || variants[0]?.sizingSystem || (isBagCategoryName(categoryPath) ? 'STANDARD' : 'EU'),
    );

    return {
      id: p.id,
      businessId: p.business_id,
      categoryId: p.category_id,
      categoryName,
      parentCategoryId,
      parentCategoryName,
      categoryPath,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      model: meta.model ?? null,
      footwearType,
      gender: meta.gender ?? null,
      description: p.description,
      material: meta.material ?? null,
      soleMaterial: meta.sole_material ?? null,
      upperMaterial: meta.upper_material ?? null,
      sizingSystem,
      artId: p.art_id || categoryObj?.art_id || inferFootwearArt(categoryPath || footwearType),
      unitOfMeasure: p.unit_of_measure || (isBagCategoryName(categoryPath) ? 'piece' : 'pair'),
      baseCostPrice: Number(p.base_cost_price ?? 0),
      baseSellingPrice: Number(p.base_selling_price ?? 0),
      offer: normalizeProductOffer(meta.offer),
      isActive: p.is_active,
      images,
      primaryImageUrl: primaryImg?.signedUrl ?? primaryImg?.imageUrl ?? null,
      variants,
      colours,
      sizes,
      totalStock,
      lowStockVariants,
      outOfStockVariants,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });
}
