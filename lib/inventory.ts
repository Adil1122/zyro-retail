import { PRODUCT_ART, SWATCHES } from '@/constants/kits';
import type { BillDiscount, BillRecord, ProductItem } from '@/types';
import { getLuminance } from './format';

export function getVariantStock(
  item: ProductItem,
  colourIdx: number | null,
  sizeIdx: number | null
): number {
  if (item.measured) return 0;
  if (item.variantQtyMap) {
    const key = `${colourIdx ?? 'x'}-${sizeIdx ?? 'x'}`;
    if (key in item.variantQtyMap) return item.variantQtyMap[key];
  }
  if (!item.colours) return item.stock ?? 0;
  const ci = colourIdx ?? 0;
  const si = sizeIdx ?? 0;
  return (ci * 5 + si * 3 + Math.floor(item.price / 50)) % 7;
}

export function getVariantReserved(
  item: ProductItem,
  colourIdx: number | null,
  sizeIdx: number | null
): number {
  if (!item.colours) return 0;
  const ci = colourIdx ?? 0;
  const si = sizeIdx ?? 0;
  return (ci + si) % 3 === 0 ? 1 : 0;
}

export function getTotalStock(item: ProductItem): number {
  if (item.measured) return 0;
  if (!item.colours) return item.stock ?? 0;
  let total = 0;
  item.colours.forEach((_, ci) => {
    const sizes = item.sizes && item.sizes.length > 0 ? item.sizes : [null];
    sizes.forEach((__, si) => {
      total += getVariantStock(item, ci, item.sizes ? si : null);
    });
  });
  return total;
}

export function getSku(
  item: ProductItem,
  colourIdx: number | null,
  sizeIdx: number | null
): string {
  if (!item.colours || colourIdx == null) return item.sku;
  const colCode = (item.colours[colourIdx] || 'STD').slice(0, 3).toUpperCase();
  if (item.sizes && sizeIdx != null && item.sizes[sizeIdx]) {
    return `${item.sku}-${colCode}-${item.sizes[sizeIdx]}`;
  }
  return `${item.sku}-${colCode}`;
}

export function getVariantText(
  item: ProductItem,
  colourIdx: number | null,
  sizeIdx: number | null
): string {
  if (!item.colours || colourIdx == null) return 'One size';
  const c = item.colours[colourIdx] || '';
  if (!item.sizes || sizeIdx == null || !item.sizes[sizeIdx]) return c;
  const isEU = (item.sizeLabel || '').includes('EU');
  return `${c} · ${isEU ? 'EU ' : ''}${item.sizes[sizeIdx]}`;
}

export function getFirstInStockColour(item: ProductItem): number {
  const colours = item.colours || ['Standard'];
  for (let ci = 0; ci < colours.length; ci++) {
    const sizes = item.sizes && item.sizes.length > 0 ? item.sizes : [null];
    if (sizes.some((_, si) => getVariantStock(item, ci, item.sizes ? si : null) > 0)) {
      return ci;
    }
  }
  return 0;
}

export function getArtVisual(item: ProductItem, colourIdx?: number | null) {
  const art = PRODUCT_ART[item.art] ?? PRODUCT_ART.tee;
  const colourName = item.colours ? item.colours[colourIdx ?? 0] : item.col || 'Grey';
  const fill = SWATCHES[colourName] ?? '#8C918E';
  const dark = getLuminance(fill) < 0.4;
  return {
    body: art.b,
    shade: art.s || 'M0 0',
    line: art.l || 'M0 0',
    fill,
    lineCol: dark ? 'rgba(255,255,255,.55)' : 'rgba(11,42,47,.45)',
    shadeCol: dark ? 'rgba(0,0,0,.25)' : 'rgba(11,42,47,.11)',
  };
}

export function getStockStatusInfo(item: ProductItem): {
  text: string;
  dot: string;
  fg: string;
  kind: 'ok' | 'warn' | 'err';
} {
  if (item.measured) return { text: 'Locked', dot: '#C99A06', fg: '#6B4E00', kind: 'warn' };
  const st = getTotalStock(item);
  if (st === 0) return { text: 'Out of stock', dot: '#B42318', fg: '#B42318', kind: 'err' };
  if (st <= 5) return { text: `${st} left`, dot: '#C99A06', fg: '#6B4E00', kind: 'warn' };
  return { text: `${st} in stock`, dot: '#2F9E63', fg: '#52666A', kind: 'ok' };
}

export function calcDiscountAmount(discount: BillDiscount | null, subtotal: number): number {
  if (!discount) return 0;
  const amt = discount.mode === 'pct' ? Math.round((subtotal * discount.value) / 100) : discount.value;
  return Math.max(0, Math.min(amt, subtotal));
}

export function calcBillTotal(bill: BillRecord, items: ProductItem[]): number {
  const raw = bill.lines.reduce((sum, [itemId, , , qty, unitPrice]) => {
    const it = items.find((x) => x.id === itemId);
    const price = unitPrice ?? (it ? it.price : 0);
    return sum + price * qty;
  }, 0);
  return Math.max(0, raw - (bill.discountAmt || 0));
}

export function calcBillItemCount(bill: BillRecord): number {
  return bill.lines.reduce((sum, [, , , qty]) => sum + qty, 0);
}

export function generateBarcodeBars(code: string, width = 200): Array<{ x: number; w: number }> {
  const seq = [2, 1, 1, 2, 3, 1];
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    seq.push(1 + (c % 3), 1 + ((c >> 2) % 2), 1 + ((c >> 3) % 3), 1 + ((c >> 1) % 2));
  }
  seq.push(2, 3, 3, 1, 1, 1, 2);
  const total = seq.reduce((a, b) => a + b, 0);
  const k = width / total;
  let x = 0;
  const out: Array<{ x: number; w: number }> = [];
  seq.forEach((w, idx) => {
    if (idx % 2 === 0) {
      out.push({ x: +(x * k).toFixed(2), w: +(w * k).toFixed(2) });
    }
    x += w;
  });
  return out;
}

export function generateQrPath(seed = 7, size = 76): string {
  const N = 21;
  const c = size / N;
  let d = '';
  let s = seed;
  const finder = (x: number, y: number) =>
    `M${x * c} ${y * c}h${7 * c}v${7 * c}h${-7 * c}zM${(x + 1) * c} ${(y + 1) * c}v${5 * c}h${5 * c}v${-5 * c}zM${(x + 2) * c} ${(y + 2) * c}h${3 * c}v${3 * c}h${-3 * c}z`;
  d += finder(0, 0) + finder(14, 0) + finder(0, 14);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (inF) continue;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      if ((s >> 8) % 100 < 46) {
        d += `M${x * c} ${y * c}h${c}v${c}h${-c}z`;
      }
    }
  }
  return d;
}
