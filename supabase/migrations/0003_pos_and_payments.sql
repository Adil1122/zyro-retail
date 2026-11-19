-- ============================================================================
-- Migration: 0003_pos_and_payments.sql
-- Phase 3: POS Register, Sales, Split Payments, Discounts, Held Bills & Receipts
-- Notes:
--   - Cross-phase FKs (customer_id -> customers, shift_id -> cash_shifts) are
--     attached via ALTER TABLE in Phases 4 and 7 respectively.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 27. payment_methods
--     Business-configured tender channels available on POS registers.
-- ----------------------------------------------------------------------------
CREATE TABLE public.payment_methods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  method_code    TEXT NOT NULL
                   CHECK (method_code IN ('cash','jazz','easy','raast','card','bank','khata','other')),
  display_name   TEXT NOT NULL CHECK (char_length(trim(display_name)) > 0),
  account_label  TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_methods_business_code UNIQUE (business_id, method_code, display_name)
);

CREATE INDEX idx_payment_methods_business_id ON public.payment_methods(business_id) WHERE is_active = true;

CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 28. printers
--     Thermal and document printer configurations attached to branches/devices.
-- ----------------------------------------------------------------------------
CREATE TABLE public.printers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id             UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id             UUID REFERENCES public.pos_devices(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  connection_type       TEXT NOT NULL DEFAULT 'usb'
                          CHECK (connection_type IN ('usb','network','bluetooth','browser_print')),
  paper_width           TEXT NOT NULL DEFAULT '80mm'
                          CHECK (paper_width IN ('80mm','58mm','A4')),
  auto_print            BOOLEAN NOT NULL DEFAULT true,
  open_drawer_on_cash   BOOLEAN NOT NULL DEFAULT true,
  copies                INTEGER NOT NULL DEFAULT 1 CHECK (copies BETWEEN 1 AND 5),
  status                TEXT NOT NULL DEFAULT 'connected'
                          CHECK (status IN ('connected','disconnected','error')),
  is_default            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_printers_branch_id ON public.printers(branch_id);
CREATE INDEX idx_printers_business_id ON public.printers(business_id);

CREATE TRIGGER trg_printers_updated_at
  BEFORE UPDATE ON public.printers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 29. receipt_templates
--     Receipt header/footer and visibility toggles for thermal printing.
-- ----------------------------------------------------------------------------
CREATE TABLE public.receipt_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Default Receipt',
  header_note       TEXT,
  footer_note       TEXT,
  show_phone        BOOLEAN NOT NULL DEFAULT true,
  show_address      BOOLEAN NOT NULL DEFAULT true,
  show_cashier      BOOLEAN NOT NULL DEFAULT true,
  show_barcode      BOOLEAN NOT NULL DEFAULT true,
  show_urdu_labels  BOOLEAN NOT NULL DEFAULT false,
  is_default        BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipt_templates_business_id ON public.receipt_templates(business_id);

CREATE TRIGGER trg_receipt_templates_updated_at
  BEFORE UPDATE ON public.receipt_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 30. sales
--     POS bill headers recording totals, customer link, FBR status, and sync id.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sales (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id          UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  device_id          UUID REFERENCES public.pos_devices(id) ON DELETE SET NULL,
  shift_id           UUID,
  customer_id        UUID,
  cashier_member_id  UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  bill_number        BIGINT NOT NULL CHECK (bill_number > 0),
  status             TEXT NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('completed','voided','refunded','partially_refunded')),
  subtotal_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (due_amount >= 0),
  change_given       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (change_given >= 0),
  refunded_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  fbr_status         TEXT NOT NULL DEFAULT 'not_required'
                       CHECK (fbr_status IN ('not_required','connected','queued','submitted','failed')),
  fbr_invoice_no     TEXT,
  client_sync_id     TEXT,
  offline_pending    BOOLEAN NOT NULL DEFAULT false,
  notes              TEXT,
  sold_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sales_branch_bill_number UNIQUE (branch_id, bill_number)
);

CREATE UNIQUE INDEX uq_sales_business_client_sync
  ON public.sales(business_id, client_sync_id)
  WHERE client_sync_id IS NOT NULL;
CREATE INDEX idx_sales_business_sold_at ON public.sales(business_id, sold_at DESC);
CREATE INDEX idx_sales_branch_sold_at ON public.sales(branch_id, sold_at DESC);
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_shift_id ON public.sales(shift_id) WHERE shift_id IS NOT NULL;

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 31. sale_items
--     Immutable line-item snapshots preserving historical names, SKUs & prices.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sale_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id                UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id             UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id             UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id               UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  product_name_snapshot  TEXT NOT NULL,
  variant_label_snapshot TEXT NOT NULL DEFAULT '',
  sku_snapshot           TEXT,
  unit_cost_snapshot     NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_cost_snapshot >= 0),
  unit_price             NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  original_unit_price    NUMERIC(14,2) NOT NULL CHECK (original_unit_price >= 0),
  quantity               NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  line_discount_amount   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_discount_amount >= 0),
  tax_amount             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total             NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  returned_quantity      NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0),
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_sale_items_returned_lte_qty CHECK (returned_quantity <= quantity)
);

CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_business_variant ON public.sale_items(business_id, variant_id);

-- Link serialized items sold in Phase 2 serial_numbers to sale_items
ALTER TABLE public.serial_numbers
  ADD CONSTRAINT fk_serial_numbers_sold_sale_item
  FOREIGN KEY (sold_sale_item_id) REFERENCES public.sale_items(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 32. sale_discounts
--     Discounts applied at bill or line level with manager approval tracking.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sale_discounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id          UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  sale_item_id     UUID REFERENCES public.sale_items(id) ON DELETE CASCADE,
  discount_scope   TEXT NOT NULL CHECK (discount_scope IN ('bill','line')),
  discount_mode    TEXT NOT NULL CHECK (discount_mode IN ('pct','rs')),
  discount_value   NUMERIC(14,2) NOT NULL CHECK (discount_value >= 0),
  discount_amount  NUMERIC(14,2) NOT NULL CHECK (discount_amount >= 0),
  reason           TEXT,
  applied_by       UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_discounts_sale_id ON public.sale_discounts(sale_id);
CREATE INDEX idx_sale_discounts_business_id ON public.sale_discounts(business_id);

-- ----------------------------------------------------------------------------
-- 33. sale_payments
--     Single or split payment legs collected against a sale.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sale_payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id          UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  sale_id            UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  shift_id           UUID,
  payment_method_id  UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  method_code        TEXT NOT NULL
                       CHECK (method_code IN ('cash','jazz','easy','raast','card','bank','khata','other')),
  amount             NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  tendered_amount    NUMERIC(14,2) CHECK (tendered_amount IS NULL OR tendered_amount >= 0),
  reference_no       TEXT,
  status             TEXT NOT NULL DEFAULT 'settled'
                       CHECK (status IN ('settled','voided')),
  recorded_by        UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  paid_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_payments_sale_id ON public.sale_payments(sale_id);
CREATE INDEX idx_sale_payments_shift_id ON public.sale_payments(shift_id) WHERE shift_id IS NOT NULL;
CREATE INDEX idx_sale_payments_business_paid_at ON public.sale_payments(business_id, paid_at DESC);

-- ----------------------------------------------------------------------------
-- 34. held_bills
--     Temporarily parked register carts awaiting resume or discard.
-- ----------------------------------------------------------------------------
CREATE TABLE public.held_bills (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id          UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id          UUID REFERENCES public.pos_devices(id) ON DELETE SET NULL,
  cashier_member_id  UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  customer_id        UUID,
  hold_number        INTEGER NOT NULL CHECK (hold_number > 0),
  cart_payload       JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount_payload   JSONB,
  note               TEXT,
  status             TEXT NOT NULL DEFAULT 'held'
                       CHECK (status IN ('held','resumed','discarded','expired')),
  held_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumed_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_held_bills_branch_status ON public.held_bills(branch_id, status) WHERE status = 'held';
CREATE INDEX idx_held_bills_business_id ON public.held_bills(business_id);

CREATE TRIGGER trg_held_bills_updated_at
  BEFORE UPDATE ON public.held_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 35. receipts
--     Generated receipt payloads for thermal printing and reprint history.
-- ----------------------------------------------------------------------------
CREATE TABLE public.receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  sale_id         UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES public.receipt_templates(id) ON DELETE SET NULL,
  receipt_number  TEXT NOT NULL,
  render_format   TEXT NOT NULL DEFAULT 'thermal_80mm'
                    CHECK (render_format IN ('thermal_80mm','thermal_58mm','a4')),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_sale_id ON public.receipts(sale_id);
CREATE INDEX idx_receipts_business_id ON public.receipts(business_id);

-- ----------------------------------------------------------------------------
-- 36. print_jobs
--     Tracks receipt print attempts, failures, and manual reprint queue.
-- ----------------------------------------------------------------------------
CREATE TABLE public.print_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id      UUID REFERENCES public.pos_devices(id) ON DELETE SET NULL,
  printer_id     UUID REFERENCES public.printers(id) ON DELETE SET NULL,
  sale_id        UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  receipt_id     UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  job_type       TEXT NOT NULL DEFAULT 'sale_receipt'
                   CHECK (job_type IN ('sale_receipt','reprint','test_print','shift_summary')),
  status         TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','printed','failed','unknown')),
  copies         INTEGER NOT NULL DEFAULT 1 CHECK (copies BETWEEN 1 AND 5),
  attempts       INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error_message  TEXT,
  queued_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_print_jobs_branch_status ON public.print_jobs(branch_id, status, created_at DESC);
CREATE INDEX idx_print_jobs_sale_id ON public.print_jobs(sale_id) WHERE sale_id IS NOT NULL;

CREATE TRIGGER trg_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
