'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileText, Trash2, UserPlus } from 'lucide-react';
import { CustomerSelector } from '@/components/domain/CustomerSelector';
import { PaymentSummary } from '@/components/domain/PaymentSummary';
import { ProductSelector } from '@/components/domain/ProductSelector';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import type { CartLine, Customer, ProductItem } from '@/types';

export function QuoteBuilder() {
  const { addQuote, notify } = useZyro();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('Valid for 7 days · Bulk order estimate');
  const [previewMode, setPreviewMode] = useState(false);

  const addItem = (item: ProductItem) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: item.id,
          itemId: item.id,
          name: item.name,
          variantText: 'Standard',
          sku: item.sku,
          colourIdx: null,
          sizeIdx: null,
          price: item.price,
          originalPrice: item.price,
          qty: 1,
          lineDiscount: 0,
        },
      ];
    });
  };

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const saveQuote = () => {
    addQuote({
      id: `QT-${Date.now().toString().slice(-4)}`,
      customerId: customer?.id || null,
      customerName: customer?.name || 'Walk-in customer',
      validUntil: '24 Nov 2026',
      lines,
      discount: null,
      notes,
      createdAt: 'Today',
    });
    setPreviewMode(true);
    notify('Quote saved and ready to share', 'ok');
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <header className="h-[58px] bg-[#08343A] text-white px-4 sm:px-6 flex items-center justify-between">
        <Link href="/pos">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> Back to register
          </Button>
        </Link>
        <div className="font-display font-bold text-[16px]">New quote</div>
        <span className="w-24" />
      </header>

      <div className="max-w-[1100px] mx-auto p-4 sm:p-6">
        {previewMode ? (
          <Card padding="lg" className="max-w-[560px] mx-auto space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#E8F6EE] text-[#14532D] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display text-[22px] font-bold">Quote ready</h1>
                <p className="text-[13px] text-[#52666A]">
                  For {customer?.name || 'Walk-in customer'} · Valid until 24 Nov 2026
                </p>
              </div>
            </div>
            <div className="divide-y divide-[#F1EBE3] border-y border-[#E7E0D7]">
              {lines.map((l) => (
                <div key={l.key} className="py-2.5 flex justify-between text-[14px]">
                  <span>
                    {l.name} × {l.qty}
                  </span>
                  <span className="font-bold num">{formatRs(l.price * l.qty)}</span>
                </div>
              ))}
            </div>
            <PaymentSummary subtotal={subtotal} total={subtotal} itemCount={lines.reduce((s, l) => s + l.qty, 0)} />
            <div className="text-[13px] text-[#52666A]">{notes}</div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPreviewMode(false)}>
                Edit quote
              </Button>
              <Link href="/pos" className="flex-1">
                <Button variant="primary" fullWidth>
                  Done
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <ProductSelector onSelect={addItem} />
            </div>
            <Card className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[18px] font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#08343A]" /> Quote summary
                </h2>
                <Button variant="secondary" size="sm" onClick={() => setCustomerModal(true)}>
                  <UserPlus className="w-4 h-4" /> {customer ? customer.name : 'Customer'}
                </Button>
              </div>

              <div className="divide-y divide-[#F1EBE3] max-h-[280px] overflow-y-auto">
                {lines.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-[#52666A]">
                    Pick items from the left to build a price quote (does not reserve stock).
                  </div>
                ) : (
                  lines.map((l) => (
                    <div key={l.key} className="py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[14px]">{l.name}</div>
                        <div className="text-[12px] text-[#52666A] num">
                          {l.qty} × {formatRs(l.price)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                        className="p-1.5 text-[#B42318] hover:bg-[#FDF0EF] rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <Input label="Notes / validity" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <PaymentSummary subtotal={subtotal} total={subtotal} />
              <Button variant="primary" size="lg" fullWidth disabled={lines.length === 0} onClick={saveQuote}>
                Preview & save quote
              </Button>
            </Card>
          </div>
        )}
      </div>

      <CustomerSelector
        open={customerModal}
        onClose={() => setCustomerModal(false)}
        currentId={customer?.id || null}
        onPick={setCustomer}
      />
    </div>
  );
}
