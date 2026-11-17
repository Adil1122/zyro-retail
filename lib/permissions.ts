import { NAV_ITEMS, ROUTE_ACCESS_RULES } from '@/constants/navigation';
import type { RoleId } from '@/types';

export function getAllowedNavItems(role: RoleId) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccessPath(role: RoleId, pathname: string): boolean {
  if (pathname === '/' || pathname.startsWith('/no-access')) return true;
  // Exact/prefix match ordered most specific first in ROUTE_ACCESS_RULES
  const rule = ROUTE_ACCESS_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')
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
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')
  );
  const title = rule?.title || 'Restricted page';

  if (role === 'cashier' && (pathname.startsWith('/inventory/items/new') || pathname.startsWith('/inventory/categories'))) {
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
