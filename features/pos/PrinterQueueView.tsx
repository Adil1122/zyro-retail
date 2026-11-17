'use client';

import React from 'react';
import { CheckCircle2, Printer, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcBillTotal } from '@/lib/inventory';

export function PrinterQueueView() {
  const { state, settings, setPrintJobStatus, notify } = useZyro();

  const jobs = state.bills.slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Counter 1 · Hardware"
        title="Receipt printer"
        subtitle={`${settings.printer.name} · ${settings.printer.paperWidth} thermal`}
        actions={
          <Button
            variant="secondary"
            onClick={() => notify('Test slip sent to thermal printer', 'ok')}
          >
            <Printer className="w-4 h-4" /> Print test page
          </Button>
        }
      />

      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-[15px] text-[#0B2A2F]">How receipts print</div>
          <p className="text-[13px] text-[#52666A]">
            {settings.printer.autoPrint
              ? 'Receipts print automatically when a sale completes.'
              : 'Manual print mode — tap Print on each completed sale.'}
          </p>
        </div>
        <Badge tone={settings.printer.status === 'error' ? 'err' : 'ok'} withIcon>
          {settings.printer.status === 'error' ? 'Printer offline' : 'Printer ready'}
        </Badge>
      </Card>

      <Card padding="none">
        <div className="px-5 py-3.5 border-b border-[#F1EBE3] font-display font-bold text-[16px]">
          Today’s print jobs
        </div>
        <div className="divide-y divide-[#F1EBE3]">
          {jobs.map((b) => (
            <div key={b.no} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[14px] mono">
                  Bill #{b.no} · {formatRs(calcBillTotal(b, state.items))}
                </div>
                <div className="text-[12px] text-[#52666A]">{b.time} · 80 mm thermal</div>
              </div>
              <div className="flex items-center gap-2.5">
                {b.print === 'printed' ? (
                  <Badge tone="ok">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Printed
                  </Badge>
                ) : (
                  <>
                    <Badge tone="err">{b.print}</Badge>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setPrintJobStatus(b.no, 'printed');
                        notify(`Printed Bill #${b.no}`, 'ok');
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
