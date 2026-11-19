import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import { inferFootwearArt } from '@/lib/inventory-server';
import type { Json, TableUpdate } from '@/types/database';
import type { SizingSystem } from '@/types/footwear';

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
    sizeSetId?: string | null;
    defaultSizingSystem?: SizingSystem;
    counterVisible?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('categories')
    .select('id, name, attribute_schema')
    .eq('id', id)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  }

  const updatePayload: TableUpdate<'categories'> = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    updatePayload.name = body.name.trim();
    updatePayload.art_id = inferFootwearArt(body.name.trim());
  }
  if (body.sizeSetId !== undefined) updatePayload.size_set_id = body.sizeSetId;
  if (typeof body.counterVisible === 'boolean') updatePayload.counter_visible = body.counterVisible;
  if (typeof body.sortOrder === 'number') updatePayload.sort_order = body.sortOrder;
  if (typeof body.isActive === 'boolean') updatePayload.is_active = body.isActive;
  if (body.defaultSizingSystem) {
    const prevSchema = (existing.attribute_schema ?? {}) as Record<string, unknown>;
    updatePayload.attribute_schema = {
      ...prevSchema,
      category_scope: 'footwear',
      default_sizing_system: body.defaultSizingSystem,
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const schema = (updated.attribute_schema ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    category: {
      id: updated.id,
      businessId: updated.business_id,
      parentId: updated.parent_id,
      name: updated.name,
      categoryType: updated.category_type === 'simple' ? 'simple' : 'sc',
      sizeSetId: updated.size_set_id,
      artId: updated.art_id || inferFootwearArt(updated.name),
      counterVisible: updated.counter_visible,
      sortOrder: updated.sort_order,
      isActive: updated.is_active,
      defaultSizingSystem: (schema.default_sizing_system as SizingSystem) || 'EU',
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

  // Check if active products reference this category
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('category_id', id)
    .is('deleted_at', null);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete category while ${count} footwear product(s) are assigned to it.` },
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
