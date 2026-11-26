import type {
  FootwearProductRecord,
  PosCustomerRecord,
  PosExchangeRecord,
  PosHeldBillRecord,
  PosReturnRecord,
  PosSaleRecord,
} from '@/types/footwear';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export interface PosCatalogResponse {
  businessName: string;
  currency: string;
  branch: { id: string; name: string; city?: string | null; address?: string | null; phone?: string | null };
  branches: Array<{ id: string; name: string; city?: string | null; isMain?: boolean }>;
  canDiscount: boolean;
  canOverridePrice: boolean;
  canProcessReturns: boolean;
  categories: Array<{ id: string; parentId: string | null; name: string; artId: string; counterVisible: boolean }>;
  paymentMethods: Array<{ code: string; label: string }>;
  products: FootwearProductRecord[];
  facets: {
    brands: string[];
    sizes: string[];
    colours: string[];
  };
}

export const footwearPosService = {
  getCatalog(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<PosCatalogResponse>(`/api/pos/catalog${qs}`);
  },

  searchCustomers(q?: string, branchId?: string) {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (branchId) sp.set('branchId', branchId);
    const qs = sp.toString();
    return apiJson<{ customers: PosCustomerRecord[] }>(`/api/pos/customers${qs ? `?${qs}` : ''}`);
  },

  createCustomer(payload: {
    branchId?: string;
    fullName: string;
    phone?: string;
    city?: string;
    address?: string;
    notes?: string;
  }) {
    return apiJson<{ customer: PosCustomerRecord }>('/api/pos/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  checkout(payload: {
    branchId?: string;
    customerId?: string | null;
    clientSyncId: string;
    discountPayload?: { mode: 'pct' | 'rs'; value: number; reason?: string } | null;
    taxRatePct?: number;
    notes?: string;
    heldBillId?: string | null;
    allowPartialKhata?: boolean;
    items: Array<{
      variantId: string;
      quantity: number;
      unitPrice?: number;
      lineDiscountAmount?: number;
      note?: string;
    }>;
    payments: Array<{
      methodCode: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'khata' | 'other';
      amount: number;
      tenderedAmount?: number;
      referenceNo?: string;
    }>;
  }) {
    return apiJson<{ sale: PosSaleRecord; rpcResult: Record<string, unknown> }>('/api/pos/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listHeldBills(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ heldBills: PosHeldBillRecord[] }>(`/api/pos/held-bills${qs}`);
  },

  holdBill(payload: {
    branchId?: string;
    customerId?: string | null;
    cartPayload: PosHeldBillRecord['cartPayload'];
    discountPayload?: { mode: 'pct' | 'rs'; value: number; reason?: string } | null;
    totalEstimate: number;
    note?: string;
  }) {
    return apiJson<{ heldBill: PosHeldBillRecord }>('/api/pos/held-bills', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteHeldBill(id: string, branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ deleted: boolean }>(
      `/api/pos/held-bills/${encodeURIComponent(id)}${qs}`,
      { method: 'DELETE' },
    );
  },

  listSales(params?: {
    branchId?: string;
    allBranches?: boolean;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    cashierId?: string;
    customerId?: string;
    paymentStatus?: string;
    method?: string;
    status?: string;
    limit?: number;
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
    return apiJson<{
      businessName: string;
      branch: { id: string; name: string; address?: string | null; phone?: string | null };
      branches: Array<{ id: string; name: string }>;
      cashiers: Array<{ id: string; name: string }>;
      sales: PosSaleRecord[];
      summary: {
        count: number;
        totalSales: number;
        totalCollected: number;
        totalDue: number;
        totalRefunded: number;
      };
    }>(`/api/pos/sales${qs ? `?${qs}` : ''}`);
  },

  recordPrintJob(payload: {
    branchId?: string;
    saleId: string;
    jobType?: 'sale_receipt' | 'reprint' | 'return_slip' | 'exchange_slip';
    status?: 'printed' | 'queued' | 'failed';
  }) {
    return apiJson<{ printJob: { id: string; status: string } }>('/api/pos/print-jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listReturns(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ returns: PosReturnRecord[]; branchId: string }>(`/api/pos/returns${qs}`);
  },

  processReturn(payload: {
    branchId?: string;
    originalSaleId?: string | null;
    customerId?: string | null;
    reason: string;
    refundMethod?: string;
    items: Array<{
      originalSaleItemId?: string | null;
      variantId: string;
      quantity: number;
      condition: 'resellable' | 'damaged';
    }>;
  }) {
    return apiJson<{
      returnNumber: string;
      result: { sales_return_id: string; refund_id: string | null; total_return_amount: number };
      refundPayout: unknown;
    }>('/api/pos/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listExchanges(branchId?: string) {
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return apiJson<{ exchanges: PosExchangeRecord[]; branchId: string }>(`/api/pos/exchanges${qs}`);
  },

  processExchange(payload: {
    branchId?: string;
    originalSaleId: string;
    originalSaleItemId: string;
    returnQuantity: number;
    condition: 'resellable' | 'damaged';
    replacementVariantId: string;
    replacementQuantity: number;
    reason: string;
    settlementMethod: 'cash' | 'card' | 'bank' | 'jazz' | 'easy' | 'raast' | 'khata' | 'other';
  }) {
    return apiJson<{
      exchange: {
        exchange_id: string;
        exchange_number: string;
        replacement_bill_number: number;
        return_credit_amount: number;
        replacement_total_amount: number;
        net_difference_amount: number;
        restocked: boolean;
      };
    }>('/api/pos/exchanges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
