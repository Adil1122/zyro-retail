import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api/workspace-guard';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const branchId = req.nextUrl.searchParams.get('branchId');
  const guard = await requireWorkspaceContext({
    branchId,
    allPermissions: ['pos.sell'],
  });
  if (!guard.ok) return guard.response;

  const { supabase, businessId, branchId: resolvedBranchId } = guard.ctx;

  const { error } = await supabase
    .from('held_bills')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)
    .eq('branch_id', resolvedBranchId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ deleted: true });
}
