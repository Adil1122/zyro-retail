'use client';

import React from 'react';
import { CashierDashboard } from '@/features/dashboard/CashierDashboard';
import { OwnerDashboard } from '@/features/dashboard/OwnerDashboard';
import { StockkeeperDashboard } from '@/features/dashboard/StockkeeperDashboard';
import { useZyro } from '@/hooks/useZyro';

export default function DashboardPage() {
  const { role } = useZyro();

  if (role === 'cashier') return <CashierDashboard />;
  if (role === 'inventory') return <StockkeeperDashboard />;
  return <OwnerDashboard />;
}
