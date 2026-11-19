import { NAV_ITEMS, ROUTE_ACCESS_RULES, type NavItemConfig } from '@/constants/navigation';
import type { RoleId } from '@/types';

const ROUTE_PERMISSION_REQUIREMENTS: Array<{ prefix: string; anyOf: string[] }> = [
  { prefix: '/home', anyOf: ['dashboard.owner.view', 'settings.manage'] },
  { prefix: '/cashier/home', anyOf: ['dashboard.cashier.view', 'pos.sell', 'dashboard.owner.view'] },
  { prefix: '/stockkeeper/home', anyOf: ['dashboard.inventory.view', 'inventory.manage', 'dashboard.owner.view'] },
  { prefix: '/pos/bills', anyOf: ['pos.bills.view', 'pos.sell'] },
  { prefix: '/pos/printer', anyOf: ['pos.bills.view', 'pos.sell'] },
  { prefix: '/pos', anyOf: ['pos.sell'] },
  { prefix: '/khata', anyOf: ['khata.view', 'khata.manage'] },
  { prefix: '/inventory/categories', anyOf: ['inventory.categories', 'inventory.manage'] },
  { prefix: '/inventory/items/new', anyOf: ['inventory.manage'] },
  { prefix: '/inventory/adjust', anyOf: ['inventory.manage'] },
  { prefix: '/inventory/counts', anyOf: ['inventory.manage'] },
  { prefix: '/inventory', anyOf: ['inventory.view', 'inventory.manage'] },
  { prefix: '/orders', anyOf: ['orders.view', 'orders.manage'] },
  { prefix: '/cash', anyOf: ['cash.view', 'cash.shift.open', 'cash.entry.draft'] },
  { prefix: '/purchasing', anyOf: ['purchasing.view', 'purchasing.receive', 'purchasing.manage'] },
  { prefix: '/expenses', anyOf: ['expenses.manage'] },
  { prefix: '/staff', anyOf: ['staff.manage'] },
  { prefix: '/reports', anyOf: ['reports.view'] },
  { prefix: '/settings', anyOf: ['settings.manage'] },
];

const NAV_PERMISSION_MAP: Record<string, string[]> = {
  home: ['dashboard.owner.view', 'dashboard.cashier.view', 'dashboard.inventory.view'],
  sell: ['pos.sell'],
  bills: ['pos.bills.view', 'pos.sell'],
  khata: ['khata.view', 'khata.manage'],
  stock: ['inventory.view', 'inventory.manage'],
  orders: ['orders.view', 'orders.manage'],
  cash: ['cash.view', 'cash.shift.open'],
  suppliers: ['purchasing.view', 'purchasing.receive', 'purchasing.manage'],
  expenses: ['expenses.manage'],
  staff: ['staff.manage'],
  reports: ['reports.view'],
  settings: ['settings.manage'],
};

export function getAllowedNavItems(role: RoleId, permissions?: string[]): NavItemConfig[] {
  if (permissions && permissions.length > 0) {
    const permSet = new Set(permissions);
    return NAV_ITEMS.filter((item) => {
      const required = NAV_PERMISSION_MAP[item.id];
      if (!required) return item.roles.includes(role);
      return required.some((key) => permSet.has(key));
    });
  }
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccessPath(role: RoleId, pathname: string, permissions?: string[]): boolean {
  if (pathname === '/' || pathname.startsWith('/no-access') || pathname === '/dashboard') return true;

  if (permissions && permissions.length > 0) {
    const permSet = new Set(permissions);
    const permRule = ROUTE_PERMISSION_REQUIREMENTS.find(
      (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
    );
    if (permRule) {
      return permRule.anyOf.some((key) => permSet.has(key));
    }
  }

  // Exact/prefix match ordered most specific first in ROUTE_ACCESS_RULES
  const rule = ROUTE_ACCESS_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
  );
  if (!rule) return true;
  return rule.roles.includes(role);
}

export function getNoAccessMessage(role: RoleId, pathname: string): {
  title: string;
  headline: string;
  body: string;
} {
  const rule = ROUTE_ACCESS_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
  );
  const title = rule?.title || 'Restricted page';

  if (
    role === 'cashier' &&
    (pathname.startsWith('/inventory/items/new') || pathname.startsWith('/inventory/categories'))
  ) {
    return {
      title,
      headline: 'Ask the stockkeeper or the owner',
      body: 'Cashiers sell, take payments and look up stock. Adding items, categories, prices and money pages stay with the owner, so nothing changes without them.',
    };
  }

  if (role === 'cashier') {
    return {
      title,
      headline: `Only the owner can open ${title}`,
      body: 'Cashiers can sell on the register, print bills, check Khata, and manage their own shift. Back-office finance, purchasing, staff payroll and settings stay with the owner.',
    };
  }

  return {
    title,
    headline: `Only the owner or counter staff can open ${title}`,
    body: 'Stockkeepers add items, receive deliveries, count stock and print barcode labels. Counter sales, Khata and the financial books stay with the owner.',
  };
}
