export type PaymentMethodId =
  | 'cash'
  | 'jazz'
  | 'easy'
  | 'raast'
  | 'card'
  | 'bank'
  | 'khata'
  | 'split';

export type PrintStatus = 'printed' | 'failed' | 'unknown' | 'queued';

export type FbrMode = 'notRequired' | 'connected' | 'queued';

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  variantText: string;
  sku: string;
  colourIdx: number | null;
  sizeIdx: number | null;
  price: number;
  originalPrice: number;
  qty: number;
  lineDiscount: number;
  note?: string;
}

export interface BillDiscount {
  mode: 'pct' | 'rs';
  value: number;
  reason?: string;
  approvedBy?: string;
}

export interface HeldBill {
  id: string;
  billNo: number;
  heldAt: string;
  customerId: string | null;
  lines: CartLine[];
  discount: BillDiscount | null;
  note?: string;
}

export interface PaymentSplitPart {
  method: Exclude<PaymentMethodId, 'split'>;
  amount: number;
  ref?: string;
}

export interface BillRecord {
  no: number;
  time: string;
  dateLabel?: string;
  cust: string | null;
  lines: Array<[string, number | null, number | null, number, number?]>;
  pay: PaymentMethodId;
  splits?: PaymentSplitPart[];
  discountAmt?: number;
  recv: number;
  collected: number;
  returned: number;
  refundOwed: number;
  print: PrintStatus;
  fbrStatus?: FbrMode;
  fbrInvoiceNo?: string;
  offlinePending?: boolean;
  cashierId?: string;
}

export interface QuoteRecord {
  id: string;
  customerId: string | null;
  customerName: string;
  validUntil: string;
  lines: CartLine[];
  discount: BillDiscount | null;
  notes: string;
  createdAt: string;
}
