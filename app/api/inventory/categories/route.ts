import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import { inferFootwearArt } from '@/lib/inventory-server';
import { FOOTWEAR_TYPES, type SizingSystem } from '@/types/footwear';

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

  const countByCat = new Map<string, number>();
  for (const p of products ?? []) {
    if (p.category_id) {
      countByCat.set(p.category_id, (countByCat.get(p.category_id) ?? 0) + 1);
    }
  }

  const mapped = (categories ?? []).map((c) => {
    const schema = (c.attribute_schema ?? {}) as Record<string, unknown>;
    const sys = String(schema.default_sizing_system ?? 'EU').toUpperCase();
    return {
      id: c.id,
      businessId: c.business_id,
      parentId: c.parent_id,
      name: c.name,
      categoryType: c.category_type === 'simple' ? 'simple' : 'sc',
      sizeSetId: c.size_set_id,
      artId: c.art_id || inferFootwearArt(c.name),
      counterVisible: c.counter_visible,
      sortOrder: c.sort_order,
      isActive: c.is_active,
      defaultSizingSystem: (sys === 'UK' || sys === 'US' ? sys : 'EU') as SizingSystem,
      productCount: countByCat.get(c.id) ?? 0,
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
    sizeSetId?: string | null;
    defaultSizingSystem?: SizingSystem;
    counterVisible?: boolean;
    artId?: string;
    sortOrder?: number;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  }

  const defaultSizingSystem: SizingSystem =
    body?.defaultSizingSystem === 'UK' || body?.defaultSizingSystem === 'US'
      ? body.defaultSizingSystem
      : 'EU';

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
      name,
      category_type: 'sc',
      size_set_id: body?.sizeSetId || null,
      art_id: body?.artId || inferFootwearArt(name),
      counter_visible: body?.counterVisible ?? true,
      sort_order: sortOrder,
      attribute_schema: {
        category_scope: 'footwear',
        default_sizing_system: defaultSizingSystem,
      },
    })
    .select('id, business_id, parent_id, name, category_type, size_set_id, art_id, attribute_schema, counter_visible, sort_order, is_active')
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 400;
    return NextResponse.json(
      { error: error.code === '23505' ? 'A footwear category with this name already exists.' : error.message },
      { status },
    );
  }

  return NextResponse.json(
    {
      category: {
        id: created.id,
        businessId: created.business_id,
        parentId: created.parent_id,
        name: created.name,
        categoryType: 'sc',
        sizeSetId: created.size_set_id,
        artId: created.art_id || inferFootwearArt(created.name),
        counterVisible: created.counter_visible,
        sortOrder: created.sort_order,
        isActive: created.is_active,
        defaultSizingSystem,
        productCount: 0,
      },
    },
    { status: 201 },
  );
}
