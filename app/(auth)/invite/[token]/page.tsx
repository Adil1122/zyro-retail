import React from 'react';
import { StaffJoinFlow } from '@/features/auth/StaffJoinFlow';

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StaffJoinFlow invitationToken={token} />;
}
