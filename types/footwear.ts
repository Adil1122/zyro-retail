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
