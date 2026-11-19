-- ============================================================================
-- Migration: 0012_sell_stock_footwear_rpcs.sql
-- Additive Transactional RPCs & Hardening for Footwear SELL & STOCK Modules
--
-- Non-destructive & idempotent:
--   - Does NOT drop, recreate, or alter any existing tables.
--   - Hardens complete_sale() with active status checks, reserved stock checks,
--     permission-gated price overrides, and full receipt snapshot payloads.
--   - Adds adjust_branch_stock(), complete_stock_count(), and
--     process_footwear_exchange() atomic SECURITY DEFINER RPCs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Hardened complete_sale(p_payload JSONB)
--    - Validates product & variant is_active = true
--    - Enforces DB selling_price unless caller has pos.discount.approve or
--      inventory.manage (prevents unauthorized Cashier price tampering)
--    - Checks available stock (quantity_on_hand - quantity_reserved >= qty)
--    - Supports Cash, Card, Bank Transfer, Digital Wallets (Jazz/Easy/Raast),
--      Other, Split, Partial (with Khata due), and full Khata credit
--    - Stores complete structured receipt snapshot in public.receipts.payload
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
  v_can_override     BOOLEAN := false;
  v_can_discount     BOOLEAN := false;
  v_existing_sale    RECORD;
  v_biz_name         TEXT;
  v_branch_rec       RECORD;
  v_cashier_name     TEXT;
  v_customer_name    TEXT;
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
  v_stock_reserved   NUMERIC(14,3);
  v_unit_cost        NUMERIC(14,4);
  v_qty              NUMERIC(14,3);
  v_req_price        NUMERIC(14,2);
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
  v_receipt_items    JSONB := '[]'::jsonb;
  v_receipt_payments JSONB := '[]'::jsonb;
BEGIN
  IF v_business_id IS NULL OR v_branch_id IS NULL THEN
    RAISE EXCEPTION 'business_id and branch_id are required';
  END IF;

  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'pos.sell') THEN
    RAISE EXCEPTION 'Unauthorized to complete POS sale on branch %', v_branch_id;
  END IF;

  v_member_id    := public.current_business_member_id(v_business_id);
  v_can_override := public.has_permission(v_business_id, 'pos.discount.approve')
                    OR public.has_permission(v_business_id, 'inventory.manage');
  v_can_discount := public.has_permission(v_business_id, 'pos.discount.apply')
                    OR v_can_override;

  IF v_bill_discount > 0 AND NOT v_can_discount THEN
    RAISE EXCEPTION 'Unauthorized to apply bill discount';
  END IF;

  -- Idempotency check
  IF v_client_sync_id IS NOT NULL THEN
    SELECT id, bill_number, total_amount, paid_amount, due_amount, change_given, status
    INTO v_existing_sale
    FROM public.sales
    WHERE business_id = v_business_id AND client_sync_id = v_client_sync_id;

    IF FOUND THEN
      SELECT id INTO v_receipt_id FROM public.receipts WHERE sale_id = v_existing_sale.id LIMIT 1;
      RETURN jsonb_build_object(
        'sale_id', v_existing_sale.id,
        'bill_number', v_existing_sale.bill_number,
        'total_amount', v_existing_sale.total_amount,
        'paid_amount', v_existing_sale.paid_amount,
        'due_amount', v_existing_sale.due_amount,
        'change_given', v_existing_sale.change_given,
        'receipt_id', v_receipt_id,
        'status', v_existing_sale.status,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Cannot complete sale without at least one line item';
  END IF;

  -- Lock branch row to safely allocate sequential branch bill_number
  SELECT id, name, city, address, phone INTO v_branch_rec
  FROM public.branches
  WHERE id = v_branch_id AND business_id = v_business_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch % not found in business %', v_branch_id, v_business_id;
  END IF;

  SELECT name INTO v_biz_name FROM public.businesses WHERE id = v_business_id;
  SELECT COALESCE(up.full_name, bm.invited_name, 'Cashier') INTO v_cashier_name
  FROM public.business_members bm
  LEFT JOIN public.user_profiles up ON up.id = bm.user_id
  WHERE bm.id = v_member_id;

  IF v_customer_id IS NOT NULL THEN
    SELECT full_name INTO v_customer_name
    FROM public.customers
    WHERE id = v_customer_id AND business_id = v_business_id AND deleted_at IS NULL;
  END IF;

  SELECT COALESCE(MAX(bill_number), 0) + 1
  INTO v_bill_number
  FROM public.sales
  WHERE branch_id = v_branch_id;

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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_qty := (v_item->>'quantity')::NUMERIC;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid line quantity';
    END IF;

    SELECT pv.id AS variant_id, pv.product_id, pv.variant_name, pv.sku,
           pv.colour_name, pv.size_name,
           pv.cost_price, COALESCE(pv.selling_price, p.base_selling_price) AS default_price,
           pv.is_active AS variant_active,
           p.name AS product_name, p.brand AS product_brand,
           p.track_inventory, p.allow_negative_stock, p.is_active AS product_active
    INTO v_variant
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = (v_item->>'variant_id')::UUID
      AND pv.business_id = v_business_id
      AND pv.deleted_at IS NULL
      AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found for business', v_item->>'variant_id';
    END IF;

    IF NOT v_variant.product_active OR NOT v_variant.variant_active THEN
      RAISE EXCEPTION 'Product % (%) is inactive and cannot be sold', v_variant.product_name, v_variant.variant_name;
    END IF;

    v_orig_price := v_variant.default_price;
    v_req_price  := NULLIF(v_item->>'unit_price', '')::NUMERIC;

    IF v_req_price IS NOT NULL AND v_req_price <> v_variant.default_price THEN
      IF NOT v_can_override THEN
        RAISE EXCEPTION 'Unauthorized price override for % (%). Expected %',
          v_variant.product_name, v_variant.variant_name, v_variant.default_price;
      END IF;
      IF v_req_price < 0 THEN
        RAISE EXCEPTION 'Unit price cannot be negative';
      END IF;
      v_unit_price := v_req_price;
    ELSE
      v_unit_price := v_variant.default_price;
    END IF;

    v_line_disc := GREATEST(COALESCE((v_item->>'line_discount_amount')::NUMERIC, 0), 0);
    IF v_line_disc > 0 AND NOT v_can_discount THEN
      RAISE EXCEPTION 'Unauthorized to apply line discount';
    END IF;
    IF v_line_disc > (v_unit_price * v_qty) THEN
      RAISE EXCEPTION 'Line discount exceeds line subtotal';
    END IF;

    v_line_total := GREATEST((v_unit_price * v_qty) - v_line_disc, 0);
    v_subtotal   := v_subtotal + v_line_total;
    v_unit_cost  := v_variant.cost_price;

    IF v_variant.track_inventory THEN
      v_stock_id       := NULL;
      v_stock_qty      := NULL;
      v_stock_reserved := 0;

      SELECT id, quantity_on_hand, quantity_reserved, average_cost
      INTO v_stock_id, v_stock_qty, v_stock_reserved, v_unit_cost
      FROM public.stock_levels
      WHERE branch_id = v_branch_id AND variant_id = v_variant.variant_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock available for % (%) at this branch', v_variant.product_name, v_variant.variant_name;
      END IF;

      IF (v_stock_qty - COALESCE(v_stock_reserved, 0)) < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for % (%): only % available',
          v_variant.product_name, v_variant.variant_name, GREATEST(v_stock_qty - COALESCE(v_stock_reserved, 0), 0);
      END IF;

      v_unit_cost := COALESCE(v_unit_cost, v_variant.cost_price);

      UPDATE public.stock_levels
      SET quantity_on_hand = quantity_on_hand - v_qty
      WHERE id = v_stock_id;

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

    v_receipt_items := v_receipt_items || jsonb_build_array(
      jsonb_build_object(
        'sale_item_id', v_sale_item_id,
        'product_name', v_variant.product_name,
        'brand', v_variant.product_brand,
        'variant_label', v_variant.variant_name,
        'colour', v_variant.colour_name,
        'size', v_variant.size_name,
        'sku', v_variant.sku,
        'quantity', v_qty,
        'unit_price', v_unit_price,
        'line_discount', v_line_disc,
        'line_total', v_line_total
      )
    );
  END LOOP;

  IF v_bill_discount > v_subtotal THEN
    v_bill_discount := v_subtotal;
  END IF;

  v_total_amount := GREATEST(v_subtotal - v_bill_discount + v_tax_total, 0);

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

    v_receipt_payments := v_receipt_payments || jsonb_build_array(
      jsonb_build_object(
        'method_code', v_method,
        'amount', v_pay_amt,
        'tendered_amount', NULLIF(v_pay->>'tendered_amount', '')::NUMERIC,
        'reference_no', v_pay->>'reference_no'
      )
    );

    IF v_method = 'khata' THEN
      v_khata_due := v_khata_due + v_pay_amt;
    ELSE
      v_paid_non_khata := v_paid_non_khata + v_pay_amt;
      IF v_method = 'cash' THEN
        v_cash_inflow   := v_cash_inflow + v_pay_amt;
        v_tendered_cash := v_tendered_cash + COALESCE(NULLIF(v_pay->>'tendered_amount', '')::NUMERIC, v_pay_amt);
      END IF;
    END IF;
  END LOOP;

  -- Support partial payment on a customer account by automatically allocating unpaid remainder to Khata
  IF (v_paid_non_khata + v_khata_due) < v_total_amount THEN
    IF COALESCE((p_payload->>'allow_partial_khata')::BOOLEAN, false) AND v_customer_id IS NOT NULL THEN
      v_pay_amt := v_total_amount - (v_paid_non_khata + v_khata_due);
      INSERT INTO public.sale_payments (
        business_id, branch_id, sale_id, shift_id, method_code,
        amount, reference_no, recorded_by
      ) VALUES (
        v_business_id, v_branch_id, v_sale_id, v_shift_id, 'khata',
        v_pay_amt, 'Partial balance due', v_member_id
      );
      v_khata_due := v_khata_due + v_pay_amt;
      v_receipt_payments := v_receipt_payments || jsonb_build_array(
        jsonb_build_object('method_code', 'khata', 'amount', v_pay_amt, 'reference_no', 'Partial balance due')
      );
    ELSE
      RAISE EXCEPTION 'Total payment (%) is less than bill total (%)',
        (v_paid_non_khata + v_khata_due), v_total_amount;
    END IF;
  END IF;

  v_change_given := GREATEST(v_tendered_cash - v_cash_inflow, 0);

  IF v_khata_due > 0 THEN
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'A customer must be selected for Khata credit or partial-payment sales';
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
      'business_name', COALESCE(v_biz_name, 'ZYRO Retail'),
      'branch_name', v_branch_rec.name,
      'branch_city', v_branch_rec.city,
      'branch_address', v_branch_rec.address,
      'branch_phone', v_branch_rec.phone,
      'cashier_name', v_cashier_name,
      'customer_name', COALESCE(v_customer_name, 'Walk-in customer'),
      'bill_number', v_bill_number,
      'subtotal_amount', v_subtotal,
      'discount_amount', v_bill_discount,
      'tax_amount', v_tax_total,
      'total_amount', v_total_amount,
      'paid_amount', v_paid_non_khata,
      'due_amount', v_khata_due,
      'change_given', v_change_given,
      'items', v_receipt_items,
      'payments', v_receipt_payments,
      'sold_at', now()
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
    jsonb_build_object(
      'bill_number', v_bill_number,
      'total_amount', v_total_amount,
      'paid_amount', v_paid_non_khata,
      'due_amount', v_khata_due
    )
  );

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'bill_number', v_bill_number,
    'subtotal_amount', v_subtotal,
    'discount_amount', v_bill_discount,
    'tax_amount', v_tax_total,
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
-- 2. adjust_branch_stock(p_payload JSONB)
--    Atomically adjusts stock for a variant at a branch and records ledger.
--    Supports movement_type: opening_stock, adjustment, damage, shrinkage.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_branch_stock(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id   UUID := (p_payload->>'business_id')::UUID;
  v_branch_id     UUID := (p_payload->>'branch_id')::UUID;
  v_variant_id    UUID := (p_payload->>'variant_id')::UUID;
  v_delta         NUMERIC(14,3) := (p_payload->>'quantity_delta')::NUMERIC;
  v_movement_type TEXT := COALESCE(NULLIF(trim(p_payload->>'movement_type'), ''), 'adjustment');
  v_reason        TEXT := NULLIF(trim(p_payload->>'reason'), '');
  v_member_id     UUID;
  v_variant_cost  NUMERIC(14,4);
  v_cur_qty       NUMERIC(14,3) := 0;
  v_new_qty       NUMERIC(14,3);
  v_movement_id   UUID;
BEGIN
  IF v_business_id IS NULL OR v_branch_id IS NULL OR v_variant_id IS NULL THEN
    RAISE EXCEPTION 'business_id, branch_id, and variant_id are required';
  END IF;

  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'inventory.manage') THEN
    RAISE EXCEPTION 'Unauthorized to adjust branch stock';
  END IF;

  IF v_delta IS NULL OR v_delta = 0 THEN
    RAISE EXCEPTION 'quantity_delta must be non-zero';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'A reason is required for stock adjustments';
  END IF;

  IF v_movement_type NOT IN ('opening_stock', 'adjustment', 'damage', 'shrinkage') THEN
    RAISE EXCEPTION 'Unsupported movement_type: %', v_movement_type;
  END IF;

  SELECT cost_price INTO v_variant_cost
  FROM public.product_variants
  WHERE id = v_variant_id AND business_id = v_business_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found in business', v_variant_id;
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  SELECT quantity_on_hand INTO v_cur_qty
  FROM public.stock_levels
  WHERE branch_id = v_branch_id AND variant_id = v_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_cur_qty := 0;
    v_new_qty := v_delta;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Stock cannot drop below zero (current: 0, delta: %)', v_delta;
    END IF;
    INSERT INTO public.stock_levels (
      business_id, branch_id, variant_id, quantity_on_hand, average_cost
    ) VALUES (
      v_business_id, v_branch_id, v_variant_id, v_new_qty, COALESCE(v_variant_cost, 0)
    );
  ELSE
    v_new_qty := v_cur_qty + v_delta;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Stock cannot drop below zero (current: %, delta: %)', v_cur_qty, v_delta;
    END IF;
    UPDATE public.stock_levels
    SET quantity_on_hand = v_new_qty
    WHERE branch_id = v_branch_id AND variant_id = v_variant_id;
  END IF;

  INSERT INTO public.stock_movements (
    business_id, branch_id, variant_id, movement_type,
    quantity_delta, unit_cost, reference_type, reason, performed_by
  ) VALUES (
    v_business_id, v_branch_id, v_variant_id, v_movement_type,
    v_delta, COALESCE(v_variant_cost, 0), 'stock_adjustment', v_reason, v_member_id
  )
  RETURNING id INTO v_movement_id;

  INSERT INTO public.audit_logs (
    business_id, branch_id, actor_user_id, actor_member_id,
    action, entity_type, entity_id, before_data, after_data
  ) VALUES (
    v_business_id, v_branch_id, auth.uid(), v_member_id,
    'stock.adjusted', 'product_variant', v_variant_id,
    jsonb_build_object('quantity_on_hand', v_cur_qty),
    jsonb_build_object('quantity_on_hand', v_new_qty, 'delta', v_delta, 'movement_type', v_movement_type, 'reason', v_reason)
  );

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'variant_id', v_variant_id,
    'previous_qty', v_cur_qty,
    'new_qty', v_new_qty,
    'quantity_delta', v_delta
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. complete_stock_count(p_payload JSONB)
--    Atomically finalizes a branch stock count, writes stock_counts +
--    stock_count_items, reconciles stock_levels, and appends stock_movements.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_stock_count(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id    UUID := (p_payload->>'business_id')::UUID;
  v_branch_id      UUID := (p_payload->>'branch_id')::UUID;
  v_count_number   TEXT := COALESCE(NULLIF(trim(p_payload->>'count_number'), ''), 'CNT-' || to_char(now(), 'YYYYMMDD-HH24MISS'));
  v_notes          TEXT := NULLIF(trim(p_payload->>'notes'), '');
  v_member_id      UUID;
  v_count_id       UUID;
  v_item           JSONB;
  v_variant_id     UUID;
  v_counted_qty    NUMERIC(14,3);
  v_expected_qty   NUMERIC(14,3);
  v_variance       NUMERIC(14,3);
  v_cost           NUMERIC(14,4);
  v_adjusted_count INTEGER := 0;
BEGIN
  IF v_business_id IS NULL OR v_branch_id IS NULL THEN
    RAISE EXCEPTION 'business_id and branch_id are required';
  END IF;

  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'inventory.manage') THEN
    RAISE EXCEPTION 'Unauthorized to complete stock count';
  END IF;

  IF jsonb_array_length(COALESCE(p_payload->'items', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'At least one counted variant is required';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);

  INSERT INTO public.stock_counts (
    business_id, branch_id, count_number, status,
    counted_by, approved_by, started_at, completed_at, notes
  ) VALUES (
    v_business_id, v_branch_id, v_count_number, 'approved',
    v_member_id, v_member_id, now(), now(), v_notes
  )
  RETURNING id INTO v_count_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    v_variant_id  := (v_item->>'variant_id')::UUID;
    v_counted_qty := (v_item->>'counted_qty')::NUMERIC;

    IF v_variant_id IS NULL OR v_counted_qty IS NULL OR v_counted_qty < 0 THEN
      RAISE EXCEPTION 'Each counted item requires a valid variant_id and non-negative counted_qty';
    END IF;

    SELECT cost_price INTO v_cost
    FROM public.product_variants
    WHERE id = v_variant_id AND business_id = v_business_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found in business', v_variant_id;
    END IF;

    SELECT quantity_on_hand INTO v_expected_qty
    FROM public.stock_levels
    WHERE branch_id = v_branch_id AND variant_id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_expected_qty := 0;
      INSERT INTO public.stock_levels (
        business_id, branch_id, variant_id, quantity_on_hand, average_cost
      ) VALUES (
        v_business_id, v_branch_id, v_variant_id, v_counted_qty, COALESCE(v_cost, 0)
      );
    ELSE
      UPDATE public.stock_levels
      SET quantity_on_hand = v_counted_qty
      WHERE branch_id = v_branch_id AND variant_id = v_variant_id;
    END IF;

    INSERT INTO public.stock_count_items (
      business_id, stock_count_id, variant_id, expected_qty, counted_qty, notes
    ) VALUES (
      v_business_id, v_count_id, v_variant_id, v_expected_qty, v_counted_qty, v_item->>'notes'
    );

    v_variance := v_counted_qty - v_expected_qty;
    IF v_variance <> 0 THEN
      v_adjusted_count := v_adjusted_count + 1;
      INSERT INTO public.stock_movements (
        business_id, branch_id, variant_id, movement_type,
        quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
      ) VALUES (
        v_business_id, v_branch_id, v_variant_id, 'stock_count',
        v_variance, COALESCE(v_cost, 0), 'stock_count', v_count_id,
        COALESCE(v_notes, 'Stock count ' || v_count_number), v_member_id
      );
    END IF;
  END LOOP;

  INSERT INTO public.audit_logs (
    business_id, branch_id, actor_user_id, actor_member_id,
    action, entity_type, entity_id, after_data
  ) VALUES (
    v_business_id, v_branch_id, auth.uid(), v_member_id,
    'stock_count.approved', 'stock_count', v_count_id,
    jsonb_build_object('count_number', v_count_number, 'adjusted_variants', v_adjusted_count)
  );

  RETURN jsonb_build_object(
    'stock_count_id', v_count_id,
    'count_number', v_count_number,
    'adjusted_variants', v_adjusted_count,
    'status', 'approved'
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. process_footwear_exchange(p_payload JSONB)
--    Atomically processes a footwear exchange (size, colour, or different shoe):
--      - Validates original sale & returnable quantity (original sale preserved)
--      - Records sales_returns + sales_return_items
--      - Restocks returned variant ONLY if condition = 'resellable' (exchange_in)
--      - Deducts replacement variant stock with FOR UPDATE lock (exchange_out)
--      - Creates replacement sale record for replacement item(s)
--      - Collects extra payment if replacement > returned, or issues refund
--        if replacement < returned
--      - Records exchanges + exchange_items + audit_logs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_footwear_exchange(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id        UUID := (p_payload->>'business_id')::UUID;
  v_branch_id          UUID := (p_payload->>'branch_id')::UUID;
  v_orig_sale_id       UUID := (p_payload->>'original_sale_id')::UUID;
  v_orig_sale_item_id  UUID := (p_payload->>'original_sale_item_id')::UUID;
  v_return_qty         NUMERIC(14,3) := COALESCE((p_payload->>'return_quantity')::NUMERIC, 1);
  v_return_condition   TEXT := COALESCE(NULLIF(p_payload->>'condition', ''), 'resellable');
  v_repl_variant_id    UUID := (p_payload->>'replacement_variant_id')::UUID;
  v_repl_qty           NUMERIC(14,3) := COALESCE((p_payload->>'replacement_quantity')::NUMERIC, 1);
  v_reason             TEXT := COALESCE(NULLIF(trim(p_payload->>'reason'), ''), 'Footwear size/colour exchange');
  v_pay_method         TEXT := COALESCE(NULLIF(p_payload->>'settlement_method', ''), 'cash');
  v_exchange_number    TEXT := COALESCE(NULLIF(trim(p_payload->>'exchange_number'), ''), 'EXC-' || to_char(now(), 'YYYYMMDD-HH24MISS'));
  v_member_id          UUID;
  v_orig_sale          RECORD;
  v_orig_item          RECORD;
  v_ret_variant        RECORD;
  v_repl_variant       RECORD;
  v_repl_stock_id      UUID;
  v_repl_stock_qty     NUMERIC(14,3);
  v_repl_reserved      NUMERIC(14,3);
  v_return_credit      NUMERIC(14,2);
  v_repl_unit_price    NUMERIC(14,2);
  v_repl_total         NUMERIC(14,2);
  v_net_diff           NUMERIC(14,2);
  v_return_id          UUID;
  v_repl_sale_id       UUID;
  v_repl_bill_no       BIGINT;
  v_exchange_id        UUID;
  v_refund_id          UUID;
  v_restock            BOOLEAN;
  v_prev_khata         NUMERIC(14,2);
BEGIN
  IF v_business_id IS NULL OR v_branch_id IS NULL OR v_orig_sale_id IS NULL
     OR v_orig_sale_item_id IS NULL OR v_repl_variant_id IS NULL THEN
    RAISE EXCEPTION 'Missing required exchange parameters';
  END IF;

  IF NOT public.has_branch_access(v_business_id, v_branch_id)
     OR NOT public.has_permission(v_business_id, 'pos.returns.process') THEN
    RAISE EXCEPTION 'Unauthorized to process footwear exchange';
  END IF;

  IF v_return_qty <= 0 OR v_repl_qty <= 0 THEN
    RAISE EXCEPTION 'Exchange quantities must be positive';
  END IF;

  IF v_return_condition NOT IN ('resellable', 'damaged') THEN
    RAISE EXCEPTION 'Condition must be resellable or damaged';
  END IF;

  v_member_id := public.current_business_member_id(v_business_id);
  v_restock   := (v_return_condition = 'resellable');

  -- Lock original sale & branch
  PERFORM 1 FROM public.branches WHERE id = v_branch_id AND business_id = v_business_id FOR UPDATE;

  SELECT * INTO v_orig_sale
  FROM public.sales
  WHERE id = v_orig_sale_id AND business_id = v_business_id AND branch_id = v_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original sale not found on this branch';
  END IF;

  SELECT * INTO v_orig_item
  FROM public.sale_items
  WHERE id = v_orig_sale_item_id AND sale_id = v_orig_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original sale item not found';
  END IF;

  IF (v_orig_item.returned_quantity + v_return_qty) > v_orig_item.quantity THEN
    RAISE EXCEPTION 'Return quantity exceeds remaining exchangeable quantity';
  END IF;

  SELECT pv.id, pv.product_id, pv.variant_name, pv.sku, pv.cost_price, p.name AS product_name
  INTO v_ret_variant
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = v_orig_item.variant_id AND pv.business_id = v_business_id;

  SELECT pv.id, pv.product_id, pv.variant_name, pv.sku, pv.cost_price,
         COALESCE(pv.selling_price, p.base_selling_price) AS selling_price,
         p.name AS product_name, p.track_inventory, p.is_active AS product_active,
         pv.is_active AS variant_active
  INTO v_repl_variant
  FROM public.product_variants pv
  JOIN public.products p ON p.id = pv.product_id
  WHERE pv.id = v_repl_variant_id
    AND pv.business_id = v_business_id
    AND pv.deleted_at IS NULL
    AND p.deleted_at IS NULL;

  IF NOT FOUND OR NOT v_repl_variant.product_active OR NOT v_repl_variant.variant_active THEN
    RAISE EXCEPTION 'Replacement footwear variant is unavailable';
  END IF;

  -- Lock & verify replacement variant stock
  IF v_repl_variant.track_inventory THEN
    SELECT id, quantity_on_hand, quantity_reserved
    INTO v_repl_stock_id, v_repl_stock_qty, v_repl_reserved
    FROM public.stock_levels
    WHERE branch_id = v_branch_id AND variant_id = v_repl_variant.id
    FOR UPDATE;

    IF NOT FOUND OR (v_repl_stock_qty - COALESCE(v_repl_reserved, 0)) < v_repl_qty THEN
      RAISE EXCEPTION 'Insufficient branch stock for replacement % (%)',
        v_repl_variant.product_name, v_repl_variant.variant_name;
    END IF;
  END IF;

  -- Effective unit return credit respects original line discount proportionally
  v_return_credit   := ROUND((v_orig_item.line_total / v_orig_item.quantity) * v_return_qty, 2);
  v_repl_unit_price := v_repl_variant.selling_price;
  v_repl_total      := ROUND(v_repl_unit_price * v_repl_qty, 2);
  v_net_diff        := v_repl_total - v_return_credit;

  -- 1. Mark returned quantity on original sale item (original sale values remain untouched)
  UPDATE public.sale_items
  SET returned_quantity = returned_quantity + v_return_qty
  WHERE id = v_orig_sale_item_id;

  -- 2. Create sales_return & sales_return_items
  INSERT INTO public.sales_returns (
    business_id, branch_id, original_sale_id, customer_id, return_number,
    return_type, status, total_return_amount, reason, processed_by
  ) VALUES (
    v_business_id, v_branch_id, v_orig_sale_id, v_orig_sale.customer_id, 'RET-' || v_exchange_number,
    'with_bill', 'completed', v_return_credit, v_reason, v_member_id
  )
  RETURNING id INTO v_return_id;

  INSERT INTO public.sales_return_items (
    business_id, sales_return_id, original_sale_item_id, variant_id,
    product_name_snapshot, variant_label_snapshot, quantity, unit_price,
    line_total, condition, restocked
  ) VALUES (
    v_business_id, v_return_id, v_orig_sale_item_id, v_orig_item.variant_id,
    v_orig_item.product_name_snapshot, v_orig_item.variant_label_snapshot,
    v_return_qty, ROUND(v_return_credit / v_return_qty, 2), v_return_credit,
    v_return_condition, v_restock
  );

  -- 3. Restock returned variant ONLY if resellable
  IF v_restock THEN
    INSERT INTO public.stock_levels (
      business_id, branch_id, variant_id, quantity_on_hand, average_cost
    ) VALUES (
      v_business_id, v_branch_id, v_orig_item.variant_id, v_return_qty, COALESCE(v_ret_variant.cost_price, 0)
    )
    ON CONFLICT (branch_id, variant_id) DO UPDATE
    SET quantity_on_hand = public.stock_levels.quantity_on_hand + EXCLUDED.quantity_on_hand;

    INSERT INTO public.stock_movements (
      business_id, branch_id, variant_id, movement_type,
      quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
    ) VALUES (
      v_business_id, v_branch_id, v_orig_item.variant_id, 'exchange_in',
      v_return_qty, COALESCE(v_ret_variant.cost_price, 0), 'exchange', v_return_id,
      'Exchange return ' || v_exchange_number || ' (' || v_reason || ')', v_member_id
    );
  END IF;

  -- 4. Create replacement sale header & deduct replacement stock
  SELECT COALESCE(MAX(bill_number), 0) + 1 INTO v_repl_bill_no
  FROM public.sales WHERE branch_id = v_branch_id;

  INSERT INTO public.sales (
    business_id, branch_id, customer_id, cashier_member_id, bill_number, status,
    subtotal_amount, discount_amount, tax_amount, total_amount,
    paid_amount, due_amount, notes, sold_at
  ) VALUES (
    v_business_id, v_branch_id, v_orig_sale.customer_id, v_member_id, v_repl_bill_no, 'completed',
    v_repl_total, 0, 0, v_repl_total,
    CASE WHEN v_net_diff > 0 AND v_pay_method <> 'khata' THEN v_net_diff ELSE 0 END,
    CASE WHEN v_net_diff > 0 AND v_pay_method = 'khata' THEN v_net_diff ELSE 0 END,
    'Exchange ' || v_exchange_number || ' from Bill #' || v_orig_sale.bill_number,
    now()
  )
  RETURNING id INTO v_repl_sale_id;

  INSERT INTO public.sale_items (
    business_id, sale_id, product_id, variant_id,
    product_name_snapshot, variant_label_snapshot, sku_snapshot,
    unit_cost_snapshot, unit_price, original_unit_price,
    quantity, line_discount_amount, line_total, note
  ) VALUES (
    v_business_id, v_repl_sale_id, v_repl_variant.product_id, v_repl_variant.id,
    v_repl_variant.product_name, v_repl_variant.variant_name, v_repl_variant.sku,
    v_repl_variant.cost_price, v_repl_unit_price, v_repl_unit_price,
    v_repl_qty, 0, v_repl_total, 'Exchange replacement'
  );

  IF v_repl_variant.track_inventory THEN
    UPDATE public.stock_levels
    SET quantity_on_hand = quantity_on_hand - v_repl_qty
    WHERE id = v_repl_stock_id;

    INSERT INTO public.stock_movements (
      business_id, branch_id, variant_id, movement_type,
      quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by
    ) VALUES (
      v_business_id, v_branch_id, v_repl_variant.id, 'exchange_out',
      -v_repl_qty, v_repl_variant.cost_price, 'exchange', v_repl_sale_id,
      'Exchange issue ' || v_exchange_number, v_member_id
    );
  END IF;

  -- 5. Settle net price difference
  IF v_net_diff > 0 THEN
    IF v_pay_method = 'khata' THEN
      IF v_orig_sale.customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer is required for Khata settlement on exchange difference';
      END IF;
      SELECT khata_balance INTO v_prev_khata
      FROM public.customers WHERE id = v_orig_sale.customer_id FOR UPDATE;
      UPDATE public.customers
      SET khata_balance = khata_balance + v_net_diff, last_activity_at = now()
      WHERE id = v_orig_sale.customer_id;
      INSERT INTO public.customer_ledger (
        business_id, branch_id, customer_id, entry_type,
        reference_type, reference_id, debit_amount, credit_amount,
        running_balance, notes, recorded_by
      ) VALUES (
        v_business_id, v_branch_id, v_orig_sale.customer_id, 'sale_credit',
        'exchange', v_repl_sale_id, v_net_diff, 0,
        v_prev_khata + v_net_diff, 'Exchange diff ' || v_exchange_number, v_member_id
      );
    END IF;

    INSERT INTO public.sale_payments (
      business_id, branch_id, sale_id, method_code, amount, reference_no, recorded_by
    ) VALUES (
      v_business_id, v_branch_id, v_repl_sale_id, v_pay_method, v_net_diff,
      'Exchange difference ' || v_exchange_number, v_member_id
    );
  ELSIF v_net_diff < 0 THEN
    INSERT INTO public.refunds (
      business_id, branch_id, sales_return_id, customer_id,
      refund_number, total_amount, paid_amount, status, issued_by
    ) VALUES (
      v_business_id, v_branch_id, v_return_id, v_orig_sale.customer_id,
      'RFD-' || v_exchange_number, ABS(v_net_diff), ABS(v_net_diff), 'paid', v_member_id
    )
    RETURNING id INTO v_refund_id;

    INSERT INTO public.refund_payments (
      business_id, branch_id, refund_id, method_code, amount, reference_no, paid_by
    ) VALUES (
      v_business_id, v_branch_id, v_refund_id,
      CASE WHEN v_pay_method = 'khata' THEN 'khata_credit' ELSE v_pay_method END,
      ABS(v_net_diff), 'Exchange refund ' || v_exchange_number, v_member_id
    );

    IF v_pay_method = 'khata' AND v_orig_sale.customer_id IS NOT NULL THEN
      SELECT khata_balance INTO v_prev_khata
      FROM public.customers WHERE id = v_orig_sale.customer_id FOR UPDATE;
      UPDATE public.customers
      SET khata_balance = khata_balance - ABS(v_net_diff), last_activity_at = now()
      WHERE id = v_orig_sale.customer_id;
      INSERT INTO public.customer_ledger (
        business_id, branch_id, customer_id, entry_type,
        reference_type, reference_id, debit_amount, credit_amount,
        running_balance, notes, recorded_by
      ) VALUES (
        v_business_id, v_branch_id, v_orig_sale.customer_id, 'return_credit',
        'refund', v_refund_id, 0, ABS(v_net_diff),
        v_prev_khata - ABS(v_net_diff), 'Exchange credit ' || v_exchange_number, v_member_id
      );
    END IF;
  END IF;

  -- 6. Create exchanges & exchange_items
  INSERT INTO public.exchanges (
    business_id, branch_id, sales_return_id, replacement_sale_id,
    exchange_number, return_credit_amount, replacement_total_amount,
    net_difference_amount, processed_by
  ) VALUES (
    v_business_id, v_branch_id, v_return_id, v_repl_sale_id,
    v_exchange_number, v_return_credit, v_repl_total,
    v_net_diff, v_member_id
  )
  RETURNING id INTO v_exchange_id;

  INSERT INTO public.exchange_items (
    business_id, exchange_id, direction, variant_id, quantity, unit_price, line_total
  ) VALUES
    (v_business_id, v_exchange_id, 'returned', v_orig_item.variant_id, v_return_qty,
     ROUND(v_return_credit / v_return_qty, 2), v_return_credit),
    (v_business_id, v_exchange_id, 'replacement', v_repl_variant.id, v_repl_qty,
     v_repl_unit_price, v_repl_total);

  INSERT INTO public.audit_logs (
    business_id, branch_id, actor_user_id, actor_member_id,
    action, entity_type, entity_id, after_data
  ) VALUES (
    v_business_id, v_branch_id, auth.uid(), v_member_id,
    'exchange.completed', 'exchange', v_exchange_id,
    jsonb_build_object(
      'exchange_number', v_exchange_number,
      'original_bill_number', v_orig_sale.bill_number,
      'replacement_bill_number', v_repl_bill_no,
      'return_credit', v_return_credit,
      'replacement_total', v_repl_total,
      'net_difference', v_net_diff,
      'restocked', v_restock
    )
  );

  RETURN jsonb_build_object(
    'exchange_id', v_exchange_id,
    'exchange_number', v_exchange_number,
    'sales_return_id', v_return_id,
    'replacement_sale_id', v_repl_sale_id,
    'replacement_bill_number', v_repl_bill_no,
    'refund_id', v_refund_id,
    'return_credit_amount', v_return_credit,
    'replacement_total_amount', v_repl_total,
    'net_difference_amount', v_net_diff,
    'restocked', v_restock
  );
END;
$$;

-- Restrict and grant execute strictly to authenticated role
REVOKE ALL ON FUNCTION public.complete_sale(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_branch_stock(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_stock_count(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_footwear_exchange(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_sale(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_branch_stock(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stock_count(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_footwear_exchange(JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
