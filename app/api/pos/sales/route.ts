import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';
import type { PosSaleRecord } from '@/types/footwear';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const branchId = sp.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    anyPermissions: ['pos.bills.view', 'pos.sell', 'pos.returns.process', 'reports.view'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId, branch, branches, membership } = guard.ctx;

  const q = (sp.get('q') ?? '').trim().toLowerCase();
  const dateFrom = sp.get('dateFrom')?.trim() || '';
  const dateTo = sp.get('dateTo')?.trim() || '';
  const cashierId = sp.get('cashierId')?.trim() || '';
  const customerId = sp.get('customerId')?.trim() || '';
  const paymentStatus = sp.get('paymentStatus')?.trim() || 'all'; // all | paid | partial | unpaid
  const methodFilter = sp.get('method')?.trim() || 'all';
  const statusFilter = sp.get('status')?.trim() || 'all';
  const allBranches = sp.get('allBranches') === 'true' && membership.roleName.toLowerCase() === 'owner';
  const limit = Math.min(200, Math.max(10, Number(sp.get('limit') ?? 100) || 100));

  let query = supabase
    .from('sales')
    .select(
      `
      id, branch_id, bill_number, status, customer_id, cashier_member_id,
      subtotal_amount, discount_amount, tax_amount, total_amount,
      paid_amount, due_amount, change_given, refunded_amount, notes, sold_at,
      branches:branch_id ( name ),
      customers:customer_id ( full_name, phone ),
      cashier:cashier_member_id (
        id, invited_name,
        user_profiles:user_id ( full_name )
      ),
      sale_items (
        id, product_id, variant_id, product_name_snapshot, variant_label_snapshot,
        sku_snapshot, unit_price, original_unit_price, quantity,
        line_discount_amount, line_total, returned_quantity, note
      ),
      sale_payments (
        id, method_code, amount, tendered_amount, reference_no, paid_at
      ),
      receipts ( id, receipt_number, payload ),
      print_jobs ( id, status, created_at )
    `,
    )
    .eq('business_id', businessId)
    .order('sold_at', { ascending: false })
    .limit(limit);

  if (!allBranches) {
    query = query.eq('branch_id', resolvedBranchId);
  }
  if (dateFrom) {
    query = query.gte('sold_at', `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte('sold_at', `${dateTo}T23:59:59.999Z`);
  }
  if (cashierId && cashierId !== 'all') {
    query = query.eq('cashier_member_id', cashierId);
  }
  if (customerId && customerId !== 'all') {
    query = query.eq('customer_id', customerId);
  }
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sales: PosSaleRecord[] = (data ?? []).map((row) => {
    const br = row.branches as unknown as { name: string } | null;
    const cust = row.customers as unknown as { full_name: string; phone: string | null } | null;
    const cash = row.cashier as unknown as {
      id: string;
      invited_name: string | null;
      user_profiles: { full_name: string } | null;
    } | null;
    const receipts = (row.receipts ?? []) as Array<{
      id: string;
      receipt_number: string;
      payload: Record<string, unknown>;
    }>;
    const printJobs = (row.print_jobs ?? []) as Array<{
      id: string;
      status: string;
      created_at: string;
    }>;
    const latestPrint = printJobs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

    const paid = Number(row.paid_amount ?? 0);
    const due = Number(row.due_amount ?? 0);
    const pStatus: PosSaleRecord['paymentStatus'] =
      due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    return {
      id: row.id,
      branchId: row.branch_id,
      branchName: br?.name ?? branch.name,
      billNumber: Number(row.bill_number),
      status: row.status as PosSaleRecord['status'],
      customerId: row.customer_id,
      customerName: cust?.full_name ?? null,
      customerPhone: cust?.phone ?? null,
      cashierMemberId: row.cashier_member_id,
      cashierName: cash?.user_profiles?.full_name || cash?.invited_name || 'Cashier',
      subtotalAmount: Number(row.subtotal_amount ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      taxAmount: Number(row.tax_amount ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      paidAmount: paid,
      dueAmount: due,
      changeGiven: Number(row.change_given ?? 0),
      refundedAmount: Number(row.refunded_amount ?? 0),
      paymentStatus: pStatus,
      notes: row.notes,
      soldAt: row.sold_at,
      items: ((row.sale_items ?? []) as Array<Record<string, unknown>>).map((it) => ({
        id: String(it.id),
        productId: String(it.product_id),
        variantId: String(it.variant_id),
        productName: String(it.product_name_snapshot),
        variantLabel: String(it.variant_label_snapshot),
        sku: String(it.sku_snapshot ?? ''),
        unitPrice: Number(it.unit_price),
        originalUnitPrice: Number(it.original_unit_price),
        quantity: Number(it.quantity),
        lineDiscountAmount: Number(it.line_discount_amount ?? 0),
        lineTotal: Number(it.line_total),
        returnedQuantity: Number(it.returned_quantity ?? 0),
        returnableQuantity: Math.max(0, Number(it.quantity) - Number(it.returned_quantity ?? 0)),
        note: (it.note as string | null) ?? null,
      })),
      payments: ((row.sale_payments ?? []) as Array<Record<string, unknown>>).map((p) => ({
        id: String(p.id),
        methodCode: String(p.method_code) as PosSaleRecord['payments'][number]['methodCode'],
        amount: Number(p.amount),
        tenderedAmount: p.tendered_amount != null ? Number(p.tendered_amount) : null,
        referenceNo: (p.reference_no as string | null) ?? null,
        paidAt: String(p.paid_at),
      })),
      receiptNumber: receipts[0]?.receipt_number ?? `RCP-${row.bill_number}`,
      receiptPayload: receipts[0]?.payload ?? null,
      printStatus: (latestPrint?.status as PosSaleRecord['printStatus']) || 'printed',
    };
  });

  // Collect facets for filter dropdowns
  const cashiers = Array.from(
    new Map(
      sales
        .filter((s) => s.cashierMemberId)
        .map((s) => [s.cashierMemberId!, { id: s.cashierMemberId!, name: s.cashierName }]),
    ).values(),
  );

  if (paymentStatus !== 'all') {
    sales = sales.filter((s) => s.paymentStatus === paymentStatus);
  }
  if (methodFilter !== 'all') {
    if (methodFilter === 'split') {
      sales = sales.filter((s) => s.payments.length > 1);
    } else {
      sales = sales.filter((s) => s.payments.some((p) => p.methodCode === methodFilter));
    }
  }
  if (q) {
    const cleanQ = q.replace(/^#/, '');
    sales = sales.filter(
      (s) =>
        String(s.billNumber).includes(cleanQ) ||
        (s.receiptNumber ?? '').toLowerCase().includes(q) ||
        (s.customerName ?? '').toLowerCase().includes(q) ||
        (s.customerPhone ?? '').toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.items.some(
          (i) =>
            i.productName.toLowerCase().includes(q) ||
            i.variantLabel.toLowerCase().includes(q) ||
            i.sku.toLowerCase().includes(q),
        ),
    );
  }

  const summary = {
    count: sales.length,
    totalSales: sales.reduce((s, b) => s + b.totalAmount, 0),
    totalCollected: sales.reduce((s, b) => s + b.paidAmount, 0),
    totalDue: sales.reduce((s, b) => s + b.dueAmount, 0),
    totalRefunded: sales.reduce((s, b) => s + b.refundedAmount, 0),
  };

  return NextResponse.json({
    businessName: membership.businessName,
    branch,
    branches,
    cashiers,
    sales,
    summary,
  });
}
