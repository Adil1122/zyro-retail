-- ============================================================================
-- Migration: 0009_audit_sync_and_transactions.sql
-- Phase 9: Audit Logs, Offline Sync Queue, Auth Helpers & Atomic RPC Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 96. audit_logs
--     Append-only audit trail for financial, stock, and security events.
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  actor_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_member_id  UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  device_id        UUID REFERENCES public.pos_devices(id) ON DELETE SET NULL,
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID,
  before_data      JSONB,
  after_data       JSONB,
  ip_address       INET,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_business_date ON public.audit_logs(business_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(business_id, entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 97. sync_operations
--     Offline counter operation queue with strict per-device idempotency.
-- ----------------------------------------------------------------------------
CREATE TABLE public.sync_operations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id           UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
  idempotency_key     TEXT NOT NULL,
  operation_type      TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','applied','conflict','failed')),
  error_message       TEXT,
  resolved_entity_id  UUID,
  client_created_at   TIMESTAMPTZ NOT NULL,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_sync_operations_idempotency UNIQUE (business_id, device_id, idempotency_key)
);

CREATE INDEX idx_sync_operations_branch_status ON public.sync_operations(branch_id, status, created_at);

CREATE TRIGGER trg_sync_operations_updated_at
  BEFORE UPDATE ON public.sync_operations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- Multi-Tenant & RBAC Helper Functions (used by RPCs & Phase 10 RLS policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
      AND bm.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.current_business_member_id(p_business_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bm.id
  FROM public.business_members bm
  WHERE bm.business_id = p_business_id
    AND bm.user_id = auth.uid()
    AND bm.status = 'active'
    AND bm.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_branch_access(p_business_id UUID, p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    JOIN public.roles r ON r.id = bm.role_id
    LEFT JOIN public.member_branch_access mba
      ON mba.member_id = bm.id AND mba.branch_id = p_branch_id
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
      AND bm.deleted_at IS NULL
      AND (r.name = 'owner' OR mba.id IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_business_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    JOIN public.role_permissions rp ON rp.role_id = bm.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
      AND bm.deleted_at IS NULL
      AND p.permission_key = p_permission_key
  );
$$;

-- ============================================================================
-- Atomic PL/pgSQL Transactional Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RPC 0: create_business_workspace(p_payload JSONB)
--   Atomically provisions a new shop tenant for auth.uid():
--   user_profiles (if absent), businesses, system RBAC roles, main branch,
--   owner membership + branch access, default cash drawer, payment methods,
--   expense categories, receipt template, and business/branch settings.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_business_workspace(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_shop_name     TEXT := NULLIF(trim(p_payload->>'shop_name'), '');
  v_phone         TEXT := NULLIF(trim(p_payload->>'phone'), '');
  v_owner_name    TEXT := COALESCE(NULLIF(trim(p_payload->>'owner_name'), ''), 'Shop Owner');
  v_shop_kit      TEXT := COALESCE(NULLIF(trim(p_payload->>'shop_kit'), ''), 'clothing');
  v_branch_name   TEXT := COALESCE(NULLIF(trim(p_payload->>'main_branch_name'), ''), 'Main branch');
  v_business_id   UUID;
  v_owner_role_id UUID;
  v_branch_id     UUID;
  v_member_id     UUID;
  v_drawer_id     UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated Supabase user session is required';
  END IF;

  IF v_shop_name IS NULL OR v_phone IS NULL THEN
    RAISE EXCEPTION 'shop_name and phone are required';
  END IF;

  INSERT INTO public.user_profiles (id, full_name, phone)
  VALUES (v_user_id, v_owner_name, v_phone)
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.user_profiles.full_name),
      phone     = COALESCE(public.user_profiles.phone, EXCLUDED.phone);

  INSERT INTO public.businesses (name, phone, shop_kit, owner_user_id)
  VALUES (v_shop_name, v_phone, v_shop_kit, v_user_id)
  RETURNING id INTO v_business_id;

  PERFORM public.bootstrap_business_roles(v_business_id);

  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE business_id = v_business_id AND name = 'owner';

  INSERT INTO public.branches (business_id, name, city, address, phone, is_main)
  VALUES (
    v_business_id,
    v_branch_name,
    NULLIF(trim(p_payload->>'city'), ''),
    NULLIF(trim(p_payload->>'address'), ''),
    v_phone,
    true
  )
  RETURNING id INTO v_branch_id;

  INSERT INTO public.business_members (business_id, user_id, role_id, status)
  VALUES (v_business_id, v_user_id, v_owner_role_id, 'active')
  RETURNING id INTO v_member_id;

  INSERT INTO public.member_branch_access (business_id, member_id, branch_id, is_default)
  VALUES (v_business_id, v_member_id, v_branch_id, true);

  INSERT INTO public.cash_drawers (business_id, branch_id, name)
  VALUES (v_business_id, v_branch_id, 'Counter 1')
  RETURNING id INTO v_drawer_id;

  INSERT INTO public.payment_methods (business_id, method_code, display_name, sort_order) VALUES
    (v_business_id, 'cash',  'Cash',      1),
    (v_business_id, 'jazz',  'JazzCash',  2),
    (v_business_id, 'easy',  'Easypaisa', 3),
    (v_business_id, 'raast', 'Raast QR',  4),
    (v_business_id, 'card',  'Card',      5),
    (v_business_id, 'bank',  'Bank',      6),
    (v_business_id, 'khata', 'Khata',     7);

  INSERT INTO public.expense_categories (business_id, code, name, is_system) VALUES
    (v_business_id, 'rent',        'Shop Rent',   true),
    (v_business_id, 'electricity', 'Electricity', true),
    (v_business_id, 'gas',         'Gas',         true),
    (v_business_id, 'water',       'Water',       true),
    (v_business_id, 'internet',    'Internet',    true),
    (v_business_id, 'supplies',    'Supplies',    true),
    (v_business_id, 'marketing',   'Marketing',   true),
    (v_business_id, 'repairs',     'Repairs',     true),
    (v_business_id, 'transport',   'Transport',   true),
    (v_business_id, 'other',       'Other',       true);

  INSERT INTO public.receipt_templates (business_id, name, is_default)
  VALUES (v_business_id, 'Default Receipt', true);

  INSERT INTO public.business_settings (business_id)
  VALUES (v_business_id);

  INSERT INTO public.branch_settings (business_id, branch_id)
  VALUES (v_business_id, v_branch_id);

  INSERT INTO public.audit_logs (
    business_id, branch_id, actor_user_id, actor_member_id,
    action, entity_type, entity_id, after_data
  ) VALUES (
    v_business_id, v_branch_id, v_user_id, v_member_id,
    'business.created', 'business', v_business_id,
    jsonb_build_object('shop_name', v_shop_name, 'shop_kit', v_shop_kit)
  );

  RETURN jsonb_build_object(
    'business_id', v_business_id,
    'branch_id', v_branch_id,
    'member_id', v_member_id,
    'cash_drawer_id', v_drawer_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 1: complete_sale(p_payload JSONB)
--   Atomically validates stock/batches/serials, snapshots historical pricing,
--   verifies tender totals & Khata limits, creates sale + items + discounts +
--   payments + receipt + print job, deducts inventory, posts Khata & cash.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_sale(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id      UUID := (p_payload->>'business_id')::UUID;
  v_branch_id        UUID := (p_payload->>'branch_id')::UUID;
  v_device_id        UUID := NULLIF(p_payload->>'device_id', '')::UUID;
  v_shift_id         UUID := NULLIF(p_payload->>'shift_id', '')::UUID;
  v_customer_id      UUID := NULLIF(p_payload->>'customer_id', '')::UUID;
  v_client_sync_id   TEXT := NULLIF(p_payload->>'client_sync_id', '');
  v_member_id        UUID;
  v_existing_sale    RECORD;
  v_bill_number      BIGINT;
  v_sale_id          UUID;
  v_receipt_id       UUID;
  v_subtotal         NUMERIC(14,2) := 0;
  v_bill_discount    NUMERIC(14,2) := GREATEST(COALESCE((p_payload->>'discount_amount')::NUMERIC, 0), 0);
  v_tax_total        NUMERIC(14,2) := GREATEST(COALESCE((p_payload->>'tax_amount')::NUMERIC, 0), 0);
  v_total_amount     NUMERIC(14,2) := 0;
  v_paid_non_khata   NUMERIC(14,2) := 0;
  v_khata_due        NUMERIC(14,2) := 0;
  v_cash_inflow      NUMERIC(14,2) := 0;
  v_tendered_cash    NUMERIC(14,2) := 0;
  v_change_given     NUMERIC(14,2) := 0;
  v_item             JSONB;
  v_pay              JSONB;
  v_variant          RECORD;
  v_stock_id         UUID;
  v_stock_qty        NUMERIC(14,3);
  v_unit_cost        NUMERIC(14,4);
  v_qty              NUMERIC(14,3);
  v_unit_price       NUMERIC(14,2);
  v_orig_price       NUMERIC(14,2);
  v_line_disc        NUMERIC(14,2);
  v_line_total       NUMERIC(14,2);
  v_sale_item_id     UUID;
  v_pay_amt          NUMERIC(14,2);
  v_method           TEXT;
  v_prev_khata       NUMERIC(14,2);
  v_credit_limit     NUMERIC(14,2);
  v_block_overdue    BOOLEAN;
BEGIN
  IF v_business_id IS NULL OR v_branch_id IS NULL THEN
    RAISE EXCEPTION 'business_id and branch_id are required';
  END IF;

  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'pos.sell') THEN
    RAISE EXCEPTION 'Unauthorized to complete POS sale on branch %', v_branch_id;
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  -- Idempotency check for offline sync replay protection
  IF v_client_sync_id IS NOT NULL THEN
    SELECT id, bill_number, total_amount, paid_amount, due_amount, status
    INTO v_existing_sale
    FROM public.sales
    WHERE business_id = v_business_id AND client_sync_id = v_client_sync_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'sale_id', v_existing_sale.id,
        'bill_number', v_existing_sale.bill_number,
        'total_amount', v_existing_sale.total_amount,
        'paid_amount', v_existing_sale.paid_amount,
        'due_amount', v_existing_sale.due_amount,
        'status', v_existing_sale.status,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Cannot complete sale without at least one line item';
  END IF;

  -- Lock branch row to safely allocate sequential branch bill_number
  PERFORM 1 FROM public.branches WHERE id = v_branch_id AND business_id = v_business_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch % not found in business %', v_branch_id, v_business_id;
  END IF;

  SELECT COALESCE(MAX(bill_number), 0) + 1
  INTO v_bill_number
  FROM public.sales
  WHERE branch_id = v_branch_id;

  -- Pre-create sale header (totals updated immediately after line calculations)
  INSERT INTO public.sales (
    business_id, branch_id, device_id, shift_id, customer_id,
    cashier_member_id, bill_number, status, client_sync_id,
    offline_pending, notes, sold_at
  ) VALUES (
    v_business_id, v_branch_id, v_device_id, v_shift_id, v_customer_id,
    v_member_id, v_bill_number, 'completed', v_client_sync_id,
    COALESCE((p_payload->>'offline_pending')::BOOLEAN, false),
    p_payload->>'notes',
    COALESCE((p_payload->>'sold_at')::TIMESTAMPTZ, now())
  )
  RETURNING id INTO v_sale_id;

  -- Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_qty := (v_item->>'quantity')::NUMERIC;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid line quantity';
    END IF;

    SELECT pv.id AS variant_id, pv.product_id, pv.variant_name, pv.sku,
           pv.cost_price, COALESCE(pv.selling_price, p.base_selling_price) AS default_price,
           p.name AS product_name, p.track_inventory
    INTO v_variant
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = (v_item->>'variant_id')::UUID
      AND pv.business_id = v_business_id
      AND pv.deleted_at IS NULL
      AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found for business %', v_item->>'variant_id', v_business_id;
    END IF;

    v_orig_price := COALESCE((v_item->>'original_unit_price')::NUMERIC, v_variant.default_price);
    v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, v_variant.default_price);
    v_line_disc  := GREATEST(COALESCE((v_item->>'line_discount_amount')::NUMERIC, 0), 0);
    v_line_total := GREATEST((v_unit_price * v_qty) - v_line_disc, 0);
    v_subtotal   := v_subtotal + v_line_total;
    v_unit_cost  := v_variant.cost_price;

    -- Lock and deduct branch stock when inventory tracking is enabled
    IF v_variant.track_inventory THEN
      v_stock_id  := NULL;
      v_stock_qty := NULL;

      SELECT id, quantity_on_hand, average_cost
      INTO v_stock_id, v_stock_qty, v_unit_cost
      FROM public.stock_levels
      WHERE branch_id = v_branch_id AND variant_id = v_variant.variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock level found for % (%) on branch', v_variant.product_name, v_variant.variant_name;
      END IF;

      IF v_stock_qty < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for % (%)', v_variant.product_name, v_variant.variant_name;
      END IF;

      v_unit_cost := COALESCE(v_unit_cost, v_variant.cost_price);

      UPDATE public.stock_levels
      SET quantity_on_hand = quantity_on_hand - v_qty
      WHERE id = v_stock_id;

      IF NULLIF(v_item->>'batch_id', '') IS NOT NULL THEN
        UPDATE public.product_batches
        SET quantity_on_hand = quantity_on_hand - v_qty
        WHERE id = (v_item->>'batch_id')::UUID
          AND branch_id = v_branch_id
          AND variant_id = v_variant.variant_id
          AND quantity_on_hand >= v_qty;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient batch stock for batch %', v_item->>'batch_id';
        END IF;
      END IF;

      INSERT INTO public.stock_movements (
        business_id, branch_id, variant_id, batch_id, movement_type,
        quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
      ) VALUES (
        v_business_id, v_branch_id, v_variant.variant_id,
        NULLIF(v_item->>'batch_id', '')::UUID,
        'sale', -v_qty, v_unit_cost,
        'sale', v_sale_id, 'POS Sale #' || v_bill_number, v_member_id
      );
    END IF;

    INSERT INTO public.sale_items (
      business_id, sale_id, product_id, variant_id, batch_id,
      product_name_snapshot, variant_label_snapshot, sku_snapshot,
      unit_cost_snapshot, unit_price, original_unit_price,
      quantity, line_discount_amount, line_total, note
    ) VALUES (
      v_business_id, v_sale_id, v_variant.product_id, v_variant.variant_id,
      NULLIF(v_item->>'batch_id', '')::UUID,
      v_variant.product_name, v_variant.variant_name, v_variant.sku,
      v_unit_cost, v_unit_price, v_orig_price, v_qty, v_line_disc, v_line_total, v_item->>'note'
    )
    RETURNING id INTO v_sale_item_id;

    -- Mark serialized IMEI/serial as sold if supplied
    IF NULLIF(v_item->>'serial_number_id', '') IS NOT NULL THEN
      UPDATE public.serial_numbers
      SET status = 'sold', sold_sale_item_id = v_sale_item_id
      WHERE id = (v_item->>'serial_number_id')::UUID
        AND branch_id = v_branch_id
        AND variant_id = v_variant.variant_id
        AND status IN ('in_stock','reserved');
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Serial/IMEI % is unavailable for sale', v_item->>'serial_number_id';
      END IF;
    END IF;
  END LOOP;

  v_total_amount := GREATEST(v_subtotal - v_bill_discount + v_tax_total, 0);

  -- Record bill-level discount if applicable
  IF v_bill_discount > 0 AND (p_payload->'discount_payload') IS NOT NULL THEN
    INSERT INTO public.sale_discounts (
      business_id, sale_id, discount_scope, discount_mode,
      discount_value, discount_amount, reason, applied_by
    ) VALUES (
      v_business_id, v_sale_id, 'bill',
      COALESCE(p_payload->'discount_payload'->>'mode', 'rs'),
      COALESCE((p_payload->'discount_payload'->>'value')::NUMERIC, v_bill_discount),
      v_bill_discount,
      p_payload->'discount_payload'->>'reason',
      v_member_id
    );
  END IF;

  -- Process payment splits
  FOR v_pay IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'payments', '[]'::jsonb))
  LOOP
    v_method  := v_pay->>'method_code';
    v_pay_amt := (v_pay->>'amount')::NUMERIC;
    IF v_pay_amt IS NULL OR v_pay_amt <= 0 THEN
      RAISE EXCEPTION 'Payment leg amount must be positive';
    END IF;

    INSERT INTO public.sale_payments (
      business_id, branch_id, sale_id, shift_id, method_code,
      amount, tendered_amount, reference_no, recorded_by
    ) VALUES (
      v_business_id, v_branch_id, v_sale_id, v_shift_id, v_method,
      v_pay_amt, NULLIF(v_pay->>'tendered_amount', '')::NUMERIC,
      v_pay->>'reference_no', v_member_id
    );

    IF v_method = 'khata' THEN
      v_khata_due := v_khata_due + v_pay_amt;
    ELSE
      v_paid_non_khata := v_paid_non_khata + v_pay_amt;
      IF v_method = 'cash' THEN
        v_cash_inflow   := v_cash_inflow + v_pay_amt;
        v_tendered_cash := v_tendered_cash + COALESCE((v_pay->>'tendered_amount')::NUMERIC, v_pay_amt);
      END IF;
    END IF;
  END LOOP;

  IF (v_paid_non_khata + v_khata_due) < v_total_amount THEN
    RAISE EXCEPTION 'Total payment (%) is less than bill total (%)',
      (v_paid_non_khata + v_khata_due), v_total_amount;
  END IF;

  v_change_given := GREATEST(v_tendered_cash - v_cash_inflow, 0);

  IF v_khata_due > 0 THEN
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'A customer must be selected for Khata credit sales';
    END IF;

    SELECT khata_balance INTO v_prev_khata
    FROM public.customers
    WHERE id = v_customer_id AND business_id = v_business_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Customer % not found', v_customer_id;
    END IF;

    SELECT credit_limit, block_on_overdue
    INTO v_credit_limit, v_block_overdue
    FROM public.customer_credit_limits
    WHERE customer_id = v_customer_id;

    IF FOUND AND v_block_overdue AND v_credit_limit > 0 AND (v_prev_khata + v_khata_due) > v_credit_limit THEN
      RAISE EXCEPTION 'Customer Khata balance (%) would exceed credit limit (%)',
        (v_prev_khata + v_khata_due), v_credit_limit;
    END IF;

    UPDATE public.customers
    SET khata_balance = khata_balance + v_khata_due,
        last_activity_at = now()
    WHERE id = v_customer_id;

    INSERT INTO public.customer_ledger (
      business_id, branch_id, customer_id, entry_type,
      reference_type, reference_id, debit_amount, credit_amount,
      running_balance, notes, recorded_by
    ) VALUES (
      v_business_id, v_branch_id, v_customer_id, 'sale_credit',
      'sale', v_sale_id, v_khata_due, 0,
      v_prev_khata + v_khata_due, 'POS Bill #' || v_bill_number, v_member_id
    );
  END IF;

  IF v_cash_inflow > 0 AND v_shift_id IS NOT NULL THEN
    INSERT INTO public.cash_transactions (
      business_id, branch_id, cash_shift_id, direction, category,
      amount, reference_type, reference_id, reference_label, status, created_by
    ) VALUES (
      v_business_id, v_branch_id, v_shift_id, 'in', 'pos_sale_cash',
      v_cash_inflow, 'sale', v_sale_id, 'Bill #' || v_bill_number, 'reviewed', v_member_id
    );
  END IF;

  UPDATE public.sales
  SET subtotal_amount = v_subtotal,
      discount_amount = v_bill_discount,
      tax_amount      = v_tax_total,
      total_amount    = v_total_amount,
      paid_amount     = v_paid_non_khata,
      due_amount      = v_khata_due,
      change_given    = v_change_given
  WHERE id = v_sale_id;

  INSERT INTO public.receipts (
    business_id, branch_id, sale_id, receipt_number, payload
  ) VALUES (
    v_business_id, v_branch_id, v_sale_id,
    'RCP-' || v_bill_number::TEXT,
    jsonb_build_object(
      'bill_number', v_bill_number,
      'total_amount', v_total_amount,
      'paid_amount', v_paid_non_khata,
      'due_amount', v_khata_due
    )
  )
  RETURNING id INTO v_receipt_id;

  INSERT INTO public.print_jobs (
    business_id, branch_id, device_id, sale_id, receipt_id, job_type, status, queued_by
  ) VALUES (
    v_business_id, v_branch_id, v_device_id, v_sale_id, v_receipt_id, 'sale_receipt', 'queued', v_member_id
  );

  INSERT INTO public.audit_logs (
    business_id, branch_id, actor_user_id, actor_member_id, device_id,
    action, entity_type, entity_id, after_data
  ) VALUES (
    v_business_id, v_branch_id, auth.uid(), v_member_id, v_device_id,
    'sale.completed', 'sale', v_sale_id,
    jsonb_build_object('bill_number', v_bill_number, 'total_amount', v_total_amount)
  );

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'bill_number', v_bill_number,
    'total_amount', v_total_amount,
    'paid_amount', v_paid_non_khata,
    'due_amount', v_khata_due,
    'change_given', v_change_given,
    'receipt_id', v_receipt_id,
    'status', 'completed'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 2: receive_purchase_order(p_payload JSONB)
--   Atomically creates a GRN, increments branch stock + weighted moving avg cost,
--   updates batches and PO received quantities, and optionally drafts vendor bill.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id    UUID := (p_payload->>'business_id')::UUID;
  v_branch_id      UUID := (p_payload->>'branch_id')::UUID;
  v_po_id          UUID := (p_payload->>'purchase_order_id')::UUID;
  v_grn_number     TEXT := NULLIF(trim(p_payload->>'grn_number'), '');
  v_member_id      UUID;
  v_po             RECORD;
  v_grn_id         UUID;
  v_item           JSONB;
  v_po_item_id     UUID;
  v_variant_id     UUID;
  v_qty_recv       NUMERIC(14,3);
  v_unit_cost      NUMERIC(14,4);
  v_batch_no       TEXT;
  v_expiry         DATE;
  v_batch_id       UUID;
  v_cur_qty        NUMERIC(14,3);
  v_cur_cost       NUMERIC(14,4);
  v_new_avg        NUMERIC(14,4);
  v_remaining_open INTEGER;
  v_po_status      TEXT;
  v_bill_id        UUID;
  v_bill_total     NUMERIC(14,2) := 0;
BEGIN
  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'purchasing.receive') THEN
    RAISE EXCEPTION 'Unauthorized to receive purchase order inventory';
  END IF;

  IF v_grn_number IS NULL THEN
    RAISE EXCEPTION 'grn_number is required';
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one received line item is required';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  SELECT * INTO v_po
  FROM public.purchase_orders
  WHERE id = v_po_id AND business_id = v_business_id AND branch_id = v_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found on branch %', v_po_id, v_branch_id;
  END IF;

  IF v_po.status IN ('cancelled','received') THEN
    RAISE EXCEPTION 'Purchase order % cannot receive goods (status=%)', v_po_id, v_po.status;
  END IF;

  INSERT INTO public.goods_receipts (
    business_id, branch_id, purchase_order_id, supplier_id,
    grn_number, received_by, notes
  ) VALUES (
    v_business_id, v_branch_id, v_po_id, v_po.supplier_id,
    v_grn_number, v_member_id, p_payload->>'notes'
  )
  RETURNING id INTO v_grn_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_po_item_id := NULLIF(v_item->>'purchase_order_item_id', '')::UUID;
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_qty_recv   := (v_item->>'quantity_received')::NUMERIC;
    v_unit_cost  := (v_item->>'actual_unit_cost')::NUMERIC;
    v_batch_no   := NULLIF(trim(v_item->>'batch_number'), '');
    v_expiry     := NULLIF(v_item->>'expiry_date', '')::DATE;
    v_batch_id   := NULL;

    IF v_qty_recv IS NULL OR v_qty_recv <= 0 OR v_unit_cost IS NULL OR v_unit_cost < 0 THEN
      RAISE EXCEPTION 'Invalid received quantity or cost';
    END IF;

    IF v_po_item_id IS NOT NULL THEN
      UPDATE public.purchase_order_items
      SET quantity_received = quantity_received + v_qty_recv,
          actual_unit_cost  = v_unit_cost
      WHERE id = v_po_item_id
        AND purchase_order_id = v_po_id
        AND quantity_received + v_qty_recv <= quantity_ordered;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Received quantity exceeds ordered quantity for PO item %', v_po_item_id;
      END IF;
    END IF;

    IF v_batch_no IS NOT NULL THEN
      INSERT INTO public.product_batches (
        business_id, branch_id, variant_id, batch_number, expiry_date, cost_price, quantity_on_hand
      ) VALUES (
        v_business_id, v_branch_id, v_variant_id, v_batch_no, v_expiry, v_unit_cost, v_qty_recv
      )
      ON CONFLICT (branch_id, variant_id, batch_number) DO UPDATE
      SET quantity_on_hand = public.product_batches.quantity_on_hand + EXCLUDED.quantity_on_hand,
          cost_price = EXCLUDED.cost_price,
          expiry_date = COALESCE(EXCLUDED.expiry_date, public.product_batches.expiry_date)
      RETURNING id INTO v_batch_id;
    END IF;

    SELECT quantity_on_hand, average_cost
    INTO v_cur_qty, v_cur_cost
    FROM public.stock_levels
    WHERE branch_id = v_branch_id AND variant_id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.stock_levels (
        business_id, branch_id, variant_id, quantity_on_hand, average_cost
      ) VALUES (
        v_business_id, v_branch_id, v_variant_id, v_qty_recv, v_unit_cost
      );
    ELSE
      v_new_avg := CASE
        WHEN (v_cur_qty + v_qty_recv) > 0
          THEN ((v_cur_qty * v_cur_cost) + (v_qty_recv * v_unit_cost)) / (v_cur_qty + v_qty_recv)
        ELSE v_unit_cost
      END;
      UPDATE public.stock_levels
      SET quantity_on_hand = quantity_on_hand + v_qty_recv,
          average_cost     = v_new_avg
      WHERE branch_id = v_branch_id AND variant_id = v_variant_id;
    END IF;

    INSERT INTO public.goods_receipt_items (
      business_id, goods_receipt_id, purchase_order_item_id, variant_id,
      batch_id, quantity_received, actual_unit_cost, batch_number, expiry_date
    ) VALUES (
      v_business_id, v_grn_id, v_po_item_id, v_variant_id,
      v_batch_id, v_qty_recv, v_unit_cost, v_batch_no, v_expiry
    );

    INSERT INTO public.stock_movements (
      business_id, branch_id, variant_id, batch_id, movement_type,
      quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
    ) VALUES (
      v_business_id, v_branch_id, v_variant_id, v_batch_id, 'purchase_receipt',
      v_qty_recv, v_unit_cost, 'goods_receipt', v_grn_id,
      'GRN ' || v_grn_number || ' / PO ' || v_po.po_number, v_member_id
    );

    v_bill_total := v_bill_total + ROUND(v_qty_recv * v_unit_cost, 2);
  END LOOP;

  SELECT COUNT(*) INTO v_remaining_open
  FROM public.purchase_order_items
  WHERE purchase_order_id = v_po_id AND quantity_received < quantity_ordered;

  v_po_status := CASE WHEN v_remaining_open = 0 THEN 'received' ELSE 'partial' END;

  UPDATE public.purchase_orders
  SET status = v_po_status,
      is_billed = COALESCE((p_payload->>'create_draft_bill')::BOOLEAN, false) OR is_billed
  WHERE id = v_po_id;

  IF COALESCE((p_payload->>'create_draft_bill')::BOOLEAN, false) THEN
    INSERT INTO public.supplier_bills (
      business_id, branch_id, supplier_id, purchase_order_id, goods_receipt_id,
      bill_ref, status, total_amount, created_by
    ) VALUES (
      v_business_id, v_branch_id, v_po.supplier_id, v_po_id, v_grn_id,
      COALESCE(NULLIF(p_payload->>'bill_ref', ''), 'BILL-' || v_grn_number),
      'draft', v_bill_total, v_member_id
    )
    RETURNING id INTO v_bill_id;
  END IF;

  RETURN jsonb_build_object(
    'goods_receipt_id', v_grn_id,
    'grn_number', v_grn_number,
    'po_status', v_po_status,
    'draft_bill_id', v_bill_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 3: process_sales_return(p_payload JSONB)
--   Validates returnable quantities, restocks resellable items, and records
--   a customer refund liability.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sales_return(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id      UUID := (p_payload->>'business_id')::UUID;
  v_branch_id        UUID := (p_payload->>'branch_id')::UUID;
  v_orig_sale_id     UUID := NULLIF(p_payload->>'original_sale_id', '')::UUID;
  v_customer_id      UUID := NULLIF(p_payload->>'customer_id', '')::UUID;
  v_return_number    TEXT := NULLIF(trim(p_payload->>'return_number'), '');
  v_member_id        UUID;
  v_return_id        UUID;
  v_refund_id        UUID;
  v_total_return     NUMERIC(14,2) := 0;
  v_item             JSONB;
  v_orig_item_id     UUID;
  v_variant_id       UUID;
  v_batch_id         UUID;
  v_qty              NUMERIC(14,3);
  v_price            NUMERIC(14,2);
  v_line_total       NUMERIC(14,2);
  v_condition        TEXT;
  v_restock          BOOLEAN;
  v_prod_name        TEXT;
  v_var_name         TEXT;
  v_cost             NUMERIC(14,4);
BEGIN
  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'pos.returns.process') THEN
    RAISE EXCEPTION 'Unauthorized to process sales return';
  END IF;

  IF v_return_number IS NULL THEN
    RAISE EXCEPTION 'return_number is required';
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one return line item is required';
  END IF;

  IF v_orig_sale_id IS NOT NULL THEN
    PERFORM 1 FROM public.sales
    WHERE id = v_orig_sale_id AND business_id = v_business_id AND branch_id = v_branch_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original sale % not found in branch %', v_orig_sale_id, v_branch_id;
    END IF;
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  INSERT INTO public.sales_returns (
    business_id, branch_id, original_sale_id, customer_id, return_number,
    return_type, status, reason, processed_by
  ) VALUES (
    v_business_id, v_branch_id, v_orig_sale_id, v_customer_id, v_return_number,
    COALESCE(p_payload->>'return_type', CASE WHEN v_orig_sale_id IS NULL THEN 'without_bill' ELSE 'with_bill' END),
    'completed', p_payload->>'reason', v_member_id
  )
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_orig_item_id := NULLIF(v_item->>'original_sale_item_id', '')::UUID;
    v_variant_id   := (v_item->>'variant_id')::UUID;
    v_batch_id     := NULLIF(v_item->>'batch_id', '')::UUID;
    v_qty          := (v_item->>'quantity')::NUMERIC;
    v_price        := (v_item->>'unit_price')::NUMERIC;
    v_condition    := COALESCE(v_item->>'condition', 'resellable');
    v_restock      := COALESCE((v_item->>'restocked')::BOOLEAN, v_condition = 'resellable');

    IF v_qty IS NULL OR v_qty <= 0 OR v_price IS NULL OR v_price < 0 THEN
      RAISE EXCEPTION 'Invalid return quantity or unit price';
    END IF;

    v_line_total   := ROUND(v_qty * v_price, 2);
    v_total_return := v_total_return + v_line_total;

    SELECT p.name, pv.variant_name, pv.cost_price
    INTO v_prod_name, v_var_name, v_cost
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = v_variant_id AND pv.business_id = v_business_id;

    IF v_orig_item_id IS NOT NULL THEN
      UPDATE public.sale_items
      SET returned_quantity = returned_quantity + v_qty
      WHERE id = v_orig_item_id
        AND sale_id = v_orig_sale_id
        AND returned_quantity + v_qty <= quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Return quantity exceeds remaining sold quantity for item %', v_orig_item_id;
      END IF;
    END IF;

    INSERT INTO public.sales_return_items (
      business_id, sales_return_id, original_sale_item_id, variant_id, batch_id,
      product_name_snapshot, variant_label_snapshot, quantity, unit_price,
      line_total, condition, restocked
    ) VALUES (
      v_business_id, v_return_id, v_orig_item_id, v_variant_id, v_batch_id,
      COALESCE(v_prod_name, 'Item'), COALESCE(v_var_name, ''),
      v_qty, v_price, v_line_total, v_condition, v_restock
    );

    IF v_restock THEN
      INSERT INTO public.stock_levels (
        business_id, branch_id, variant_id, quantity_on_hand, average_cost
      ) VALUES (
        v_business_id, v_branch_id, v_variant_id, v_qty, COALESCE(v_cost, 0)
      )
      ON CONFLICT (branch_id, variant_id) DO UPDATE
      SET quantity_on_hand = public.stock_levels.quantity_on_hand + EXCLUDED.quantity_on_hand;

      IF v_batch_id IS NOT NULL THEN
        UPDATE public.product_batches
        SET quantity_on_hand = quantity_on_hand + v_qty
        WHERE id = v_batch_id AND branch_id = v_branch_id;
      END IF;

      INSERT INTO public.stock_movements (
        business_id, branch_id, variant_id, batch_id, movement_type,
        quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
      ) VALUES (
        v_business_id, v_branch_id, v_variant_id, v_batch_id, 'sale_return',
        v_qty, COALESCE(v_cost, 0), 'sales_return', v_return_id,
        'Sales Return ' || v_return_number, v_member_id
      );
    END IF;
  END LOOP;

  UPDATE public.sales_returns
  SET total_return_amount = v_total_return
  WHERE id = v_return_id;

  IF v_orig_sale_id IS NOT NULL THEN
    UPDATE public.sales
    SET refunded_amount = refunded_amount + v_total_return,
        status = CASE
          WHEN refunded_amount + v_total_return >= total_amount THEN 'refunded'
          ELSE 'partially_refunded'
        END
    WHERE id = v_orig_sale_id;
  END IF;

  IF v_total_return > 0 THEN
    INSERT INTO public.refunds (
      business_id, branch_id, sales_return_id, customer_id,
      refund_number, total_amount, status, issued_by
    ) VALUES (
      v_business_id, v_branch_id, v_return_id, v_customer_id,
      'RFD-' || v_return_number, v_total_return, 'owed', v_member_id
    )
    RETURNING id INTO v_refund_id;

    IF v_customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET refund_owed = refund_owed + v_total_return,
          last_activity_at = now()
      WHERE id = v_customer_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'sales_return_id', v_return_id,
    'refund_id', v_refund_id,
    'total_return_amount', v_total_return
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 4: issue_refund(p_payload JSONB)
--   Settles a pending refund liability via drawer cash, wallet, or Khata credit.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_refund(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id  UUID := (p_payload->>'business_id')::UUID;
  v_branch_id    UUID := (p_payload->>'branch_id')::UUID;
  v_refund_id    UUID := (p_payload->>'refund_id')::UUID;
  v_shift_id     UUID := NULLIF(p_payload->>'shift_id', '')::UUID;
  v_method       TEXT := p_payload->>'method_code';
  v_amount       NUMERIC(14,2) := (p_payload->>'amount')::NUMERIC;
  v_member_id    UUID;
  v_refund       RECORD;
  v_pay_id       UUID;
  v_new_paid     NUMERIC(14,2);
  v_new_status   TEXT;
  v_prev_khata   NUMERIC(14,2);
BEGIN
  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'pos.refunds.pay') THEN
    RAISE EXCEPTION 'Unauthorized to issue refund';
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Refund payment amount must be positive';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  SELECT * INTO v_refund
  FROM public.refunds
  WHERE id = v_refund_id AND business_id = v_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund % not found', v_refund_id;
  END IF;

  IF v_refund.status IN ('paid','cancelled') THEN
    RAISE EXCEPTION 'Refund % is not open for payment (status=%)', v_refund_id, v_refund.status;
  END IF;

  v_new_paid := v_refund.paid_amount + v_amount;
  IF v_new_paid > v_refund.total_amount THEN
    RAISE EXCEPTION 'Refund payment amount % exceeds remaining balance', v_amount;
  END IF;

  v_new_status := CASE WHEN v_new_paid = v_refund.total_amount THEN 'paid' ELSE 'partially_paid' END;

  INSERT INTO public.refund_payments (
    business_id, branch_id, refund_id, shift_id, method_code,
    amount, reference_no, paid_by
  ) VALUES (
    v_business_id, v_branch_id, v_refund_id, v_shift_id, v_method,
    v_amount, p_payload->>'reference_no', v_member_id
  )
  RETURNING id INTO v_pay_id;

  UPDATE public.refunds
  SET paid_amount = v_new_paid,
      status = v_new_status
  WHERE id = v_refund_id;

  IF v_refund.customer_id IS NOT NULL THEN
    SELECT khata_balance INTO v_prev_khata
    FROM public.customers WHERE id = v_refund.customer_id FOR UPDATE;

    UPDATE public.customers
    SET refund_owed = GREATEST(refund_owed - v_amount, 0),
        khata_balance = CASE WHEN v_method = 'khata_credit' THEN khata_balance - v_amount ELSE khata_balance END,
        last_activity_at = now()
    WHERE id = v_refund.customer_id;

    IF v_method = 'khata_credit' THEN
      INSERT INTO public.customer_ledger (
        business_id, branch_id, customer_id, entry_type,
        reference_type, reference_id, debit_amount, credit_amount,
        running_balance, notes, recorded_by
      ) VALUES (
        v_business_id, v_branch_id, v_refund.customer_id, 'return_credit',
        'refund', v_refund_id, 0, v_amount,
        v_prev_khata - v_amount, 'Refund credited to Khata', v_member_id
      );
    END IF;
  END IF;

  IF v_method = 'cash' AND v_shift_id IS NOT NULL THEN
    INSERT INTO public.cash_transactions (
      business_id, branch_id, cash_shift_id, direction, category,
      amount, reference_type, reference_id, reference_label, status, created_by
    ) VALUES (
      v_business_id, v_branch_id, v_shift_id, 'out', 'customer_refund',
      v_amount, 'refund', v_refund_id, v_refund.refund_number, 'reviewed', v_member_id
    );
  END IF;

  RETURN jsonb_build_object(
    'refund_id', v_refund_id,
    'refund_payment_id', v_pay_id,
    'status', v_new_status,
    'remaining_owed', v_refund.total_amount - v_new_paid
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 5: collect_khata_payment(p_payload JSONB)
--   Records a customer payment, updates Khata running balance, allocates
--   against open debit ledger entries, and logs cash drawer inflow if cash.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collect_khata_payment(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id    UUID := (p_payload->>'business_id')::UUID;
  v_branch_id      UUID := (p_payload->>'branch_id')::UUID;
  v_customer_id    UUID := (p_payload->>'customer_id')::UUID;
  v_shift_id       UUID := NULLIF(p_payload->>'shift_id', '')::UUID;
  v_payment_no     TEXT := NULLIF(trim(p_payload->>'payment_number'), '');
  v_method         TEXT := p_payload->>'method_code';
  v_amount         NUMERIC(14,2) := (p_payload->>'amount')::NUMERIC;
  v_member_id      UUID;
  v_prev_balance   NUMERIC(14,2);
  v_new_balance    NUMERIC(14,2);
  v_payment_id     UUID;
  v_credit_led_id  UUID;
  v_debit_id       UUID;
  v_remaining      NUMERIC(14,2);
  v_debit_amt      NUMERIC(14,2);
  v_alloc_amt      NUMERIC(14,2);
BEGIN
  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'khata.manage') THEN
    RAISE EXCEPTION 'Unauthorized to collect Khata payment';
  END IF;

  IF v_payment_no IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'payment_number and positive amount are required';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  SELECT khata_balance INTO v_prev_balance
  FROM public.customers
  WHERE id = v_customer_id AND business_id = v_business_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer % not found', v_customer_id;
  END IF;

  v_new_balance := v_prev_balance - v_amount;

  INSERT INTO public.customer_payments (
    business_id, branch_id, customer_id, shift_id, payment_number,
    method_code, amount, reference_no, collected_by, notes
  ) VALUES (
    v_business_id, v_branch_id, v_customer_id, v_shift_id, v_payment_no,
    v_method, v_amount, p_payload->>'reference_no', v_member_id, p_payload->>'notes'
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.customer_ledger (
    business_id, branch_id, customer_id, entry_type,
    reference_type, reference_id, debit_amount, credit_amount,
    running_balance, notes, recorded_by
  ) VALUES (
    v_business_id, v_branch_id, v_customer_id, 'payment',
    'customer_payment', v_payment_id, 0, v_amount,
    v_new_balance, p_payload->>'notes', v_member_id
  )
  RETURNING id INTO v_credit_led_id;

  UPDATE public.customers
  SET khata_balance = v_new_balance,
      last_activity_at = now()
  WHERE id = v_customer_id;

  -- Optional invoice-level FIFO allocation if debit_ledger_ids provided
  v_remaining := v_amount;
  IF (p_payload->'debit_ledger_ids') IS NOT NULL THEN
    FOR v_debit_id IN
      SELECT (value #>> '{}')::UUID FROM jsonb_array_elements(p_payload->'debit_ledger_ids')
    LOOP
      EXIT WHEN v_remaining <= 0;
      SELECT cl.debit_amount - COALESCE((
        SELECT SUM(la.allocated_amount) FROM public.ledger_allocations la WHERE la.debit_ledger_id = cl.id
      ), 0)
      INTO v_debit_amt
      FROM public.customer_ledger cl
      WHERE cl.id = v_debit_id AND cl.customer_id = v_customer_id;

      IF v_debit_amt IS NOT NULL AND v_debit_amt > 0 THEN
        v_alloc_amt := LEAST(v_remaining, v_debit_amt);
        INSERT INTO public.ledger_allocations (
          business_id, payment_id, debit_ledger_id, credit_ledger_id, allocated_amount
        ) VALUES (
          v_business_id, v_payment_id, v_debit_id, v_credit_led_id, v_alloc_amt
        );
        v_remaining := v_remaining - v_alloc_amt;
      END IF;
    END LOOP;
  END IF;

  IF v_method = 'cash' AND v_shift_id IS NOT NULL THEN
    INSERT INTO public.cash_transactions (
      business_id, branch_id, cash_shift_id, direction, category,
      amount, reference_type, reference_id, reference_label, status, created_by
    ) VALUES (
      v_business_id, v_branch_id, v_shift_id, 'in', 'customer_collection',
      v_amount, 'customer_payment', v_payment_id, v_payment_no, 'reviewed', v_member_id
    );
  END IF;

  RETURN jsonb_build_object(
    'customer_payment_id', v_payment_id,
    'ledger_id', v_credit_led_id,
    'previous_balance', v_prev_balance,
    'new_balance', v_new_balance
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 6: close_cash_shift(p_payload JSONB)
--   Computes expected drawer cash from float + reviewed inflows - reviewed
--   outflows, records counted cash & variance, and closes the shift.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_cash_shift(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id    UUID := (p_payload->>'business_id')::UUID;
  v_branch_id      UUID := (p_payload->>'branch_id')::UUID;
  v_shift_id       UUID := (p_payload->>'cash_shift_id')::UUID;
  v_counted_cash   NUMERIC(14,2) := (p_payload->>'counted_cash')::NUMERIC;
  v_member_id      UUID;
  v_shift          RECORD;
  v_cash_in        NUMERIC(14,2);
  v_cash_out       NUMERIC(14,2);
  v_expected_cash  NUMERIC(14,2);
  v_variance       NUMERIC(14,2);
BEGIN
  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'cash.shift.close') THEN
    RAISE EXCEPTION 'Unauthorized to close cash shift';
  END IF;

  IF v_counted_cash IS NULL OR v_counted_cash < 0 THEN
    RAISE EXCEPTION 'counted_cash must be non-negative';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  SELECT * INTO v_shift
  FROM public.cash_shifts
  WHERE id = v_shift_id AND business_id = v_business_id AND branch_id = v_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash shift % not found', v_shift_id;
  END IF;

  IF v_shift.status <> 'open' THEN
    RAISE EXCEPTION 'Cash shift % is already closed', v_shift_id;
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE direction = 'in'  AND status = 'reviewed'), 0),
    COALESCE(SUM(amount) FILTER (WHERE direction = 'out' AND status = 'reviewed'), 0)
  INTO v_cash_in, v_cash_out
  FROM public.cash_transactions
  WHERE cash_shift_id = v_shift_id;

  v_expected_cash := v_shift.opening_float + v_cash_in - v_cash_out;
  v_variance      := v_counted_cash - v_expected_cash;

  UPDATE public.cash_shifts
  SET expected_cash   = v_expected_cash,
      counted_cash    = v_counted_cash,
      variance_amount = v_variance,
      variance_reason = p_payload->>'variance_reason',
      status          = 'closed',
      closed_by       = v_member_id,
      closed_at       = now()
  WHERE id = v_shift_id;

  RETURN jsonb_build_object(
    'cash_shift_id', v_shift_id,
    'expected_cash', v_expected_cash,
    'counted_cash', v_counted_cash,
    'variance_amount', v_variance,
    'status', 'closed'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC 7: transfer_stock(p_payload JSONB)
--   Atomically transfers stock between two branches of the same business.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_stock(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id     UUID := (p_payload->>'business_id')::UUID;
  v_from_branch_id  UUID := (p_payload->>'from_branch_id')::UUID;
  v_to_branch_id    UUID := (p_payload->>'to_branch_id')::UUID;
  v_transfer_no     TEXT := NULLIF(trim(p_payload->>'transfer_number'), '');
  v_member_id       UUID;
  v_transfer_id     UUID;
  v_item            JSONB;
  v_variant_id      UUID;
  v_batch_id        UUID;
  v_qty             NUMERIC(14,3);
  v_avg_cost        NUMERIC(14,4);
BEGIN
  IF v_from_branch_id = v_to_branch_id THEN
    RAISE EXCEPTION 'Source and destination branches must differ';
  END IF;

  IF v_transfer_no IS NULL OR jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'transfer_number and at least one transfer item are required';
  END IF;

  IF NOT public.has_branch_access(v_business_id, v_from_branch_id)
     OR NOT public.has_branch_access(v_business_id, v_to_branch_id)
     OR NOT public.has_permission(v_business_id, 'inventory.manage') THEN
    RAISE EXCEPTION 'Unauthorized for inter-branch stock transfer';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  INSERT INTO public.stock_transfers (
    business_id, from_branch_id, to_branch_id, transfer_number, status,
    requested_by, approved_by, received_by, sent_at, received_at, notes
  ) VALUES (
    v_business_id, v_from_branch_id, v_to_branch_id, v_transfer_no, 'received',
    v_member_id, v_member_id, v_member_id, now(), now(), p_payload->>'notes'
  )
  RETURNING id INTO v_transfer_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_batch_id   := NULLIF(v_item->>'batch_id', '')::UUID;
    v_qty        := (v_item->>'quantity')::NUMERIC;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Transfer quantity must be positive';
    END IF;

    SELECT average_cost INTO v_avg_cost
    FROM public.stock_levels
    WHERE branch_id = v_from_branch_id AND variant_id = v_variant_id AND quantity_on_hand >= v_qty
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient source branch stock for variant %', v_variant_id;
    END IF;

    UPDATE public.stock_levels
    SET quantity_on_hand = quantity_on_hand - v_qty
    WHERE branch_id = v_from_branch_id AND variant_id = v_variant_id;

    INSERT INTO public.stock_levels (
      business_id, branch_id, variant_id, quantity_on_hand, average_cost
    ) VALUES (
      v_business_id, v_to_branch_id, v_variant_id, v_qty, v_avg_cost
    )
    ON CONFLICT (branch_id, variant_id) DO UPDATE
    SET quantity_on_hand = public.stock_levels.quantity_on_hand + EXCLUDED.quantity_on_hand;

    INSERT INTO public.stock_transfer_items (
      business_id, transfer_id, variant_id, batch_id, quantity_sent, quantity_received
    ) VALUES (
      v_business_id, v_transfer_id, v_variant_id, v_batch_id, v_qty, v_qty
    );

    INSERT INTO public.stock_movements (
      business_id, branch_id, variant_id, batch_id, movement_type,
      quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
    ) VALUES
      (v_business_id, v_from_branch_id, v_variant_id, v_batch_id, 'transfer_out',
       -v_qty, v_avg_cost, 'stock_transfer', v_transfer_id, 'Transfer ' || v_transfer_no, v_member_id),
      (v_business_id, v_to_branch_id, v_variant_id, v_batch_id, 'transfer_in',
       v_qty, v_avg_cost, 'stock_transfer', v_transfer_id, 'Transfer ' || v_transfer_no, v_member_id);
  END LOOP;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_no,
    'status', 'received'
  );
END;
$$;

-- ============================================================================
-- Restrict SECURITY DEFINER Function Execution Strictly to Authenticated Users
-- ============================================================================
REVOKE ALL ON FUNCTION public.bootstrap_business_roles(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_business_member_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_branch_access(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_business_workspace(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_sale(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.receive_purchase_order(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_sales_return(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_refund(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.collect_khata_payment(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_cash_shift(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_stock(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.bootstrap_business_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_member_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_branch_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_workspace(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sale(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sales_return(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_refund(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collect_khata_payment(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_shift(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_stock(JSONB) TO authenticated;
