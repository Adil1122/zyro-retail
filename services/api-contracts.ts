import type {
  AppSettings,
  AuthSession,
  BillRecord,
  Customer,
  EmployeeRecord,
  ExpenseBill,
  KhataInvoice,
  OrderStatus,
  ProductCategory,
  ProductItem,
  PurchaseOrder,
  RoleId,
  SalesOrder,
  ShiftRecord,
  Supplier,
  VendorBill,
} from '@/types';

/**
 * Future Supabase service boundary contracts.
 * Initial migration uses MockZyroStore in services/zyro-store.tsx;
 * replacing methods with Supabase queries preserves UI and hook signatures.
 */
export interface IAuthRepository {
  getSession(): Promise<AuthSession>;
  signInAsRole(role: RoleId): Promise<AuthSession>;
  switchBranch(branchId: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface ICatalogRepository {
  listItems(): Promise<ProductItem[]>;
  saveItem(item: ProductItem): Promise<ProductItem>;
  listCategories(): Promise<ProductCategory[]>;
  adjustStock(itemId: string, delta: number, reason: string): Promise<void>;
}

export interface ISalesRepository {
  listBills(): Promise<BillRecord[]>;
  recordBill(bill: BillRecord): Promise<BillRecord>;
  recordReturn(billNo: number, amount: number): Promise<void>;
}

export interface IKhataRepository {
  listCustomers(): Promise<Customer[]>;
  listInvoices(): Promise<KhataInvoice[]>;
  collectPayment(customerId: string, amount: number): Promise<void>;
}

export interface IOrdersRepository {
  listOrders(): Promise<SalesOrder[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
}

export interface IPurchasingRepository {
  listSuppliers(): Promise<Supplier[]>;
  listPurchaseOrders(): Promise<PurchaseOrder[]>;
  listVendorBills(): Promise<VendorBill[]>;
}

export interface IFinanceRepository {
  listShifts(): Promise<ShiftRecord[]>;
  listExpenses(): Promise<ExpenseBill[]>;
  listEmployees(): Promise<EmployeeRecord[]>;
  getSettings(): Promise<AppSettings>;
}
