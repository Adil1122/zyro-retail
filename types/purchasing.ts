export interface Supplier {
  id: string;
  name: string;
  city: string;
  phone: string;
  makes: string;
  balance?: number;
}

export type PoStatus = 'draft' | 'approved' | 'ordered' | 'partial' | 'received';

export interface PurchaseOrder {
  no: string;
  sup: string;
  status: PoStatus;
  by: string;
  d: number; // YYYYMMDD
  billed?: boolean;
  // [itemId, colourIdx, sizeIdx, qtyOrdered, poUnitCost, qtyReceived, actualUnitCost?]
  lines: Array<[string, number | null, number | null, number, number, number, number?]>;
}

export interface VendorPayment {
  amt: number;
  ref: string;
  d: number;
  by: string;
}

export interface VendorCredit {
  amt: number;
  reason: string;
  d: number;
}

export interface VendorBill {
  ref: string;
  sup: string;
  po: string;
  status: 'draft' | 'posted';
  by: string;
  inv: number;
  due: number;
  total: number;
  pays: VendorPayment[];
  credits: VendorCredit[];
}
