-- ============================================================================
-- Migration: 0006_returns_and_exchanges.sql
-- Phase 6: Sales Returns, Refund Liabilities, Refund Payouts & Exchanges
-- Notes:
--   - shift_id FK on refund_payments is attached in Phase 7 (cash_shifts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 65. sales_returns
--     Return headers supporting both receipt-linked and manager-approved
--     no-bill returns.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sales_returns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id            UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  original_sale_id     UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id          UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  return_number        TEXT NOT NULL,
  return_type          TEXT NOT NULL DEFAULT 'with_bill'
                         CHECK (return_type IN ('with_bill','without_bill')),
  status               TEXT NOT NULL DEFAULT 'completed'
                         CHECK (status IN ('completed','pending_approval','cancelled')),
  total_return_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_return_amount >= 0),
  reason               TEXT,
  processed_by         UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  approved_by          UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  returned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sales_returns_business_no UNIQUE (business_id, return_number)
);

CREATE INDEX idx_sales_returns_original_sale ON public.sales_returns(original_sale_id) WHERE original_sale_id IS NOT NULL;
CREATE INDEX idx_sales_returns_branch_date ON public.sales_returns(branch_id, returned_at DESC);

CREATE TRIGGER trg_sales_returns_updated_at
  BEFORE UPDATE ON public.sales_returns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 66. sales_return_items
--     Individual variants returned, item condition, and restock flag.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sales_return_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sales_return_id         UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  original_sale_item_id   UUID REFERENCES public.sale_items(id) ON DELETE SET NULL,
  variant_id              UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id                UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  product_name_snapshot   TEXT NOT NULL,
  variant_label_snapshot  TEXT NOT NULL DEFAULT '',
  quantity                NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price              NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total              NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  condition               TEXT NOT NULL DEFAULT 'resellable'
                            CHECK (condition IN ('resellable','damaged','expired')),
  restocked               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_return_items_return_id ON public.sales_return_items(sales_return_id);
CREATE INDEX idx_sales_return_items_business_id ON public.sales_return_items(business_id);

-- ----------------------------------------------------------------------------
-- 67. refunds
--     Refund liabilities created from sales returns or exchange net balances.
-- ----------------------------------------------------------------------------
CREATE TABLE public.refunds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  sales_return_id  UUID REFERENCES public.sales_returns(id) ON DELETE SET NULL,
  customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  refund_number    TEXT NOT NULL,
  total_amount     NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status           TEXT NOT NULL DEFAULT 'owed'
                     CHECK (status IN ('owed','partially_paid','paid','cancelled')),
  issued_by        UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_refunds_business_no UNIQUE (business_id, refund_number),
  CONSTRAINT chk_refunds_paid_lte_total CHECK (paid_amount <= total_amount)
);

CREATE INDEX idx_refunds_business_status ON public.refunds(business_id, status);
CREATE INDEX idx_refunds_customer_id ON public.refunds(customer_id) WHERE customer_id IS NOT NULL;

CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 68. refund_payments
--     Disbursement legs settling an owed refund (cash, wallet, bank, khata).
-- ----------------------------------------------------------------------------
CREATE TABLE public.refund_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  refund_id     UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  shift_id      UUID,
  method_code   TEXT NOT NULL
                  CHECK (method_code IN ('cash','jazz','easy','raast','card','bank','khata_credit')),
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_no  TEXT,
  paid_by       UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  paid_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refund_payments_refund_id ON public.refund_payments(refund_id);
CREATE INDEX idx_refund_payments_shift_id ON public.refund_payments(shift_id) WHERE shift_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 69. exchanges
--     Product swap linking a sales return to a replacement sale and net diff.
-- ----------------------------------------------------------------------------
CREATE TABLE public.exchanges (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id               UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id                 UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  sales_return_id           UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE RESTRICT,
  replacement_sale_id       UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  exchange_number           TEXT NOT NULL,
  return_credit_amount      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (return_credit_amount >= 0),
  replacement_total_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (replacement_total_amount >= 0),
  net_difference_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  processed_by              UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  exchanged_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_exchanges_business_no UNIQUE (business_id, exchange_number)
);

CREATE INDEX idx_exchanges_branch_date ON public.exchanges(branch_id, exchanged_at DESC);

-- ----------------------------------------------------------------------------
-- 70. exchange_items
--     Line-by-line record of returned vs replacement items in an exchange.
-- ----------------------------------------------------------------------------
CREATE TABLE public.exchange_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  exchange_id  UUID NOT NULL REFERENCES public.exchanges(id) ON DELETE CASCADE,
  direction    TEXT NOT NULL CHECK (direction IN ('returned','replacement')),
  variant_id   UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id     UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  quantity     NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  line_total   NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exchange_items_exchange_id ON public.exchange_items(exchange_id);
CREATE INDEX idx_exchange_items_business_id ON public.exchange_items(business_id);
