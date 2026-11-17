export interface Customer {
  id: string;
  name: string;
  phone: string;
  khata: number;
  last: string;
  refundOwed?: number;
}

export interface KhataCollection {
  d: number;
  amt: number;
  by: string;
  method?: string;
}

export interface KhataReturn {
  d: number;
  amt: number;
  item: string;
}

export interface KhataInvoice {
  no: string;
  cust: string;
  d: number;
  by: string;
  lines: Array<[string, number | null, number | null, number, number?]>;
  col: KhataCollection[];
  ret: KhataReturn[];
}

export interface KhataConsentRecord {
  yes: boolean;
  ev: string;
  d: number;
}

export interface KhataReminderMessage {
  id: string;
  customerId: string;
  customerName: string;
  body: string;
  channel: 'WhatsApp' | 'SMS';
  sentAt: string;
  balanceAtSend: number;
}
