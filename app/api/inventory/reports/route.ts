import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import { fetchHydratedFootwearProducts } from '@/lib/inventory-server';

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['inventory.view', 'inventory.manage', 'reports.view'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId, branch } = guard.ctx;

  const [products, movRes] = await Promise.all([
    fetchHydratedFootwearProducts({
      supabase,
      businessId,
      branchId: resolvedBranchId,
    }),
    supabase
      .from('stock_movements')
      .select(
        `
        id, movement_type, quantity_delta, unit_cost, reason, created_at,
        product_variants:variant_id ( variant_name, sku, products:product_id ( name, brand ) )
      `,
      )
      .eq('business_id', businessId)
      .eq('branch_id', resolvedBranchId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const variantRows = products.flatMap((p) =>
    p.variants.map((v) => ({
      productId: p.id,
      productName: p.name,
      brand: p.brand,
      footwearType: p.footwearType,
      variantId: v.id,
      variantName: v.variantName,
      colourName: v.colourName,
      sizeName: v.sizeName,
      sizingSystem: v.sizingSystem,
      sku: v.sku,
      barcode: v.primaryBarcode,
      stockOnHand: v.stockOnHand,
      stockReserved: v.stockReserved,
      availableStock: v.availableStock,
      reorderLevel: v.reorderLevel,
      costPrice: v.costPrice,
      averageCost: v.averageCost,
      sellingPrice: v.sellingPrice,
      costValuation: v.stockOnHand * v.averageCost,
      retailValuation: v.stockOnHand * v.sellingPrice,
      status:
        v.stockOnHand <= 0
          ? 'out_of_stock'
          : v.stockOnHand <= Math.max(v.reorderLevel, 2)
            ? 'low_stock'
            : 'in_stock',
    })),
  );

  const productSummary = products.map((p) => ({
    productId: p.id,
    name: p.name,
    brand: p.brand,
    footwearType: p.footwearType,
    sku: p.sku,
    variantCount: p.variants.length,
    totalPairs: p.totalStock,
    lowStockVariants: p.lowStockVariants,
    outOfStockVariants: p.outOfStockVariants,
    costValuation: p.variants.reduce((s, v) => s + v.stockOnHand * v.averageCost, 0),
    retailValuation: p.variants.reduce((s, v) => s + v.stockOnHand * v.sellingPrice, 0),
  }));

  const totals = {
    totalProducts: products.length,
    totalVariants: variantRows.length,
    totalPairsOnHand: variantRows.reduce((s, v) => s + v.stockOnHand, 0),
    lowStockVariants: variantRows.filter((v) => v.status === 'low_stock').length,
    outOfStockVariants: variantRows.filter((v) => v.status === 'out_of_stock').length,
    totalCostValuation: variantRows.reduce((s, v) => s + v.costValuation, 0),
    totalRetailValuation: variantRows.reduce((s, v) => s + v.retailValuation, 0),
    potentialGrossMargin:
      variantRows.reduce((s, v) => s + v.retailValuation, 0) -
      variantRows.reduce((s, v) => s + v.costValuation, 0),
  };

  return NextResponse.json({
    branch,
    totals,
    productSummary,
    variantRows,
    lowStock: variantRows.filter((v) => v.status === 'low_stock'),
    outOfStock: variantRows.filter((v) => v.status === 'out_of_stock'),
    recentMovements: (movRes.data ?? []).map((m) => {
      const pv = m.product_variants as unknown as {
        variant_name: string;
        sku: string;
        products: { name: string; brand: string | null } | null;
      } | null;
      return {
        id: m.id,
        movementType: m.movement_type,
        quantityDelta: Number(m.quantity_delta),
        unitCost: Number(m.unit_cost ?? 0),
        reason: m.reason,
        createdAt: m.created_at,
        productName: pv?.products?.name ?? 'Footwear',
        brand: pv?.products?.brand ?? null,
        variantLabel: pv?.variant_name ?? '',
        sku: pv?.sku ?? '',
      };
    }),
  });
}
