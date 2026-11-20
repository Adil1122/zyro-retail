import type { RoleId } from '@/types';

export interface NavItemConfig {
  id:
    | 'home'
    | 'sell'
    | 'bills'
    | 'khata'
    | 'stock'
    | 'orders'
    | 'cash'
    | 'suppliers'
    | 'expenses'
    | 'staff'
    | 'reports'
    | 'settings';
  href: string;
  roles: RoleId[];
  group: 'main' | 'office' | 'foot';
  icon:
    | 'home'
    | 'bag'
    | 'bills'
    | 'khata'
    | 'stock'
    | 'orders'
    | 'cash'
    | 'suppliers'
    | 'expenses'
    | 'staff'
    | 'reports'
    | 'settings';
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', href: '/dashboard', roles: ['owner', 'cashier', 'inventory'], group: 'main', icon: 'home' },
  { id: 'sell', href: '/pos', roles: ['owner', 'cashier'], group: 'main', icon: 'bag' },
  { id: 'bills', href: '/pos/bills', roles: ['owner', 'cashier'], group: 'main', icon: 'bills' },
  { id: 'khata', href: '/khata', roles: ['owner', 'cashier'], group: 'main', icon: 'khata' },
  { id: 'stock', href: '/inventory', roles: ['owner', 'cashier', 'inventory'], group: 'main', icon: 'stock' },
  { id: 'orders', href: '/orders', roles: ['owner', 'cashier', 'inventory'], group: 'main', icon: 'orders' },
  { id: 'cash', href: '/cash', roles: ['owner'], group: 'main', icon: 'cash' },
  { id: 'suppliers', href: '/purchasing', roles: ['owner', 'inventory'], group: 'office', icon: 'suppliers' },
  { id: 'expenses', href: '/expenses', roles: ['owner'], group: 'office', icon: 'expenses' },
  { id: 'staff', href: '/staff', roles: ['owner'], group: 'office', icon: 'staff' },
  { id: 'reports', href: '/reports', roles: ['owner'], group: 'office', icon: 'reports' },
  { id: 'settings', href: '/settings', roles: ['owner'], group: 'foot', icon: 'settings' },
];

/**
 * Temporary restriction: only Sell and Stock are enabled in the left navigation.
 * Set to `null` to re-enable all navigation modules.
 */
export const TEMPORARILY_ENABLED_NAV_IDS: ReadonlySet<NavItemConfig['id']> | null = new Set([
  'sell',
  'stock',
]);

export function isNavModuleEnabled(id: NavItemConfig['id']): boolean {
  return TEMPORARILY_ENABLED_NAV_IDS === null || TEMPORARILY_ENABLED_NAV_IDS.has(id);
}

export const ROLE_DISPLAY_NAMES: Record<RoleId, string> = {
  owner: 'Owner',
  cashier: 'Cashier',
  inventory: 'Stockkeeper',
};

export interface RoleDefinitionCard {
  id: 'owner' | 'manager' | 'cashier' | 'stock' | 'orders';
  name: string;
  who: string;
  can: string;
  toneIdx: number;
}

export const ROLE_DEFINITIONS: RoleDefinitionCard[] = [
  { id: 'owner', name: 'Owner', who: 'You', can: 'Everything, in every branch', toneIdx: 0 },
  {
    id: 'manager',
    name: 'Manager',
    who: 'Runs the shop when you’re away',
    can: 'Sell, returns, stock, orders, approve discounts. Not staff pay or settings',
    toneIdx: 1,
  },
  { id: 'cashier', name: 'Cashier', who: 'Counter staff, by shift', can: 'Sell, take payments, print bills, own shift only', toneIdx: 2 },
  { id: 'stock', name: 'Stockkeeper', who: 'Stock room and receiving', can: 'Items, stock in, counts, barcode labels', toneIdx: 3 },
  { id: 'orders', name: 'Online orders', who: 'WhatsApp and Instagram desk', can: 'Orders, customer messages, packing', toneIdx: 4 },
];

export const ROUTE_ACCESS_RULES: Array<{ prefix: string; roles: RoleId[]; title: string }> = [
  { prefix: '/dashboard', roles: ['owner', 'cashier', 'inventory'], title: 'Home' },
  { prefix: '/pos/bills', roles: ['owner', 'cashier'], title: 'Bill book' },
  { prefix: '/pos/printer', roles: ['owner', 'cashier'], title: 'Receipt printer' },
  { prefix: '/pos/sync-check', roles: ['owner', 'cashier'], title: 'Sync check' },
  { prefix: '/pos', roles: ['owner', 'cashier'], title: 'Sell register' },
  { prefix: '/khata', roles: ['owner', 'cashier'], title: 'Khata' },
  { prefix: '/inventory/categories', roles: ['owner'], title: 'Categories' },
  { prefix: '/inventory/items/new', roles: ['owner', 'inventory'], title: 'Add item' },
  { prefix: '/inventory/count', roles: ['owner', 'inventory'], title: 'Stock count' },
  { prefix: '/inventory/measured', roles: ['owner', 'inventory'], title: 'Measured items' },
  { prefix: '/inventory/photos', roles: ['owner', 'inventory'], title: 'Product photos' },
  { prefix: '/inventory', roles: ['owner', 'cashier', 'inventory'], title: 'Stock' },
  { prefix: '/orders', roles: ['owner', 'cashier', 'inventory'], title: 'Orders' },
  { prefix: '/purchasing', roles: ['owner', 'inventory'], title: 'Purchasing and suppliers' },
  { prefix: '/cash/open-shift', roles: ['owner', 'cashier'], title: 'Open shift' },
  { prefix: '/cash/close-shift', roles: ['owner', 'cashier'], title: 'Close shift' },
  { prefix: '/cash', roles: ['owner'], title: 'Cash' },
  { prefix: '/expenses', roles: ['owner'], title: 'Expenses' },
  { prefix: '/staff', roles: ['owner'], title: 'Staff and payroll' },
  { prefix: '/reports', roles: ['owner'], title: 'Reports' },
  { prefix: '/settings', roles: ['owner'], title: 'Settings' },
];
