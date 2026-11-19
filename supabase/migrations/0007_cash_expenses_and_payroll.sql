-- ============================================================================
-- Migration: 0007_cash_expenses_and_payroll.sql
-- Phase 7: Cash Drawers, Shifts, Cash Ledger, Expenses, Staff & Payroll
-- Notes:
--   - Enforces zero password/PIN columns inside employee_records.
--   - Attaches delayed shift_id FKs onto sales, sale_payments,
--     customer_payments, and refund_payments.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 71. cash_drawers
--     Physical register cash drawers operated within a branch.
-- ----------------------------------------------------------------------------
CREATE TABLE public.cash_drawers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id    UUID REFERENCES public.pos_devices(id) ON DELETE SET NULL,
  name         TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_cash_drawers_branch_id ON public.cash_drawers(branch_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_cash_drawers_updated_at
  BEFORE UPDATE ON public.cash_drawers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 72. cash_shifts
--     Register opening float, active session, blind/counted close, & variance.
-- ----------------------------------------------------------------------------
CREATE TABLE public.cash_shifts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id            UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cash_drawer_id       UUID NOT NULL REFERENCES public.cash_drawers(id) ON DELETE RESTRICT,
  shift_number         TEXT NOT NULL,
  business_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  opened_by            UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  assigned_cashier_id  UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  closed_by            UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  opening_float        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (opening_float >= 0),
  expected_cash        NUMERIC(14,2),
  counted_cash         NUMERIC(14,2) CHECK (counted_cash IS NULL OR counted_cash >= 0),
  variance_amount      NUMERIC(14,2),
  variance_reason      TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cash_shifts_business_no UNIQUE (business_id, shift_number)
);

CREATE UNIQUE INDEX uq_cash_shifts_one_open_per_drawer
  ON public.cash_shifts(cash_drawer_id)
  WHERE status = 'open';
CREATE INDEX idx_cash_shifts_branch_date ON public.cash_shifts(branch_id, business_date DESC);

CREATE TRIGGER trg_cash_shifts_updated_at
  BEFORE UPDATE ON public.cash_shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attach delayed shift FKs onto Phases 3, 4, and 6 transaction tables
ALTER TABLE public.sales
  ADD CONSTRAINT fk_sales_shift
  FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

ALTER TABLE public.sale_payments
  ADD CONSTRAINT fk_sale_payments_shift
  FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

ALTER TABLE public.customer_payments
  ADD CONSTRAINT fk_customer_payments_shift
  FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

ALTER TABLE public.refund_payments
  ADD CONSTRAINT fk_refund_payments_shift
  FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 73. cash_transactions
--     Drawer inflows/outflows with owner draft review & cancellation workflow.
-- ----------------------------------------------------------------------------
CREATE TABLE public.cash_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  cash_shift_id    UUID REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
  direction        TEXT NOT NULL CHECK (direction IN ('in','out')),
  category         TEXT NOT NULL CHECK (category IN (
                     'owner_cash_in','customer_collection','misc_receipt_review',
                     'owner_cash_out','shop_expense','supplier_payment',
                     'customer_refund','misc_payout_review','pos_sale_cash'
                   )),
  amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_type   TEXT,
  reference_id     UUID,
  reference_label  TEXT,
  source_label     TEXT,
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'reviewed'
                     CHECK (status IN ('draft','reviewed','cancelled')),
  evidence_note    TEXT,
  review_note      TEXT,
  cancel_reason    TEXT,
  created_by       UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  reviewed_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_transactions_shift_id ON public.cash_transactions(cash_shift_id, occurred_at DESC);
CREATE INDEX idx_cash_transactions_branch_status ON public.cash_transactions(branch_id, status, occurred_at DESC);

CREATE TRIGGER trg_cash_transactions_updated_at
  BEFORE UPDATE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 74. expense_categories
--     Shop overhead classifications (rent, electricity, internet, etc.).
-- ----------------------------------------------------------------------------
CREATE TABLE public.expense_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code         TEXT NOT NULL CHECK (char_length(trim(code)) > 0),
  name         TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  is_system    BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_expense_categories_business_code
  ON public.expense_categories(business_id, lower(code));

CREATE TRIGGER trg_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 75. recurring_expenses
--     Monthly recurring overhead templates (e.g., shop rent, utility bills).
-- ----------------------------------------------------------------------------
CREATE TABLE public.recurring_expenses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id            UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  expense_category_id  UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  title                TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  payee_name           TEXT NOT NULL,
  amount               NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  due_day              INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
  start_month          TEXT NOT NULL,
  generated_months     JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_expenses_branch_active ON public.recurring_expenses(branch_id) WHERE is_active = true;

CREATE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 76. expenses
--     Individual shop expense bills (draft for owner review, or posted).
-- ----------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id             UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  expense_category_id   UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  recurring_expense_id  UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  expense_number        TEXT NOT NULL,
  title                 TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  payee_name            TEXT NOT NULL,
  amount                NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  service_charge        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (service_charge >= 0),
  due_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_ref              TEXT,
  period_label          TEXT,
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','posted','cancelled')),
  paid_amount           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  created_by            UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_by             UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_at             TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_expenses_business_no UNIQUE (business_id, expense_number),
  CONSTRAINT chk_expenses_paid_lte_total CHECK (paid_amount <= amount + service_charge)
);

CREATE INDEX idx_expenses_business_status ON public.expenses(business_id, status, due_date);
CREATE INDEX idx_expenses_branch_id ON public.expenses(branch_id);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 77. expense_payments
--     Payments made toward posted expense bills.
-- ----------------------------------------------------------------------------
CREATE TABLE public.expense_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  expense_id     UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  cash_shift_id  UUID REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
  method_code    TEXT NOT NULL
                   CHECK (method_code IN ('cash','bank','jazz','easy','raast','cheque','other')),
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_no   TEXT,
  paid_by        UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_payments_expense_id ON public.expense_payments(expense_id);
CREATE INDEX idx_expense_payments_business_id ON public.expense_payments(business_id);

-- ----------------------------------------------------------------------------
-- 78. employee_records
--     HR and payroll records optionally linked to a counter login member.
--     Credentials never live in this table.
-- ----------------------------------------------------------------------------
CREATE TABLE public.employee_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  member_id      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  employee_code  TEXT NOT NULL,
  full_name      TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
  job_title      TEXT NOT NULL,
  phone          TEXT,
  base_salary    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  hired_date     DATE,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT uq_employee_records_code UNIQUE (business_id, employee_code)
);

CREATE INDEX idx_employee_records_branch_active ON public.employee_records(branch_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_employee_records_updated_at
  BEFORE UPDATE ON public.employee_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 79. attendance
--     Daily attendance tracking for payroll calculation.
-- ----------------------------------------------------------------------------
CREATE TABLE public.attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  employee_id      UUID NOT NULL REFERENCES public.employee_records(id) ON DELETE CASCADE,
  attendance_date  DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'present'
                     CHECK (status IN ('present','absent','half_day','leave')),
  check_in_at      TIMESTAMPTZ,
  check_out_at     TIMESTAMPTZ,
  overtime_hours   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
  notes            TEXT,
  recorded_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_branch_date ON public.attendance(branch_id, attendance_date DESC);

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 80. staff_advances
--     Salary advances issued to staff with recovery balance tracking.
-- ----------------------------------------------------------------------------
CREATE TABLE public.staff_advances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  employee_id       UUID NOT NULL REFERENCES public.employee_records(id) ON DELETE RESTRICT,
  advance_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  recovered_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (recovered_amount >= 0),
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','partially_recovered','recovered')),
  notes             TEXT,
  issued_by         UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_staff_advances_recovered_lte_amt CHECK (recovered_amount <= amount)
);

CREATE INDEX idx_staff_advances_employee_status ON public.staff_advances(employee_id, status);

CREATE TRIGGER trg_staff_advances_updated_at
  BEFORE UPDATE ON public.staff_advances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 81. payroll
--     Monthly payroll run header (draft for owner review, or posted).
-- ----------------------------------------------------------------------------
CREATE TABLE public.payroll (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  period_key    TEXT NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'),
  working_days  INTEGER NOT NULL DEFAULT 30 CHECK (working_days BETWEEN 1 AND 31),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted')),
  total_gross   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_gross >= 0),
  total_net     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_net >= 0),
  created_by    UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_by     UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  posted_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payroll_branch_period UNIQUE (business_id, branch_id, period_key)
);

CREATE INDEX idx_payroll_business_status ON public.payroll(business_id, status);

CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 82. payroll_items
--     Employee-level earnings, deductions, advance recovery, and net pay.
-- ----------------------------------------------------------------------------
CREATE TABLE public.payroll_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_id               UUID NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
  employee_id              UUID NOT NULL REFERENCES public.employee_records(id) ON DELETE RESTRICT,
  paid_days                NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (paid_days >= 0),
  base_amount              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
  allowance_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (allowance_amount >= 0),
  bonus_amount             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  overtime_amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (overtime_amount >= 0),
  reduction_amount         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (reduction_amount >= 0),
  advance_recovery_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (advance_recovery_amount >= 0),
  net_payable              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_payable >= 0),
  paid_amount              NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payroll_items_emp UNIQUE (payroll_id, employee_id),
  CONSTRAINT chk_payroll_items_paid_lte_net CHECK (paid_amount <= net_payable)
);

CREATE INDEX idx_payroll_items_business_id ON public.payroll_items(business_id);

CREATE TRIGGER trg_payroll_items_updated_at
  BEFORE UPDATE ON public.payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 83. payroll_payments
--     Salary payout batches linked to cash drawer or bank transfers.
-- ----------------------------------------------------------------------------
CREATE TABLE public.payroll_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id      UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  payroll_id     UUID NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
  cash_shift_id  UUID REFERENCES public.cash_shifts(id) ON DELETE SET NULL,
  method_code    TEXT NOT NULL
                   CHECK (method_code IN ('cash','bank','jazz','easy','raast','other')),
  total_amount   NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  reference_no   TEXT,
  paid_by        UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_payments_payroll_id ON public.payroll_payments(payroll_id);

-- ----------------------------------------------------------------------------
-- 84. payroll_payment_allocations
--     Maps salary payouts to individual employee payroll lines.
-- ----------------------------------------------------------------------------
CREATE TABLE public.payroll_payment_allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payroll_payment_id  UUID NOT NULL REFERENCES public.payroll_payments(id) ON DELETE CASCADE,
  payroll_item_id     UUID NOT NULL REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  allocated_amount    NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_pay_alloc_item_id ON public.payroll_payment_allocations(payroll_item_id);
CREATE INDEX idx_payroll_pay_alloc_business_id ON public.payroll_payment_allocations(business_id);
