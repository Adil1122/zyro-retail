'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { categoriesForKit, kitById } from '@/constants/kits';
import { calcCashDrawerSummary } from '@/lib/cash';
import { getVariantStock } from '@/lib/inventory';
import {
  ADVANCES,
  BILLS,
  CASH_DRAFTS,
  CONSENT,
  CUSTOMERS,
  DEFAULT_BRANCHES,
  DEFAULT_SETTINGS,
  EMPLOYEES,
  EXP_BILLS,
  EXP_REC,
  HELD_BILLS_SEED,
  ITEMS,
  KH_INV,
  KIT_EXTRA_ITEMS,
  MESSAGE_DRAFTS,
  MOCK_USERS,
  PAYRUNS,
  PURCHASE_ORDERS,
  SHIFTS,
  SHIPMENTS,
  SORDERS,
  SUPPLIERS,
  VBILLS,
} from '@/constants/mock-data';
import type {
  AppSettings,
  AuthSession,
  BillDiscount,
  BillRecord,
  CashDraftEntry,
  CartLine,
  Customer,
  EmployeeRecord,
  ExpenseBill,
  HeldBill,
  KhataConsentRecord,
  KhataInvoice,
  KhataReminderMessage,
  LanguageId,
  MessageDraft,
  OrderStatus,
  PaymentMethodId,
  PaymentSplitPart,
  PayrollRun,
  PrintStatus,
  ProductCategory,
  ProductItem,
  PurchaseOrder,
  QuoteRecord,
  RecurringExpense,
  RoleId,
  SalaryAdvance,
  SalesOrder,
  ShiftRecord,
  ShipmentRecord,
  ShopKitId,
  StockAdjustmentRecord,
  Supplier,
  VendorBill,
} from '@/types';

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'ok' | 'warn' | 'err' | 'info';
}

export interface ZyroState {
  session: AuthSession;
  settings: AppSettings;
  categories: ProductCategory[];
  items: ProductItem[];
  customers: Customer[];
  bills: BillRecord[];
  heldBills: HeldBill[];
  quotes: QuoteRecord[];
  khataInvoices: KhataInvoice[];
  khataConsent: Record<string, KhataConsentRecord>;
  khataMessages: KhataReminderMessage[];
  ownerPassword: string;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  vendorBills: VendorBill[];
  shifts: ShiftRecord[];
  cashDrafts: CashDraftEntry[];
  expenseBills: ExpenseBill[];
  recurringExpenses: RecurringExpense[];
  employees: EmployeeRecord[];
  advances: SalaryAdvance[];
  payrollRuns: PayrollRun[];
  orders: SalesOrder[];
  shipments: ShipmentRecord[];
  messageDrafts: MessageDraft[];
  stockAdjustments: StockAdjustmentRecord[];
  measuredPilotUnlocked: boolean;
  measuredRollMetres: number;
  nextBillNo: number;
  cart: CartLine[];
  cartCustomerId: string | null;
  cartDiscount: BillDiscount | null;
}

function applyItemStockDelta(
  items: ProductItem[],
  itemId: string,
  colourIdx: number | null,
  sizeIdx: number | null,
  delta: number
): ProductItem[] {
  if (delta === 0) return items;
  return items.map((it) => {
    if (it.id !== itemId || it.measured) return it;
    if (!it.colours) {
      return { ...it, stock: Math.max(0, (it.stock ?? 0) + delta) };
    }
    const nextMap = { ...(it.variantQtyMap || {}) };
    const ci = colourIdx ?? 0;
    const si = it.sizes && it.sizes.length > 0 ? (sizeIdx ?? 0) : null;
    const vKey = `${ci}-${si ?? 'x'}`;
    const cur = vKey in nextMap ? nextMap[vKey] : getVariantStock(it, ci, si);
    nextMap[vKey] = Math.max(0, cur + delta);
    return { ...it, variantQtyMap: nextMap };
  });
}

function createInitialState(): ZyroState {
  return {
    session: {
      isAuthenticated: true,
      isDeviceSetup: true,
      counterSignedIn: true,
      user: MOCK_USERS.owner,
      shopName: DEFAULT_SETTINGS.shopName,
      kit: 'clothing',
      branchId: 'main',
      branches: DEFAULT_BRANCHES,
      language: 'en',
    },
    settings: DEFAULT_SETTINGS,
    categories: categoriesForKit('clothing'),
    items: ITEMS,
    customers: CUSTOMERS,
    bills: BILLS,
    heldBills: HELD_BILLS_SEED,
    quotes: [],
    khataInvoices: KH_INV,
    khataConsent: CONSENT,
    khataMessages: [],
    ownerPassword: 'ZyroShop@2026',
    suppliers: SUPPLIERS,
    purchaseOrders: PURCHASE_ORDERS,
    vendorBills: VBILLS,
    shifts: SHIFTS,
    cashDrafts: CASH_DRAFTS,
    expenseBills: EXP_BILLS,
    recurringExpenses: EXP_REC,
    employees: EMPLOYEES,
    advances: ADVANCES,
    payrollRuns: PAYRUNS,
    orders: SORDERS,
    shipments: SHIPMENTS,
    messageDrafts: MESSAGE_DRAFTS,
    stockAdjustments: [],
    measuredPilotUnlocked: false,
    measuredRollMetres: 42.5,
    nextBillNo: 1044,
    cart: [
      {
        key: 'tee-0-1',
        itemId: 'tee',
        name: 'Everyday Tee',
        variantText: 'Black · M',
        sku: 'TEE-BLA-M',
        colourIdx: 0,
        sizeIdx: 1,
        price: 1350,
        originalPrice: 1350,
        qty: 2,
        lineDiscount: 0,
      },
      {
        key: 'chappal-0-2',
        itemId: 'chappal',
        name: 'Peshawari Chappal',
        variantText: 'Brown · EU 42',
        sku: 'PSH-BRO-42',
        colourIdx: 0,
        sizeIdx: 2,
        price: 4500,
        originalPrice: 4500,
        qty: 1,
        lineDiscount: 0,
      },
      {
        key: 'socks-x-x',
        itemId: 'socks',
        name: 'Cotton Socks 3-pack',
        variantText: 'One size',
        sku: 'SCK-3PK',
        colourIdx: null,
        sizeIdx: null,
        price: 650,
        originalPrice: 650,
        qty: 1,
        lineDiscount: 0,
      },
    ],
    cartCustomerId: null,
    cartDiscount: null,
  };
}

interface ZyroContextValue {
  state: ZyroState;
  toasts: ToastMessage[];
  notify: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
  setRole: (role: RoleId) => void;
  setLanguage: (lang: LanguageId) => void;
  setKit: (kit: ShopKitId) => void;
  setBranch: (branchId: string) => void;
  signOut: () => void;
  completeAuthSignIn: (role: RoleId, shopName?: string, kit?: ShopKitId, userName?: string) => void;
  updateOwnerPassword: (newPassword: string) => void;
  updateEmployeePin: (employeeId: string, pin: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  // Cart & POS actions
  addToCart: (line: CartLine) => void;
  updateCartLine: (key: string, patch: Partial<CartLine>) => void;
  removeCartLine: (key: string) => void;
  clearCart: () => void;
  setCartCustomer: (customerId: string | null) => void;
  setCartDiscount: (discount: BillDiscount | null) => void;
  holdCurrentBill: (note?: string) => void;
  recallHeldBill: (heldId: string) => void;
  completeSale: (params: {
    pay: PaymentMethodId;
    recv: number;
    splits?: PaymentSplitPart[];
    discountAmt?: number;
  }) => BillRecord;
  reprintBill: (billNo: number) => void;
  refundBill: (billNo: number, amount: number, method: 'cash' | 'khata') => void;
  setPrintJobStatus: (billNo: number, status: PrintStatus) => void;
  syncOfflineBills: () => void;
  addQuote: (quote: QuoteRecord) => void;
  // Customers & Khata
  addCustomer: (name: string, phone: string) => Customer;
  collectKhataPayment: (customerId: string, amount: number, invoiceNo?: string) => void;
  setKhataConsent: (customerId: string, evidence: string) => void;
  settleCustomerRefund: (customerId: string, amount: number, fromDrawer?: boolean) => void;
  addKhataReminder: (msg: KhataReminderMessage) => void;
  // Inventory
  saveItem: (item: ProductItem) => void;
  deleteItem: (itemId: string) => void;
  adjustStock: (
    itemId: string,
    variantLabel: string,
    delta: number,
    reason: string,
    variantKey?: string
  ) => void;
  saveCategories: (cats: ProductCategory[]) => void;
  toggleMeasuredPilot: () => void;
  logMeasuredCut: (metres: number) => void;
  // Orders
  createOrder: (order: SalesOrder) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  packOrderLine: (orderId: string, lineIdx: number) => void;
  createShipment: (shipment: ShipmentRecord) => void;
  completeRtoInspection: (orderId: string, condition: 'resellable' | 'damaged') => void;
  matchShipmentCod: (shipmentId: string, got: number, fees: number, ref: string) => void;
  markMessageSent: (draftId: string, bodyOverride?: string) => void;
  // Purchasing
  createPurchaseOrder: (po: PurchaseOrder) => void;
  approvePurchaseOrder: (poNo: string) => void;
  markPoOrdered: (poNo: string) => void;
  receivePurchaseOrder: (poNo: string, receivedMap: Record<number, { qty: number; cost: number }>) => void;
  addSupplier: (sup: Supplier) => void;
  addVendorBill: (bill: VendorBill) => void;
  postVendorBill: (ref: string) => void;
  payVendorBill: (ref: string, amt: number, payRef: string) => void;
  addVendorCredit: (ref: string, amt: number, reason: string) => void;
  // Cash, Shifts & Expenses
  openShift: (floatAmt: number, cashierName: string) => void;
  closeShift: (shiftId: string, counted: number, varianceReason?: string, expectedOverride?: number) => void;
  addCashDraft: (entry: CashDraftEntry) => void;
  reviewCashDraft: (id: string, status: 'reviewed' | 'cancelled', note?: string) => void;
  addExpenseBill: (bill: ExpenseBill) => void;
  postExpenseBill: (id: string) => void;
  payExpenseBill: (id: string, amt: number, ref: string, fromCashDrawer?: boolean) => void;
  toggleRecurringExpense: (id: string) => void;
  generateMonthlyExpenseBill: (recId: string, period?: string) => ExpenseBill | null;
  // Staff & Payroll
  addEmployee: (emp: EmployeeRecord) => void;
  updateEmployee: (id: string, patch: Partial<EmployeeRecord>) => void;
  addAdvance: (adv: SalaryAdvance) => void;
  postPayrollRun: (period: string) => void;
  createPayrollRun: (period: string, days: number) => void;
  updatePayrollLine: (
    period: string,
    empId: string,
    patch: {
      paidDays?: number;
      allowance?: number;
      bonus?: number;
      overtime?: number;
      reduction?: number;
      advanceRecovery?: number;
    }
  ) => void;
  payPayrollEmployee: (period: string, empId: string, amount: number) => void;
  resetDemoState: () => void;
}

const ZyroContext = createContext<ZyroContextValue | null>(null);

const STORAGE_KEY = 'zyro_retail_pos_v1';

export function ZyroStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ZyroState>(() => createInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ZyroState>;
        if (parsed && parsed.session && parsed.items) {
          setState((prev) => ({
            ...prev,
            ...parsed,
            khataMessages: parsed.khataMessages ?? prev.khataMessages,
            ownerPassword: parsed.ownerPassword ?? prev.ownerPassword,
          }));
        }
      }
    } catch {
      // ignore corrupted local storage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated]);

  // Sync document dir/lang for Urdu RTL
  useEffect(() => {
    const lang = state.session.language;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
  }, [state.session.language]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'ok') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  const setRole = useCallback((role: RoleId) => {
    setState((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        isAuthenticated: true,
        counterSignedIn: true,
        user: MOCK_USERS[role],
      },
    }));
  }, []);

  const setLanguage = useCallback((language: LanguageId) => {
    setState((prev) => ({
      ...prev,
      session: { ...prev.session, language },
      settings: { ...prev.settings, language },
    }));
  }, []);

  const setKit = useCallback((kit: ShopKitId) => {
    const cfg = kitById(kit);
    const extra = KIT_EXTRA_ITEMS[kit] || [];
    setState((prev) => ({
      ...prev,
      session: { ...prev.session, kit, shopName: cfg.defaultShopName },
      settings: { ...prev.settings, kit, shopName: cfg.defaultShopName },
      categories: categoriesForKit(kit),
      items: extra.length > 0 ? [...extra, ...ITEMS] : ITEMS,
    }));
  }, []);

  const setBranch = useCallback((branchId: string) => {
    setState((prev) => ({
      ...prev,
      session: { ...prev.session, branchId },
    }));
  }, []);

  const signOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      session: { ...prev.session, isAuthenticated: false, counterSignedIn: false },
    }));
  }, []);

  const completeAuthSignIn = useCallback(
    (role: RoleId, shopName?: string, kit?: ShopKitId, userName?: string) => {
      setState((prev) => {
        const nextKit = kit || prev.session.kit;
        const cfg = kitById(nextKit);
        const nextShop = shopName || prev.session.shopName || cfg.defaultShopName;
        const baseUser = MOCK_USERS[role];
        const nextUser = userName
          ? {
              ...baseUser,
              name: userName,
              shortName: userName.split(' ')[0] || baseUser.shortName,
              initials: userName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0].toUpperCase())
                .join(''),
            }
          : baseUser;
        return {
          ...prev,
          session: {
            ...prev.session,
            isAuthenticated: true,
            isDeviceSetup: true,
            counterSignedIn: true,
            user: nextUser,
            kit: nextKit,
            shopName: nextShop,
          },
          settings: {
            ...prev.settings,
            kit: nextKit,
            shopName: nextShop,
          },
          categories: kit ? categoriesForKit(kit) : prev.categories,
        };
      });
    },
    []
  );

  const updateOwnerPassword = useCallback((ownerPassword: string) => {
    setState((prev) => ({ ...prev, ownerPassword }));
  }, []);

  const updateEmployeePin = useCallback((employeeId: string, pin: string) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === employeeId ? { ...e, pin } : e)),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
      session: {
        ...prev.session,
        shopName: patch.shopName ?? prev.session.shopName,
        language: patch.language ?? prev.session.language,
        kit: patch.kit ?? prev.session.kit,
      },
    }));
  }, []);

  const addToCart = useCallback((line: CartLine) => {
    setState((prev) => {
      const idx = prev.cart.findIndex((c) => c.key === line.key);
      if (idx >= 0) {
        const updated = [...prev.cart];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + line.qty };
        return { ...prev, cart: updated };
      }
      return { ...prev, cart: [...prev.cart, line] };
    });
  }, []);

  const updateCartLine = useCallback((key: string, patch: Partial<CartLine>) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart
        .map((c) => (c.key === key ? { ...c, ...patch } : c))
        .filter((c) => c.qty > 0),
    }));
  }, []);

  const removeCartLine = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.filter((c) => c.key !== key),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      cart: [],
      cartCustomerId: null,
      cartDiscount: null,
    }));
  }, []);

  const setCartCustomer = useCallback((cartCustomerId: string | null) => {
    setState((prev) => ({ ...prev, cartCustomerId }));
  }, []);

  const setCartDiscount = useCallback((cartDiscount: BillDiscount | null) => {
    setState((prev) => ({ ...prev, cartDiscount }));
  }, []);

  const holdCurrentBill = useCallback((note?: string) => {
    setState((prev) => {
      if (prev.cart.length === 0) return prev;
      const held: HeldBill = {
        id: `held-${Date.now()}`,
        billNo: prev.nextBillNo,
        heldAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        customerId: prev.cartCustomerId,
        lines: prev.cart,
        discount: prev.cartDiscount,
        note,
      };
      return {
        ...prev,
        heldBills: [held, ...prev.heldBills],
        nextBillNo: prev.nextBillNo + 1,
        cart: [],
        cartCustomerId: null,
        cartDiscount: null,
      };
    });
  }, []);

  const recallHeldBill = useCallback((heldId: string) => {
    setState((prev) => {
      const target = prev.heldBills.find((h) => h.id === heldId);
      if (!target) return prev;
      const remainingHeld = prev.heldBills.filter((h) => h.id !== heldId);
      const parked: HeldBill | null =
        prev.cart.length > 0
          ? {
              id: `held-${Date.now()}`,
              billNo: prev.nextBillNo,
              heldAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
              customerId: prev.cartCustomerId,
              lines: prev.cart,
              discount: prev.cartDiscount,
              note: 'Auto-held on recall',
            }
          : null;
      return {
        ...prev,
        heldBills: parked ? [parked, ...remainingHeld] : remainingHeld,
        nextBillNo: parked ? prev.nextBillNo + 1 : prev.nextBillNo,
        cart: target.lines,
        cartCustomerId: target.customerId,
        cartDiscount: target.discount,
      };
    });
  }, []);

  const completeSale = useCallback(
    ({
      pay,
      recv,
      splits,
      discountAmt = 0,
    }: {
      pay: PaymentMethodId;
      recv: number;
      splits?: PaymentSplitPart[];
      discountAmt?: number;
    }): BillRecord => {
      const snap = stateRef.current;
      const billNo = snap.nextBillNo;
      const offline = snap.settings.offlineModeSimulated;
      const printStatus: PrintStatus =
        snap.settings.printer.status === 'error'
          ? 'failed'
          : snap.settings.printer.autoPrint
            ? 'printed'
            : 'queued';
      const bill: BillRecord = {
        no: billNo,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        cust: snap.cartCustomerId,
        lines: snap.cart.map((l) =>
          l.price !== l.originalPrice
            ? [l.itemId, l.colourIdx, l.sizeIdx, l.qty, l.price]
            : [l.itemId, l.colourIdx, l.sizeIdx, l.qty]
        ),
        pay,
        splits,
        discountAmt,
        recv,
        collected: 0,
        returned: 0,
        refundOwed: 0,
        print: printStatus,
        fbrStatus: snap.settings.fbr.mode,
        fbrInvoiceNo:
          snap.settings.fbr.mode === 'connected' ? `FBR-1482-${billNo}` : undefined,
        offlinePending: offline,
        cashierId: snap.session.user.id,
      };

      setState((prev) => {
        const activeCart = prev.cart;
        const subtotal = activeCart.reduce((s, l) => s + l.price * l.qty, 0);
        const total = Math.max(0, subtotal - discountAmt);

        const nextItems = prev.items.map((it) => {
          const soldLines = activeCart.filter((l) => l.itemId === it.id);
          if (soldLines.length === 0 || it.measured) return it;
          if (!it.colours) {
            const soldQty = soldLines.reduce((sum, l) => sum + l.qty, 0);
            return { ...it, stock: Math.max(0, (it.stock ?? 0) - soldQty) };
          }
          const nextMap = { ...(it.variantQtyMap || {}) };
          soldLines.forEach((l) => {
            const vKey = `${l.colourIdx ?? 'x'}-${l.sizeIdx ?? 'x'}`;
            const cur = vKey in nextMap ? nextMap[vKey] : getVariantStock(it, l.colourIdx, l.sizeIdx);
            nextMap[vKey] = Math.max(0, cur - l.qty);
          });
          return { ...it, variantQtyMap: nextMap };
        });

        const nextCustomers =
          pay === 'khata' && prev.cartCustomerId
            ? prev.customers.map((c) =>
                c.id === prev.cartCustomerId
                  ? { ...c, khata: c.khata + total, last: 'Today' }
                  : c
              )
            : prev.customers;

        const nextKhataInv =
          pay === 'khata' && prev.cartCustomerId
            ? [
                {
                  no: String(bill.no),
                  cust: prev.cartCustomerId,
                  d: 20261117,
                  by: prev.session.user.shortName,
                  lines: bill.lines,
                  col: [],
                  ret: [],
                },
                ...prev.khataInvoices,
              ]
            : prev.khataInvoices;

        return {
          ...prev,
          items: nextItems,
          bills: [bill, ...prev.bills],
          customers: nextCustomers,
          khataInvoices: nextKhataInv,
          nextBillNo: bill.no + 1,
          cart: [],
          cartCustomerId: null,
          cartDiscount: null,
        };
      });
      return bill;
    },
    []
  );

  const reprintBill = useCallback((billNo: number) => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.no === billNo ? { ...b, print: 'printed' } : b)),
    }));
  }, []);

  const refundBill = useCallback((billNo: number, amount: number, method: 'cash' | 'khata') => {
    setState((prev) => {
      const target = prev.bills.find((b) => b.no === billNo);
      const nextBills = prev.bills.map((b) =>
        b.no === billNo
          ? {
              ...b,
              returned: b.returned + amount,
              refundOwed: Math.max(0, b.refundOwed - amount),
            }
          : b
      );
      const nextCustomers =
        target?.cust && method === 'khata'
          ? prev.customers.map((c) =>
              c.id === target.cust
                ? {
                    ...c,
                    khata: Math.max(0, c.khata - amount),
                    refundOwed: Math.max(0, (c.refundOwed || 0) - amount),
                  }
                : c
            )
          : prev.customers;
      return { ...prev, bills: nextBills, customers: nextCustomers };
    });
  }, []);

  const setPrintJobStatus = useCallback((billNo: number, print: PrintStatus) => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.no === billNo ? { ...b, print } : b)),
    }));
  }, []);

  const syncOfflineBills = useCallback(() => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => ({
        ...b,
        offlinePending: false,
        fbrStatus: b.fbrStatus === 'queued' ? 'connected' : b.fbrStatus,
      })),
    }));
  }, []);

  const addQuote = useCallback((quote: QuoteRecord) => {
    setState((prev) => ({ ...prev, quotes: [quote, ...prev.quotes] }));
  }, []);

  const addCustomer = useCallback((name: string, phone: string): Customer => {
    const newC: Customer = {
      id: `c-${Date.now().toString(36)}`,
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      khata: 0,
      last: 'Today',
    };
    setState((prev) => ({ ...prev, customers: [newC, ...prev.customers] }));
    return newC;
  }, []);

  const collectKhataPayment = useCallback(
    (customerId: string, amount: number, invoiceNo?: string) => {
      setState((prev) => {
        const nextCustomers = prev.customers.map((c) =>
          c.id === customerId
            ? { ...c, khata: Math.max(0, c.khata - amount), last: 'Today' }
            : c
        );
        let remaining = amount;
        const nextInvoices = prev.khataInvoices.map((inv) => {
          if (inv.cust !== customerId || remaining <= 0) return inv;
          if (invoiceNo && inv.no !== invoiceNo) return inv;
          const raw = inv.lines.reduce((s, [id, , , qty, unitPrice]) => {
            const it = prev.items.find((x) => x.id === id);
            return s + (unitPrice ?? (it ? it.price : 0)) * qty;
          }, 0);
          const colSum = inv.col.reduce((s, c) => s + c.amt, 0);
          const retSum = inv.ret.reduce((s, r) => s + r.amt, 0);
          const due = Math.max(0, raw - colSum - retSum);
          if (due <= 0) return inv;
          const applied = invoiceNo ? Math.min(remaining, due) : Math.min(remaining, due);
          remaining -= applied;
          return {
            ...inv,
            col: [...inv.col, { d: 20261117, amt: applied, by: prev.session.user.shortName }],
          };
        });
        return { ...prev, customers: nextCustomers, khataInvoices: nextInvoices };
      });
    },
    []
  );

  const setKhataConsent = useCallback((customerId: string, ev: string) => {
    setState((prev) => ({
      ...prev,
      khataConsent: {
        ...prev.khataConsent,
        [customerId]: { yes: true, ev, d: 20261117 },
      },
    }));
  }, []);

  const settleCustomerRefund = useCallback(
    (customerId: string, amount: number, fromDrawer = false) => {
      setState((prev) => {
        const cust = prev.customers.find((c) => c.id === customerId);
        const nextDrafts = fromDrawer
          ? [
              {
                id: `CD-${prev.cashDrafts.length + 1}`,
                cat: 'customer_refund' as const,
                amt: amount,
                ref: `REF-${customerId.toUpperCase()}`,
                src: 'Khata refund',
                reason: `Customer refund paid to ${cust?.name || customerId}`,
                by: prev.session.user.shortName,
                when: 'Just now',
                status: 'reviewed' as const,
                v: 1,
                note: 'Paid from counter drawer',
              },
              ...prev.cashDrafts,
            ]
          : prev.cashDrafts;
        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === customerId
              ? { ...c, refundOwed: Math.max(0, (c.refundOwed || 0) - amount) }
              : c
          ),
          cashDrafts: nextDrafts,
        };
      });
    },
    []
  );

  const addKhataReminder = useCallback((msg: KhataReminderMessage) => {
    setState((prev) => ({ ...prev, khataMessages: [msg, ...prev.khataMessages] }));
  }, []);

  const saveItem = useCallback((item: ProductItem) => {
    setState((prev) => {
      const exists = prev.items.some((x) => x.id === item.id);
      return {
        ...prev,
        items: exists
          ? prev.items.map((x) => (x.id === item.id ? item : x))
          : [item, ...prev.items],
      };
    });
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((x) => x.id !== itemId),
    }));
  }, []);

  const adjustStock = useCallback(
    (itemId: string, variantLabel: string, delta: number, reason: string, variantKey?: string) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((it) => {
          if (it.id !== itemId) return it;
          if (!it.colours) {
            return { ...it, stock: Math.max(0, (it.stock ?? 0) + delta) };
          }
          const nextMap: Record<string, number> = { ...(it.variantQtyMap || {}) };
          const sizes = it.sizes && it.sizes.length > 0 ? it.sizes : [null];

          if (variantKey) {
            const [ciStr, siStr] = variantKey.split('-');
            const ci = Number(ciStr);
            const si = siStr === 'x' ? null : Number(siStr);
            const cur =
              variantKey in nextMap
                ? nextMap[variantKey]
                : getVariantStock(it, Number.isNaN(ci) ? 0 : ci, si);
            nextMap[variantKey] = Math.max(0, cur + delta);
            return { ...it, variantQtyMap: nextMap };
          }

          // Distribute delta across colour/size matrix (used by whole-item stock counts)
          if (delta > 0) {
            const firstKey = `0-${it.sizes && it.sizes.length > 0 ? 0 : 'x'}`;
            const cur =
              firstKey in nextMap
                ? nextMap[firstKey]
                : getVariantStock(it, 0, it.sizes && it.sizes.length > 0 ? 0 : null);
            nextMap[firstKey] = cur + delta;
          } else if (delta < 0) {
            let remaining = Math.abs(delta);
            for (let ci = 0; ci < it.colours.length && remaining > 0; ci++) {
              for (let sIdx = 0; sIdx < sizes.length && remaining > 0; sIdx++) {
                const si = it.sizes && it.sizes.length > 0 ? sIdx : null;
                const vKey = `${ci}-${si ?? 'x'}`;
                const cur = vKey in nextMap ? nextMap[vKey] : getVariantStock(it, ci, si);
                if (cur > 0) {
                  const take = Math.min(cur, remaining);
                  nextMap[vKey] = cur - take;
                  remaining -= take;
                }
              }
            }
          }
          return { ...it, variantQtyMap: nextMap };
        }),
        stockAdjustments: [
          {
            id: `adj-${Date.now()}`,
            itemId,
            variantLabel,
            delta,
            reason,
            by: prev.session.user.shortName,
            at: 'Just now',
          },
          ...prev.stockAdjustments,
        ],
      }));
    },
    []
  );

  const saveCategories = useCallback((categories: ProductCategory[]) => {
    setState((prev) => ({ ...prev, categories }));
  }, []);

  const toggleMeasuredPilot = useCallback(() => {
    setState((prev) => ({
      ...prev,
      measuredPilotUnlocked: !prev.measuredPilotUnlocked,
    }));
  }, []);

  const logMeasuredCut = useCallback((metres: number) => {
    setState((prev) => ({
      ...prev,
      measuredRollMetres: Math.max(0, +(prev.measuredRollMetres - metres).toFixed(2)),
    }));
  }, []);

  const createOrder = useCallback((order: SalesOrder) => {
    setState((prev) => ({ ...prev, orders: [order, ...prev.orders] }));
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
  }, []);

  const packOrderLine = useCallback((orderId: string, lineIdx: number) => {
    setState((prev) => {
      const targetOrder = prev.orders.find((o) => o.id === orderId);
      const targetLine = targetOrder?.lines[lineIdx];
      let nextItems = prev.items;
      if (targetLine) {
        const [itId, ci, si, ordQty, shipQty] = targetLine;
        const delta = Math.max(0, ordQty - shipQty);
        if (delta > 0) {
          nextItems = applyItemStockDelta(prev.items, itId, ci, si, -delta);
        }
      }
      return {
        ...prev,
        items: nextItems,
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          const lines = o.lines.map((l, idx) =>
            idx === lineIdx
              ? ([l[0], l[1], l[2], l[3], l[3]] as [string, number | null, number | null, number, number])
              : l
          );
          const allShipped = lines.every((l) => l[4] >= l[3]);
          return { ...o, lines, status: allShipped ? 'fulfilled' : 'partially_fulfilled' };
        }),
      };
    });
  }, []);

  const createShipment = useCallback((shipment: ShipmentRecord) => {
    setState((prev) => ({ ...prev, shipments: [shipment, ...prev.shipments] }));
  }, []);

  const completeRtoInspection = useCallback(
    (orderId: string, condition: 'resellable' | 'damaged') => {
      setState((prev) => {
        const ord = prev.orders.find((o) => o.id === orderId);
        let nextItems = prev.items;
        if (condition === 'resellable' && ord) {
          ord.lines.forEach(([itId, ci, si, , shipQty]) => {
            if (shipQty > 0) {
              nextItems = applyItemStockDelta(nextItems, itId, ci, si, shipQty);
            }
          });
        }
        return {
          ...prev,
          items: nextItems,
          shipments: prev.shipments.map((s) =>
            s.order === orderId
              ? {
                  ...s,
                  review: false,
                  note:
                    condition === 'resellable'
                      ? 'Inspected: resellable — returned to shelf stock'
                      : 'Inspected: damaged — written off to shrinkage',
                }
              : s
          ),
        };
      });
    },
    []
  );

  const matchShipmentCod = useCallback(
    (shipmentId: string, got: number, fees: number, ref: string) => {
      setState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((s) =>
          s.id === shipmentId
            ? {
                ...s,
                status: 'delivered_manual',
                match: { ref, got, fees, status: 'manual_matched' },
              }
            : s
        ),
      }));
    },
    []
  );

  const markMessageSent = useCallback((draftId: string, bodyOverride?: string) => {
    setState((prev) => ({
      ...prev,
      messageDrafts: prev.messageDrafts.map((m) =>
        m.id === draftId ? { ...m, body: bodyOverride ?? m.body, sent: true } : m
      ),
    }));
  }, []);

  const createPurchaseOrder = useCallback((po: PurchaseOrder) => {
    setState((prev) => ({ ...prev, purchaseOrders: [po, ...prev.purchaseOrders] }));
  }, []);

  const approvePurchaseOrder = useCallback((poNo: string) => {
    setState((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((p) =>
        p.no === poNo ? { ...p, status: 'approved' } : p
      ),
    }));
  }, []);

  const markPoOrdered = useCallback((poNo: string) => {
    setState((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((p) =>
        p.no === poNo ? { ...p, status: 'ordered' } : p
      ),
    }));
  }, []);

  const receivePurchaseOrder = useCallback(
    (poNo: string, receivedMap: Record<number, { qty: number; cost: number }>) => {
      setState((prev) => {
        const targetPo = prev.purchaseOrders.find((p) => p.no === poNo);
        let nextItems = prev.items;
        if (targetPo) {
          targetPo.lines.forEach(([itId, ci, si, , , prevRec], idx) => {
            const rec = receivedMap[idx];
            if (!rec) return;
            const delta = Math.max(0, rec.qty - prevRec);
            if (delta > 0) {
              nextItems = applyItemStockDelta(nextItems, itId, ci, si, delta);
            }
            if (rec.cost > 0) {
              nextItems = nextItems.map((it) =>
                it.id === itId ? { ...it, costPrice: rec.cost } : it
              );
            }
          });
        }
        return {
          ...prev,
          items: nextItems,
          purchaseOrders: prev.purchaseOrders.map((po) => {
            if (po.no !== poNo) return po;
            const nextLines = po.lines.map((l, idx) => {
              const rec = receivedMap[idx];
              if (!rec) return l;
              return [l[0], l[1], l[2], l[3], l[4], rec.qty, rec.cost] as PurchaseOrder['lines'][number];
            });
            const allDone = nextLines.every((l) => (l[5] || 0) >= l[3]);
            return {
              ...po,
              lines: nextLines,
              status: allDone ? 'received' : 'partial',
            };
          }),
        };
      });
    },
    []
  );

  const addSupplier = useCallback((sup: Supplier) => {
    setState((prev) => ({ ...prev, suppliers: [sup, ...prev.suppliers] }));
  }, []);

  const addVendorBill = useCallback((bill: VendorBill) => {
    setState((prev) => ({ ...prev, vendorBills: [bill, ...prev.vendorBills] }));
  }, []);

  const postVendorBill = useCallback((ref: string) => {
    setState((prev) => ({
      ...prev,
      vendorBills: prev.vendorBills.map((b) =>
        b.ref === ref ? { ...b, status: 'posted' } : b
      ),
    }));
  }, []);

  const payVendorBill = useCallback((ref: string, amt: number, payRef: string) => {
    setState((prev) => ({
      ...prev,
      vendorBills: prev.vendorBills.map((b) =>
        b.ref === ref
          ? {
              ...b,
              pays: [
                ...b.pays,
                { amt, ref: payRef, d: 20261117, by: prev.session.user.shortName },
              ],
            }
          : b
      ),
    }));
  }, []);

  const addVendorCredit = useCallback((ref: string, amt: number, reason: string) => {
    setState((prev) => ({
      ...prev,
      vendorBills: prev.vendorBills.map((b) =>
        b.ref === ref
          ? {
              ...b,
              credits: [...b.credits, { amt, reason: reason.trim() || 'Supplier credit note', d: 20261117 }],
            }
          : b
      ),
    }));
  }, []);

  const openShift = useCallback((floatAmt: number, cashierName: string) => {
    setState((prev) => ({
      ...prev,
      shifts: [
        {
          id: `SH-${Date.now().toString().slice(-4)}`,
          reg: 'Counter 1',
          d: 20261117,
          opened: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
          by: prev.session.user.shortName,
          cashier: cashierName,
          float: floatAmt,
          status: 'open',
        },
        ...prev.shifts,
      ],
    }));
  }, []);

  const closeShift = useCallback(
    (shiftId: string, counted: number, varianceReason?: string, expectedOverride?: number) => {
      setState((prev) => {
        const target = prev.shifts.find((s) => s.id === shiftId);
        const computedExpected =
          expectedOverride ??
          target?.expected ??
          calcCashDrawerSummary(
            prev.bills,
            prev.items,
            prev.cashDrafts,
            target?.float || 10000
          ).expectedCash;
        return {
          ...prev,
          shifts: prev.shifts.map((sh) =>
            sh.id === shiftId
              ? {
                  ...sh,
                  status: 'closed',
                  closed: new Date()
                    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    .toLowerCase(),
                  expected: computedExpected,
                  counted,
                  varianceReason,
                }
              : sh
          ),
        };
      });
    },
    []
  );

  const addCashDraft = useCallback((entry: CashDraftEntry) => {
    setState((prev) => ({ ...prev, cashDrafts: [entry, ...prev.cashDrafts] }));
  }, []);

  const reviewCashDraft = useCallback(
    (id: string, status: 'reviewed' | 'cancelled', note?: string) => {
      setState((prev) => ({
        ...prev,
        cashDrafts: prev.cashDrafts.map((c) =>
          c.id === id
            ? {
                ...c,
                status,
                v: c.v + 1,
                ...(status === 'reviewed' ? { note } : { cancel: note }),
              }
            : c
        ),
      }));
    },
    []
  );

  const addExpenseBill = useCallback((bill: ExpenseBill) => {
    setState((prev) => ({ ...prev, expenseBills: [bill, ...prev.expenseBills] }));
  }, []);

  const postExpenseBill = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      expenseBills: prev.expenseBills.map((b) =>
        b.id === id ? { ...b, status: 'posted' } : b
      ),
    }));
  }, []);

  const payExpenseBill = useCallback(
    (id: string, amt: number, ref: string, fromCashDrawer = false) => {
      setState((prev) => {
        const target = prev.expenseBills.find((b) => b.id === id);
        const nextCashDrafts = fromCashDrawer
          ? [
              {
                id: `CD-${prev.cashDrafts.length + 1}`,
                cat: 'shop_expense' as const,
                amt,
                ref: ref || `EXP-${id}`,
                src: target?.payee || 'Expense bill',
                reason: target ? `${target.title} (${target.payee})` : `Expense bill ${id}`,
                by: prev.session.user.shortName,
                when: 'Just now',
                status: 'reviewed' as const,
                v: 1,
                note: 'Paid from counter drawer',
              },
              ...prev.cashDrafts,
            ]
          : prev.cashDrafts;
        return {
          ...prev,
          expenseBills: prev.expenseBills.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'posted',
                  pays: [...b.pays, { amt, ref, d: 20261117 }],
                }
              : b
          ),
          cashDrafts: nextCashDrafts,
        };
      });
    },
    []
  );

  const toggleRecurringExpense = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      ),
    }));
  }, []);

  const generateMonthlyExpenseBill = useCallback(
    (recId: string, period = '2026-11'): ExpenseBill | null => {
      const snap = stateRef.current;
      const rec = snap.recurringExpenses.find((r) => r.id === recId);
      if (!rec || rec.made.includes(period)) return null;
      const [yr, mo] = period.split('-');
      const monthLabel = new Date(Number(yr), Number(mo) - 1, 1).toLocaleString('en-US', {
        month: 'long',
      });
      const dueDay = String(rec.day).padStart(2, '0');
      const svcNum = Number(`${yr}${mo}01`);
      const dueNum = Number(`${yr}${mo}${dueDay}`);
      const bill: ExpenseBill = {
        id: `EX${snap.expenseBills.length + 1}`,
        title: `${rec.title} · ${monthLabel}`,
        payee: rec.payee,
        cat: rec.cat,
        amt: rec.amt,
        svc: svcNum,
        due: dueNum,
        ref: null,
        rec: rec.id,
        period,
        status: 'draft',
        pays: [],
      };
      setState((prev) => ({
        ...prev,
        expenseBills: [bill, ...prev.expenseBills],
        recurringExpenses: prev.recurringExpenses.map((r) =>
          r.id === recId ? { ...r, made: [...r.made, period] } : r
        ),
      }));
      return bill;
    },
    []
  );

  const addEmployee = useCallback((emp: EmployeeRecord) => {
    setState((prev) => ({
      ...prev,
      employees: [emp, ...prev.employees],
      payrollRuns: prev.payrollRuns.map((r) =>
        r.status === 'draft' && !r.lines.some((ln) => ln[0] === emp.id)
          ? { ...r, lines: [...r.lines, [emp.id, r.days, 0, 0, 0, 0, 0, 0]] }
          : r
      ),
    }));
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<EmployeeRecord>) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const addAdvance = useCallback((adv: SalaryAdvance) => {
    setState((prev) => ({ ...prev, advances: [adv, ...prev.advances] }));
  }, []);

  const postPayrollRun = useCallback((period: string) => {
    setState((prev) => ({
      ...prev,
      payrollRuns: prev.payrollRuns.map((r) =>
        r.period === period ? { ...r, status: 'posted' } : r
      ),
    }));
  }, []);

  const createPayrollRun = useCallback((period: string, days: number) => {
    setState((prev) => {
      if (prev.payrollRuns.some((r) => r.period === period)) return prev;
      const lines = prev.employees
        .filter((e) => e.active)
        .map((e) => {
          const openAdv = prev.advances
            .filter((a) => a.emp === e.id)
            .reduce((s, a) => s + Math.max(0, a.amt - a.rec), 0);
          return [e.id, days, 0, 0, 0, 0, openAdv, 0] as PayrollRun['lines'][number];
        });
      return {
        ...prev,
        payrollRuns: [{ period, days, status: 'draft', lines }, ...prev.payrollRuns],
      };
    });
  }, []);

  const updatePayrollLine = useCallback(
    (
      period: string,
      empId: string,
      patch: {
        paidDays?: number;
        allowance?: number;
        bonus?: number;
        overtime?: number;
        reduction?: number;
        advanceRecovery?: number;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        payrollRuns: prev.payrollRuns.map((r) =>
          r.period !== period
            ? r
            : {
                ...r,
                lines: r.lines.map((ln) => {
                  if (ln[0] !== empId) return ln;
                  return [
                    ln[0],
                    patch.paidDays ?? ln[1],
                    patch.allowance ?? ln[2],
                    patch.bonus ?? ln[3],
                    patch.overtime ?? ln[4],
                    patch.reduction ?? ln[5],
                    patch.advanceRecovery ?? ln[6],
                    ln[7],
                  ] as PayrollRun['lines'][number];
                }),
              }
        ),
      }));
    },
    []
  );

  const payPayrollEmployee = useCallback((period: string, empId: string, amount: number) => {
    setState((prev) => {
      const targetRun = prev.payrollRuns.find((r) => r.period === period);
      const targetLine = targetRun?.lines.find((ln) => ln[0] === empId);
      let recoveryLeft = targetLine ? targetLine[6] : 0;
      const nextAdvances =
        recoveryLeft > 0
          ? prev.advances.map((a) => {
              if (a.emp !== empId || recoveryLeft <= 0) return a;
              const open = Math.max(0, a.amt - a.rec);
              if (open <= 0) return a;
              const take = Math.min(open, recoveryLeft);
              recoveryLeft -= take;
              return { ...a, rec: a.rec + take };
            })
          : prev.advances;
      return {
        ...prev,
        advances: nextAdvances,
        payrollRuns: prev.payrollRuns.map((r) =>
          r.period === period
            ? {
                ...r,
                lines: r.lines.map((ln) =>
                  ln[0] === empId
                    ? ([ln[0], ln[1], ln[2], ln[3], ln[4], ln[5], ln[6], amount] as typeof ln)
                    : ln
                ),
              }
            : r
        ),
      };
    });
  }, []);

  const resetDemoState = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ZyroContextValue>(
    () => ({
      state,
      toasts,
      notify,
      dismissToast,
      setRole,
      setLanguage,
      setKit,
      setBranch,
      signOut,
      completeAuthSignIn,
      updateOwnerPassword,
      updateEmployeePin,
      updateSettings,
      addToCart,
      updateCartLine,
      removeCartLine,
      clearCart,
      setCartCustomer,
      setCartDiscount,
      holdCurrentBill,
      recallHeldBill,
      completeSale,
      reprintBill,
      refundBill,
      setPrintJobStatus,
      syncOfflineBills,
      addQuote,
      addCustomer,
      collectKhataPayment,
      setKhataConsent,
      settleCustomerRefund,
      addKhataReminder,
      saveItem,
      deleteItem,
      adjustStock,
      saveCategories,
      toggleMeasuredPilot,
      logMeasuredCut,
      createOrder,
      updateOrderStatus,
      packOrderLine,
      createShipment,
      completeRtoInspection,
      matchShipmentCod,
      markMessageSent,
      createPurchaseOrder,
      approvePurchaseOrder,
      markPoOrdered,
      receivePurchaseOrder,
      addSupplier,
      addVendorBill,
      postVendorBill,
      payVendorBill,
      addVendorCredit,
      openShift,
      closeShift,
      addCashDraft,
      reviewCashDraft,
      addExpenseBill,
      postExpenseBill,
      payExpenseBill,
      toggleRecurringExpense,
      generateMonthlyExpenseBill,
      addEmployee,
      updateEmployee,
      addAdvance,
      postPayrollRun,
      createPayrollRun,
      updatePayrollLine,
      payPayrollEmployee,
      resetDemoState,
    }),
    [
      state,
      toasts,
      notify,
      dismissToast,
      setRole,
      setLanguage,
      setKit,
      setBranch,
      signOut,
      completeAuthSignIn,
      updateOwnerPassword,
      updateEmployeePin,
      updateSettings,
      addToCart,
      updateCartLine,
      removeCartLine,
      clearCart,
      setCartCustomer,
      setCartDiscount,
      holdCurrentBill,
      recallHeldBill,
      completeSale,
      reprintBill,
      refundBill,
      setPrintJobStatus,
      syncOfflineBills,
      addQuote,
      addCustomer,
      collectKhataPayment,
      setKhataConsent,
      settleCustomerRefund,
      addKhataReminder,
      saveItem,
      deleteItem,
      adjustStock,
      saveCategories,
      toggleMeasuredPilot,
      logMeasuredCut,
      createOrder,
      updateOrderStatus,
      packOrderLine,
      createShipment,
      completeRtoInspection,
      matchShipmentCod,
      markMessageSent,
      createPurchaseOrder,
      approvePurchaseOrder,
      markPoOrdered,
      receivePurchaseOrder,
      addSupplier,
      addVendorBill,
      postVendorBill,
      payVendorBill,
      addVendorCredit,
      openShift,
      closeShift,
      addCashDraft,
      reviewCashDraft,
      addExpenseBill,
      postExpenseBill,
      payExpenseBill,
      toggleRecurringExpense,
      generateMonthlyExpenseBill,
      addEmployee,
      updateEmployee,
      addAdvance,
      postPayrollRun,
      createPayrollRun,
      updatePayrollLine,
      payPayrollEmployee,
      resetDemoState,
    ]
  );

  return <ZyroContext.Provider value={value}>{children}</ZyroContext.Provider>;
}

export function useZyroStore(): ZyroContextValue {
  const ctx = useContext(ZyroContext);
  if (!ctx) throw new Error('useZyroStore must be used inside ZyroStoreProvider');
  return ctx;
}
