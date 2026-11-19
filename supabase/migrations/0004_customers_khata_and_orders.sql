-- ============================================================================
-- Migration: 0004_customers_khata_and_orders.sql
-- Phase 4: Customers, Khata Credit Ledger, Quotations, Orders & Shipments
-- Notes:
--   - Attaches customer_id FKs onto public.sales and public.held_bills.
--   - shift_id FK on customer_payments is attached in Phase 7 (cash_shifts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 37. customers
--     Customer directory supporting walk-in Khata balances and refunds owed.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
  phone             TEXT,
  email             TEXT,
  city              TEXT,
  address           TEXT,
  notes             TEXT,
  khata_balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  refund_owed       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (refund_owed >= 0),
  last_activity_at  TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_customers_business_phone
  ON public.customers(business_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_customers_business_name ON public.customers(business_id, lower(full_name)) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attach delayed customer FKs to Phase 3 POS tables
ALTER TABLE public.sales
  ADD CONSTRAINT fk_sales_customer
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.held_bills
  ADD CONSTRAINT fk_held_bills_customer
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 38. customer_credit_limits
--     Credit cap and overdue blocking rules per Khata customer.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_credit_limits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  credit_limit        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  payment_terms_days  INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  block_on_overdue    BOOLEAN NOT NULL DEFAULT false,
  approved_by         UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_credit_limits_customer UNIQUE (customer_id)
);

CREATE INDEX idx_customer_credit_limits_business_id ON public.customer_credit_limits(business_id);

CREATE TRIGGER trg_customer_credit_limits_updated_at
  BEFORE UPDATE ON public.customer_credit_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 39. customer_message_consents
--     Tracks WhatsApp/SMS reminder consent proof for compliance.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_message_consents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id    UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  channel        TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  consented      BOOLEAN NOT NULL DEFAULT false,
  evidence_note  TEXT,
  consented_at   TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_consent_channel UNIQUE (customer_id, channel)
);

CREATE INDEX idx_customer_message_consents_business_id ON public.customer_message_consents(business_id);

CREATE TRIGGER trg_customer_message_consents_updated_at
  BEFORE UPDATE ON public.customer_message_consents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 40. customer_orders
--     Online, social (WhatsApp/Instagram/Facebook), and manual customer orders.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id                UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  customer_id              UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number             TEXT NOT NULL,
  source                   TEXT NOT NULL DEFAULT 'manual_whatsapp'
                             CHECK (source IN ('manual_whatsapp','manual_instagram','manual_facebook','website_manual','counter_manual')),
  status                   TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','confirmed','partially_fulfilled','fulfilled','cancelled')),
  customer_name_snapshot   TEXT,
  customer_phone_snapshot  TEXT,
  delivery_address         TEXT,
  delivery_city            TEXT,
  subtotal_amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  delivery_fee             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total_amount             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_by               UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  confirmed_by             UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  confirmed_at             TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_orders_business_no UNIQUE (business_id, order_number)
);

CREATE INDEX idx_customer_orders_branch_status ON public.customer_orders(branch_id, status, created_at DESC);
CREATE INDEX idx_customer_orders_customer_id ON public.customer_orders(customer_id) WHERE customer_id IS NOT NULL;

CREATE TRIGGER trg_customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 41. customer_order_items
--     Product variant lines requested and shipped for an order.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id                UUID NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id              UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot   TEXT NOT NULL,
  variant_label_snapshot  TEXT NOT NULL DEFAULT '',
  unit_price              NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  quantity                NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  shipped_quantity        NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (shipped_quantity >= 0),
  line_total              NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_order_items_shipped_lte_qty CHECK (shipped_quantity <= quantity)
);

CREATE INDEX idx_customer_order_items_order_id ON public.customer_order_items(order_id);
CREATE INDEX idx_customer_order_items_business_id ON public.customer_order_items(business_id);

CREATE TRIGGER trg_customer_order_items_updated_at
  BEFORE UPDATE ON public.customer_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 42. order_events
--     Audit timeline of order state changes and packing checkpoints.
-- ----------------------------------------------------------------------------
CREATE TABLE public.order_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  actor_member_id  UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_id ON public.order_events(order_id, created_at);
CREATE INDEX idx_order_events_business_id ON public.order_events(business_id);

-- ----------------------------------------------------------------------------
-- 43. shipments
--     Courier parcels and manual COD tracking linked to customer orders.
-- ----------------------------------------------------------------------------
CREATE TABLE public.shipments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  order_id         UUID NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  shipment_number  TEXT NOT NULL,
  courier_name     TEXT NOT NULL,
  tracking_number  TEXT,
  city             TEXT,
  status           TEXT NOT NULL DEFAULT 'prepared'
                     CHECK (status IN ('prepared','handed_over','delivered_manual','rto_manual')),
  cod_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cod_amount >= 0),
  needs_review     BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  dispatched_at    TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_shipments_business_no UNIQUE (business_id, shipment_number)
);

CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_business_status ON public.shipments(business_id, status);

CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 44. courier_settlements
--     COD payout reconciliation batches received from courier companies.
-- ----------------------------------------------------------------------------
CREATE TABLE public.courier_settlements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  courier_name         TEXT NOT NULL,
  settlement_ref       TEXT NOT NULL,
  settlement_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_cod_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_cod_amount >= 0),
  courier_fee_amount   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (courier_fee_amount >= 0),
  net_received_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_received_amount >= 0),
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reconciled')),
  recorded_by          UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_courier_settlements_ref UNIQUE (business_id, courier_name, settlement_ref)
);

CREATE INDEX idx_courier_settlements_business_date ON public.courier_settlements(business_id, settlement_date DESC);

CREATE TRIGGER trg_courier_settlements_updated_at
  BEFORE UPDATE ON public.courier_settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 45. courier_settlement_items
--     Shipment-level breakdown inside a courier COD settlement.
-- ----------------------------------------------------------------------------
CREATE TABLE public.courier_settlement_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  settlement_id  UUID NOT NULL REFERENCES public.courier_settlements(id) ON DELETE CASCADE,
  shipment_id    UUID NOT NULL REFERENCES public.shipments(id) ON DELETE RESTRICT,
  cod_collected  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cod_collected >= 0),
  courier_fee    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (courier_fee >= 0),
  net_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_courier_settlement_shipment UNIQUE (shipment_id)
);

CREATE INDEX idx_courier_settlement_items_settlement_id ON public.courier_settlement_items(settlement_id);
CREATE INDEX idx_courier_settlement_items_business_id ON public.courier_settlement_items(business_id);

-- ----------------------------------------------------------------------------
-- 46. quotations
--     Customer price quotes convertible directly into POS sales.
-- ----------------------------------------------------------------------------
CREATE TABLE public.quotations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id               UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  customer_id             UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quote_number            TEXT NOT NULL,
  customer_name_snapshot  TEXT NOT NULL DEFAULT 'Walk-in Customer',
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','sent','accepted','converted','expired','cancelled')),
  valid_until             DATE NOT NULL,
  discount_payload        JSONB,
  subtotal_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  converted_sale_id       UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_by              UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quotations_business_no UNIQUE (business_id, quote_number)
);

CREATE INDEX idx_quotations_branch_status ON public.quotations(branch_id, status);

CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 47. quotation_items
--     Line items quoted to a customer.
-- ----------------------------------------------------------------------------
CREATE TABLE public.quotation_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quotation_id            UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id              UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot   TEXT NOT NULL,
  variant_label_snapshot  TEXT NOT NULL DEFAULT '',
  unit_price              NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  quantity                NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  line_discount_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_discount_amount >= 0),
  line_total              NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_business_id ON public.quotation_items(business_id);

-- ----------------------------------------------------------------------------
-- 48. customer_ledger
--     Khata double-entry customer credit/payment/return ledger.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  customer_id      UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  entry_type       TEXT NOT NULL CHECK (entry_type IN (
                     'sale_credit','payment','return_credit','refund_debit','opening_balance','adjustment'
                   )),
  reference_type   TEXT,
  reference_id     UUID,
  debit_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  running_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date         DATE,
  notes            TEXT,
  recorded_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_customer_ledger_nonzero CHECK (debit_amount > 0 OR credit_amount > 0)
);

CREATE INDEX idx_customer_ledger_customer_date ON public.customer_ledger(customer_id, occurred_at DESC);
CREATE INDEX idx_customer_ledger_business_due ON public.customer_ledger(business_id, due_date) WHERE due_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 49. customer_payments
--     Payments received from Khata customers toward open balances.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  shift_id        UUID,
  payment_number  TEXT NOT NULL,
  method_code     TEXT NOT NULL
                    CHECK (method_code IN ('cash','jazz','easy','raast','card','bank','other')),
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_no    TEXT,
  collected_by    UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_payments_business_no UNIQUE (business_id, payment_number)
);

CREATE INDEX idx_customer_payments_customer_date ON public.customer_payments(customer_id, paid_at DESC);
CREATE INDEX idx_customer_payments_shift_id ON public.customer_payments(shift_id) WHERE shift_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 50. ledger_allocations
--     Matches customer payments or returns against specific Khata debit bills.
-- ----------------------------------------------------------------------------
CREATE TABLE public.ledger_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_id        UUID REFERENCES public.customer_payments(id) ON DELETE CASCADE,
  debit_ledger_id   UUID NOT NULL REFERENCES public.customer_ledger(id) ON DELETE CASCADE,
  credit_ledger_id  UUID NOT NULL REFERENCES public.customer_ledger(id) ON DELETE CASCADE,
  allocated_amount  NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_allocations_debit_id ON public.ledger_allocations(debit_ledger_id);
CREATE INDEX idx_ledger_allocations_business_id ON public.ledger_allocations(business_id);

-- ----------------------------------------------------------------------------
-- 51. customer_message_drafts
--     Drafted and sent Khata reminders or order notifications per customer.
-- ----------------------------------------------------------------------------
CREATE TABLE public.customer_message_drafts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id         UUID REFERENCES public.customer_orders(id) ON DELETE SET NULL,
  channel          TEXT NOT NULL CHECK (channel IN ('WhatsApp','Instagram','SMS')),
  template_key     TEXT,
  message_body     TEXT NOT NULL,
  balance_at_send  NUMERIC(14,2),
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','queued','sent','failed')),
  created_by       UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_message_drafts_business_status ON public.customer_message_drafts(business_id, status);

CREATE TRIGGER trg_customer_message_drafts_updated_at
  BEFORE UPDATE ON public.customer_message_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 52. notification_drafts
--     Internal operational alerts and scheduled reminder drafts.
-- ----------------------------------------------------------------------------
CREATE TABLE public.notification_drafts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  target_member_id  UUID REFERENCES public.business_members(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  channel           TEXT NOT NULL DEFAULT 'in_app'
                      CHECK (channel IN ('in_app','whatsapp','sms','email')),
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','queued','sent','dismissed')),
  scheduled_for     TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_drafts_business_status ON public.notification_drafts(business_id, status);

CREATE TRIGGER trg_notification_drafts_updated_at
  BEFORE UPDATE ON public.notification_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
