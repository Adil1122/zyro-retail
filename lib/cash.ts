import { CASH_CATS } from '@/constants/mock-data';
import { calcBillTotal } from '@/lib/inventory';
import type { BillRecord, CashDraftEntry, PaymentMethodId, ProductItem } from '@/types';

export interface CashDrawerSummary {
  float: number;
  cashSales: number;
  nonCashSales: number;
  cashMovementsIn: number;
  cashMovementsOut: number;
  cashRefunds: number;
  expectedCash: number;
}

export function calcCashDrawerSummary(
  bills: BillRecord[],
  items: ProductItem[],
  cashDrafts: CashDraftEntry[],
  floatAmt: number
): CashDrawerSummary {
  let cashSales = 0;
  let nonCashSales = 0;
  let cashRefunds = 0;

  bills.forEach((b) => {
    const total = calcBillTotal(b, items);
    if (b.pay === 'cash') {
      cashSales += total;
      cashRefunds += b.returned || 0;
    } else if (b.pay === 'split' && b.splits && b.splits.length > 0) {
      const cashLeg = b.splits
        .filter((sp) => sp.method === 'cash')
        .reduce((s, sp) => s + sp.amount, 0);
      const boundedCash = Math.min(total, cashLeg);
      cashSales += boundedCash;
      nonCashSales += Math.max(0, total - boundedCash);
    } else {
      nonCashSales += total;
    }
  });

  let cashMovementsIn = 0;
  let cashMovementsOut = 0;
  cashDrafts
    .filter((c) => c.status === 'reviewed')
    .forEach((c) => {
      if (CASH_CATS[c.cat].dir === 'in') cashMovementsIn += c.amt;
      else cashMovementsOut += c.amt;
    });

  const expectedCash = Math.max(
    0,
    floatAmt + cashSales + cashMovementsIn - cashMovementsOut - cashRefunds
  );

  return {
    float: floatAmt,
    cashSales,
    nonCashSales,
    cashMovementsIn,
    cashMovementsOut,
    cashRefunds,
    expectedCash,
  };
}

export function calcPaymentMix(
  bills: BillRecord[],
  items: ProductItem[]
): Record<Exclude<PaymentMethodId, 'split'>, number> {
  const mix: Record<Exclude<PaymentMethodId, 'split'>, number> = {
    cash: 0,
    khata: 0,
    jazz: 0,
    easy: 0,
    raast: 0,
    card: 0,
    bank: 0,
  };

  bills.forEach((b) => {
    const total = calcBillTotal(b, items);
    if (b.pay === 'split' && b.splits && b.splits.length > 0) {
      const splitSum = b.splits.reduce((s, sp) => s + sp.amount, 0);
      b.splits.forEach((sp) => {
        const portion =
          splitSum > 0 ? Math.round((sp.amount / splitSum) * total) : sp.amount;
        mix[sp.method] = (mix[sp.method] || 0) + portion;
      });
    } else if (b.pay !== 'split') {
      mix[b.pay] = (mix[b.pay] || 0) + total;
    }
  });

  return mix;
}
