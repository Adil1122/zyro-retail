'use client';

import React from 'react';
import { CheckCircle2, Cloud, RefreshCw, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcBillTotal } from '@/lib/inventory';

export function SyncCheckView() {
  const { state, settings, syncOfflineBills, notify } = useZyro();
  const pendingBills = state.bills.filter((b) => b.offlinePending || b.fbrStatus === 'queued');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Device sync · Counter 1"
        title="Check unconfirmed sales"
        subtitle="Bills saved locally while internet was down or waiting for FBR confirmation."
        actions={
          <Button
            variant="primary"
            disabled={settings.offlineModeSimulated || pendingBills.length === 0}
            onClick={() => {
              syncOfflineBills();
              notify('All offline bills synced', 'ok');
            }}
          >
            <RefreshCw className="w-4 h-4" /> Sync now
          </Button>
        }
      />

      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.offlineModeSimulated ? (
            <WifiOff className="w-6 h-6 text-[#B42318]" />
          ) : (
            <Cloud className="w-6 h-6 text-[#14532D]" />
          )}
          <div>
            <div className="font-semibold text-[15px]">
              {settings.offlineModeSimulated ? 'Device is offline' : 'Connected to cloud'}
            </div>
            <div className="text-[13px] text-[#52666A]">
              {pendingBills.length} sales awaiting server confirmation
            </div>
          </div>
        </div>
        <Badge tone={pendingBills.length > 0 ? 'warn' : 'ok'}>
          {pendingBills.length > 0 ? `${pendingBills.length} pending` : 'All synced'}
        </Badge>
      </Card>

      {pendingBills.length === 0 ? (
        <Card className="text-center py-8 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#2F9E63] mx-auto" />
          <div className="font-display text-[17px] font-bold">Everything is confirmed</div>
          <p className="text-[13px] text-[#52666A]">No unconfirmed offline bills on this counter.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-[#F1EBE3]">
            {pendingBills.map((b) => (
              <div key={b.no} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="mono font-bold text-[14px]">Bill #{b.no}</div>
                  <div className="text-[12px] text-[#52666A]">{b.time} · Saved on device</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="warn">Pending sync</Badge>
                  <span className="font-bold num">{formatRs(calcBillTotal(b, state.items))}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
