export const FOOTWEAR_TYPES = [
  'Sneakers',
  'Formal Shoes',
  'Casual Shoes',
  'Sandals',
  'Slippers',
  'Boots',
  'Sports Shoes',
  'School Shoes',
  'Heels',
  'Flats',
] as const;

export type FootwearType = (typeof FOOTWEAR_TYPES)[number];

export const FOOTWEAR_GENDERS = ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Kids'] as const;
export type FootwearGender = (typeof FOOTWEAR_GENDERS)[number];

export const FOOTWEAR_CHILD_GROUPS = ['Men', 'Women', 'Kids'] as const;
export type FootwearChildGroup = (typeof FOOTWEAR_CHILD_GROUPS)[number];

export const PARENT_CATEGORY_OPTIONS = [
  { key: 'footwear' as const, label: 'Footwear' },
  { key: 'bags' as const, label: 'Bags / Handbags' },
] as const;
export type ParentCategoryKey = (typeof PARENT_CATEGORY_OPTIONS)[number]['key'];

export const FOOTWEAR_SIZING_SYSTEMS = ['EU', 'UK', 'US'] as const;
export const SIZING_SYSTEMS = ['EU', 'UK', 'US', 'STANDARD'] as const;
export type SizingSystem = (typeof SIZING_SYSTEMS)[number];

export const BAG_STANDARD_SIZES = ['One Size', 'Small', 'Medium', 'Large'] as const;

export function formatVariantSizeLabel(sizeName: string, sizingSystem: SizingSystem): string {
  const size = sizeName.trim();
  if (!size) return '';
  if (sizingSystem === 'STANDARD') return size;
  return `${sizingSystem} ${size}`;
}

export function formatVariantDisplay(
  colourName: string,
  sizeName: string,
  sizingSystem: SizingSystem,
): string {
  const colour = colourName.trim() || 'Standard';
  const sizeLabel = formatVariantSizeLabel(sizeName, sizingSystem);
  return sizeLabel ? `${colour} · ${sizeLabel}` : colour;
}

export interface FootwearCategoryRecord {
  id: string;
  businessId: string;
  name: string;
  parentId: string | null;
  parentName?: string | null;
  categoryScope?: 'footwear' | 'bags';
  childGroup?: string | null;
  footwearType?: string | null;
  categoryType: 'sc' | 'simple';
  sizeSetId: string | null;
  artId: string;
  counterVisible: boolean;
  sortOrder: number;
  isActive: boolean;
  defaultSizingSystem: SizingSystem;
  sizeOptions: string[];
  productCount?: number;
  totalProductCount?: number;
  childCount?: number;
}

export interface FootwearProductImageRecord {
  id: string;
  productId: string;
  storagePath: string;
  imageUrl: string | null;
  signedUrl?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface FootwearBarcodeRecord {
  id: string;
  variantId: string;
  barcode: string;
  barcodeType: 'EAN13' | 'EAN8' | 'CODE128' | 'UPC' | 'CUSTOM';
  isPrimary: boolean;
}

export interface FootwearVariantRecord {
  id: string;
  productId: string;
  variantName: string;
  sku: string;
  colourName: string;
  sizeName: string;
  sizingSystem: SizingSystem;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  isDefault: boolean;
  isActive: boolean;
  barcodes: FootwearBarcodeRecord[];
  primaryBarcode: string | null;
  stockOnHand: number;
  stockReserved: number;
  availableStock: number;
  averageCost: number;
  branchStocks?: Record<string, { onHand: number; reserved: number; reorderLevel: number }>;
}

export interface ProductOffer {
  minQuantity: number;
  bundlePrice: number;
  isActive: boolean;
  updatedAt?: string;
}

export function normalizeProductOffer(raw: unknown): ProductOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.isActive === false) return null;
  const minQuantity = Math.floor(Number(obj.minQuantity ?? 0));
  const bundlePrice = Number(obj.bundlePrice ?? 0);
  if (!Number.isFinite(minQuantity) || minQuantity < 2) return null;
  if (!Number.isFinite(bundlePrice) || bundlePrice <= 0) return null;
  return {
    minQuantity,
    bundlePrice: Math.round(bundlePrice * 100) / 100,
    isActive: true,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
  };
}

export function getOfferSavings(
  unitPrice: number,
  offer: ProductOffer | null | undefined,
): number {
  if (!offer || !offer.isActive || offer.minQuantity < 2 || offer.bundlePrice <= 0) return 0;
  const regularTotal = unitPrice * offer.minQuantity;
  return Math.max(0, Math.round((regularTotal - offer.bundlePrice) * 100) / 100);
}

export function formatOfferCustomerText(
  unitPrice: number,
  offer: ProductOffer | null | undefined,
  formatCurrency: (amount: number) => string,
): string | null {
  if (!offer || !offer.isActive) return null;
  const savings = getOfferSavings(unitPrice, offer);
  if (savings <= 0) return null;
  return `Buy ${offer.minQuantity} and get ${formatCurrency(savings)} discount`;
}

export interface CartOfferLineInput {
  key: string;
  productId: string;
  qty: number;
  price: number;
  offer?: ProductOffer | null;
}

export interface CartOfferLineResult {
  offerDiscount: number;
  bundlesApplied: number;
  totalProductQty: number;
  remainingForNextBundle: number;
  offer: ProductOffer | null;
}

export function computeCartOfferDiscounts(
  lines: CartOfferLineInput[],
): Record<string, CartOfferLineResult> {
  const results: Record<string, CartOfferLineResult> = {};
  const byProduct = new Map<string, CartOfferLineInput[]>();

  for (const line of lines) {
    const group = byProduct.get(line.productId) ?? [];
    group.push(line);
    byProduct.set(line.productId, group);
  }

  for (const [, group] of byProduct.entries()) {
    const activeOffer = group.find((l) => l.offer?.isActive)?.offer ?? null;
    const totalProductQty = group.reduce((sum, l) => sum + Math.max(0, l.qty), 0);

    if (!activeOffer || activeOffer.minQuantity < 2 || activeOffer.bundlePrice <= 0) {
      for (const l of group) {
        results[l.key] = {
          offerDiscount: 0,
          bundlesApplied: 0,
          totalProductQty,
          remainingForNextBundle: 0,
          offer: null,
        };
      }
      continue;
    }

    const bundlesApplied = Math.floor(totalProductQty / activeOffer.minQuantity);
    const remainder = totalProductQty % activeOffer.minQuantity;
    const remainingForNextBundle =
      totalProductQty < activeOffer.minQuantity
        ? activeOffer.minQuantity - totalProductQty
        : remainder === 0
          ? 0
          : activeOffer.minQuantity - remainder;

    let totalSavings = 0;
    if (bundlesApplied > 0) {
      const unitsToBundle = bundlesApplied * activeOffer.minQuantity;
      let counted = 0;
      let regularBundledTotal = 0;
      for (const l of group) {
        if (counted >= unitsToBundle) break;
        const take = Math.min(Math.max(0, l.qty), unitsToBundle - counted);
        regularBundledTotal += take * l.price;
        counted += take;
      }
      totalSavings = Math.max(
        0,
        Math.round(regularBundledTotal - bundlesApplied * activeOffer.bundlePrice),
      );
    }

    const totalGross = group.reduce((sum, l) => sum + Math.max(0, l.price * l.qty), 0);
    let remainingToDistribute = Math.min(totalSavings, Math.round(totalGross));

    group.forEach((l, idx) => {
      const lineGross = Math.max(0, Math.round(l.price * l.qty));
      let lineOfferDiscount = 0;
      if (remainingToDistribute > 0 && lineGross > 0 && totalGross > 0) {
        if (idx === group.length - 1) {
          lineOfferDiscount = Math.min(remainingToDistribute, lineGross);
        } else {
          const share = Math.floor((totalSavings * lineGross) / totalGross);
          lineOfferDiscount = Math.min(share, remainingToDistribute, lineGross);
        }
        remainingToDistribute = Math.max(0, remainingToDistribute - lineOfferDiscount);
      }

      results[l.key] = {
        offerDiscount: lineOfferDiscount,
        bundlesApplied,
        totalProductQty,
        remainingForNextBundle,
        offer: activeOffer,
      };
    });

    // If rounding capped earlier lines and left residual discount, apply to any line with headroom
    if (remainingToDistribute > 0) {
      for (const l of group) {
        if (remainingToDistribute <= 0) break;
        const lineGross = Math.max(0, Math.round(l.price * l.qty));
        const headroom = Math.max(0, lineGross - results[l.key].offerDiscount);
        if (headroom > 0) {
          const add = Math.min(headroom, remainingToDistribute);
          results[l.key].offerDiscount += add;
          remainingToDistribute -= add;
        }
      }
    }
  }

  return results;
}

export interface FootwearMetadata {
  category_scope?: 'footwear' | 'bags' | 'general';
  model?: string | null;
  footwear_type?: FootwearType | string | null;
  gender?: FootwearGender | string | null;
  material?: string | null;
  sole_material?: string | null;
  upper_material?: string | null;
  sizing_system?: SizingSystem;
  reorder_level?: number;
  offer?: ProductOffer | null;
}

export interface FootwearProductRecord {
  id: string;
  businessId: string;
  categoryId: string | null;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  categoryPath: string;
  sku: string;
  name: string;
  brand: string | null;
  model: string | null;
  footwearType: string;
  gender: string | null;
  description: string | null;
  material: string | null;
  soleMaterial: string | null;
  upperMaterial: string | null;
  sizingSystem: SizingSystem;
  artId: string;
  unitOfMeasure: string;
  baseCostPrice: number;
  baseSellingPrice: number;
  offer: ProductOffer | null;
  isActive: boolean;
  images: FootwearProductImageRecord[];
  primaryImageUrl: string | null;
  variants: FootwearVariantRecord[];
  colours: string[];
  sizes: string[];
  totalStock: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementRecord {
  id: string;
  branchId: string;
  branchName?: string;
  variantId: string;
  productId?: string;
  productName: string;
  variantLabel: string;
  sku: string;
  movementType:
    | 'opening_stock'
    | 'purchase_receipt'
    | 'sale'
    | 'sale_return'
    | 'exchange_in'
    | 'exchange_out'
    | 'adjustment'
    | 'stock_count'
    | 'transfer_out'
    | 'transfer_in'
    | 'damage'
    | 'shrinkage';
  quantityDelta: number;
  unitCost: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  performedByName: string;
  createdAt: string;
}

export interface StockCountRecord {
  id: string;
  branchId: string;
  countNumber: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'cancelled';
  notes: string | null;
  countedByName: string;
  completedAt: string | null;
  createdAt: string;
  itemCount: number;
  discrepancyCount: number;
  netVariance: number;
}

export interface PosCustomerRecord {
  id: string;
  fullName: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  khataBalance: number;
  refundOwed: number;
  notes: string | null;
}

export interface PosSaleItemRecord {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  originalUnitPrice: number;
  quantity: number;
  lineDiscountAmount: number;
  lineTotal: number;
  returnedQuantity: number;
  returnableQuantity: number;
  note: string | null;
}

export interface PosSalePaymentRecord {
  id: string;
  methodCode: 'cash' | 'jazz' | 'easy' | 'raast' | 'card' | 'bank' | 'khata' | 'other';
  amount: number;
  tenderedAmount: number | null;
  referenceNo: string | null;
  paidAt: string;
}

export interface PosSaleRecord {
  id: string;
  branchId: string;
  branchName: string;
  billNumber: number;
  status: 'completed' | 'voided' | 'refunded' | 'partially_refunded';
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  cashierMemberId: string | null;
  cashierName: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  changeGiven: number;
  refundedAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  notes: string | null;
  soldAt: string;
  items: PosSaleItemRecord[];
  payments: PosSalePaymentRecord[];
  receiptNumber: string | null;
  receiptPayload: Record<string, unknown> | null;
  printStatus: 'printed' | 'failed' | 'unknown' | 'queued';
}

export interface PosHeldBillRecord {
  id: string;
  branchId: string;
  holdCode: string;
  customerId: string | null;
  customerName: string | null;
  cartPayload: Array<{
    key: string;
    productId: string;
    variantId: string;
    name: string;
    brand?: string | null;
    variantText: string;
    colourName: string;
    sizeName: string;
    sizingSystem: SizingSystem;
    sku: string;
    price: number;
    originalPrice: number;
    qty: number;
    lineDiscount: number;
    note?: string;
  }>;
  discountPayload: { mode: 'pct' | 'rs'; value: number; reason?: string } | null;
  totalEstimate: number;
  note: string | null;
  heldAt: string;
}

export interface PosReturnRecord {
  id: string;
  returnNumber: string;
  originalSaleId: string | null;
  originalBillNumber: number | null;
  customerId: string | null;
  customerName: string | null;
  returnType: 'with_bill' | 'without_bill';
  status: string;
  totalReturnAmount: number;
  reason: string | null;
  processedByName: string;
  createdAt: string;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    condition: 'resellable' | 'damaged' | 'expired';
    restocked: boolean;
  }>;
  refund: {
    id: string;
    refundNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  } | null;
}

export interface PosExchangeRecord {
  id: string;
  exchangeNumber: string;
  originalSaleId: string;
  originalBillNumber: number | null;
  replacementSaleId: string | null;
  replacementBillNumber: number | null;
  customerName: string | null;
  returnCreditAmount: number;
  replacementTotalAmount: number;
  netDifferenceAmount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    direction: 'returned' | 'replacement';
    variantId: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}
