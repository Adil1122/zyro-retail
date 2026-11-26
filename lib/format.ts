export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatNumber(x: number): string {
  const v = Math.round(Math.abs(x || 0));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatRs(x: number): string {
  return (x < 0 ? '−' : '') + 'Rs ' + formatNumber(x);
}

export function formatPhone(p: string): string {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('92')) d = '0' + d.slice(2);
  if (d.length === 11) return d.slice(0, 4) + ' ' + d.slice(4);
  return d;
}

export function formatPhoneIntl(p: string): string {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('92')) d = d.slice(2);
  return '+92 ' + d.slice(0, 3) + ' ' + d.slice(3);
}

export function isValidPkPhone(p: string): boolean {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('92')) d = '0' + d.slice(2);
  return /^03\d{9}$/.test(d);
}

export function formatShortDate(d: number): string {
  const day = d % 100;
  const m = (Math.floor(d / 100) % 100) - 1;
  return `${day} ${MONTHS[m] || 'Nov'}`;
}

export function daysAgo(d: number): number {
  const t = Date.UTC(2026, 10, 14);
  const x = Date.UTC(Math.floor(d / 10000), (Math.floor(d / 100) % 100) - 1, d % 100);
  return Math.round((t - x) / 86400000);
}

export function formatMonthName(period: string): string {
  const m = parseInt(period.slice(5, 7), 10);
  return `${FULL_MONTHS[m - 1] || 'November'} ${period.slice(0, 4)}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
