'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock, Ruler, Unlock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';

export function MeasuredItemView() {
  const { state, role, toggleMeasuredPilot, logMeasuredCut, notify } = useZyro();
  const [cutLength, setCutLength] = useState('3.5');

  const measuredItems = state.items.filter((i) => i.measured);
  const [selectedId, setSelectedId] = useState<string>(measuredItems[0]?.id || 'fabric');
  const fabricItem =
    measuredItems.find((i) => i.id === selectedId) ||
    measuredItems[0] || {
      id: 'fabric',
      name: 'Cotton Fabric by metre',
      sku: 'FAB-COT',
      price: 1250,
      unit: '/ m',
    };

  const pilotUnlocked = state.measuredPilotUnlocked;
  const rollMetres = state.measuredRollMetres;
  const unitLabel = (fabricItem.unit || '/ m').replace(/^\s*\/\s*/, '');
  const cutNum = parseFloat(cutLength) || 0;

  return (
    <div className="max-w-[740px] space-y-5">
      <PageHeader
        eyebrow="Pilot control · Loose & fabric rolls"
        title="Measured items"
        subtitle="Manage loose cloth, fabric bolts, and items sold by decimal length or weight."
        actions={
          <Link href="/inventory">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to stock
            </Button>
          </Link>
        }
      />

      {measuredItems.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {measuredItems.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={`px-3 py-1.5 rounded-[10px] border text-[13px] font-semibold transition-colors ${
                fabricItem.id === m.id
                  ? 'bg-[#08343A] text-white border-[#08343A]'
                  : 'bg-white text-[#0B2A2F] border-[#D6CDC1] hover:bg-[#F8F4EF]'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] bg-[#ECE6EF] text-[#4A3A5A] flex items-center justify-center shrink-0">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold text-[17px] text-[#0B2A2F]">
                {fabricItem.name}
              </div>
              <div className="text-[13px] text-[#52666A] mono">
                {fabricItem.sku} · {formatRs(fabricItem.price)} / {unitLabel}
              </div>
            </div>
          </div>
          <Badge tone={pilotUnlocked ? 'ok' : 'warn'}>
            {pilotUnlocked ? 'Pilot counter unlocked' : 'Locked on counter'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7]">
          <div>
            <div className="text-[12px] text-[#52666A]">Remaining bolt / stock</div>
            <div className="font-display text-[24px] font-bold text-[#08343A] num">
              {rollMetres.toFixed(2)} {unitLabel}
            </div>
          </div>
          <div>
            <div className="text-[12px] text-[#52666A]">Estimated stock value</div>
            <div className="font-display text-[24px] font-bold text-[#0B2A2F] num">
              {formatRs(Math.round(rollMetres * fabricItem.price))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3">
          <Input
            label={`Record a measured cut (${unitLabel})`}
            type="number"
            step="0.25"
            value={cutLength}
            onChange={(e) => setCutLength(e.target.value)}
            suffixNode={<span>{unitLabel} = {formatRs(Math.round(cutNum * fabricItem.price))}</span>}
          />
          <Button
            variant="dark"
            disabled={cutNum <= 0 || cutNum > rollMetres}
            onClick={() => {
              logMeasuredCut(cutNum);
              notify(`Logged ${cutNum} ${unitLabel} cut (${formatRs(Math.round(cutNum * fabricItem.price))})`, 'ok');
            }}
          >
            <CheckCircle2 className="w-4 h-4" /> Log cut
          </Button>
        </div>

        {role === 'owner' && (
          <div className="pt-3 border-t border-[#F1EBE3] flex items-center justify-between gap-3">
            <div className="text-[13px] text-[#52666A]">
              Owner approval lets cashiers sell measured items directly on Counter 1.
            </div>
            <Button
              size="sm"
              variant={pilotUnlocked ? 'secondary' : 'copperTint'}
              onClick={() => {
                const next = !pilotUnlocked;
                toggleMeasuredPilot();
                notify(
                  next ? 'Enabled measured items pilot on Counter 1' : 'Locked measured items from fast counter',
                  'info'
                );
              }}
            >
              {pilotUnlocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {pilotUnlocked ? 'Lock on counter' : 'Enable pilot'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
