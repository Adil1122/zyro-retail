export type CategoryTypeId = 'sc' | 'piece' | 'batch' | 'pack' | 'shade' | 'serial' | 'simple';

export type ProductArtId =
  | 'tee'
  | 'kurta'
  | 'suit'
  | 'jeans'
  | 'lawn'
  | 'shawl'
  | 'chappal'
  | 'sneaker'
  | 'khussa'
  | 'belt'
  | 'socks'
  | 'fabric';

export interface ProductCategory {
  id: string;
  label: string;
  type: CategoryTypeId;
  sizeSetId?: string;
  art?: ProductArtId;
  counterVisible: boolean;
  order: number;
}

export interface ProductBatch {
  batchNo: string;
  expiry: string; // YYYY-MM-DD
  qty: number;
}

export interface ProductItem {
  id: string;
  art: ProductArtId;
  name: string;
  cat: string;
  price: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  colours?: string[];
  sizes?: string[] | null;
  sizeLabel?: string;
  chart?: boolean;
  stock?: number;
  col?: string;
  measured?: boolean;
  unit?: string;
  // Kit-specific extensions
  karat?: string;
  weightGrams?: number;
  makingCharge?: number;
  batches?: ProductBatch[];
  shades?: string[];
  serials?: string[];
  warrantyMonths?: number;
  variantQtyMap?: Record<string, number>;
}

export interface StockAdjustmentRecord {
  id: string;
  itemId: string;
  variantLabel: string;
  delta: number;
  reason: string;
  by: string;
  at: string;
}

export interface StockCountLine {
  itemId: string;
  variantLabel: string;
  expected: number;
  counted: number | null;
}
