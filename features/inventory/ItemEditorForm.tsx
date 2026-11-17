'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { BarcodePreview } from '@/components/domain/BarcodePreview';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CTYPES, getSizeSet, PRODUCT_ART, SIZESETS, SWATCHES } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import type { CategoryTypeId, ProductArtId, ProductItem } from '@/types';

const ART_LIST = Object.keys(PRODUCT_ART) as ProductArtId[];
const SWATCH_LIST = Object.keys(SWATCHES);

export function ItemEditorForm({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const { state, saveItem, notify } = useZyro();
  const existing = useMemo(
    () => (itemId ? state.items.find((x) => x.id === itemId) : undefined),
    [itemId, state.items]
  );

  const initialCatId = existing?.cat || state.categories[0]?.id || 'men';
  const initialCat = state.categories.find((c) => c.id === initialCatId);
  const matchedExistingSizeSet = existing?.sizes
    ? SIZESETS.find(([, , list]) => list.join(',') === existing.sizes?.join(','))?.[0]
    : existing && existing.sizes === null
      ? 'free'
      : undefined;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(existing?.name || '');
  const [cat, setCat] = useState(initialCatId);
  const [art, setArt] = useState<ProductArtId>(existing?.art || 'tee');
  const [sku, setSku] = useState(existing?.sku || '');
  const [barcode, setBarcode] = useState(existing?.barcode || '');

  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [costPrice, setCostPrice] = useState(existing?.costPrice ? String(existing.costPrice) : '');

  // Variant fields
  const [colours, setColours] = useState<string[]>(existing?.colours || ['Black', 'White']);
  const [sizeSetId, setSizeSetId] = useState<string>(
    matchedExistingSizeSet || initialCat?.sizeSetId || 'sxxl'
  );
  const [variantOpeningQty, setVariantOpeningQty] = useState('4');
  const [stock, setStock] = useState(String(existing?.stock ?? 12));
  const [measured, setMeasured] = useState(Boolean(existing?.measured));

  // Kit-specific fields
  const [karat, setKarat] = useState(existing?.karat || '22K');
  const [weightGrams, setWeightGrams] = useState(String(existing?.weightGrams ?? '3.5'));
  const [makingCharge, setMakingCharge] = useState(String(existing?.makingCharge ?? '3500'));
  const [batchNo, setBatchNo] = useState(existing?.batches?.[0]?.batchNo || 'B-2026');
  const [batchExpiry, setBatchExpiry] = useState(existing?.batches?.[0]?.expiry || '2027-06-30');
  const [serialList, setSerialList] = useState((existing?.serials || []).join('\n'));
  const [warrantyMonths, setWarrantyMonths] = useState(String(existing?.warrantyMonths ?? 12));

  const selectedCat = state.categories.find((c) => c.id === cat);
  const ctype: CategoryTypeId = selectedCat?.type || 'sc';
  const ctypeInfo = CTYPES[ctype];

  const autoSku = () => {
    const clean = name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.slice(0, 3).toUpperCase())
      .join('-');
    const code = clean || 'ITM';
    setSku(code);
    if (!barcode) {
      setBarcode(`896400${Math.floor(100000 + Math.random() * 899999)}`);
    }
  };

  const toggleColour = (col: string) => {
    setColours((prev) =>
      prev.includes(col) ? (prev.length > 1 ? prev.filter((c) => c !== col) : prev) : [...prev, col]
    );
  };

  const numPrice = parseInt(price, 10) || 0;
  const numCost = parseInt(costPrice, 10) || 0;
  const marginPct = numPrice > 0 && numCost > 0 ? Math.round(((numPrice - numCost) / numPrice) * 100) : null;

  const handleSave = () => {
    if (!name.trim()) {
      notify('Enter an item name', 'err');
      setStep(1);
      return;
    }
    if (numPrice <= 0) {
      notify('Enter a valid selling price', 'err');
      setStep(2);
      return;
    }
    const finalSku = (sku || name.slice(0, 3)).toUpperCase();
    const resolvedSetId = sizeSetId || selectedCat?.sizeSetId || 'sxxl';
    const [, sizeLabel, sizes] = getSizeSet(resolvedSetId);
    const activeSizes = ctype === 'sc' && resolvedSetId !== 'free' ? sizes : null;

    let variantQtyMap = existing?.variantQtyMap;
    if (!existing && (ctype === 'sc' || ctype === 'shade')) {
      const perVariant = Math.max(0, parseInt(variantOpeningQty, 10) || 0);
      const nextMap: Record<string, number> = {};
      colours.forEach((_, ci) => {
        if (activeSizes && activeSizes.length > 0) {
          activeSizes.forEach((__, si) => {
            nextMap[`${ci}-${si}`] = perVariant;
          });
        } else {
          nextMap[`${ci}-x`] = perVariant;
        }
      });
      variantQtyMap = nextMap;
    }

    const item: ProductItem = {
      id: existing?.id || `itm-${Date.now().toString(36)}`,
      name: name.trim(),
      cat,
      art,
      sku: finalSku,
      barcode: barcode || undefined,
      price: numPrice,
      costPrice: numCost || Math.round(numPrice * 0.6),
      measured,
      unit: measured ? existing?.unit || '/ m' : undefined,
      ...(ctype === 'sc' || ctype === 'shade'
        ? {
            colours,
            sizes: activeSizes,
            sizeLabel: ctype === 'sc' ? sizeLabel : undefined,
            chart: ctype === 'sc' && resolvedSetId !== 'free',
            variantQtyMap,
          }
        : {
            stock: parseInt(stock, 10) || 0,
            col: colours[0],
          }),
      ...(ctype === 'piece'
        ? {
            karat,
            weightGrams: parseFloat(weightGrams) || 0,
            makingCharge: parseInt(makingCharge, 10) || 0,
          }
        : {}),
      ...(ctype === 'batch'
        ? {
            batches: [{ batchNo, expiry: batchExpiry, qty: parseInt(stock, 10) || 0 }],
          }
        : {}),
      ...(ctype === 'serial'
        ? {
            serials: serialList
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            warrantyMonths: parseInt(warrantyMonths, 10) || 12,
          }
        : {}),
    };

    saveItem(item);
    notify(existing ? `Updated ${item.name}` : `Added ${item.name} to catalog`, 'ok');
    router.push('/inventory');
  };

  return (
    <div className="max-w-[780px] space-y-5">
      <PageHeader
        eyebrow={existing ? `Edit SKU · ${existing.sku}` : 'New catalog item'}
        title={existing ? existing.name : 'Add item'}
        subtitle={`Category type (${ctypeInfo.label}) decides what details Zyro asks for.`}
        actions={
          <Link href="/inventory">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to stock
            </Button>
          </Link>
        }
      />

      {/* Stepper */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: 1 as const, label: '1. Item & category' },
          { n: 2 as const, label: '2. Pricing & setup' },
          { n: 3 as const, label: '3. Stock & barcode' },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`p-3 rounded-[11px] border text-start text-[13px] font-semibold transition-all ${
              step === s.n
                ? 'border-[#08343A] bg-[#08343A] text-white'
                : step > s.n
                  ? 'border-[#8AC7A4] bg-[#E3F4EA] text-[#14532D]'
                  : 'border-[#E7E0D7] bg-white text-[#52666A]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <Card className="space-y-4">
          <Input
            label="Item name"
            placeholder="e.g. Wash & Wear Kurta, Panadol 500mg, Gold Ring"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Category"
            value={cat}
            onChange={(e) => {
              const nextId = e.target.value;
              setCat(nextId);
              const nextCat = state.categories.find((c) => c.id === nextId);
              if (!existing && nextCat?.sizeSetId) {
                setSizeSetId(nextCat.sizeSetId);
              }
            }}
            options={state.categories.map((c) => ({
              value: c.id,
              label: `${c.label} (${CTYPES[c.type].label})`,
            }))}
          />
          <div className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7] text-[13px] text-[#3D5357]">
            <strong className="text-[#0B2A2F]">{ctypeInfo.label}:</strong> asks for {ctypeInfo.asks}.
          </div>

          <div className="space-y-1.5">
            <div className="text-[13px] font-semibold text-[#0B2A2F]">Catalog silhouette</div>
            <div className="flex flex-wrap gap-2">
              {ART_LIST.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArt(a)}
                  className={`px-3 py-1.5 rounded-[9px] border text-[12px] font-semibold capitalize ${
                    art === a
                      ? 'border-[#08343A] bg-[#08343A] text-white'
                      : 'border-[#D6CDC1] bg-white text-[#0B2A2F]'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setStep(2)}>
              Next: Pricing &amp; setup
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Selling price (Rs)"
              type="number"
              placeholder="e.g. 2490"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              label="Cost price (Rs)"
              type="number"
              placeholder="e.g. 1450"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>

          {marginPct !== null && (
            <div className="flex items-center gap-2">
              <Badge tone={marginPct >= 20 ? 'ok' : 'warn'}>Margin: {marginPct}%</Badge>
              <span className="text-[12px] text-[#52666A] num">
                Profit per unit: {formatRs(numPrice - numCost)}
              </span>
            </div>
          )}

          {(ctype === 'sc' || ctype === 'shade') && (
            <div className="space-y-4 pt-2 border-t border-[#F1EBE3]">
              {ctype === 'sc' && (
                <Select
                  label="Size scale"
                  value={sizeSetId}
                  onChange={(e) => setSizeSetId(e.target.value)}
                  options={SIZESETS.map(([id, label]) => ({ value: id, label }))}
                />
              )}
              <div className="space-y-1.5">
                <div className="text-[13px] font-semibold text-[#0B2A2F]">
                  {ctype === 'shade' ? 'Shades' : 'Colours'} ({colours.length} selected)
                </div>
                <div className="flex flex-wrap gap-2">
                  {SWATCH_LIST.slice(0, 14).map((c) => {
                    const active = colours.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleColour(c)}
                        className={`px-2.5 py-1.5 rounded-[9px] border text-[12px] font-semibold flex items-center gap-1.5 ${
                          active
                            ? 'border-[#08343A] bg-[#08343A] text-white'
                            : 'border-[#D6CDC1] bg-white text-[#0B2A2F]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: SWATCHES[c] }}
                        />
                        {c}
                        {active && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {ctype === 'piece' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F1EBE3]">
              <Input label="Karat / Purity" value={karat} onChange={(e) => setKarat(e.target.value)} />
              <Input label="Weight (grams)" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} />
              <Input label="Making charge (Rs)" value={makingCharge} onChange={(e) => setMakingCharge(e.target.value)} />
            </div>
          )}

          {ctype === 'batch' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F1EBE3]">
              <Input label="Batch number" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
              <Input label="Expiry date" type="date" value={batchExpiry} onChange={(e) => setBatchExpiry(e.target.value)} />
            </div>
          )}

          {(ctype === 'pack' || ctype === 'simple' || existing?.measured) && (
            <label className="flex items-center gap-2.5 p-3 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4] cursor-pointer">
              <input
                type="checkbox"
                checked={measured}
                onChange={(e) => setMeasured(e.target.checked)}
                className="w-4 h-4 accent-[#08343A]"
              />
              <div>
                <div className="text-[13px] font-semibold text-[#0B2A2F]">
                  Sold loose by metre or kg (Measured item)
                </div>
                <div className="text-[12px] text-[#52666A]">
                  Locked from fast barcode counter until measured cut is entered
                </div>
              </div>
            </label>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)}>Next: Stock &amp; barcode</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Short SKU"
              placeholder="e.g. KUR-WHT"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              suffixNode={
                <button
                  type="button"
                  onClick={autoSku}
                  className="text-[12px] font-semibold text-[#08343A] flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto
                </button>
              }
            />
            <Input
              label="Maker or Zyro barcode"
              placeholder="Scan or click Auto"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          {ctype === 'serial' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#0B2A2F]">
                  Serials / IMEIs (one per line)
                </label>
                <textarea
                  rows={4}
                  value={serialList}
                  onChange={(e) => setSerialList(e.target.value)}
                  placeholder="358291048291001"
                  className="field rounded-[10px] border border-[#8A8276] p-3 text-[13px] mono"
                />
              </div>
              <Input
                label="Warranty (months)"
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
              />
            </div>
          ) : (ctype === 'sc' || ctype === 'shade') ? (
            !existing && (
              <Input
                label="Opening quantity per variant (colour × size)"
                type="number"
                min={0}
                value={variantOpeningQty}
                onChange={(e) => setVariantOpeningQty(e.target.value)}
                hint="Sets initial shelf count for each selected colour/size combination"
              />
            )
          ) : (
            <Input
              label="Opening quantity on shelf"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          )}

          <div className="pt-2">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A] mb-2">
              Label preview
            </div>
            <BarcodePreview
              code={barcode || sku || 'ZYRO-NEW'}
              label={name || 'New Item'}
              priceText={numPrice > 0 ? formatRs(numPrice) : 'Rs 0'}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" size="lg" onClick={handleSave}>
              {existing ? 'Save item changes' : 'Save item to catalog'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
