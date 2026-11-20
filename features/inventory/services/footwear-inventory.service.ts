import type {
  FootwearCategoryRecord,
  FootwearProductRecord,
  SizingSystem,
  StockCountRecord,
  StockMovementRecord,
} from '@/types/footwear';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export interface InventoryProductsResponse {
  products: FootwearProductRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  branch: { id: string; name: string; city?: string | null };
  branches: Array<{ id: string; name: string; city?: string | null; isMain?: boolean }>;
  canManageInventory: boolean;
  canManageCategories: boolean;
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalVariants: number;
    totalPairsOnHand: number;
    lowStockCount: number;
    outOfStockCount: number;
    costValuation: number;
    retailValuation: number;
  };
  facets: {
    brands: string[];
    sizes: string[];
    colours: string[];
    footwearTypes: string[];
  };
}

export interface InventoryReportResponse {
  branch: { id: string; name: string };
  totals: {
    totalProducts: number;
    totalVariants: number;
    totalPairsOnHand: number;
    lowStockVariants: number;
    outOfStockVariants: number;
    totalCostValuation: number;
    totalRetailValuation: number;
    potentialGrossMargin: number;
  };
  productSummary: Array<{
    productId: string;
    name: string;
    brand: string | null;
    footwearType: string;
    sku: string;
    variantCount: number;
    totalPairs: number;
    lowStockVariants: number;
    outOfStockVariants: number;
    costValuation: number;
    retailValuation: number;
  }>;
  variantRows: Array<{
    productId: string;
    productName: string;
    brand: string | null;
    footwearType: string;
    variantId: string;
    variantName: string;
    colourName: string;
    sizeName: string;
    sizingSystem: SizingSystem;
    sku: string;
    barcode: string | null;
    stockOnHand: number;
    stockReserved: number;
    availableStock: number;
    reorderLevel: number;
    costPrice: number;
    averageCost: number;
    sellingPrice: number;
    costValuation: number;
    retailValuation: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  }>;
}

export const footwearInventoryService = {
  listCategories(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ categories: FootwearCategoryRecord[]; footwearTypes: string[] }>(
      `/api/inventory/categories${qs}`,
    );
  },

  createCategory(payload: {
    name: string;
    parentId?: string | null;
    sizeSetId?: string | null;
    defaultSizingSystem?: SizingSystem;
    sizeOptions?: string[];
    counterVisible?: boolean;
  }) {
    return apiJson<{ category: FootwearCategoryRecord }>('/api/inventory/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCategory(
    id: string,
    payload: {
      name?: string;
      parentId?: string | null;
      sizeSetId?: string | null;
      defaultSizingSystem?: SizingSystem;
      sizeOptions?: string[];
      counterVisible?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return apiJson<{ category: FootwearCategoryRecord }>(
      `/api/inventory/categories/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  deleteCategory(id: string) {
    return apiJson<{ deleted: boolean }>(
      `/api/inventory/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },

  listProducts(params?: {
    branchId?: string;
    q?: string;
    categoryId?: string;
    footwearType?: string;
    brand?: string;
    size?: string;
    colour?: string;
    stockFilter?: string;
    status?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
    includeAllBranches?: boolean;
  }) {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          sp.set(k, String(v));
        }
      });
    }
    const qs = sp.toString();
    return apiJson<InventoryProductsResponse>(`/api/inventory/products${qs ? `?${qs}` : ''}`);
  },

  getProduct(id: string, branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{
      product: FootwearProductRecord;
      branch: { id: string; name: string };
      branches: Array<{ id: string; name: string }>;
      canManageInventory: boolean;
    }>(`/api/inventory/products/${encodeURIComponent(id)}${qs}`);
  },

  createProduct(payload: Record<string, unknown>) {
    return apiJson<{ product: FootwearProductRecord }>('/api/inventory/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProduct(id: string, payload: Record<string, unknown>) {
    return apiJson<{ product: FootwearProductRecord }>(
      `/api/inventory/products/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  deleteProduct(id: string, branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ deleted: boolean }>(
      `/api/inventory/products/${encodeURIComponent(id)}${qs}`,
      { method: 'DELETE' },
    );
  },

  async uploadProductImage(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return apiJson<{ storagePath: string; signedUrl: string | null }>('/api/inventory/images', {
      method: 'POST',
      body: fd,
    });
  },

  lookupBarcode(code: string, branchId?: string) {
    const sp = new URLSearchParams({ code });
    if (branchId) sp.set('branchId', branchId);
    return apiJson<{
      found: boolean;
      product: FootwearProductRecord;
      variant: FootwearProductRecord['variants'][number];
      branchId: string;
    }>(`/api/inventory/barcode-lookup?${sp.toString()}`);
  },

  listMovements(params?: { branchId?: string; variantId?: string; type?: string; limit?: number }) {
    const sp = new URLSearchParams();
    if (params?.branchId) sp.set('branchId', params.branchId);
    if (params?.variantId) sp.set('variantId', params.variantId);
    if (params?.type) sp.set('type', params.type);
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return apiJson<{ movements: StockMovementRecord[]; branchId: string }>(
      `/api/inventory/adjustments${qs ? `?${qs}` : ''}`,
    );
  },

  adjustStock(payload: {
    branchId?: string;
    variantId: string;
    quantityDelta: number;
    movementType: 'opening_stock' | 'adjustment' | 'damage' | 'shrinkage';
    reason: string;
  }) {
    return apiJson<{
      adjustment: {
        movement_id: string;
        variant_id: string;
        previous_qty: number;
        new_qty: number;
        quantity_delta: number;
      };
    }>('/api/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listCounts(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ counts: StockCountRecord[]; branchId: string }>(`/api/inventory/counts${qs}`);
  },

  completeCount(payload: {
    branchId?: string;
    notes?: string;
    items: Array<{ variantId: string; countedQty: number; notes?: string }>;
  }) {
    return apiJson<{
      result: {
        stock_count_id: string;
        count_number: string;
        adjusted_variants: number;
        status: string;
      };
    }>('/api/inventory/counts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getReports(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<InventoryReportResponse>(`/api/inventory/reports${qs}`);
  },
};
