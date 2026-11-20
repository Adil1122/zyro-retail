import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import {
  extractCategorySizeOptions,
  inferFootwearArt,
  isBagCategoryName,
  normalizeSizingSystem,
} from '@/lib/inventory-server';
import type { Json } from '@/types/database';
import { FOOTWEAR_TYPES, type SizingSystem } from '@/types/footwear';

function cleanSizeOptions(input?: string[] | null): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((v) => String(v ?? '').trim())
        .filter(Boolean),
    ),
  );
}

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['inventory.view', 'inventory.manage', 'inventory.categories', 'pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId } = guard.ctx;

  const [{ data: categories, error }, { data: products }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, business_id, parent_id, name, category_type, size_set_id, art_id, attribute_schema, counter_visible, sort_order, is_active')
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('products')
      .select('id, category_id')
      .eq('business_id', businessId)
      .is('deleted_at', null),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = categories ?? [];
  const nameById = new Map<string, string>(rows.map((c) => [c.id, c.name]));

  const countByCat = new Map<string, number>();
  for (const p of products ?? []) {
    if (p.category_id) {
      countByCat.set(p.category_id, (countByCat.get(p.category_id) ?? 0) + 1);
    }
  }

  const childCountByParent = new Map<string, number>();
  const childProductsByParent = new Map<string, number>();
  for (const c of rows) {
    if (c.parent_id) {
      childCountByParent.set(c.parent_id, (childCountByParent.get(c.parent_id) ?? 0) + 1);
      childProductsByParent.set(
        c.parent_id,
        (childProductsByParent.get(c.parent_id) ?? 0) + (countByCat.get(c.id) ?? 0),
      );
    }
  }

  const mapped = rows.map((c) => {
    const schema = (c.attribute_schema ?? {}) as Record<string, unknown>;
    const parentName = c.parent_id ? nameById.get(c.parent_id) ?? null : null;
    const rawSystem =
      schema.default_sizing_system ??
      (isBagCategoryName(c.name) || isBagCategoryName(parentName) ? 'STANDARD' : 'EU');
    const directCount = countByCat.get(c.id) ?? 0;
    const childProducts = childProductsByParent.get(c.id) ?? 0;

    return {
      id: c.id,
      businessId: c.business_id,
      parentId: c.parent_id,
      parentName,
      name: c.name,
      categoryType: c.category_type === 'simple' ? 'simple' : 'sc',
      sizeSetId: c.size_set_id,
      artId: c.art_id || inferFootwearArt(c.name),
      counterVisible: c.counter_visible,
      sortOrder: c.sort_order,
      isActive: c.is_active,
      defaultSizingSystem: normalizeSizingSystem(rawSystem),
      sizeOptions: extractCategorySizeOptions(schema),
      productCount: directCount,
      totalProductCount: directCount + childProducts,
      childCount: childCountByParent.get(c.id) ?? 0,
    };
  });

  return NextResponse.json({
    categories: mapped,
    footwearTypes: FOOTWEAR_TYPES,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireWorkspaceContext({
    anyPermissions: ['inventory.categories', 'inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId } = guard.ctx;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    parentId?: string | null;
    sizeSetId?: string | null;
    defaultSizingSystem?: SizingSystem;
    sizeOptions?: string[];
    counterVisible?: boolean;
    artId?: string;
    sortOrder?: number;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  }

  const parentId = body?.parentId?.trim() || null;
  let parentName: string | null = null;

  if (parentId) {
    const { data: parentRow } = await supabase
      .from('categories')
      .select('id, name, parent_id')
      .eq('id', parentId)
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!parentRow) {
      return NextResponse.json({ error: 'Selected parent category does not exist.' }, { status: 400 });
    }
    if (parentRow.parent_id) {
      return NextResponse.json(
        { error: 'Please select a top-level parent category.' },
        { status: 400 },
      );
    }
    parentName = parentRow.name;
  }

  const defaultSizingSystem: SizingSystem = body?.defaultSizingSystem
    ? normalizeSizingSystem(body.defaultSizingSystem)
    : isBagCategoryName(name) || isBagCategoryName(parentName)
      ? 'STANDARD'
      : 'EU';

  const sizeOptions = cleanSizeOptions(body?.sizeOptions);
  const categoryScope =
    isBagCategoryName(name) || isBagCategoryName(parentName) ? 'bags' : 'footwear';

  const { data: maxOrderRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = body?.sortOrder ?? Number(maxOrderRow?.sort_order ?? -1) + 1;

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      business_id: businessId,
      parent_id: parentId,
      name,
      category_type: 'sc',
      size_set_id: body?.sizeSetId || null,
      art_id: body?.artId || inferFootwearArt(parentName || name),
      counter_visible: body?.counterVisible ?? true,
      sort_order: sortOrder,
      attribute_schema: {
        category_scope: categoryScope,
        default_sizing_system: defaultSizingSystem,
        size_options: sizeOptions,
      } as unknown as Json,
    })
    .select('id, business_id, parent_id, name, category_type, size_set_id, art_id, attribute_schema, counter_visible, sort_order, is_active')
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 400;
    return NextResponse.json(
      { error: error.code === '23505' ? 'A category with this name already exists.' : error.message },
      { status },
    );
  }

  return NextResponse.json(
    {
      category: {
        id: created.id,
        businessId: created.business_id,
        parentId: created.parent_id,
        parentName,
        name: created.name,
        categoryType: 'sc',
        sizeSetId: created.size_set_id,
        artId: created.art_id || inferFootwearArt(created.name),
        counterVisible: created.counter_visible,
        sortOrder: created.sort_order,
        isActive: created.is_active,
        defaultSizingSystem,
        sizeOptions,
        productCount: 0,
        totalProductCount: 0,
        childCount: 0,
      },
    },
    { status: 201 },
  );
}

