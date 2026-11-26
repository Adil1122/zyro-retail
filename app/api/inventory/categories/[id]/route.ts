import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import {
  extractCategorySizeOptions,
  inferFootwearArt,
  isBagCategoryName,
  normalizeSizingSystem,
} from '@/lib/inventory-server';
import type { Json, TableUpdate } from '@/types/database';
import type { ParentCategoryKey, SizingSystem } from '@/types/footwear';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireWorkspaceContext({
    anyPermissions: ['inventory.categories', 'inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const { supabase, businessId } = guard.ctx;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    parentId?: string | null;
    parentCategoryType?: ParentCategoryKey | null;
    childGroup?: string | null;
    footwearType?: string | null;
    sizeSetId?: string | null;
    defaultSizingSystem?: SizingSystem;
    sizeOptions?: string[];
    counterVisible?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('categories')
    .select('id, name, parent_id, attribute_schema')
    .eq('id', id)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }

  const updatePayload: TableUpdate<'categories'> = {};
  let nextParentName: string | null = null;
  let resolvedParentId: string | null = existing.parent_id;

  if (body.parentCategoryType) {
    const targetParentName = body.parentCategoryType === 'bags' ? 'Bags / Handbags' : 'Footwear';
    // Prevent nesting a category that already has children
    const { count: ownChildren } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('parent_id', id)
      .is('deleted_at', null);

    if ((ownChildren ?? 0) === 0 && existing.name.toLowerCase() !== targetParentName.toLowerCase()) {
      const { data: existingParent } = await supabase
        .from('categories')
        .select('id, name')
        .eq('business_id', businessId)
        .ilike('name', targetParentName)
        .is('parent_id', null)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingParent && existingParent.id !== id) {
        resolvedParentId = existingParent.id;
        nextParentName = existingParent.name;
        updatePayload.parent_id = existingParent.id;
      } else if (!existingParent) {
        const { data: createdParent } = await supabase
          .from('categories')
          .insert({
            business_id: businessId,
            parent_id: null,
            name: targetParentName,
            category_type: 'sc',
            art_id: body.parentCategoryType === 'bags' ? 'bag' : 'sneaker',
            counter_visible: true,
            sort_order: body.parentCategoryType === 'footwear' ? 0 : 1,
            attribute_schema: {
              category_scope: body.parentCategoryType,
              default_sizing_system: body.parentCategoryType === 'bags' ? 'STANDARD' : 'EU',
              size_options: [],
            } as unknown as Json,
          })
          .select('id, name')
          .single();

        if (createdParent) {
          resolvedParentId = createdParent.id;
          nextParentName = createdParent.name;
          updatePayload.parent_id = createdParent.id;
        }
      }
    }
  } else if (body.parentId !== undefined) {
    const nextParentId = body.parentId ? body.parentId.trim() : null;
    if (nextParentId === id) {
      return NextResponse.json({ error: 'A category cannot be its own parent.' }, { status: 400 });
    }
    if (nextParentId) {
      const { count: ownChildren } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('parent_id', id)
        .is('deleted_at', null);

      if ((ownChildren ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Cannot nest a category that already has child categories under another parent.' },
          { status: 400 },
        );
      }

      const { data: parentRow } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('id', nextParentId)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!parentRow) {
        return NextResponse.json({ error: 'Selected parent category not found.' }, { status: 400 });
      }
      if (parentRow.parent_id) {
        return NextResponse.json(
          { error: 'Please select a top-level parent category.' },
          { status: 400 },
        );
      }
      nextParentName = parentRow.name;
    }
    resolvedParentId = nextParentId;
    updatePayload.parent_id = nextParentId;
  } else if (existing.parent_id) {
    const { data: currentParent } = await supabase
      .from('categories')
      .select('name')
      .eq('id', existing.parent_id)
      .maybeSingle();
    nextParentName = currentParent?.name ?? null;
  }

  const nextName =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name;

  if (typeof body.name === 'string' && body.name.trim()) {
    updatePayload.name = nextName;
  }
  if (body.sizeSetId !== undefined) updatePayload.size_set_id = body.sizeSetId;
  if (typeof body.counterVisible === 'boolean') updatePayload.counter_visible = body.counterVisible;
  if (typeof body.sortOrder === 'number') updatePayload.sort_order = body.sortOrder;
  if (typeof body.isActive === 'boolean') updatePayload.is_active = body.isActive;

  const prevSchema = (existing.attribute_schema ?? {}) as Record<string, unknown>;
  const categoryScope: 'footwear' | 'bags' =
    body.parentCategoryType === 'bags' ||
    isBagCategoryName(nextParentName) ||
    isBagCategoryName(nextName) ||
    (!body.parentCategoryType && prevSchema.category_scope === 'bags')
      ? 'bags'
      : 'footwear';

  if (
    body.defaultSizingSystem !== undefined ||
    body.sizeOptions !== undefined ||
    body.childGroup !== undefined ||
    body.footwearType !== undefined ||
    body.parentCategoryType !== undefined
  ) {
    let nextSystem: SizingSystem;
    if (categoryScope === 'bags') {
      nextSystem = 'STANDARD';
    } else {
      const requested = body.defaultSizingSystem
        ? normalizeSizingSystem(body.defaultSizingSystem)
        : normalizeSizingSystem(prevSchema.default_sizing_system ?? 'EU');
      nextSystem = requested === 'STANDARD' ? 'EU' : requested;
    }

    const nextSizeOptions =
      body.sizeOptions !== undefined
        ? Array.from(new Set(body.sizeOptions.map((s) => String(s ?? '').trim()).filter(Boolean)))
        : extractCategorySizeOptions(prevSchema);

    const nextChildGroup =
      categoryScope === 'bags'
        ? null
        : body.childGroup !== undefined
          ? body.childGroup?.trim() || null
          : typeof prevSchema.child_group === 'string'
            ? prevSchema.child_group
            : null;

    const nextFootwearType =
      categoryScope === 'bags'
        ? null
        : body.footwearType !== undefined
          ? body.footwearType?.trim() || null
          : typeof prevSchema.footwear_type === 'string'
            ? prevSchema.footwear_type
            : null;

    updatePayload.art_id =
      categoryScope === 'bags' ? 'bag' : inferFootwearArt(nextFootwearType || nextName);

    updatePayload.attribute_schema = {
      ...prevSchema,
      category_scope: categoryScope,
      child_group: nextChildGroup,
      footwear_type: nextFootwearType,
      default_sizing_system: nextSystem,
      size_options: nextSizeOptions,
    } as unknown as Json;
  }

  const { data: updated, error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', id)
    .eq('business_id', businessId)
    .select('id, business_id, parent_id, name, category_type, size_set_id, art_id, attribute_schema, counter_visible, sort_order, is_active')
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 400;
    return NextResponse.json(
      { error: error.code === '23505' ? 'A category with this name already exists.' : error.message },
      { status },
    );
  }

  const schema = (updated.attribute_schema ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    category: {
      id: updated.id,
      businessId: updated.business_id,
      parentId: updated.parent_id ?? resolvedParentId,
      parentName: nextParentName,
      categoryScope,
      childGroup: typeof schema.child_group === 'string' ? schema.child_group : null,
      footwearType: typeof schema.footwear_type === 'string' ? schema.footwear_type : null,
      name: updated.name,
      categoryType: updated.category_type === 'simple' ? 'simple' : 'sc',
      sizeSetId: updated.size_set_id,
      artId: updated.art_id || inferFootwearArt(updated.name),
      counterVisible: updated.counter_visible,
      sortOrder: updated.sort_order,
      isActive: updated.is_active,
      defaultSizingSystem: normalizeSizingSystem(schema.default_sizing_system ?? 'EU'),
      sizeOptions: extractCategorySizeOptions(schema),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireWorkspaceContext({
    anyPermissions: ['inventory.categories', 'inventory.manage'],
  });
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const { supabase, businessId } = guard.ctx;

  const [{ count: productCount }, { count: childCount }] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('category_id', id)
      .is('deleted_at', null),
    supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('parent_id', id)
      .is('deleted_at', null),
  ]);

  if ((childCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete this parent category while ${childCount} child categor${childCount === 1 ? 'y is' : 'ies are'} under it.` },
      { status: 409 },
    );
  }

  if ((productCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete category while ${productCount} product(s) are assigned to it.` },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .eq('business_id', businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ deleted: true });
}
