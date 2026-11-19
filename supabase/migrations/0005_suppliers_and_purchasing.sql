-- ============================================================================
-- Migration: 0005_suppliers_and_purchasing.sql
-- Phase 5: Suppliers, Purchase Orders, Goods Receipts, Vendor Bills & Credits
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 53. suppliers
--     Wholesale vendors and manufacturers supplying stock to the business.
-- ----------------------------------------------------------------------------
CREATE TABLE public.suppliers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  contact_person      TEXT,
  phone               TEXT,
  email               TEXT,
  city                TEXT,
  address             TEXT,
  makes_notes         TEXT,
  opening_balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_terms_days  INTEGER NOT NULL DEFAULT 15 CHECK (payment_terms_days >= 0),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_suppliers_business_name ON public.suppliers(business_id, lower(name)) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 54. supplier_ledger
--     Accounts payable ledger tracking vendor bills, payments, and credits.
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  entry_type       TEXT NOT NULL CHECK (entry_type IN (
                     'bill_posted','payment','credit_note','opening_balance','adjustment'
                   )),
  reference_type   TEXT,
  reference_id     UUID,
  debit_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  running_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  recorded_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_supplier_ledger_nonzero CHECK (debit_amount > 0 OR credit_amount > 0)
);

CREATE INDEX idx_supplier_ledger_supplier_date ON public.supplier_ledger(supplier_id, occurred_at DESC);
CREATE INDEX idx_supplier_ledger_business_id ON public.supplier_ledger(business_id);

-- ----------------------------------------------------------------------------
-- 55. purchase_orders
--     Purchase orders issued to suppliers with approval and receipt status.
-- ----------------------------------------------------------------------------
CREATE TABLE public.purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  supplier_id      UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  po_number        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','approved','ordered','partial','received','cancelled')),
  order_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date    DATE,
  subtotal_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  is_billed        BOOLEAN NOT NULL DEFAULT false,
  created_by       UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_purchase_orders_business_no UNIQUE (business_id, po_number)
);

CREATE INDEX idx_purchase_orders_branch_status ON public.purchase_orders(branch_id, status, order_date DESC);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 56. purchase_order_items
--     Variant quantities and agreed unit costs on a purchase order.
-- ----------------------------------------------------------------------------
CREATE TABLE public.purchase_order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  purchase_order_id       UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id              UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot   TEXT NOT NULL,
  variant_label_snapshot  TEXT NOT NULL DEFAULT '',
  quantity_ordered        NUMERIC(14,3) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received       NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  po_unit_cost            NUMERIC(14,4) NOT NULL CHECK (po_unit_cost >= 0),
  actual_unit_cost        NUMERIC(14,4) CHECK (actual_unit_cost IS NULL OR actual_unit_cost >= 0),
  line_total              NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_po_items_received_lte_ordered CHECK (quantity_received <= quantity_ordered)
);

CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_business_id ON public.purchase_order_items(business_id);

CREATE TRIGGER trg_purchase_order_items_updated_at
  BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 57. goods_receipts
--     Goods Received Notes (GRN) recording physical deliveries into a branch.
-- ----------------------------------------------------------------------------
CREATE TABLE public.goods_receipts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id          UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  purchase_order_id  UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id        UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  grn_number         TEXT NOT NULL,
  received_by        UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_goods_receipts_business_no UNIQUE (business_id, grn_number)
);

CREATE INDEX idx_goods_receipts_po_id ON public.goods_receipts(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX idx_goods_receipts_branch_date ON public.goods_receipts(branch_id, received_at DESC);

-- Attach delayed GRN FK to Phase 2 serial_numbers
ALTER TABLE public.serial_numbers
  ADD CONSTRAINT fk_serial_numbers_goods_receipt
  FOREIGN KEY (goods_receipt_id) REFERENCES public.goods_receipts(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 58. goods_receipt_items
--     Variant quantities, actual landing cost, and batch numbers received.
-- ----------------------------------------------------------------------------
CREATE TABLE public.goods_receipt_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  goods_receipt_id        UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id  UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  variant_id              UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id                UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  quantity_received       NUMERIC(14,3) NOT NULL CHECK (quantity_received > 0),
  actual_unit_cost        NUMERIC(14,4) NOT NULL CHECK (actual_unit_cost >= 0),
  batch_number            TEXT,
  expiry_date             DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goods_receipt_items_grn_id ON public.goods_receipt_items(goods_receipt_id);
CREATE INDEX idx_goods_receipt_items_business_id ON public.goods_receipt_items(business_id);

-- ----------------------------------------------------------------------------
-- 59. supplier_bills
--     Vendor invoices (draft for owner review, or posted payable liability).
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_bills (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id          UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  supplier_id        UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_order_id  UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  goods_receipt_id   UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
  bill_ref           TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','posted','cancelled')),
  invoice_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  credited_amount    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credited_amount >= 0),
  created_by         UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_by          UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_at          TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_supplier_bills_supplier_ref UNIQUE (business_id, supplier_id, bill_ref),
  CONSTRAINT chk_supplier_bills_settled_lte_total CHECK (paid_amount + credited_amount <= total_amount)
);

CREATE INDEX idx_supplier_bills_business_status ON public.supplier_bills(business_id, status, due_date);
CREATE INDEX idx_supplier_bills_supplier_id ON public.supplier_bills(supplier_id);

CREATE TRIGGER trg_supplier_bills_updated_at
  BEFORE UPDATE ON public.supplier_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 60. supplier_bill_items
--     Line items billed on a supplier invoice.
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_bill_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_bill_id  UUID NOT NULL REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  description       TEXT NOT NULL,
  quantity          NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_cost         NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
  line_total        NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_bill_items_bill_id ON public.supplier_bill_items(supplier_bill_id);
CREATE INDEX idx_supplier_bill_items_business_id ON public.supplier_bill_items(business_id);

-- ----------------------------------------------------------------------------
-- 61. supplier_payments
--     Payments disbursed to vendors via cash, bank, or mobile wallets.
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  supplier_id     UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  payment_number  TEXT NOT NULL,
  method_code     TEXT NOT NULL
                    CHECK (method_code IN ('cash','bank','jazz','easy','raast','cheque','other')),
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_no    TEXT,
  paid_by         UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_supplier_payments_business_no UNIQUE (business_id, payment_number)
);

CREATE INDEX idx_supplier_payments_supplier_date ON public.supplier_payments(supplier_id, paid_at DESC);

-- ----------------------------------------------------------------------------
-- 62. supplier_payment_allocations
--     Allocates vendor payments across one or more posted supplier bills.
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_payment_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_id        UUID NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
  supplier_bill_id  UUID NOT NULL REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  allocated_amount  NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_pay_alloc_bill_id ON public.supplier_payment_allocations(supplier_bill_id);
CREATE INDEX idx_supplier_pay_alloc_business_id ON public.supplier_payment_allocations(business_id);

-- ----------------------------------------------------------------------------
-- 63. supplier_credit_notes
--     Vendor credit adjustments for damaged goods, short shipments, or rebates.
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_credit_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_bill_id    UUID REFERENCES public.supplier_bills(id) ON DELETE SET NULL,
  credit_note_number  TEXT NOT NULL,
  amount              NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reason              TEXT NOT NULL,
  issued_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by          UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_supplier_credit_notes_no UNIQUE (business_id, credit_note_number)
);

CREATE INDEX idx_supplier_credit_notes_supplier_id ON public.supplier_credit_notes(supplier_id);

-- ----------------------------------------------------------------------------
-- 64. supplier_credit_allocations
--     Applies supplier credit notes against open supplier bills.
-- ----------------------------------------------------------------------------
CREATE TABLE public.supplier_credit_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  credit_note_id    UUID NOT NULL REFERENCES public.supplier_credit_notes(id) ON DELETE CASCADE,
  supplier_bill_id  UUID NOT NULL REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  allocated_amount  NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_credit_alloc_bill_id ON public.supplier_credit_allocations(supplier_bill_id);
CREATE INDEX idx_supplier_credit_alloc_business_id ON public.supplier_credit_allocations(business_id);
