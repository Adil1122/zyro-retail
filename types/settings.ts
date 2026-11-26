import type { FbrMode } from './pos';
import type { LanguageId, ShopKitId } from './auth';

export interface PrinterConfig {
  name: string;
  paperWidth: '80mm' | '58mm';
  status: 'connected' | 'disconnected' | 'error';
  autoPrint: boolean;
  openDrawerOnCash: boolean;
  copies: number;
}

export interface ReceiptSettings {
  headerNote: string;
  footerNote: string;
  showPhone: boolean;
  showAddress: boolean;
  showCashier: boolean;
  showBarcode: boolean;
  showUrduLabels: boolean;
}

export interface FbrSettings {
  mode: FbrMode;
  posId: string;
  ntn: string;
  strn: string;
  autoQueueOffline: boolean;
}

export interface AppSettings {
  shopName: string;
  kit: ShopKitId;
  phone: string;
  address: string;
  city: string;
  language: LanguageId;
  cashierMaxDiscountPct: number;
  requireManagerForNoBillReturn: boolean;
  offlineModeSimulated: boolean;
  printer: PrinterConfig;
  receipt: ReceiptSettings;
  fbr: FbrSettings;
}
