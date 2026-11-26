import type {
  AppSettings,
  BillRecord,
  BranchInfo,
  CashCategoryId,
  CashDraftEntry,
  Customer,
  EmployeeRecord,
  ExpenseBill,
  ExpenseCategoryId,
  HeldBill,
  KhataConsentRecord,
  KhataInvoice,
  MessageDraft,
  OrderSource,
  PaymentMethodId,
  PayrollRun,
  ProductItem,
  PurchaseOrder,
  RecurringExpense,
  RoleId,
  SalaryAdvance,
  SalesOrder,
  ShiftRecord,
  ShipmentRecord,
  StaffQuickProfile,
  Supplier,
  UserProfile,
  VendorBill,
} from '@/types';

export const DEFAULT_BRANCHES: BranchInfo[] = [
  { id: 'main', name: 'Main branch', city: 'Lahore', phone: '03001112233', address: '14-B Liberty Market, Gulberg III', isMain: true },
  { id: 'dha', name: 'DHA branch', city: 'Lahore', phone: '03002223344', address: 'Phase 5 Commercial Area, DHA', isMain: false },
];

export const MOCK_USERS: Record<RoleId, UserProfile> = {
  owner: {
    id: 'owner-hamza',
    name: 'Hamza Sheikh',
    shortName: 'Hamza',
    role: 'owner',
    roleLabel: 'Owner',
    initials: 'HS',
    avatarBg: '#F1E6D6',
    avatarFg: '#6B4A1E',
    pin: '1234',
  },
  cashier: {
    id: 'ali',
    name: 'Ali Hassan',
    shortName: 'Ali',
    role: 'cashier',
    roleLabel: 'Cashier',
    initials: 'AH',
    avatarBg: '#E1EEEE',
    avatarFg: '#0B4F55',
    pin: '1111',
  },
  inventory: {
    id: 'faraz',
    name: 'Faraz Ahmed',
    shortName: 'Faraz',
    role: 'inventory',
    roleLabel: 'Stockkeeper',
    initials: 'FA',
    avatarBg: '#E5EDE3',
    avatarFg: '#2F4A2E',
    pin: '3333',
  },
};

export const ITEMS: ProductItem[] = [
  { id: 'tee', art: 'tee', name: 'Everyday Tee', cat: 'men', price: 1350, costPrice: 780, sku: 'TEE', colours: ['Black', 'White', 'Navy'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], sizeLabel: 'Size', chart: true },
  { id: 'kurta', art: 'kurta', name: 'Cotton Kurta', cat: 'men', price: 3490, costPrice: 2000, sku: 'KUR', colours: ['White', 'Sky', 'Olive'], sizes: ['S', 'M', 'L', 'XL'], sizeLabel: 'Size', chart: true },
  { id: 'suit', art: 'suit', name: 'Wash & Wear Shalwar Suit', cat: 'men', price: 5990, costPrice: 3600, sku: 'WWS', colours: ['Grey', 'Beige'], sizes: ['38', '40', '42', '44'], sizeLabel: 'Chest · inches', chart: true },
  { id: 'jeans', art: 'jeans', name: 'Slim Denim Jeans', cat: 'men', price: 3990, costPrice: 2400, sku: 'JNS', colours: ['Indigo', 'Black'], sizes: ['30', '32', '34', '36'], sizeLabel: 'Waist · inches', chart: true },
  { id: 'lawn', art: 'lawn', name: 'Lawn 3-Pc Unstitched', cat: 'women', price: 4950, costPrice: 2600, sku: 'LWN', colours: ['Rose', 'Mint', 'Indigo'], sizes: null },
  { id: 'shawl', art: 'shawl', name: 'Pashmina-blend Shawl', cat: 'women', price: 3200, costPrice: 1850, sku: 'SHW', colours: ['Charcoal', 'Rust', 'Cream'], sizes: null },
  { id: 'chappal', art: 'chappal', name: 'Peshawari Chappal', cat: 'foot', price: 4500, costPrice: 2300, sku: 'PSH', colours: ['Brown', 'Black'], sizes: ['40', '41', '42', '43', '44', '45'], sizeLabel: 'Size · EU', chart: true },
  { id: 'sneaker', art: 'sneaker', name: 'Runner Sneaker', cat: 'foot', price: 6990, costPrice: 3900, sku: 'RUN', colours: ['White', 'Slate'], sizes: ['39', '40', '41', '42', '43', '44'], sizeLabel: 'Size · EU', chart: true },
  { id: 'khussa', art: 'khussa', name: 'Khussa — Women', cat: 'foot', price: 2800, costPrice: 1450, sku: 'KHS', colours: ['Gold', 'Maroon'], sizes: ['36', '37', '38', '39', '40'], sizeLabel: 'Size · EU', chart: true },
  { id: 'belt', art: 'belt', name: 'Leather Belt', cat: 'acc', price: 1200, costPrice: 650, sku: 'BLT-BRN', stock: 9, col: 'Tan' },
  { id: 'socks', art: 'socks', name: 'Cotton Socks 3-pack', cat: 'acc', price: 650, costPrice: 340, sku: 'SCK-3PK', stock: 24, col: 'Slate' },
  { id: 'fabric', art: 'fabric', name: 'Cotton Fabric by metre', cat: 'fabric', price: 1250, costPrice: 720, unit: '/ m', sku: 'FAB-COT', measured: true, col: 'Cream' },
];

export const KIT_EXTRA_ITEMS: Record<string, ProductItem[]> = {
  shoes: [
    { id: 'oxford', art: 'sneaker', name: 'Formal Oxford Loafer', cat: 'men', price: 6490, costPrice: 3800, sku: 'SHU-OXF', colours: ['Black', 'Brown'], sizes: ['39', '40', '41', '42', '43', '44', '45'], sizeLabel: 'Size · EU', chart: true },
    { id: 'heel-sandal', art: 'khussa', name: 'Block Heel Sandal', cat: 'women', price: 4250, costPrice: 2300, sku: 'SHU-HEL', colours: ['Gold', 'Beige', 'Black'], sizes: ['36', '37', '38', '39', '40', '41'], sizeLabel: 'Size · EU', chart: true },
    { id: 'kids-runner', art: 'sneaker', name: 'Kids School Runner', cat: 'kids', price: 2950, costPrice: 1650, sku: 'SHU-KID', colours: ['Black', 'Navy'], sizes: ['28', '29', '30', '31', '32', '33', '34', '35'], sizeLabel: 'Size · EU', chart: true },
    { id: 'polish-kit', art: 'belt', name: 'Shoe Polish & Brush Kit', cat: 'acc', price: 750, costPrice: 400, sku: 'SHU-POL', stock: 18 },
  ],
  pharmacy: [
    { id: 'panadol', art: 'lawn', name: 'Panadol Extra 500mg (10x10)', cat: 'tablets', price: 420, costPrice: 340, sku: 'MED-PAN', stock: 42, batches: [{ batchNo: 'B-8812', expiry: '2026-12-10', qty: 18 }, { batchNo: 'B-9104', expiry: '2027-08-20', qty: 24 }] },
    { id: 'augmentin', art: 'shawl', name: 'Augmentin 625mg Tab', cat: 'tablets', price: 680, costPrice: 560, sku: 'MED-AUG', stock: 6, batches: [{ batchNo: 'A-402', expiry: '2026-11-28', qty: 6 }] },
    { id: 'brufen', art: 'socks', name: 'Brufen Syrup 120ml', cat: 'syrups', price: 195, costPrice: 155, sku: 'SYR-BRU', stock: 0, batches: [{ batchNo: 'S-209', expiry: '2026-10-15', qty: 0 }] },
    { id: 'oximeter', art: 'belt', name: 'Pulse Oximeter Digital', cat: 'devices', price: 2450, costPrice: 1700, sku: 'DEV-OXI', stock: 7 },
  ],
  grocery: [
    { id: 'basmati-5kg', art: 'fabric', name: 'Super Kernel Basmati (5 kg)', cat: 'atta', price: 1890, costPrice: 1620, sku: 'GRC-RIC5', stock: 22, barcode: '8964001002011' },
    { id: 'chakki-atta', art: 'fabric', name: 'Chakki Atta (10 kg Bag)', cat: 'atta', price: 1450, costPrice: 1290, sku: 'GRC-ATA10', stock: 15, barcode: '8964001002028' },
    { id: 'cooking-oil', art: 'lawn', name: 'Dalda Cooking Oil (1 L Pouch)', cat: 'oil', price: 545, costPrice: 495, sku: 'GRC-OIL1', stock: 38, barcode: '8964001002035' },
    { id: 'tea-pack', art: 'shawl', name: 'Tapal Danedar (450 g)', cat: 'drinks', price: 890, costPrice: 780, sku: 'GRC-TEA', stock: 14, barcode: '8964001002042' },
    { id: 'loose-sugar', art: 'fabric', name: 'White Sugar by kg', cat: 'atta', price: 165, costPrice: 148, sku: 'GRC-SUG', unit: '/ kg', measured: true },
  ],
  cosmetics: [
    { id: 'matte-lip', art: 'khussa', name: 'Velvet Matte Lipstick', cat: 'makeup', price: 1450, costPrice: 850, sku: 'COS-LIP', colours: ['Red', 'Rose', 'Maroon'], sizes: null, batches: [{ batchNo: 'C-512', expiry: '2027-05-15', qty: 14 }] },
    { id: 'glow-serum', art: 'lawn', name: 'Vitamin C Brightening Serum', cat: 'skin', price: 2250, costPrice: 1350, sku: 'COS-SER', stock: 9, batches: [{ batchNo: 'SK-119', expiry: '2026-12-20', qty: 9 }] },
    { id: 'argan-shampoo', art: 'shawl', name: 'Argan Repair Shampoo 300ml', cat: 'hair', price: 1650, costPrice: 1050, sku: 'COS-SHM', stock: 4, batches: [{ batchNo: 'HR-082', expiry: '2026-10-28', qty: 4 }] },
    { id: 'oud-mist', art: 'belt', name: 'Royal Oud Body Mist', cat: 'fragrance', price: 2800, costPrice: 1600, sku: 'COS-OUD', stock: 11 },
  ],
  jewellery: [
    { id: 'ring22', art: 'khussa', name: '22K Gold Solitaire Ring', cat: 'gold', price: 94500, costPrice: 82000, sku: 'GLD-RNG-22', stock: 1, karat: '22K', weightGrams: 4.2, makingCharge: 6500 },
    { id: 'bangle', art: 'belt', name: 'Silver Kundan Bangle Set', cat: 'silver', price: 12500, costPrice: 8900, sku: 'SLV-BNG-04', stock: 3, karat: '925', weightGrams: 28.5, makingCharge: 1800 },
  ],
  mobile: [
    { id: 'a55', art: 'lawn', name: 'Samsung Galaxy A55 5G (256GB)', cat: 'phones', price: 134999, costPrice: 124000, sku: 'MOB-A55', stock: 3, serials: ['358291048291001', '358291048291002', '358291048291003'], warrantyMonths: 12 },
    { id: 'gan65', art: 'belt', name: 'Anker 65W GaN Charger', cat: 'chargers', price: 6800, costPrice: 4900, sku: 'CHG-ANK65', stock: 14 },
  ],
};

export const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Bilal Ahmed', phone: '03217654321', khata: 2400, last: '2 Nov' },
  { id: 'c2', name: 'Ayesha Khan', phone: '03001234567', khata: 0, last: '11 Nov' },
  { id: 'c3', name: 'Usman Ali', phone: '03459988776', khata: 850, last: '9 Nov' },
  { id: 'c4', name: 'Sana Tariq', phone: '03334455667', khata: 0, last: '28 Oct' },
  { id: 'c5', name: 'Hina Raza', phone: '03111222333', khata: 0, last: '1 Nov', refundOwed: 1200 },
  { id: 'c6', name: 'Kamran Butt', phone: '03004455667', khata: 4640, last: '5 Nov' },
  { id: 'c7', name: 'Nadia Shah', phone: '03339876543', khata: 6300, last: '8 Nov' },
  { id: 'c8', name: 'Farhan Malik', phone: '03451122334', khata: 2990, last: '11 Nov' },
];

export const BILLS: BillRecord[] = [
  { no: 1043, time: '12:24 pm', cust: null, lines: [['tee', 0, 1, 2], ['chappal', 0, 2, 1], ['socks', null, null, 1]], pay: 'cash', recv: 10000, collected: 0, returned: 0, refundOwed: 0, print: 'printed' },
  { no: 1040, time: '11:30 am', cust: 'c4', lines: [['suit', 0, 1, 1], ['shawl', 1, 0, 1]], pay: 'cash', recv: 9200, collected: 0, returned: 0, refundOwed: 0, print: 'printed' },
  { no: 1039, time: '11:12 am', cust: null, lines: [['jeans', 0, 2, 1], ['belt', null, null, 1]], pay: 'cash', recv: 5200, collected: 0, returned: 0, refundOwed: 0, print: 'unknown' },
  { no: 1038, time: '10:55 am', cust: 'c3', lines: [['tee', 2, 3, 1]], pay: 'khata', recv: 0, collected: 500, returned: 0, refundOwed: 0, print: 'printed' },
  { no: 1037, time: '10:41 am', cust: null, lines: [['lawn', 0, 0, 1]], pay: 'cash', recv: 5000, collected: 0, returned: 0, refundOwed: 0, print: 'failed' },
  { no: 1036, time: '10:20 am', cust: 'c5', lines: [['khussa', 1, 2, 1], ['belt', null, null, 1]], pay: 'cash', recv: 4000, collected: 0, returned: 1200, refundOwed: 1200, print: 'printed' },
  { no: 1035, time: '10:12 am', cust: 'c1', lines: [['shawl', 0, 0, 1]], pay: 'khata', recv: 0, collected: 800, returned: 0, refundOwed: 0, print: 'printed' },
  { no: 1034, time: '10:08 am', cust: null, lines: [['socks', null, null, 2]], pay: 'cash', recv: 1500, collected: 0, returned: 0, refundOwed: 0, print: 'printed' },
  { no: 1033, time: '10:05 am', cust: null, lines: [['sneaker', 0, 3, 1]], pay: 'cash', recv: 7000, collected: 0, returned: 0, refundOwed: 0, print: 'printed' },
];

export const HELD_BILLS_SEED: HeldBill[] = [
  {
    id: 'held-1',
    billNo: 1041,
    heldAt: '12:08 pm',
    customerId: 'c2',
    note: 'Customer checking matching shawl size',
    discount: null,
    lines: [
      {
        key: 'lawn-0-0',
        itemId: 'lawn',
        name: 'Lawn 3-Pc Unstitched',
        variantText: 'Rose',
        sku: 'LWN-ROS',
        colourIdx: 0,
        sizeIdx: null,
        price: 4950,
        originalPrice: 4950,
        qty: 1,
        lineDiscount: 0,
      },
    ],
  },
];

export const KH_INV: KhataInvoice[] = [
  { no: '0952', cust: 'c6', d: 20261012, by: 'Hamza', lines: [['suit', 1, 2, 1], ['socks', null, null, 1]], col: [{ d: 20261105, amt: 2000, by: 'Owner' }], ret: [] },
  { no: '0971', cust: 'c8', d: 20261020, by: 'Hamza', lines: [['jeans', 1, 3, 1]], col: [{ d: 20261111, amt: 1000, by: 'Owner' }], ret: [] },
  { no: '0988', cust: 'c1', d: 20261028, by: 'Hamza', lines: [['kurta', 0, 2, 1], ['tee', 1, 2, 1]], col: [{ d: 20261102, amt: 3000, by: 'Owner' }, { d: 20261109, amt: 1840, by: 'Owner' }], ret: [] },
  { no: '0990', cust: 'c7', d: 20261029, by: 'Hamza', lines: [['lawn', 1, 0, 1], ['socks', null, null, 1]], col: [], ret: [{ d: 20261102, amt: 650, item: 'Cotton Socks 3-pack' }] },
  { no: '1012', cust: 'c7', d: 20261108, by: 'Hamza', lines: [['tee', 0, 0, 1]], col: [], ret: [] },
  { no: '1035', cust: 'c1', d: 20261114, by: 'Hamza', lines: [['shawl', 0, 0, 1]], col: [{ d: 20261114, amt: 800, by: 'Owner' }], ret: [] },
  { no: '1038', cust: 'c3', d: 20261114, by: 'Hamza', lines: [['tee', 2, 3, 1]], col: [{ d: 20261114, amt: 500, by: 'Owner' }], ret: [] },
];

export const CONSENT: Record<string, KhataConsentRecord> = {
  c1: { yes: true, ev: 'Said yes at the counter', d: 20261102 },
  c4: { yes: true, ev: 'Signed the shop register', d: 20261020 },
  c7: { yes: true, ev: 'Replied “Yes” on WhatsApp', d: 20261101 },
};

export const SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Noor Textiles', city: 'Faisalabad', phone: '03007654321', makes: 'Kurtas, shalwar suits' },
  { id: 's2', name: 'Karim Fabrics', city: 'Lahore', phone: '03214455889', makes: 'Lawn, cotton fabric' },
  { id: 's3', name: 'Lahore Shoe Mart', city: 'Lahore', phone: '03451239876', makes: 'Chappals, sneakers' },
  { id: 's4', name: 'Shaheen Footwear', city: 'Multan', phone: '03336677881', makes: 'Khussa' },
  { id: 's5', name: 'Royal Leather', city: 'Sialkot', phone: '03019988776', makes: 'Belts' },
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { no: '118', sup: 's4', status: 'draft', by: 'Faraz', d: 20261114, lines: [['khussa', 0, 0, 4, 1450, 0], ['khussa', 0, 1, 6, 1450, 0], ['khussa', 0, 2, 6, 1450, 0], ['khussa', 1, 1, 4, 1450, 0], ['khussa', 1, 2, 4, 1450, 0]] },
  { no: '117', sup: 's1', status: 'received', by: 'Faraz', d: 20261108, lines: [['kurta', 0, 1, 10, 2000, 10, 2000], ['kurta', 1, 1, 10, 2000, 10, 2000], ['suit', 0, 1, 4, 3000, 4, 3000], ['suit', 1, 2, 4, 3000, 4, 3000]] },
  { no: '116', sup: 's2', status: 'ordered', by: 'Faraz', d: 20261110, lines: [['lawn', 0, null, 20, 2600, 0], ['lawn', 1, null, 20, 2600, 0], ['lawn', 2, null, 20, 2600, 0]] },
  { no: '115', sup: 's5', status: 'approved', by: 'Hamza', d: 20261112, lines: [['belt', null, null, 20, 650, 0]] },
  { no: '114', sup: 's3', status: 'partial', by: 'Faraz', d: 20261105, lines: [['chappal', 0, 1, 5, 2300, 5, 2300], ['chappal', 0, 2, 5, 2300, 5, 2300], ['chappal', 0, 3, 5, 2300, 5, 2300], ['chappal', 0, 4, 5, 2300, 5, 2300], ['sneaker', 0, 1, 5, 3900, 2, 4050], ['sneaker', 0, 2, 5, 3900, 2, 4050], ['sneaker', 0, 3, 5, 3900, 2, 4050], ['sneaker', 0, 4, 5, 3900, 2, 4050]] },
  { no: '112', sup: 's3', status: 'received', by: 'Faraz', d: 20261020, billed: true, lines: [['chappal', 1, 1, 10, 2300, 10, 2300], ['sneaker', 1, 2, 10, 4100, 10, 4100]] },
  { no: '110', sup: 's1', status: 'received', by: 'Faraz', d: 20261012, billed: true, lines: [['kurta', 2, 2, 15, 1900, 15, 1900], ['suit', 0, 2, 6, 4000, 6, 4000]] },
];

export const VBILLS: VendorBill[] = [
  { ref: 'INV-2231', sup: 's1', po: '117', status: 'draft', by: 'Faraz', inv: 20261114, due: 20261214, total: 64000, pays: [], credits: [] },
  { ref: 'LSM-882', sup: 's3', po: '112', status: 'posted', by: 'Faraz', inv: 20261029, due: 20261128, total: 64000, pays: [], credits: [] },
  { ref: 'INV-2190', sup: 's1', po: '110', status: 'posted', by: 'Faraz', inv: 20261020, due: 20261109, total: 52500, pays: [{ amt: 30000, ref: 'NOOR-0301', d: 20261025, by: 'Hamza' }], credits: [] },
];

export const SHIFTS: ShiftRecord[] = [
  { id: 'SH-1114-1', reg: 'Counter 1', d: 20261114, opened: '10:02 am', by: 'Hamza', cashier: 'Ali', float: 10000, status: 'open' },
  { id: 'SH-1113-1', reg: 'Counter 1', d: 20261113, opened: '10:05 am', closed: '9:12 pm', by: 'Hamza', cashier: 'Ali', float: 10000, expected: 58240, counted: 57940, status: 'closed' },
  { id: 'SH-1112-1', reg: 'Counter 1', d: 20261112, opened: '10:00 am', closed: '9:20 pm', by: 'Hamza', cashier: 'Sana', float: 10000, expected: 61180, counted: 61180, status: 'closed' },
  { id: 'SH-1111-1', reg: 'Counter 1', d: 20261111, opened: '10:10 am', closed: '9:05 pm', by: 'Hamza', cashier: 'Ali', float: 10000, expected: 49650, counted: 49750, status: 'closed' },
  { id: 'SH-1110-2', reg: 'Counter 2', d: 20261110, opened: '4:00 pm', closed: '9:30 pm', by: 'Hamza', cashier: 'Sana', float: 5000, expected: 12300, counted: 12300, status: 'closed' },
];

export const CASH_CATS: Record<CashCategoryId, { dir: 'in' | 'out'; label: string; doc: boolean }> = {
  owner_cash_in: { dir: 'in', label: 'Owner put cash in', doc: false },
  customer_collection: { dir: 'in', label: 'Customer payment', doc: true },
  misc_receipt_review: { dir: 'in', label: 'Other cash in', doc: false },
  owner_cash_out: { dir: 'out', label: 'Owner took cash out', doc: false },
  shop_expense: { dir: 'out', label: 'Shop expense', doc: true },
  supplier_payment: { dir: 'out', label: 'Supplier payment', doc: true },
  customer_refund: { dir: 'out', label: 'Customer refund', doc: true },
  misc_payout_review: { dir: 'out', label: 'Other cash out', doc: false },
};

export const CASH_DRAFTS: CashDraftEntry[] = [
  { id: 'CD-3', cat: 'owner_cash_out', amt: 20000, ref: 'OWN-1114-01', src: '', reason: 'Took cash home to deposit at the bank tomorrow', by: 'Hamza', when: 'Today 1:15 pm', status: 'draft', v: 0 },
  { id: 'CD-2', cat: 'customer_collection', amt: 2500, ref: 'COLL-1113-02', src: 'Bill 0952', reason: 'Kamran paid part of his Khata at the shop door', by: 'Hamza', when: '13 Nov 6:40 pm', status: 'reviewed', v: 1, evidence: 'Receipt book page 41', note: 'Matches the receipt book entry' },
  { id: 'CD-1', cat: 'shop_expense', amt: 650, ref: 'EXP-1112-01', src: 'Tea stall slip 88', reason: 'Tea and snacks for staff on the sale day', by: 'Hamza', when: '12 Nov 5:10 pm', status: 'cancelled', v: 1, cancel: 'Entered twice by mistake' },
];

export const EXP_CATS: Record<ExpenseCategoryId, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  gas: 'Gas',
  water: 'Water',
  internet: 'Internet',
  supplies: 'Supplies',
  marketing: 'Marketing',
  repairs: 'Repairs',
  transport: 'Transport',
  other: 'Other',
};

export const EXP_BILLS: ExpenseBill[] = [
  { id: 'EX1', title: 'Electricity · November', payee: 'LESCO', cat: 'electricity', amt: 18400, svc: 20261101, due: 20261120, ref: '0412-NOV', status: 'draft', pays: [] },
  { id: 'EX2', title: 'Shop rent · November', payee: 'Malik Properties', cat: 'rent', amt: 45000, svc: 20261101, due: 20261105, ref: null, rec: 'r1', period: '2026-11', status: 'posted', pays: [] },
  { id: 'EX3', title: 'Shopping bags', payee: 'Al-Noor Packaging', cat: 'supplies', amt: 6200, svc: 20261103, due: 20261103, ref: 'ANP-771', status: 'posted', pays: [{ amt: 6200, ref: 'BAG-1103', d: 20261103 }] },
  { id: 'EX4', title: 'AC service', payee: 'Cool Tech', cat: 'repairs', amt: 4500, svc: 20261107, due: 20261107, ref: 'CT-2210', status: 'posted', pays: [{ amt: 4500, ref: 'ACS-1107', d: 20261107 }] },
  { id: 'EX5', title: 'Shop rent · October', payee: 'Malik Properties', cat: 'rent', amt: 45000, svc: 20261001, due: 20261005, ref: null, rec: 'r1', period: '2026-10', status: 'posted', pays: [{ amt: 45000, ref: 'RENT-1005', d: 20261005 }] },
  { id: 'EX6', title: 'Internet · October', payee: 'Nayatel', cat: 'internet', amt: 3500, svc: 20261001, due: 20261010, ref: null, rec: 'r2', period: '2026-10', status: 'posted', pays: [{ amt: 3500, ref: 'NET-1010', d: 20261010 }] },
];

export const EXP_REC: RecurringExpense[] = [
  { id: 'r1', title: 'Shop rent', payee: 'Malik Properties', cat: 'rent', amt: 45000, day: 5, start: '2026-01', active: true, made: ['2026-10', '2026-11'] },
  { id: 'r2', title: 'Internet', payee: 'Nayatel', cat: 'internet', amt: 3500, day: 10, start: '2026-03', active: true, made: ['2026-10'] },
  { id: 'r3', title: 'Night guard', payee: 'Watch Services', cat: 'other', amt: 8000, day: 1, start: '2026-06', active: false, made: ['2026-08'] },
];

export const EMPLOYEES: EmployeeRecord[] = [
  { id: 'e1', code: 'ALI-01', name: 'Ali Hassan', job: 'Cashier', login: 'Cashier login', salary: 32000, rev: 2, active: true, phone: '03011112233', pin: '1111', roleId: 'cashier' },
  { id: 'e2', code: 'SAN-02', name: 'Sana Malik', job: 'Cashier', login: 'Cashier login', salary: 30000, rev: 1, active: true, phone: '03022223344', pin: '2222', roleId: 'cashier' },
  { id: 'e3', code: 'FAR-03', name: 'Faraz Ahmed', job: 'Stockkeeper', login: 'Stockkeeper login', salary: 34000, rev: 1, active: true, phone: '03033334455', pin: '3333', roleId: 'inventory' },
  { id: 'e4', code: 'IMR-04', name: 'Imran Qureshi', job: 'Floor manager', login: 'Manager override PIN', salary: 40000, rev: 3, active: true, phone: '03044445566', pin: '1234', roleId: 'manager' },
];

export const ADVANCES: SalaryAdvance[] = [
  { id: 'ADV-1103', emp: 'e3', amt: 5000, rec: 0, d: 20261103, note: 'Family medical help' },
  { id: 'ADV-1002', emp: 'e4', amt: 2000, rec: 2000, d: 20261002, note: 'Settled in Oct payroll' },
];

export const PAYRUNS: PayrollRun[] = [
  { period: '2026-11', days: 30, status: 'draft', lines: [['e1', 30, 0, 0, 1500, 0, 0, 0], ['e2', 28, 0, 0, 0, 0, 0, 0], ['e3', 30, 0, 0, 0, 0, 0, 0], ['e4', 30, 2000, 0, 0, 0, 0, 0]] },
  { period: '2026-10', days: 31, status: 'posted', lines: [['e1', 31, 0, 0, 1000, 0, 0, 33000], ['e2', 31, 0, 0, 0, 0, 0, 30000], ['e3', 31, 0, 1000, 0, 0, 0, 35000], ['e4', 31, 2000, 0, 0, 0, 2000, 40000]] },
];

export const ORDER_SRC: Record<OrderSource, string> = {
  manual_whatsapp: 'WhatsApp',
  manual_instagram: 'Instagram',
  manual_facebook: 'Facebook',
  website_manual: 'Website',
  counter_manual: 'Counter',
};

export const SORDERS: SalesOrder[] = [
  { id: '2048', src: 'manual_whatsapp', ref: 'WA-1115-03', cust: 'c2', status: 'draft', by: 'Ali', when: 'Today 1:40 pm', lines: [['lawn', 0, null, 1, 0], ['shawl', 0, null, 1, 0]] },
  { id: '2047', src: 'manual_whatsapp', ref: 'WA-1115-01', cust: 'c7', status: 'confirmed', by: 'Ali', when: 'Today 10:15 am', confirm: 'WhatsApp · Nadia confirmed size and address', lines: [['suit', 0, 2, 1, 0]] },
  { id: '2046', src: 'manual_instagram', ref: 'IG-mehwish.style', cust: null, name: '@mehwish.style', status: 'confirmed', by: 'Ali', when: 'Today 11:50 am', confirm: 'Instagram DM · buyer chose size L', lines: [['kurta', 1, 2, 1, 0]] },
  { id: '2045', src: 'manual_facebook', ref: 'FB-8812', cust: 'c1', status: 'partially_fulfilled', by: 'Sana', when: '12 Nov', confirm: 'Phone call · Bilal said yes', lines: [['jeans', 0, 1, 1, 1], ['belt', null, null, 1, 0]] },
  { id: '2044', src: 'manual_whatsapp', ref: 'WA-1109-02', cust: 'c3', status: 'fulfilled', by: 'Ali', when: '9 Nov', confirm: 'WhatsApp · Usman confirmed address', lines: [['sneaker', 0, 3, 1, 1]] },
  { id: '2043', src: 'website_manual', ref: 'WEB-311', cust: 'c5', status: 'fulfilled', by: 'Sana', when: '6 Nov', confirm: 'Website form · called to confirm', lines: [['khussa', 0, 2, 1, 1]] },
  { id: '2042', src: 'manual_whatsapp', ref: 'WA-1104-01', cust: 'c6', status: 'cancelled', by: 'Ali', when: '4 Nov', confirm: 'WhatsApp · confirmed', lines: [['suit', 1, 1, 1, 0]] },
];

export const SHIPMENTS: ShipmentRecord[] = [
  { id: 'SHP-882', order: '2047', courier: 'TCS', city: 'Islamabad', status: 'prepared', cod: 5990, lines: [[0, 1]] },
  { id: 'SHP-881', order: '2045', courier: 'Leopards', city: 'Lahore', status: 'handed_over', cod: 3990, lines: [[0, 1]] },
  { id: 'SHP-879', order: '2044', courier: 'TCS', city: 'Karachi', status: 'delivered_manual', cod: 6990, lines: [[0, 1]], match: { ref: 'TCS-3311', got: 6840, fees: 150, status: 'manual_matched' } },
  { id: 'SHP-877', order: '2043', courier: 'M&P', city: 'Faisalabad', status: 'rto_manual', cod: 2800, lines: [[0, 1]], review: true, note: 'Customer refused at the door' },
];

export const MESSAGE_DRAFTS: MessageDraft[] = [
  {
    id: 'msg-1',
    orderId: '2048',
    customerName: 'Ayesha Khan',
    channel: 'WhatsApp',
    template: 'Order confirmation',
    body: 'Assalam-o-Alaikum Ayesha ji, your Lawn 3-Pc Unstitched & Shawl order #2048 (Rs 8,150) is ready to confirm. Please reply YES with delivery address.',
    sent: false,
  },
  {
    id: 'msg-2',
    orderId: '2047',
    customerName: 'Nadia Shah',
    channel: 'WhatsApp',
    template: 'Courier dispatch notice',
    body: 'Assalam-o-Alaikum Nadia ji, Order #2047 (Wash & Wear Shalwar Suit, COD Rs 5,990) is packed for TCS Islamabad (SHP-882).',
    sent: false,
  },
];

export const COUNTER_STAFF: StaffQuickProfile[] = [
  { id: 'ali', name: 'Ali Hassan', short: 'Ali', role: 'Cashier', ini: 'AH', bg: '#E1EEEE', fg: '#0B4F55' },
  { id: 'sana', name: 'Sana Malik', short: 'Sana', role: 'Cashier', ini: 'SM', bg: '#F6E4DF', fg: '#7A3427' },
  { id: 'imran', name: 'Imran Qureshi', short: 'Imran', role: 'Manager', ini: 'IQ', bg: '#F1E6D6', fg: '#6B4A1E' },
];

export const PINS: Record<string, string> = {
  ali: '1111',
  sana: '2222',
  imran: '1234',
};

export const MANAGER_PIN = '1234';

export const PKR_NOTES: Array<{ v: number; label: string; tone: string }> = [
  { v: 5000, label: '5,000', tone: '#B9873A' },
  { v: 1000, label: '1,000', tone: '#3E6A9E' },
  { v: 500, label: '500', tone: '#3F7F55' },
  { v: 100, label: '100', tone: '#B0473B' },
  { v: 50, label: '50', tone: '#7A5294' },
  { v: 20, label: '20', tone: '#C7702E' },
  { v: 10, label: '10', tone: '#557F4E' },
];

export const PAYMENT_METHODS: Array<{ id: PaymentMethodId; label: string; sub: string }> = [
  { id: 'cash', label: 'Cash', sub: 'Keypad or notes' },
  { id: 'jazz', label: 'JazzCash', sub: 'Mobile wallet' },
  { id: 'easy', label: 'Easypaisa', sub: 'Mobile wallet' },
  { id: 'raast', label: 'Raast QR', sub: 'Any bank app' },
  { id: 'card', label: 'Card', sub: 'Card machine' },
  { id: 'bank', label: 'Bank transfer', sub: 'IBAN' },
  { id: 'khata', label: 'Khata', sub: 'Pay later' },
  { id: 'split', label: 'Split', sub: 'Two or more ways' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  shopName: 'Hamza Fashion',
  kit: 'clothing',
  phone: '03001112233',
  address: '14-B Liberty Market, Gulberg III',
  city: 'Lahore',
  language: 'en',
  cashierMaxDiscountPct: 10,
  requireManagerForNoBillReturn: true,
  offlineModeSimulated: false,
  printer: {
    name: 'Epson TM-T88V (USB · Counter 1)',
    paperWidth: '80mm',
    status: 'connected',
    autoPrint: true,
    openDrawerOnCash: true,
    copies: 1,
  },
  receipt: {
    headerNote: 'Thanks for shopping with us',
    footerNote: 'Exchange within 7 days with original tag and bill.',
    showPhone: true,
    showAddress: true,
    showCashier: true,
    showBarcode: true,
    showUrduLabels: false,
  },
  fbr: {
    mode: 'notRequired',
    posId: '148209',
    ntn: '4120987-1',
    strn: '3277876123456',
    autoQueueOffline: true,
  },
};
