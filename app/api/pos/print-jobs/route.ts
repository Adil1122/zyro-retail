import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

const ALLOWED_JOB_TYPES = new Set(['sale_receipt', 'reprint', 'test_print', 'shift_summary']);

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    branchId?: string;
    saleId?: string;
    jobType?: string;
    status?: 'printed' | 'queued' | 'failed';
  } | null;

  if (!body?.saleId) {
    return NextResponse.json({ error: 'saleId is required.' }, { status: 400 });
  }

  const guard = await requireWorkspaceContext({
    branchId: body.branchId,
    anyPermissions: ['pos.sell', 'pos.bills.view', 'pos.returns.process'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId, membership } = guard.ctx;

  const { data: receipt } = await supabase
    .from('receipts')
    .select('id')
    .eq('business_id', businessId)
    .eq('sale_id', body.saleId)
    .maybeSingle();

  const status = body.status ?? 'printed';
  const jobType = body.jobType && ALLOWED_JOB_TYPES.has(body.jobType) ? body.jobType : 'reprint';

  const { data: job, error } = await supabase
    .from('print_jobs')
    .insert({
      business_id: businessId,
      branch_id: branchId,
      sale_id: body.saleId,
      receipt_id: receipt?.id ?? null,
      job_type: jobType,
      status,
      attempts: 1,
      queued_by: membership.memberId,
      completed_at: status === 'printed' ? new Date().toISOString() : null,
    })
    .select('id, status, completed_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ printJob: job }, { status: 201 });
}
