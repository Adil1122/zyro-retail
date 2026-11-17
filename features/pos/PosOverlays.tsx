'use client';

import React, { useState } from 'react';
import { Lock, PauseCircle, PlayCircle, Ruler, ShieldAlert, Trash2 } from 'lucide-react';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { MANAGER_PIN } from '@/constants/mock-data';
import { SWATCHES } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { getFirstInStockColour, getSku, getVariantStock, getVariantText } from '@/lib/inventory';
import type { BillDiscount, CartLine, HeldBill, ProductItem } from '@/types';

export function VariantPickerModal({
  item,
  onClose,
  onAdd,
}: {
  item: ProductItem | null;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const [colourIdx, setColourIdx] = useState<number>(() => (item ? getFirstInStockColour(item) : 0));
  const [sizeIdx, setSizeIdx] = useState<number>(0);

  if (!item) return null;

  const colours = item.colours || ['Standard'];
  const sizes = item.sizes || [];
  const safeCi = Math.min(colourIdx, colours.length - 1);
  const safeSi = sizes.length > 0 ? Math.min(sizeIdx, sizes.length - 1) : null;
  const stock = getVariantStock(item, item.colours ? safeCi : null, safeSi);

  const handleConfirm = () => {
    const ci = item.colours ? safeCi : null;
    const si = sizes.length > 0 ? safeSi : null;
    const sku = getSku(item, ci, si);
    const variantText = getVariantText(item, ci, si);
    onAdd({
      key: `${item.id}-${ci ?? 'x'}-${si ?? 'x'}`,
      itemId: item.id,
      name: item.name,
      variantText,
      sku,
      colourIdx: ci,
      sizeIdx: si,
      price: item.price,
      originalPrice: item.price,
      qty: 1,
      lineDiscount: 0,
    });
    onClose();
  };

  return (
    <Modal open={!!item} onClose={onClose} title={item.name} subtitle={formatRs(item.price)} maxWidth="md">
      <div className="space-y-5">
        <div className="flex items-center gap-4 p-3 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7]">
          <ProductArtwork item={item} colourIdx={safeCi} size={64} />
          <div>
            <div className="font-semibold text-[15px] text-[#0B2A2F]">
              {getVariantText(item, item.colours ? safeCi : null, safeSi)}
            </div>
            <div className="text-[12px] text-[#52666A] mono mt-0.5">
              SKU: {getSku(item, item.colours ? safeCi : null, safeSi)}
            </div>
            <div className="mt-1.5">
              {stock > 0 ? (
                <Badge tone="ok">{stock} in stock</Badge>
              ) : (
                <Badge tone="err">Out of stock</Badge>
              )}
            </div>
          </div>
        </div>

        {item.colours && item.colours.length > 0 && (
          <div className="space-y-2">
            <div className="text-[13px] font-semibold text-[#0B2A2F]">Colour</div>
            <div className="flex flex-wrap gap-2">
              {item.colours.map((col, idx) => {
                const active = idx === safeCi;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColourIdx(idx)}
                    className={`px-3.5 py-2 rounded-[10px] border text-[13px] font-semibold flex items-center gap-2 ${
                      active
                        ? 'border-[#C9682E] bg-[#FCEFE4] text-[#8A3D12]'
                        : 'border-[#D6CDC1] bg-white hover:bg-[#F8F4EF]'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: SWATCHES[col] || '#8C918E' }}
                      className="w-3.5 h-3.5 rounded-full border border-black/15"
                    />
                    {col}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="space-y-2">
            <div className="text-[13px] font-semibold text-[#0B2A2F]">
              {item.sizeLabel || 'Size'}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {sizes.map((sz, idx) => {
                const st = getVariantStock(item, safeCi, idx);
                const active = idx === safeSi;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSizeIdx(idx)}
                    className={`py-2.5 px-2 rounded-[10px] border text-center transition-all ${
                      active
                        ? 'border-[#08343A] bg-[#08343A] text-white'
                        : st === 0
                          ? 'border-[#E7E0D7] bg-[#F1EBE3] text-[#5F7174]'
                          : 'border-[#D6CDC1] bg-white hover:border-[#E2B48F]'
                    }`}
                  >
                    <div className="font-bold text-[14px]">{sz}</div>
                    <div className={`text-[11px] ${active ? 'text-[#C9DADB]' : 'text-[#52666A]'}`}>
                      {st} left
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" disabled={stock === 0} onClick={handleConfirm}>
            {stock === 0 ? 'Out of stock' : `Add to bill · ${formatRs(item.price)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function DiscountModal({
  open,
  onClose,
  subtotal,
  current,
  onApply,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  current: BillDiscount | null;
  onApply: (d: BillDiscount) => void;
  onRemove: () => void;
}) {
  const { role, settings, notify } = useZyro();
  const [mode, setMode] = useState<'pct' | 'rs'>(current?.mode || 'pct');
  const [value, setValue] = useState(String(current?.value || 5));
  const [reason, setReason] = useState(current?.reason || 'Regular customer discount');
  const [managerPin, setManagerPin] = useState('');
  const [error, setError] = useState('');

  const numVal = Math.max(0, Number(value) || 0);
  const pctEquiv = mode === 'pct' ? numVal : subtotal > 0 ? Math.round((numVal / subtotal) * 100) : 0;
  const needsManager = role === 'cashier' && pctEquiv > settings.cashierMaxDiscountPct;

  const handleApply = () => {
    if (numVal <= 0) {
      setError('Enter a discount greater than 0.');
      return;
    }
    if (needsManager && managerPin !== MANAGER_PIN) {
      setError(`Discounts over ${settings.cashierMaxDiscountPct}% need Manager PIN (${MANAGER_PIN}).`);
      return;
    }
    onApply({
      mode,
      value: numVal,
      reason,
      approvedBy: needsManager ? 'Imran (Manager)' : undefined,
    });
    notify('Discount applied to bill', 'ok');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Discount on this bill" subtitle={`Subtotal: ${formatRs(subtotal)}`} maxWidth="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('pct')}
            className={`py-2.5 rounded-[10px] border font-semibold text-[14px] ${
              mode === 'pct' ? 'bg-[#08343A] text-white border-[#08343A]' : 'bg-white border-[#D6CDC1]'
            }`}
          >
            Percentage (%)
          </button>
          <button
            type="button"
            onClick={() => setMode('rs')}
            className={`py-2.5 rounded-[10px] border font-semibold text-[14px] ${
              mode === 'rs' ? 'bg-[#08343A] text-white border-[#08343A]' : 'bg-white border-[#D6CDC1]'
            }`}
          >
            Fixed Rupees (Rs)
          </button>
        </div>

        <div className="flex gap-2">
          {(mode === 'pct' ? [5, 10, 15, 20] : [200, 500, 1000]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setValue(String(preset));
                setError('');
              }}
              className="flex-1 py-2 rounded-[9px] border border-[#D6CDC1] bg-[#FBF8F4] hover:bg-[#FCEFE4] font-semibold text-[13px] num"
            >
              {mode === 'pct' ? `${preset}%` : formatRs(preset)}
            </button>
          ))}
        </div>

        <Input
          label={mode === 'pct' ? 'Discount %' : 'Discount amount (Rs)'}
          type="number"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
        />
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />

        {needsManager && (
          <div className="p-3.5 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] space-y-2.5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#6B4E00]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Over {settings.cashierMaxDiscountPct}% cashier limit — enter Manager PIN ({MANAGER_PIN})
            </div>
            <Input
              label="Manager PIN"
              type="password"
              maxLength={4}
              value={managerPin}
              onChange={(e) => {
                setManagerPin(e.target.value);
                setError('');
              }}
            />
          </div>
        )}

        {error && <div className="text-[13px] font-semibold text-[#B42318]">{error}</div>}

        <div className="flex items-center justify-between pt-2">
          {current ? (
            <Button
              variant="danger"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              Remove discount
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApply}>
              Apply discount
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function LineEditModal({
  line,
  onClose,
  onSave,
  onRemove,
}: {
  line: CartLine | null;
  onClose: () => void;
  onSave: (key: string, patch: Partial<CartLine>) => void;
  onRemove: (key: string) => void;
}) {
  const { role } = useZyro();
  const [qty, setQty] = useState(line ? line.qty : 1);
  const [price, setPrice] = useState(line ? line.price : 0);
  const [note, setNote] = useState(line?.note || '');

  if (!line) return null;

  return (
    <Modal open={!!line} onClose={onClose} title={line.name} subtitle={`${line.variantText} · ${line.sku}`} maxWidth="sm">
      <div className="space-y-4">
        <Input
          label={line.variantText.startsWith('Measured') ? 'Quantity / Length (m or kg)' : 'Quantity'}
          type="number"
          step={line.variantText.startsWith('Measured') ? '0.25' : '1'}
          min={line.variantText.startsWith('Measured') ? 0.25 : 1}
          value={qty}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (line.variantText.startsWith('Measured')) {
              setQty(Math.max(0.25, Number.isNaN(val) ? 1 : val));
            } else {
              setQty(Math.max(1, Math.round(val) || 1));
            }
          }}
        />
        <Input
          label="Unit price (Rs)"
          type="number"
          disabled={role === 'cashier'}
          value={price}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
          hint={role === 'cashier' ? 'Only owner/manager can override item price' : undefined}
        />
        <Input label="Line note (optional)" placeholder="e.g. Gift wrap" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="danger"
            onClick={() => {
              onRemove(line.key);
              onClose();
            }}
          >
            <Trash2 className="w-4 h-4" /> Remove
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onSave(line.key, { qty, price, note });
                onClose();
              }}
            >
              Save line
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function HeldBillsDrawer({
  open,
  onClose,
  heldBills,
  canHoldCurrent,
  onHoldCurrent,
  onRecall,
}: {
  open: boolean;
  onClose: () => void;
  heldBills: HeldBill[];
  canHoldCurrent: boolean;
  onHoldCurrent: (note?: string) => void;
  onRecall: (id: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Drawer open={open} onClose={onClose} title="Held bills" subtitle="Pause a customer bill and bring it back anytime">
      <div className="space-y-5">
        {canHoldCurrent && (
          <div className="p-4 rounded-[12px] bg-[#FCEFE4] border border-[#E2B48F] space-y-3">
            <div className="font-semibold text-[14px] text-[#8A3D12] flex items-center gap-2">
              <PauseCircle className="w-4 h-4" /> Hold current bill
            </div>
            <Input
              placeholder="Note (e.g. Checking matching dupatta)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                onHoldCurrent(note);
                setNote('');
                onClose();
              }}
            >
              Hold current bill
            </Button>
          </div>
        )}

        <div className="space-y-2.5">
          {heldBills.length === 0 ? (
            <div className="py-10 text-center text-[14px] text-[#52666A]">
              No bills are on hold right now.
            </div>
          ) : (
            heldBills.map((h) => {
              const total = h.lines.reduce((s, l) => s + l.price * l.qty, 0);
              return (
                <div key={h.id} className="p-4 rounded-[12px] border border-[#E7E0D7] bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="mono font-bold text-[14px]">Bill #{h.billNo}</span>
                    <span className="text-[12px] text-[#52666A]">{h.heldAt}</span>
                  </div>
                  <div className="text-[13px] text-[#3D5357]">
                    {h.lines.length} items · <span className="font-bold num">{formatRs(total)}</span>
                  </div>
                  {h.note && <div className="text-[12px] text-[#52666A] italic">“{h.note}”</div>}
                  <Button
                    variant="dark"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      onRecall(h.id);
                      onClose();
                    }}
                  >
                    <PlayCircle className="w-4 h-4" /> Bring back to register
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}

export function MeasuredBlockedModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Fabric by the metre can’t be sold yet" maxWidth="sm">
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#FFF3C4] text-[#6B4E00] flex items-center justify-center">
          <Ruler className="w-6 h-6" />
        </div>
        <p className="text-[14px] text-[#3D5357] leading-relaxed">
          Measured-by-the-metre selling is locked on this counter until the owner approves the pilot bolt count in Stock → Measured items.
        </p>
        <div className="flex items-center gap-2 text-[13px] text-[#52666A]">
          <Lock className="w-4 h-4" /> Ask your owner to review and unlock measured rolls.
        </div>
        <Button variant="dark" fullWidth onClick={onClose}>
          Got it
        </Button>
      </div>
    </Modal>
  );
}
