'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, PauseCircle, PlayCircle, ShieldAlert, Tag, Trash2 } from 'lucide-react';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SWATCHES } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import type { BillDiscount } from '@/types';
import {
  formatOfferCustomerText,
  formatVariantDisplay,
  formatVariantSizeLabel,
  getOfferSavings,
  type FootwearProductRecord,
  type FootwearVariantRecord,
  type PosHeldBillRecord,
  type ProductOffer,
  type SizingSystem,
} from '@/types/footwear';

export interface FootwearCartLine {
  key: string;
  productId: string;
  variantId: string;
  name: string;
  brand?: string | null;
  artId: string;
  imageUrl?: string | null;
  variantText: string;
  colourName: string;
  sizeName: string;
  sizingSystem: SizingSystem;
  sku: string;
  barcode?: string | null;
  price: number;
  originalPrice: number;
  qty: number;
  availableStock: number;
  lineDiscount: number;
  offer?: ProductOffer | null;
  note?: string;
}

export function VariantPickerModal({
  product,
  cartQtyByVariant,
  onClose,
  onAdd,
}: {
  product: FootwearProductRecord | null;
  cartQtyByVariant: Record<string, number>;
  onClose: () => void;
  onAdd: (variant: FootwearVariantRecord, product: FootwearProductRecord, qty?: number) => void;
}) {
  const colours = useMemo(() => {
    if (!product) return [] as string[];
    const list = Array.from(new Set(product.variants.filter((v) => v.isActive).map((v) => v.colourName)));
    return list.length > 0 ? list : ['Standard'];
  }, [product]);

  const initialColour = useMemo(() => {
    if (!product) return '';
    const inStockVariant = product.variants.find((v) => v.isActive && v.availableStock > 0);
    return inStockVariant?.colourName || colours[0] || '';
  }, [product, colours]);

  const [selectedColour, setSelectedColour] = useState<string>(initialColour);

  const variantsForColour = useMemo(() => {
    if (!product) return [] as FootwearVariantRecord[];
    return product.variants.filter(
      (v) => v.isActive && (colours.length === 1 || v.colourName === selectedColour)
    );
  }, [product, colours.length, selectedColour]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    const first = variantsForColour.find((v) => v.availableStock > 0) || variantsForColour[0];
    return first?.id || '';
  });

  if (!product) return null;

  const activeVariant =
    variantsForColour.find((v) => v.id === selectedVariantId) ||
    variantsForColour.find((v) => v.availableStock > 0) ||
    variantsForColour[0] ||
    null;

  const alreadyInCart = activeVariant ? cartQtyByVariant[activeVariant.id] || 0 : 0;
  const remainingStock = activeVariant ? Math.max(0, activeVariant.availableStock - alreadyInCart) : 0;

  const handleColourSelect = (colour: string) => {
    setSelectedColour(colour);
    const nextList = product.variants.filter((v) => v.isActive && v.colourName === colour);
    const firstAvail = nextList.find((v) => v.availableStock > 0) || nextList[0];
    if (firstAvail) setSelectedVariantId(firstAvail.id);
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={product.name}
      subtitle={[
        product.brand,
        product.categoryPath || product.categoryName,
        product.sizingSystem !== 'STANDARD' ? `${product.sizingSystem} sizing` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      maxWidth="md"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 p-3 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7]">
          <ProductArtwork
            artId={product.artId}
            imageUrl={product.primaryImageUrl}
            alt={product.name}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] text-[#0B2A2F]">
              {activeVariant
                ? formatVariantDisplay(
                    activeVariant.colourName,
                    activeVariant.sizeName,
                    activeVariant.sizingSystem,
                  )
                : 'Select variant'}
            </div>
            {activeVariant && (
              <div className="text-[12px] text-[#52666A] mono mt-0.5 truncate">
                SKU: {activeVariant.sku}
                {activeVariant.primaryBarcode ? ` · ${activeVariant.primaryBarcode}` : ''}
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {activeVariant && remainingStock > 0 ? (
                <Badge tone="ok">
                  {activeVariant.availableStock} in stock
                  {alreadyInCart > 0 ? ` (${alreadyInCart} in bill)` : ''}
                </Badge>
              ) : (
                <Badge tone="err">
                  {alreadyInCart > 0 ? `All ${activeVariant?.availableStock ?? 0} already in bill` : 'Out of stock'}
                </Badge>
              )}
              {activeVariant && (
                <span className="font-bold text-[14px] text-[#08343A] num">
                  {formatRs(activeVariant.sellingPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        {(() => {
          const activeOffer = product.offer?.isActive ? product.offer : null;
          const unitPrice = activeVariant?.sellingPrice ?? product.baseSellingPrice;
          const offerMsg = formatOfferCustomerText(unitPrice, activeOffer, formatRs);
          if (!activeOffer || !offerMsg) return null;
          const regularTotal = unitPrice * activeOffer.minQuantity;
          return (
            <div className="p-3 rounded-[12px] bg-[#FCEFE4] border border-[#E2B48F] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 text-[#C9682E] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[13px] font-bold text-[#8A3D12]">{offerMsg}</div>
                  <div className="text-[12px] text-[#8A3D12] num">
                    Bundle offer: {activeOffer.minQuantity} for{' '}
                    <strong>{formatRs(activeOffer.bundlePrice)}</strong>{' '}
                    <span className="line-through opacity-75">{formatRs(regularTotal)}</span>
                  </div>
                </div>
              </div>
              <Badge tone="copper">Offered product</Badge>
            </div>
          );
        })()}

        {colours.length > 0 && (
          <div className="space-y-2">
            <div className="text-[13px] font-semibold text-[#0B2A2F]">Colour</div>
            <div className="flex flex-wrap gap-2">
              {colours.map((col) => {
                const active = col === selectedColour;
                const colStock = product.variants
                  .filter((v) => v.isActive && v.colourName === col)
                  .reduce((s, v) => s + v.availableStock, 0);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleColourSelect(col)}
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
                    <span className="text-[11px] font-normal text-[#52666A]">({colStock})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[13px] font-semibold text-[#0B2A2F]">
            {(activeVariant?.sizingSystem || product.sizingSystem) === 'STANDARD'
              ? 'Size'
              : `Size (${activeVariant?.sizingSystem || product.sizingSystem})`}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {variantsForColour.map((v) => {
              const inCart = cartQtyByVariant[v.id] || 0;
              const avail = Math.max(0, v.availableStock - inCart);
              const active = activeVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`py-2.5 px-2 rounded-[10px] border text-center transition-all ${
                    active
                      ? 'border-[#08343A] bg-[#08343A] text-white'
                      : avail === 0
                        ? 'border-[#E7E0D7] bg-[#F1EBE3] text-[#5F7174]'
                        : 'border-[#D6CDC1] bg-white hover:border-[#E2B48F]'
                  }`}
                >
                  <div className="font-bold text-[14px]">
                    {formatVariantSizeLabel(v.sizeName, v.sizingSystem)}
                  </div>
                  <div className={`text-[11px] ${active ? 'text-[#C9DADB]' : 'text-[#52666A]'}`}>
                    {v.availableStock} left
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {product.offer?.isActive &&
            activeVariant &&
            getOfferSavings(activeVariant.sellingPrice, product.offer) > 0 &&
            remainingStock >= product.offer.minQuantity && (
              <Button
                variant="copperTint"
                size="lg"
                onClick={() => {
                  onAdd(activeVariant, product, product.offer!.minQuantity);
                  onClose();
                }}
              >
                <Tag className="w-4 h-4" />
                Add {product.offer.minQuantity} · {formatRs(product.offer.bundlePrice)}
              </Button>
            )}
          <Button
            variant="primary"
            size="lg"
            disabled={!activeVariant || remainingStock <= 0}
            onClick={() => {
              if (!activeVariant) return;
              onAdd(activeVariant, product, 1);
              onClose();
            }}
          >
            {!activeVariant || remainingStock <= 0
              ? 'Out of stock'
              : `Add to bill · ${formatRs(activeVariant.sellingPrice)}`}
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
  canDiscount = true,
  canApproveHighDiscount = false,
  onApply,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  current: BillDiscount | null;
  canDiscount?: boolean;
  canApproveHighDiscount?: boolean;
  onApply: (d: BillDiscount) => void;
  onRemove: () => void;
}) {
  const { settings, notify } = useZyro();
  const [mode, setMode] = useState<'pct' | 'rs'>(current?.mode || 'pct');
  const [value, setValue] = useState(String(current?.value || 5));
  const [reason, setReason] = useState(current?.reason || 'Regular customer discount');
  const [error, setError] = useState('');

  const numVal = Math.max(0, Number(value) || 0);
  const pctEquiv = mode === 'pct' ? numVal : subtotal > 0 ? Math.round((numVal / subtotal) * 100) : 0;
  const maxCashierPct = settings.cashierMaxDiscountPct || 10;
  const exceedsLimit = !canApproveHighDiscount && pctEquiv > maxCashierPct;

  const handleApply = () => {
    if (!canDiscount) {
      setError('Your role does not have permission to apply bill discounts.');
      return;
    }
    if (numVal <= 0) {
      setError('Enter a discount greater than 0.');
      return;
    }
    if (mode === 'pct' && numVal > 100) {
      setError('Percentage discount cannot exceed 100%.');
      return;
    }
    if (mode === 'rs' && numVal > subtotal) {
      setError('Discount cannot exceed bill subtotal.');
      return;
    }
    if (exceedsLimit) {
      setError(`Your role is limited to ${maxCashierPct}% discount. Ask an owner or manager.`);
      return;
    }
    onApply({
      mode,
      value: numVal,
      reason: reason.trim() || undefined,
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

        {exceedsLimit && (
          <div className="p-3.5 rounded-[12px] bg-[#FFF3C4] border border-[#EBD892] flex items-center gap-2 text-[13px] font-semibold text-[#6B4E00]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Discounts over {maxCashierPct}% require owner/manager approval permission.
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
            <Button variant="primary" onClick={handleApply} disabled={!canDiscount}>
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
  canOverridePrice = false,
  canDiscount = true,
  onClose,
  onSave,
  onRemove,
}: {
  line: FootwearCartLine | null;
  canOverridePrice?: boolean;
  canDiscount?: boolean;
  onClose: () => void;
  onSave: (key: string, patch: Partial<FootwearCartLine>) => void;
  onRemove: (key: string) => void;
}) {
  const [qty, setQty] = useState(line ? line.qty : 1);
  const [price, setPrice] = useState(line ? line.price : 0);
  const [lineDiscount, setLineDiscount] = useState(line ? line.lineDiscount : 0);
  const [note, setNote] = useState(line?.note || '');
  const [err, setErr] = useState('');

  if (!line) return null;

  const maxLineDiscount = Math.max(0, price * qty);

  const handleSave = () => {
    if (qty < 1) {
      setErr('Quantity must be at least 1.');
      return;
    }
    if (qty > line.availableStock) {
      setErr(`Only ${line.availableStock} available in this branch.`);
      return;
    }
    if (lineDiscount < 0 || lineDiscount > maxLineDiscount) {
      setErr(`Line discount must be between 0 and ${formatRs(maxLineDiscount)}.`);
      return;
    }
    onSave(line.key, {
      qty,
      price: canOverridePrice ? price : line.originalPrice,
      lineDiscount: canDiscount ? lineDiscount : 0,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={!!line}
      onClose={onClose}
      title={line.name}
      subtitle={`${line.variantText} · ${line.sku}`}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {line.offer?.isActive && (() => {
          const offerMsg = formatOfferCustomerText(price, line.offer, formatRs);
          if (!offerMsg) return null;
          const bundles = Math.floor(qty / line.offer.minQuantity);
          const bundleSaving = bundles * getOfferSavings(price, line.offer);
          return (
            <div className="p-3 rounded-[10px] bg-[#FCEFE4] border border-[#E2B48F] text-[12px] text-[#8A3D12] space-y-0.5">
              <div className="font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#C9682E]" />
                {offerMsg}
              </div>
              <div className="num">
                {bundles > 0
                  ? `Offer active on ${qty} qty: −${formatRs(bundleSaving)} auto-applied`
                  : `Set quantity to ${line.offer.minQuantity} to pay ${formatRs(line.offer.bundlePrice)}`}
              </div>
            </div>
          );
        })()}
        <Input
          label={`Quantity (max ${line.availableStock} available)`}
          type="number"
          min={1}
          max={Math.max(1, line.availableStock)}
          value={qty}
          onChange={(e) => {
            const val = Math.max(1, Math.round(Number(e.target.value)) || 1);
            setQty(val);
            setErr('');
          }}
        />
        <Input
          label="Unit price (Rs)"
          type="number"
          disabled={!canOverridePrice}
          value={price}
          onChange={(e) => {
            setPrice(Math.max(0, Number(e.target.value) || 0));
            setErr('');
          }}
          hint={!canOverridePrice ? 'Only owner/manager can override item price' : undefined}
        />
        <Input
          label="Line discount (Rs)"
          type="number"
          min={0}
          disabled={!canDiscount}
          value={lineDiscount}
          onChange={(e) => {
            setLineDiscount(Math.max(0, Number(e.target.value) || 0));
            setErr('');
          }}
        />
        <Input
          label="Line note (optional)"
          placeholder="e.g. Gift box requested"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={err}
        />

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
            <Button variant="primary" onClick={handleSave}>
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
  loading,
  canHoldCurrent,
  holding,
  onHoldCurrent,
  onRecall,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  heldBills: PosHeldBillRecord[];
  loading?: boolean;
  canHoldCurrent: boolean;
  holding?: boolean;
  onHoldCurrent: (note?: string) => Promise<void> | void;
  onRecall: (bill: PosHeldBillRecord) => void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [note, setNote] = useState('');

  return (
    <Drawer open={open} onClose={onClose} title="Held bills" subtitle="Pause a customer bill without deducting stock">
      <div className="space-y-5">
        {canHoldCurrent && (
          <div className="p-4 rounded-[12px] bg-[#FCEFE4] border border-[#E2B48F] space-y-3">
            <div className="font-semibold text-[14px] text-[#8A3D12] flex items-center gap-2">
              <PauseCircle className="w-4 h-4" /> Hold current bill
            </div>
            <Input
              placeholder="Note (e.g. Trying EU 42 sneakers)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="primary"
              fullWidth
              disabled={holding}
              onClick={async () => {
                await onHoldCurrent(note.trim() || undefined);
                setNote('');
                onClose();
              }}
            >
              {holding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Hold current bill
            </Button>
          </div>
        )}

        <div className="space-y-2.5">
          {loading ? (
            <div className="py-10 text-center text-[13px] text-[#52666A] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading held bills...
            </div>
          ) : heldBills.length === 0 ? (
            <div className="py-10 text-center text-[14px] text-[#52666A]">
              No bills are on hold right now.
            </div>
          ) : (
            heldBills.map((h) => {
              const qtyCount = h.cartPayload.reduce((s, l) => s + l.qty, 0);
              return (
                <div key={h.id} className="p-4 rounded-[12px] border border-[#E7E0D7] bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono font-bold text-[14px]">{h.holdCode}</span>
                    <span className="text-[12px] text-[#52666A]">
                      {new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#3D5357]">
                    {qtyCount} item{qtyCount === 1 ? '' : 's'} ·{' '}
                    <span className="font-bold num">{formatRs(h.totalEstimate)}</span>
                    {h.customerName ? ` · ${h.customerName}` : ''}
                  </div>
                  {h.note && <div className="text-[12px] text-[#52666A] italic">“{h.note}”</div>}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="dark"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        onRecall(h);
                        onClose();
                      }}
                    >
                      <PlayCircle className="w-4 h-4" /> Resume bill
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void onDelete(h.id)}
                      aria-label="Cancel held bill"
                    >
                      <Trash2 className="w-4 h-4 text-[#B42318]" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
