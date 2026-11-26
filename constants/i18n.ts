import type { LanguageId } from '@/types';

export const LANG_OPTIONS: Array<{
  id: LanguageId;
  label: string;
  shortLabel: string;
  font: string;
  size: number;
}> = [
  { id: 'en', label: 'English', shortLabel: 'English', font: 'Inter, system-ui, sans-serif', size: 15 },
  { id: 'roman', label: 'Roman Urdu', shortLabel: 'Roman', font: 'Inter, system-ui, sans-serif', size: 15 },
  { id: 'ur', label: 'اردو', shortLabel: 'اردو', font: "'Noto Naskh Arabic', serif", size: 17 },
];

export const COPY_DECK: Record<string, [string, string, string]> = {
  home: ['Home', 'Ghar', 'ہوم'],
  sell: ['Sell', 'Sale', 'فروخت'],
  bills: ['Bill book', 'Bill Book', 'بل بُک'],
  billsShort: ['Bills', 'Bills', 'بل'],
  khata: ['Khata', 'Khata', 'کھاتہ'],
  stock: ['Stock', 'Stock', 'اسٹاک'],
  orders: ['Orders', 'Orders', 'آرڈرز'],
  cash: ['Cash', 'Cash Hisaab', 'کیش'],
  cashShort: ['Cash', 'Cash', 'کیش'],
  suppliers: ['Suppliers', 'Suppliers', 'سپلائرز'],
  expenses: ['Expenses', 'Kharchay', 'اخراجات'],
  staff: ['Staff', 'Staff aur Tankhwa', 'عملہ'],
  reports: ['Reports', 'Reports', 'رپورٹس'],
  settings: ['Settings', 'Settings', 'ترتیبات'],
  more: ['More', 'Aur', 'مزید'],
  backOffice: ['Back office', 'Back office', 'بیک آفس'],
  search: [
    'Search items, customers, bills',
    'Item, customer, bill dhoondein',
    'آئٹم، گاہک یا بل تلاش کریں',
  ],
  searchItems: [
    'Search items or barcode',
    'Item ya barcode dhoondein',
    'آئٹم یا بارکوڈ تلاش کریں',
  ],
  openRegister: ['Open register', 'Register kholein', 'رجسٹر کھولیں'],
  newSale: ['New sale', 'Nayi sale', 'نئی فروخت'],
  pay: ['Take payment', 'Payment lein', 'ادائیگی لیں'],
  holdBill: ['Hold', 'Hold karein', 'روکیں'],
  heldBills: ['Held bills', 'Rukay bills', 'رکے ہوئے بل'],
  discount: ['Discount', 'Chhoot', 'رعایت'],
  customer: ['Customer', 'Gahak', 'گاہک'],
  walkIn: ['Walk-in customer', 'Aam gahak', 'عام گاہک'],
  clear: ['Clear', 'Saaf karein', 'صاف کریں'],
  subtotal: ['Subtotal', 'Kul raqam', 'ذیلی کل'],
  total: ['Total', 'Kul', 'کل'],
  items: ['items', 'cheezein', 'اشیاء'],
  signOut: ['Sign out', 'Bahar niklein', 'سائن آؤٹ'],
  switchBranch: ['Switch branch', 'Branch badlein', 'برانچ تبدیل کریں'],
  mainBranch: ['Main branch', 'Main branch', 'مرکزی برانچ'],
  todaySales: ['Today’s sales', 'Aaj ki sale', 'آج کی فروخت'],
  cashInDrawer: ['Cash in drawer', 'Galla mein cash', 'دراز میں نقدی'],
  khataOwed: ['Khata owed', 'Khata baqaya', 'کھاتہ واجب الادا'],
  lowStock: ['Low stock', 'Kam stock', 'کم اسٹاک'],
  offlineNotice: ['Offline mode · bills saved on this device', 'Offline · bills device par save hain', 'آف لائن موڈ · بل اس ڈیوائس پر محفوظ ہیں'],
};

export function tr(key: string, lang: LanguageId): string {
  const row = COPY_DECK[key];
  if (!row) return key;
  const idx = lang === 'roman' ? 1 : lang === 'ur' ? 2 : 0;
  return row[idx] || row[0];
}
