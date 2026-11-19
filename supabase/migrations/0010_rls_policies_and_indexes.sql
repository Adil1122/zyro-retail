-- ============================================================================
-- Migration: 0010_rls_policies_and_indexes.sql
-- Phase 10: Row-Level Security Policies, Storage Policies & Performance Indexes
-- ============================================================================

-- ============================================================================
-- 1. Enable Row-Level Security on ALL 97 Application Tables
-- ============================================================================
DO $$
DECLARE
  v_tbl TEXT;
BEGIN
  FOR v_tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_tbl);
  END LOOP;
END;
$$;

-- ============================================================================
-- 2. Phase 1 Policies: Core Business, Profiles, RBAC, Branches & Devices
-- ============================================================================

-- permissions (global catalog: read-only for authenticated users)
CREATE POLICY permissions_select_authenticated
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

-- user_profiles (own profile + co-workers in shared businesses)
CREATE POLICY user_profiles_select
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.business_members bm_me
      JOIN public.business_members bm_other ON bm_other.business_id = bm_me.business_id
      WHERE bm_me.user_id = auth.uid()
        AND bm_me.status = 'active'
        AND bm_me.deleted_at IS NULL
        AND bm_other.user_id = user_profiles.id
        AND bm_other.deleted_at IS NULL
    )
  );

CREATE POLICY user_profiles_insert_own
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY user_profiles_update_own
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- businesses
CREATE POLICY businesses_select_member
  ON public.businesses FOR SELECT TO authenticated
  USING (public.is_business_member(id) OR owner_user_id = auth.uid());

CREATE POLICY businesses_insert_owner
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY businesses_update_owner_or_settings
  ON public.businesses FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_permission(id, 'settings.manage'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_permission(id, 'settings.manage'));

-- roles & role_permissions
CREATE POLICY roles_select_member
  ON public.roles FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY roles_manage_settings
  ON public.roles FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

CREATE POLICY role_permissions_select_member
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY role_permissions_manage_settings
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

-- branches
CREATE POLICY branches_select_member
  ON public.branches FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY branches_manage_settings
  ON public.branches FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

-- business_members & member_branch_access
CREATE POLICY business_members_select_member
  ON public.business_members FOR SELECT TO authenticated
  USING (public.is_business_member(business_id) OR user_id = auth.uid());

CREATE POLICY business_members_manage_staff_or_settings
  ON public.business_members FOR ALL TO authenticated
  USING (
    public.has_permission(business_id, 'staff.manage')
    OR public.has_permission(business_id, 'settings.manage')
  )
  WITH CHECK (
    public.has_permission(business_id, 'staff.manage')
    OR public.has_permission(business_id, 'settings.manage')
  );

CREATE POLICY member_branch_access_select_member
  ON public.member_branch_access FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY member_branch_access_manage
  ON public.member_branch_access FOR ALL TO authenticated
  USING (
    public.has_permission(business_id, 'staff.manage')
    OR public.has_permission(business_id, 'settings.manage')
  )
  WITH CHECK (
    public.has_permission(business_id, 'staff.manage')
    OR public.has_permission(business_id, 'settings.manage')
  );

-- pos_devices & device_sessions
CREATE POLICY pos_devices_select_branch
  ON public.pos_devices FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY pos_devices_manage_settings
  ON public.pos_devices FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

CREATE POLICY device_sessions_select_branch
  ON public.device_sessions FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY device_sessions_write_member
  ON public.device_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_branch_access(business_id, branch_id));

CREATE POLICY device_sessions_update_own_or_manager
  ON public.device_sessions FOR UPDATE TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND (
      member_id = public.current_business_member_id(business_id)
      OR public.has_permission(business_id, 'settings.manage')
    )
  )
  WITH CHECK (public.has_branch_access(business_id, branch_id));

-- ============================================================================
-- 3. Phase 2 Policies: Catalog, Barcodes, Batches, Serials & Inventory
-- ============================================================================
DO $$
DECLARE
  v_catalog_tbl TEXT;
BEGIN
  FOREACH v_catalog_tbl IN ARRAY ARRAY[
    'products',
    'product_images',
    'product_attributes',
    'product_variants',
    'variant_attribute_values',
    'product_barcodes'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id));',
      v_catalog_tbl || '_select_member', v_catalog_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''inventory.manage'')) WITH CHECK (public.has_permission(business_id, ''inventory.manage''));',
      v_catalog_tbl || '_write_inv', v_catalog_tbl
    );
  END LOOP;
END;
$$;

CREATE POLICY categories_select_member
  ON public.categories FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY categories_write_inv
  ON public.categories FOR ALL TO authenticated
  USING (
    public.has_permission(business_id, 'inventory.categories')
    OR public.has_permission(business_id, 'inventory.manage')
  )
  WITH CHECK (
    public.has_permission(business_id, 'inventory.categories')
    OR public.has_permission(business_id, 'inventory.manage')
  );

-- Branch-scoped stock tables
DO $$
DECLARE
  v_branch_stock_tbl TEXT;
BEGIN
  FOREACH v_branch_stock_tbl IN ARRAY ARRAY[
    'product_batches',
    'serial_numbers',
    'stock_levels',
    'stock_counts',
    'stock_reservations'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_branch_access(business_id, branch_id));',
      v_branch_stock_tbl || '_select_branch', v_branch_stock_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, ''inventory.manage'')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, ''inventory.manage''));',
      v_branch_stock_tbl || '_write_branch', v_branch_stock_tbl
    );
  END LOOP;
END;
$$;

-- stock_movements (append-only for members with branch access; mutated via RPCs)
CREATE POLICY stock_movements_select_branch
  ON public.stock_movements FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY stock_movements_insert_inv
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'inventory.manage')
  );

-- stock_count_items, stock_transfers, stock_transfer_items
CREATE POLICY stock_count_items_select_member
  ON public.stock_count_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY stock_count_items_write_inv
  ON public.stock_count_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'inventory.manage'))
  WITH CHECK (public.has_permission(business_id, 'inventory.manage'));

CREATE POLICY stock_transfers_select_branch
  ON public.stock_transfers FOR SELECT TO authenticated
  USING (
    public.has_branch_access(business_id, from_branch_id)
    OR public.has_branch_access(business_id, to_branch_id)
  );

CREATE POLICY stock_transfers_write_inv
  ON public.stock_transfers FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'inventory.manage'))
  WITH CHECK (public.has_permission(business_id, 'inventory.manage'));

CREATE POLICY stock_transfer_items_select_member
  ON public.stock_transfer_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY stock_transfer_items_write_inv
  ON public.stock_transfer_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'inventory.manage'))
  WITH CHECK (public.has_permission(business_id, 'inventory.manage'));

-- ============================================================================
-- 4. Phase 3 Policies: POS Sales, Payments, Held Bills & Receipts
-- ============================================================================
CREATE POLICY payment_methods_select_member
  ON public.payment_methods FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY payment_methods_manage_settings
  ON public.payment_methods FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

CREATE POLICY printers_select_branch
  ON public.printers FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY printers_manage_settings
  ON public.printers FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

CREATE POLICY receipt_templates_select_member
  ON public.receipt_templates FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY receipt_templates_manage_settings
  ON public.receipt_templates FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

CREATE POLICY sales_select_branch
  ON public.sales FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY sales_write_pos
  ON public.sales FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  );

CREATE POLICY sale_items_select_member
  ON public.sale_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY sale_items_write_pos
  ON public.sale_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'pos.sell'))
  WITH CHECK (public.has_permission(business_id, 'pos.sell'));

CREATE POLICY sale_discounts_select_member
  ON public.sale_discounts FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY sale_discounts_write_pos
  ON public.sale_discounts FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'pos.discount.apply'))
  WITH CHECK (public.has_permission(business_id, 'pos.discount.apply'));

CREATE POLICY sale_payments_select_branch
  ON public.sale_payments FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY sale_payments_write_pos
  ON public.sale_payments FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  );

CREATE POLICY held_bills_branch_pos
  ON public.held_bills FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  );

CREATE POLICY receipts_select_branch
  ON public.receipts FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY receipts_insert_pos
  ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.sell')
  );

CREATE POLICY print_jobs_branch_pos
  ON public.print_jobs FOR ALL TO authenticated
  USING (public.has_branch_access(business_id, branch_id))
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND (
      public.has_permission(business_id, 'pos.sell')
      OR public.has_permission(business_id, 'pos.bills.view')
    )
  );

-- ============================================================================
-- 5. Phase 4 Policies: Customers, Khata, Quotations & Orders
-- ============================================================================
CREATE POLICY customers_select_member
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY customers_write_khata_or_pos
  ON public.customers FOR ALL TO authenticated
  USING (
    public.has_permission(business_id, 'khata.manage')
    OR public.has_permission(business_id, 'pos.sell')
  )
  WITH CHECK (
    public.has_permission(business_id, 'khata.manage')
    OR public.has_permission(business_id, 'pos.sell')
  );

DO $$
DECLARE
  v_cust_tbl TEXT;
BEGIN
  FOREACH v_cust_tbl IN ARRAY ARRAY[
    'customer_credit_limits',
    'customer_message_consents',
    'customer_ledger',
    'customer_payments',
    'ledger_allocations',
    'customer_message_drafts'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id));',
      v_cust_tbl || '_select_member', v_cust_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''khata.manage'')) WITH CHECK (public.has_permission(business_id, ''khata.manage''));',
      v_cust_tbl || '_write_khata', v_cust_tbl
    );
  END LOOP;
END;
$$;

CREATE POLICY customer_orders_select_branch
  ON public.customer_orders FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY customer_orders_write_orders
  ON public.customer_orders FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'orders.manage')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'orders.manage')
  );

CREATE POLICY customer_order_items_select_member
  ON public.customer_order_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY customer_order_items_write_orders
  ON public.customer_order_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'orders.manage'))
  WITH CHECK (public.has_permission(business_id, 'orders.manage'));

CREATE POLICY order_events_select_member
  ON public.order_events FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY order_events_insert_orders
  ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(business_id, 'orders.manage'));

CREATE POLICY shipments_select_branch
  ON public.shipments FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY shipments_write_orders
  ON public.shipments FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'orders.manage')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'orders.manage')
  );

CREATE POLICY courier_settlements_select_member
  ON public.courier_settlements FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY courier_settlements_write_orders
  ON public.courier_settlements FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'orders.manage'))
  WITH CHECK (public.has_permission(business_id, 'orders.manage'));

CREATE POLICY courier_settlement_items_select_member
  ON public.courier_settlement_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY courier_settlement_items_write_orders
  ON public.courier_settlement_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'orders.manage'))
  WITH CHECK (public.has_permission(business_id, 'orders.manage'));

CREATE POLICY quotations_select_branch
  ON public.quotations FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY quotations_write_quotes
  ON public.quotations FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.quotes.manage')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.quotes.manage')
  );

CREATE POLICY quotation_items_select_member
  ON public.quotation_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY quotation_items_write_quotes
  ON public.quotation_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'pos.quotes.manage'))
  WITH CHECK (public.has_permission(business_id, 'pos.quotes.manage'));

CREATE POLICY notification_drafts_member
  ON public.notification_drafts FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

-- ============================================================================
-- 6. Phase 5 Policies: Suppliers, Purchasing & Payables
-- ============================================================================
DO $$
DECLARE
  v_purch_tbl TEXT;
BEGIN
  FOREACH v_purch_tbl IN ARRAY ARRAY[
    'suppliers',
    'supplier_ledger',
    'purchase_orders',
    'purchase_order_items',
    'supplier_bills',
    'supplier_bill_items',
    'supplier_payments',
    'supplier_payment_allocations',
    'supplier_credit_notes',
    'supplier_credit_allocations'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_permission(business_id, ''purchasing.view'') OR public.has_permission(business_id, ''purchasing.manage''));',
      v_purch_tbl || '_select_purch', v_purch_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''purchasing.manage'')) WITH CHECK (public.has_permission(business_id, ''purchasing.manage''));',
      v_purch_tbl || '_write_purch', v_purch_tbl
    );
  END LOOP;
END;
$$;

CREATE POLICY goods_receipts_select_purch
  ON public.goods_receipts FOR SELECT TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.receive'))
  );

CREATE POLICY goods_receipts_write_recv
  ON public.goods_receipts FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage'))
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage'))
  );

CREATE POLICY goods_receipt_items_select_purch
  ON public.goods_receipt_items FOR SELECT TO authenticated
  USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.receive'));

CREATE POLICY goods_receipt_items_write_recv
  ON public.goods_receipt_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage'))
  WITH CHECK (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage'));

-- ============================================================================
-- 7. Phase 6 Policies: Returns, Refunds & Exchanges
-- ============================================================================
CREATE POLICY sales_returns_select_branch
  ON public.sales_returns FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY sales_returns_write_pos
  ON public.sales_returns FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.returns.process')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.returns.process')
  );

CREATE POLICY sales_return_items_select_member
  ON public.sales_return_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY sales_return_items_write_pos
  ON public.sales_return_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'pos.returns.process'))
  WITH CHECK (public.has_permission(business_id, 'pos.returns.process'));

CREATE POLICY refunds_select_branch
  ON public.refunds FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY refunds_write_pay
  ON public.refunds FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'pos.refunds.pay') OR public.has_permission(business_id, 'pos.returns.process'))
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'pos.refunds.pay') OR public.has_permission(business_id, 'pos.returns.process'))
  );

CREATE POLICY refund_payments_select_branch
  ON public.refund_payments FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY refund_payments_write_pay
  ON public.refund_payments FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.refunds.pay')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.refunds.pay')
  );

CREATE POLICY exchanges_select_branch
  ON public.exchanges FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY exchanges_write_pos
  ON public.exchanges FOR ALL TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.returns.process')
  )
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND public.has_permission(business_id, 'pos.returns.process')
  );

CREATE POLICY exchange_items_select_member
  ON public.exchange_items FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY exchange_items_write_pos
  ON public.exchange_items FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'pos.returns.process'))
  WITH CHECK (public.has_permission(business_id, 'pos.returns.process'));

-- ============================================================================
-- 8. Phase 7 Policies: Cash Drawers, Shifts, Expenses, Staff & Payroll
-- ============================================================================
CREATE POLICY cash_drawers_select_branch
  ON public.cash_drawers FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY cash_drawers_manage_settings
  ON public.cash_drawers FOR ALL TO authenticated
  USING (public.has_permission(business_id, 'settings.manage'))
  WITH CHECK (public.has_permission(business_id, 'settings.manage'));

CREATE POLICY cash_shifts_select_branch
  ON public.cash_shifts FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.view'));

CREATE POLICY cash_shifts_insert_open
  ON public.cash_shifts FOR INSERT TO authenticated
  WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.shift.open'));

CREATE POLICY cash_shifts_update_close
  ON public.cash_shifts FOR UPDATE TO authenticated
  USING (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'cash.shift.close') OR public.has_permission(business_id, 'cash.shift.open'))
  )
  WITH CHECK (public.has_branch_access(business_id, branch_id));

CREATE POLICY cash_transactions_select_branch
  ON public.cash_transactions FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.view'));

CREATE POLICY cash_transactions_insert_draft
  ON public.cash_transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_branch_access(business_id, branch_id)
    AND (public.has_permission(business_id, 'cash.entry.draft') OR public.has_permission(business_id, 'cash.entry.review'))
  );

CREATE POLICY cash_transactions_update_review
  ON public.cash_transactions FOR UPDATE TO authenticated
  USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.entry.review'))
  WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.entry.review'));

DO $$
DECLARE
  v_exp_tbl TEXT;
BEGIN
  FOREACH v_exp_tbl IN ARRAY ARRAY[
    'expense_categories',
    'recurring_expenses',
    'expenses',
    'expense_payments'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_permission(business_id, ''expenses.manage'') OR public.has_permission(business_id, ''reports.view''));',
      v_exp_tbl || '_select_exp', v_exp_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''expenses.manage'')) WITH CHECK (public.has_permission(business_id, ''expenses.manage''));',
      v_exp_tbl || '_write_exp', v_exp_tbl
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_staff_tbl TEXT;
BEGIN
  FOREACH v_staff_tbl IN ARRAY ARRAY[
    'employee_records',
    'attendance',
    'staff_advances',
    'payroll',
    'payroll_items',
    'payroll_payments',
    'payroll_payment_allocations'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_permission(business_id, ''staff.manage'') OR public.has_permission(business_id, ''reports.view''));',
      v_staff_tbl || '_select_staff', v_staff_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''staff.manage'')) WITH CHECK (public.has_permission(business_id, ''staff.manage''));',
      v_staff_tbl || '_write_staff', v_staff_tbl
    );
  END LOOP;
END;
$$;

-- ============================================================================
-- 9. Phase 8 & 9 Policies: Accounting, Settings, FBR, Attachments, Audit & Sync
-- ============================================================================
DO $$
DECLARE
  v_acc_tbl TEXT;
BEGIN
  FOREACH v_acc_tbl IN ARRAY ARRAY[
    'accounts',
    'journal_entries',
    'journal_lines'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_permission(business_id, ''reports.view''));',
      v_acc_tbl || '_select_reports', v_acc_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''settings.manage'')) WITH CHECK (public.has_permission(business_id, ''settings.manage''));',
      v_acc_tbl || '_write_owner', v_acc_tbl
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_set_tbl TEXT;
BEGIN
  FOREACH v_set_tbl IN ARRAY ARRAY[
    'tax_rates',
    'product_tax_rates',
    'integrations',
    'business_settings',
    'branch_settings',
    'device_settings'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id));',
      v_set_tbl || '_select_member', v_set_tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_permission(business_id, ''settings.manage'')) WITH CHECK (public.has_permission(business_id, ''settings.manage''));',
      v_set_tbl || '_write_settings', v_set_tbl
    );
  END LOOP;
END;
$$;

CREATE POLICY fbr_submissions_select_branch
  ON public.fbr_submissions FOR SELECT TO authenticated
  USING (public.has_branch_access(business_id, branch_id));

CREATE POLICY fbr_submissions_write_pos_or_settings
  ON public.fbr_submissions FOR ALL TO authenticated
  USING (
    public.has_permission(business_id, 'pos.sell')
    OR public.has_permission(business_id, 'settings.manage')
  )
  WITH CHECK (
    public.has_permission(business_id, 'pos.sell')
    OR public.has_permission(business_id, 'settings.manage')
  );

CREATE POLICY files_attachments_member
  ON public.files_attachments FOR ALL TO authenticated
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

-- audit_logs: strictly append-only read by authorized auditors
CREATE POLICY audit_logs_select_auditor
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_permission(business_id, 'audit.view'));

CREATE POLICY audit_logs_insert_member
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(business_id));

-- sync_operations: branch counter offline sync
CREATE POLICY sync_operations_branch
  ON public.sync_operations FOR ALL TO authenticated
  USING (public.has_branch_access(business_id, branch_id))
  WITH CHECK (public.has_branch_access(business_id, branch_id));

-- ============================================================================
-- 10. Supabase Storage Buckets & Tenant-Scoped Storage Policies
--     Object paths MUST start with "<business_uuid>/..."
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('zyro-product-images', 'zyro-product-images', false),
  ('zyro-attachments',    'zyro-attachments',    false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY zyro_storage_select_member
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('zyro-product-images', 'zyro-attachments')
    AND array_length(storage.foldername(name), 1) >= 1
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY zyro_storage_insert_member
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('zyro-product-images', 'zyro-attachments')
    AND array_length(storage.foldername(name), 1) >= 1
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY zyro_storage_delete_manager
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('zyro-product-images', 'zyro-attachments')
    AND array_length(storage.foldername(name), 1) >= 1
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (
      public.has_permission(((storage.foldername(name))[1])::uuid, 'inventory.manage')
      OR public.has_permission(((storage.foldername(name))[1])::uuid, 'settings.manage')
    )
  );

-- ============================================================================
-- 11. Additional High-Throughput Composite Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sales_branch_status_sold_at
  ON public.sales(branch_id, status, sold_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_levels_low_stock_watch
  ON public.stock_levels(business_id, branch_id, quantity_on_hand)
  WHERE quantity_on_hand <= reorder_level;

CREATE INDEX IF NOT EXISTS idx_customers_khata_outstanding
  ON public.customers(business_id, khata_balance DESC)
  WHERE khata_balance > 0 AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_bills_open_due
  ON public.supplier_bills(business_id, due_date)
  WHERE status = 'posted';

CREATE INDEX IF NOT EXISTS idx_expenses_open_due
  ON public.expenses(business_id, due_date)
  WHERE status IN ('draft', 'posted');
