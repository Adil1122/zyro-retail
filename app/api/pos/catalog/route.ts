import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import { fetchHydratedFootwearProducts, inferFootwearArt } from '@/lib/inventory-server';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const branchId = sp.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['pos.sell', 'pos.bills.view', 'pos.returns.process', 'inventory.view'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId, branch, branches, membership } = guard.ctx;

  try {
    const [products, catsRes, payMethodsRes] = await Promise.all([
      fetchHydratedFootwearProducts({
        supabase,
        businessId,
        branchId: resolvedBranchId,
        activeOnly: true,
      }),
      supabase
        .from('categories')
        .select('id, parent_id, name, art_id, counter_visible, sort_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('payment_methods')
        .select('method_code, display_name, is_active, sort_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);

    const brands = Array.from(
      new Set(products.map((p) => p.brand).filter((x): x is string => Boolean(x))),
    ).sort();
    const sizes = Array.from(new Set(products.flatMap((p) => p.sizes).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true }),
    );
    const colours = Array.from(new Set(products.flatMap((p) => p.colours).filter(Boolean))).sort();

    return NextResponse.json({
      businessName: membership.businessName,
      currency: membership.currency,
      branch,
      branches,
      canDiscount:
        membership.permissions.includes('pos.discount.apply') ||
        membership.permissions.includes('pos.discount.approve'),
      canOverridePrice:
        membership.permissions.includes('pos.discount.approve') ||
        membership.permissions.includes('inventory.manage'),
      canProcessReturns: membership.permissions.includes('pos.returns.process'),
      categories: (catsRes.data ?? []).map((c) => ({
        id: c.id,
        parentId: c.parent_id,
        name: c.name,
        artId: c.art_id || inferFootwearArt(c.name),
        counterVisible: c.counter_visible,
      })),
      paymentMethods: (payMethodsRes.data ?? []).map((m) => ({
        code: m.method_code,
        label: m.display_name,
      })),
      products,
      facets: { brands, sizes, colours },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load POS footwear catalog';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
