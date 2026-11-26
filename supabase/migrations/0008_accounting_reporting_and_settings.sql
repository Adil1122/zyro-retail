-- ============================================================================
-- Migration: 0008_accounting_reporting_and_settings.sql
-- Phase 8: Accounting Ledger, Tax, FBR, Settings, Attachments & Reporting Views
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 85. accounts
--     Chart of accounts per business for financial & tax reporting.
-- ----------------------------------------------------------------------------
CREATE TABLE public.accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code               TEXT NOT NULL CHECK (char_length(trim(code)) > 0),
  name               TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  account_type       TEXT NOT NULL
                       CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_account_id  UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_system          BOOLEAN NOT NULL DEFAULT false,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_accounts_business_code UNIQUE (business_id, code)
);

CREATE INDEX idx_accounts_business_type ON public.accounts(business_id, account_type);

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 86. journal_entries
--     Double-entry accounting journal headers linked to operational documents.
-- ----------------------------------------------------------------------------
CREATE TABLE public.journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
  entry_number    TEXT NOT NULL,
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type  TEXT,
  reference_id    UUID,
  description     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','posted','reversed')),
  posted_by       UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_journal_entries_business_no UNIQUE (business_id, entry_number)
);

CREATE INDEX idx_journal_entries_business_date ON public.journal_entries(business_id, entry_date DESC);
CREATE INDEX idx_journal_entries_ref ON public.journal_entries(business_id, reference_type, reference_id);

CREATE TRIGGER trg_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 87. journal_lines
--     Individual debit or credit lines within a journal entry.
-- ----------------------------------------------------------------------------
CREATE TABLE public.journal_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  journal_entry_id  UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  debit_amount      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_journal_line_single_side CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX idx_journal_lines_entry_id ON public.journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account_id ON public.journal_lines(account_id);

-- Enforce balanced debits = credits before posting a journal entry
CREATE OR REPLACE FUNCTION public.enforce_balanced_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_debit_sum   NUMERIC(14,2);
  v_credit_sum  NUMERIC(14,2);
  v_line_count  INTEGER;
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS DISTINCT FROM 'posted') THEN
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0), COUNT(*)
    INTO v_debit_sum, v_credit_sum, v_line_count
    FROM public.journal_lines
    WHERE journal_entry_id = NEW.id;

    IF v_line_count < 2 OR v_debit_sum <= 0 OR v_debit_sum <> v_credit_sum THEN
      RAISE EXCEPTION 'Cannot post unbalanced journal entry % (debits=%, credits=%)',
        NEW.entry_number, v_debit_sum, v_credit_sum;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entries_balanced_post
  BEFORE UPDATE OF status ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_balanced_journal_entry();

-- ----------------------------------------------------------------------------
-- 88. tax_rates
--     GST / Sales Tax / VAT definitions configured by the business.
-- ----------------------------------------------------------------------------
CREATE TABLE public.tax_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  code          TEXT NOT NULL CHECK (char_length(trim(code)) > 0),
  rate_percent  NUMERIC(6,3) NOT NULL DEFAULT 0 CHECK (rate_percent >= 0 AND rate_percent <= 100),
  is_inclusive  BOOLEAN NOT NULL DEFAULT true,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tax_rates_business_code UNIQUE (business_id, code)
);

CREATE INDEX idx_tax_rates_business_active ON public.tax_rates(business_id) WHERE is_active = true;

CREATE TRIGGER trg_tax_rates_updated_at
  BEFORE UPDATE ON public.tax_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 89. product_tax_rates
--     Assigns tax rates to specific products.
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_tax_rates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tax_rate_id  UUID NOT NULL REFERENCES public.tax_rates(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_tax_rate_pair UNIQUE (product_id, tax_rate_id)
);

CREATE INDEX idx_product_tax_rates_business_id ON public.product_tax_rates(business_id);

-- ----------------------------------------------------------------------------
-- 90. integrations
--     External integrations (FBR POS, WhatsApp, JazzCash, Easypaisa, Raast).
-- ----------------------------------------------------------------------------
CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN (
                    'fbr_pos','whatsapp','jazzcash','easypaisa','raast','courier','other'
                  )),
  status          TEXT NOT NULL DEFAULT 'not_configured'
                    CHECK (status IN ('not_configured','connected','error','paused')),
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_integrations_business_branch_provider
  ON public.integrations(business_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), provider);

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 91. fbr_submissions
--     Fiscal invoice queue and submission log for FBR Pakistan POS compliance.
-- ----------------------------------------------------------------------------
CREATE TABLE public.fbr_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  sale_id           UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  pos_id            TEXT NOT NULL,
  usin              TEXT NOT NULL,
  fbr_invoice_no    TEXT,
  status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','submitted','failed')),
  request_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload  JSONB,
  error_message     TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_fbr_submissions_sale UNIQUE (sale_id)
);

CREATE INDEX idx_fbr_submissions_branch_status ON public.fbr_submissions(branch_id, status);

CREATE TRIGGER trg_fbr_submissions_updated_at
  BEFORE UPDATE ON public.fbr_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 92. business_settings
--     Tenant-wide operational policies, discount caps, language & FBR profile.
-- ----------------------------------------------------------------------------
CREATE TABLE public.business_settings (
  id                               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id                      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  default_language                 TEXT NOT NULL DEFAULT 'en' CHECK (default_language IN ('en','roman','ur')),
  cashier_max_discount_pct         NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (cashier_max_discount_pct BETWEEN 0 AND 100),
  require_manager_for_no_bill_ret  BOOLEAN NOT NULL DEFAULT true,
  receipt_header_note              TEXT,
  receipt_footer_note              TEXT,
  fbr_mode                         TEXT NOT NULL DEFAULT 'not_required'
                                     CHECK (fbr_mode IN ('not_required','connected','queued')),
  fbr_ntn                          TEXT,
  fbr_strn                         TEXT,
  settings_payload                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_settings_business UNIQUE (business_id)
);

CREATE TRIGGER trg_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 93. branch_settings
--     Branch-level POS ID, pricing tax mode, and stock policy overrides.
-- ----------------------------------------------------------------------------
CREATE TABLE public.branch_settings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id              UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  fbr_pos_id             TEXT,
  tax_inclusive_pricing  BOOLEAN NOT NULL DEFAULT true,
  allow_negative_stock   BOOLEAN NOT NULL DEFAULT false,
  settings_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_branch_settings_branch UNIQUE (branch_id)
);

CREATE INDEX idx_branch_settings_business_id ON public.branch_settings(business_id);

CREATE TRIGGER trg_branch_settings_updated_at
  BEFORE UPDATE ON public.branch_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 94. device_settings
--     Per-terminal printing, offline queue, and cash drawer behavior.
-- ----------------------------------------------------------------------------
CREATE TABLE public.device_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  device_id             UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
  offline_mode_enabled  BOOLEAN NOT NULL DEFAULT true,
  auto_print_receipt    BOOLEAN NOT NULL DEFAULT true,
  paper_width           TEXT NOT NULL DEFAULT '80mm' CHECK (paper_width IN ('80mm','58mm','A4')),
  settings_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_device_settings_device UNIQUE (device_id)
);

CREATE INDEX idx_device_settings_business_id ON public.device_settings(business_id);

CREATE TRIGGER trg_device_settings_updated_at
  BEFORE UPDATE ON public.device_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 95. files_attachments
--     Metadata index for receipts, bills, avatars, and evidence in Storage.
-- ----------------------------------------------------------------------------
CREATE TABLE public.files_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  bucket_id        TEXT NOT NULL DEFAULT 'zyro-attachments',
  storage_path     TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID NOT NULL,
  file_name        TEXT NOT NULL,
  mime_type        TEXT,
  file_size_bytes  BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  uploaded_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_files_attachments_path UNIQUE (bucket_id, storage_path)
);

CREATE INDEX idx_files_attachments_entity ON public.files_attachments(business_id, entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- Security-Invoker Reporting Views
--   Use security_invoker = true so all caller RLS policies remain enforced.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_daily_branch_sales
WITH (security_invoker = true) AS
SELECT
  s.business_id,
  s.branch_id,
  (s.sold_at AT TIME ZONE COALESCE(b.timezone, 'Asia/Karachi'))::date AS business_date,
  COUNT(*) FILTER (WHERE s.status <> 'voided') AS bill_count,
  COALESCE(SUM(s.subtotal_amount) FILTER (WHERE s.status <> 'voided'), 0) AS gross_sales,
  COALESCE(SUM(s.discount_amount) FILTER (WHERE s.status <> 'voided'), 0) AS total_discounts,
  COALESCE(SUM(s.tax_amount) FILTER (WHERE s.status <> 'voided'), 0) AS total_tax,
  COALESCE(SUM(s.total_amount) FILTER (WHERE s.status <> 'voided'), 0) AS net_sales,
  COALESCE(SUM(s.paid_amount) FILTER (WHERE s.status <> 'voided'), 0) AS collected_amount,
  COALESCE(SUM(s.due_amount) FILTER (WHERE s.status <> 'voided'), 0) AS khata_credit_amount,
  COALESCE(SUM(s.refunded_amount) FILTER (WHERE s.status <> 'voided'), 0) AS refunded_amount
FROM public.sales s
JOIN public.businesses b ON b.id = s.business_id
GROUP BY s.business_id, s.branch_id, (s.sold_at AT TIME ZONE COALESCE(b.timezone, 'Asia/Karachi'))::date;

CREATE OR REPLACE VIEW public.v_customer_khata_balances
WITH (security_invoker = true) AS
SELECT
  c.id AS customer_id,
  c.business_id,
  c.branch_id,
  c.full_name,
  c.phone,
  c.khata_balance,
  c.refund_owed,
  ccl.credit_limit,
  c.last_activity_at
FROM public.customers c
LEFT JOIN public.customer_credit_limits ccl ON ccl.customer_id = c.id
WHERE c.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_supplier_payables
WITH (security_invoker = true) AS
SELECT
  sb.business_id,
  sb.supplier_id,
  s.name AS supplier_name,
  COUNT(*) FILTER (WHERE sb.status = 'posted' AND (sb.total_amount - sb.paid_amount - sb.credited_amount) > 0) AS open_bills_count,
  COALESCE(SUM(sb.total_amount - sb.paid_amount - sb.credited_amount) FILTER (WHERE sb.status = 'posted'), 0) AS payable_balance,
  COALESCE(SUM(sb.total_amount - sb.paid_amount - sb.credited_amount) FILTER (WHERE sb.status = 'posted' AND sb.due_date < CURRENT_DATE), 0) AS overdue_balance
FROM public.supplier_bills sb
JOIN public.suppliers s ON s.id = sb.supplier_id
GROUP BY sb.business_id, sb.supplier_id, s.name;

CREATE OR REPLACE VIEW public.v_stock_valuation
WITH (security_invoker = true) AS
SELECT
  sl.business_id,
  sl.branch_id,
  p.id AS product_id,
  p.name AS product_name,
  pv.id AS variant_id,
  pv.variant_name,
  pv.sku,
  sl.quantity_on_hand,
  sl.quantity_reserved,
  (sl.quantity_on_hand - sl.quantity_reserved) AS available_qty,
  sl.average_cost,
  COALESCE(pv.selling_price, p.base_selling_price) AS selling_price,
  (sl.quantity_on_hand * sl.average_cost) AS stock_cost_value,
  (sl.quantity_on_hand * COALESCE(pv.selling_price, p.base_selling_price)) AS stock_retail_value
FROM public.stock_levels sl
JOIN public.product_variants pv ON pv.id = sl.variant_id
JOIN public.products p ON p.id = pv.product_id
WHERE p.deleted_at IS NULL AND pv.deleted_at IS NULL;
