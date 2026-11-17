'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { getVariantStock } from '@/lib/inventory';

export function ShoeExchangeFlow() {
  const { state, notify } = useZyro();
  const [billQuery, setBillQuery] = useState('1043');
  const [newSizeIdx, setNewSizeIdx] = useState(3);
  const [reason, setReason] = useState<'size' | 'fault'>('size');
  const [done, setDone] = useState(false);

  const shoeItem = state.items.find((x) => x.id === 'chappal') || state.items[0];
  const sizes = shoeItem.sizes || ['40', '41', '42', '43', '44', '45'];

  const recordExchange = () => {
    setDone(true);
    notify(`Exchanged size to EU ${sizes[newSizeIdx]}`, 'ok');
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <header className="h-[58px] bg-[#08343A] text-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/pos">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> Back to register
          </Button>
        </Link>
        <div className="font-display font-bold text-[16px]">Exchange a size</div>
        <span className="w-24" />
      </header>

      <div className="max-w-[680px] mx-auto p-4 sm:p-6 space-y-5">
        {done ? (
          <Card padding="lg" className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="font-display text-[22px] font-bold">Exchange recorded</h1>
            <p className="text-[14px] text-[#52666A]">
              {shoeItem.name} · Brown EU 42 returned → Brown EU {sizes[newSizeIdx]} handed to customer (Rs 0 difference).
            </p>
            <Link href="/pos">
              <Button variant="primary" size="lg">Back to register</Button>
            </Link>
          </Card>
        ) : (
          <>
            <Card className="space-y-3">
              <h1 className="font-display text-[20px] font-bold">The pair coming back</h1>
              <SearchInput value={billQuery} onChange={setBillQuery} placeholder="Original bill # (e.g. 1043)" />
              <div className="p-3.5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[15px]">{shoeItem.name}</div>
                  <div className="text-[13px] text-[#52666A]">Bill #{billQuery || '1043'} · Brown · EU 42</div>
                </div>
                <Badge tone="neutral">{formatRs(shoeItem.price)}</Badge>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReason('size')}
                  className={`flex-1 py-2 rounded-[9px] border text-[13px] font-semibold ${
                    reason === 'size' ? 'bg-[#08343A] text-white border-[#08343A]' : 'bg-white border-[#D6CDC1]'
                  }`}
                >
                  Needs another size
                </button>
                <button
                  type="button"
                  onClick={() => setReason('fault')}
                  className={`flex-1 py-2 rounded-[9px] border text-[13px] font-semibold ${
                    reason === 'fault' ? 'bg-[#08343A] text-white border-[#08343A]' : 'bg-white border-[#D6CDC1]'
                  }`}
                >
                  Manufacturing fault
                </button>
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="font-display text-[18px] font-bold">Choose replacement size</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {sizes.map((sz, idx) => {
                  const stock = getVariantStock(shoeItem, 0, idx);
                  const active = idx === newSizeIdx;
                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={stock === 0}
                      onClick={() => setNewSizeIdx(idx)}
                      className={`py-2.5 rounded-[10px] border text-center ${
                        active
                          ? 'bg-[#FCEFE4] border-[#C9682E] text-[#8A3D12]'
                          : stock === 0
                            ? 'bg-[#F1EBE3] border-[#E7E0D7] text-[#5F7174]'
                            : 'bg-white border-[#D6CDC1]'
                      }`}
                    >
                      <div className="font-bold text-[14px]">EU {sz}</div>
                      <div className="text-[11px]">{stock === 0 ? 'Sold out' : `${stock} left`}</div>
                    </button>
                  );
                })}
              </div>
              <Button variant="primary" size="counter" fullWidth onClick={recordExchange}>
                <RefreshCw className="w-4 h-4" /> Record size exchange (Rs 0)
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
