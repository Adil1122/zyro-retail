export type OrderSource =
  | 'manual_whatsapp'
  | 'manual_instagram'
  | 'manual_facebook'
  | 'website_manual'
  | 'counter_manual';

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled';

export interface SalesOrder {
  id: string;
  src: OrderSource;
  ref: string;
  cust: string | null;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  status: OrderStatus;
  by: string;
  when: string;
  confirm?: string;
  lines: Array<[string, number | null, number | null, number, number]>; // [itemId, colourIdx, sizeIdx, qty, shipped]
}

export type ShipmentStatus =
  | 'prepared'
  | 'handed_over'
  | 'delivered_manual'
  | 'rto_manual';

export interface ShipmentRecord {
  id: string;
  order: string;
  courier: string;
  city: string;
  status: ShipmentStatus;
  cod: number;
  lines: Array<[number, number]>;
  match?: {
    ref: string;
    got: number;
    fees: number;
    status: string;
  };
  review?: boolean;
  note?: string;
}

export interface MessageDraft {
  id: string;
  orderId: string;
  customerName: string;
  channel: 'WhatsApp' | 'Instagram' | 'SMS';
  template: string;
  body: string;
  sent: boolean;
}
