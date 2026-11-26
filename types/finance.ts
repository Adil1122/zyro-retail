export interface ShiftRecord {
  id: string;
  reg: string;
  d: number;
  opened: string;
  closed?: string;
  by: string;
  cashier: string;
  float: number;
  expected?: number;
  counted?: number;
  status: 'open' | 'closed';
  varianceReason?: string;
}

export type CashCategoryId =
  | 'owner_cash_in'
  | 'customer_collection'
  | 'misc_receipt_review'
  | 'owner_cash_out'
  | 'shop_expense'
  | 'supplier_payment'
  | 'customer_refund'
  | 'misc_payout_review';

export interface CashDraftEntry {
  id: string;
  cat: CashCategoryId;
  amt: number;
  ref: string;
  src: string;
  reason: string;
  by: string;
  when: string;
  status: 'draft' | 'reviewed' | 'cancelled';
  v: number;
  evidence?: string;
  note?: string;
  cancel?: string;
}

export type ExpenseCategoryId =
  | 'rent'
  | 'electricity'
  | 'gas'
  | 'water'
  | 'internet'
  | 'supplies'
  | 'marketing'
  | 'repairs'
  | 'transport'
  | 'other';

export interface ExpensePayment {
  amt: number;
  ref: string;
  d: number;
}

export interface ExpenseBill {
  id: string;
  title: string;
  payee: string;
  cat: ExpenseCategoryId;
  amt: number;
  svc: number;
  due: number;
  ref: string | null;
  rec?: string;
  period?: string;
  status: 'draft' | 'posted';
  pays: ExpensePayment[];
}

export interface RecurringExpense {
  id: string;
  title: string;
  payee: string;
  cat: ExpenseCategoryId;
  amt: number;
  day: number;
  start: string;
  active: boolean;
  made: string[];
}
