# ZYRO Retail POS — Supabase PostgreSQL Schema Reference

Complete table-by-table documentation across all **10 migrations** (`0001`–`0010`), covering **97 tables**, **4 reporting views**, and **8 atomic PL/pgSQL transaction functions**.

---

## Migration `0001_core_business_and_auth.sql`

### 1. `public.businesses`
- **Purpose**: Root multi-tenant organization / retail shop account. 
- **Primary Key**: `id`
- **Foreign Keys**: `owner_user_id -> auth.users(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_businesses_owner_user_id (owner_user_id) WHERE deleted_at IS NULL`, `idx_businesses_status (status) WHERE deleted_at IS NULL`
- **RLS Policies**: `businesses_select_member (SELECT): USING (public.is_business_member(id) OR owner_user_id = auth.uid())`; `businesses_insert_owner (INSERT): WITH CHECK (owner_user_id = auth.uid())`; `businesses_update_owner_or_settings (UPDATE): USING (owner_user_id = auth.uid() OR public.has_permission(id, 'settings.manage')) WITH CHECK (owner_user_id = auth.uid() OR public.has_permission(id, 'settings.manage'))`
- **Relationships**: references `auth.users(id)`, referenced by `roles.business_id`, referenced by `role_permissions.business_id`, referenced by `branches.business_id`, referenced by `business_members.business_id`, referenced by `member_branch_access.business_id`, referenced by `pos_devices.business_id`, referenced by `device_sessions.business_id`, referenced by `categories.business_id`, referenced by `products.business_id`, referenced by `product_images.business_id`, referenced by `product_attributes.business_id`, referenced by `product_variants.business_id`, and 82 more child tables

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `name` | `TEXT` | NO | `—` |
| `legal_name` | `TEXT` | YES | `—` |
| `phone` | `TEXT` | NO | `—` |
| `email` | `TEXT` | YES | `—` |
| `currency` | `TEXT` | NO | `DEFAULT 'PKR'` |
| `timezone` | `TEXT` | NO | `DEFAULT 'Asia/Karachi'` |
| `shop_kit` | `TEXT` | NO | `DEFAULT 'clothing'` |
| `status` | `TEXT` | NO | `DEFAULT 'active'` |
| `owner_user_id` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 2. `public.user_profiles`
- **Purpose**: Public/app profile synced 1-to-1 with Supabase auth.users. 
- **Primary Key**: `id`
- **Foreign Keys**: `id -> auth.users(id)`
- **Unique Constraints**: `uq_user_profiles_phone: (phone) WHERE phone IS NOT NULL`
- **Indexes**: `uq_user_profiles_phone (phone) WHERE phone IS NOT NULL`
- **RLS Policies**: `user_profiles_select (SELECT): USING ( id = auth.uid() OR EXISTS ( SELECT 1 FROM public.business_members bm_me JOIN public.business_members bm_other ON bm_other.business_id = bm_me.business_id WHERE bm_me.user_id = auth.uid() AND bm_me.status = 'active' AND bm_me.deleted_at IS NULL AND bm_other.user_id = user_profiles.id AND bm_other.deleted_at IS NULL ) )`; `user_profiles_insert_own (INSERT): WITH CHECK (id = auth.uid())`; `user_profiles_update_own (UPDATE): USING (id = auth.uid()) WITH CHECK (id = auth.uid())`
- **Relationships**: references `auth.users(id)`, referenced by `business_members.user_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `—` |
| `full_name` | `TEXT` | NO | `—` |
| `short_name` | `TEXT` | YES | `—` |
| `phone` | `TEXT` | YES | `—` |
| `avatar_url` | `TEXT` | YES | `—` |
| `avatar_bg` | `TEXT` | NO | `DEFAULT '#08343A'` |
| `avatar_fg` | `TEXT` | NO | `DEFAULT '#FFFFFF'` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 3. `public.permissions`
- **Purpose**: Global catalog of atomic capability keys used by RBAC roles. 
- **Primary Key**: `id`
- **Foreign Keys**: None
- **Unique Constraints**: `UNIQUE (permission_key)`
- **Indexes**: Primary key index only
- **RLS Policies**: `permissions_select_authenticated (SELECT): USING (true)`
- **Relationships**: referenced by `role_permissions.permission_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `permission_key` | `TEXT` | NO | `—` |
| `module` | `TEXT` | NO | `—` |
| `description` | `TEXT` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 4. `public.roles`
- **Purpose**: Business-scoped role definitions (seeded system roles + custom roles). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `CONSTRAINT uq_roles_business_name UNIQUE (business_id, name)`
- **Indexes**: `idx_roles_business_id (business_id)`
- **RLS Policies**: `roles_select_member (SELECT): USING (public.is_business_member(business_id))`; `roles_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `role_permissions.role_id`, referenced by `business_members.role_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `display_name` | `TEXT` | NO | `—` |
| `is_system_role` | `BOOLEAN` | NO | `DEFAULT false` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 5. `public.role_permissions`
- **Purpose**: Maps each business role to one or more capability keys. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `role_id -> public.roles(id)`, `permission_id -> public.permissions(id)`
- **Unique Constraints**: `CONSTRAINT uq_role_permissions_pair UNIQUE (role_id, permission_id)`
- **Indexes**: `idx_role_permissions_business_id (business_id)`, `idx_role_permissions_role_id (role_id)`
- **RLS Policies**: `role_permissions_select_member (SELECT): USING (public.is_business_member(business_id))`; `role_permissions_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.roles(id)`, references `public.permissions(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `role_id` | `UUID` | NO | `—` |
| `permission_id` | `UUID` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 6. `public.branches`
- **Purpose**: Physical store locations operated by a business. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `uq_branches_single_main: (business_id) WHERE is_main = true AND deleted_at IS NULL`
- **Indexes**: `idx_branches_business_id (business_id) WHERE deleted_at IS NULL`, `uq_branches_single_main (business_id) WHERE is_main = true AND deleted_at IS NULL`
- **RLS Policies**: `branches_select_member (SELECT): USING (public.is_business_member(business_id))`; `branches_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `member_branch_access.branch_id`, referenced by `pos_devices.branch_id`, referenced by `device_sessions.branch_id`, referenced by `product_batches.branch_id`, referenced by `serial_numbers.branch_id`, referenced by `stock_levels.branch_id`, referenced by `stock_movements.branch_id`, referenced by `stock_counts.branch_id`, referenced by `stock_transfers.from_branch_id`, referenced by `stock_transfers.to_branch_id`, referenced by `stock_reservations.branch_id`, referenced by `printers.branch_id`, and 38 more child tables

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `code` | `TEXT` | YES | `—` |
| `city` | `TEXT` | YES | `—` |
| `address` | `TEXT` | YES | `—` |
| `phone` | `TEXT` | YES | `—` |
| `is_main` | `BOOLEAN` | NO | `DEFAULT false` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 7. `public.business_members`
- **Purpose**: Links users (or pending phone invitations) to a business & assigned role. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `user_id -> public.user_profiles(id)`, `role_id -> public.roles(id)`
- **Unique Constraints**: `uq_business_members_user: (business_id, user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL`, `uq_business_members_invite_phone: (business_id, invited_phone) WHERE invited_phone IS NOT NULL AND deleted_at IS NULL`
- **Indexes**: `uq_business_members_user (business_id, user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL`, `uq_business_members_invite_phone (business_id, invited_phone) WHERE invited_phone IS NOT NULL AND deleted_at IS NULL`, `idx_business_members_user_id (user_id) WHERE deleted_at IS NULL`, `idx_business_members_business_status (business_id, status) WHERE deleted_at IS NULL`
- **RLS Policies**: `business_members_select_member (SELECT): USING (public.is_business_member(business_id) OR user_id = auth.uid())`; `business_members_manage_staff_or_settings (ALL): USING ( public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'settings.manage') ) WITH CHECK ( public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'settings.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.user_profiles(id)`, references `public.roles(id)`, referenced by `member_branch_access.member_id`, referenced by `device_sessions.member_id`, referenced by `stock_movements.performed_by`, referenced by `stock_counts.counted_by`, referenced by `stock_counts.approved_by`, referenced by `stock_transfers.requested_by`, referenced by `stock_transfers.approved_by`, referenced by `stock_transfers.received_by`, referenced by `sales.cashier_member_id`, referenced by `sale_discounts.applied_by`, referenced by `sale_discounts.approved_by`, referenced by `sale_payments.recorded_by`, and 42 more child tables

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `user_id` | `UUID` | YES | `—` |
| `invited_name` | `TEXT` | YES | `—` |
| `invited_phone` | `TEXT` | YES | `—` |
| `role_id` | `UUID` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'active'` |
| `joined_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 8. `public.member_branch_access`
- **Purpose**: Grants a business_member access to specific branches. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `member_id -> public.business_members(id)`, `branch_id -> public.branches(id)`
- **Unique Constraints**: `CONSTRAINT uq_member_branch_pair UNIQUE (member_id, branch_id)`
- **Indexes**: `idx_member_branch_access_business_id (business_id)`, `idx_member_branch_access_branch_id (branch_id)`
- **RLS Policies**: `member_branch_access_select_member (SELECT): USING (public.is_business_member(business_id))`; `member_branch_access_manage (ALL): USING ( public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'settings.manage') ) WITH CHECK ( public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'settings.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.business_members(id)`, references `public.branches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `member_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `is_default` | `BOOLEAN` | NO | `DEFAULT false` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 9. `public.pos_devices`
- **Purpose**: Registered counters / terminals belonging to a branch. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_pos_devices_business_branch (business_id, branch_id) WHERE deleted_at IS NULL`
- **RLS Policies**: `pos_devices_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `pos_devices_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, referenced by `device_sessions.device_id`, referenced by `printers.device_id`, referenced by `sales.device_id`, referenced by `held_bills.device_id`, referenced by `print_jobs.device_id`, referenced by `cash_drawers.device_id`, referenced by `device_settings.device_id`, referenced by `audit_logs.device_id`, referenced by `sync_operations.device_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_name` | `TEXT` | NO | `—` |
| `device_type` | `TEXT` | NO | `DEFAULT 'counter_web'` |
| `status` | `TEXT` | NO | `DEFAULT 'active'` |
| `last_seen_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 10. `public.device_sessions`
- **Purpose**: Tracks active and historical staff counter sign-in sessions per device. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`, `member_id -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_device_sessions_device_active (device_id) WHERE ended_at IS NULL`, `idx_device_sessions_member_id (member_id)`, `idx_device_sessions_business_id (business_id)`
- **RLS Policies**: `device_sessions_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `device_sessions_write_member (INSERT): WITH CHECK (public.has_branch_access(business_id, branch_id))`; `device_sessions_update_own_or_manager (UPDATE): USING ( public.has_branch_access(business_id, branch_id) AND ( member_id = public.current_business_member_id(business_id) OR public.has_permission(business_id, 'settings.manage') ) ) WITH CHECK (public.has_branch_access(business_id, branch_id))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | NO | `—` |
| `member_id` | `UUID` | NO | `—` |
| `started_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `ended_at` | `TIMESTAMPTZ` | YES | `—` |
| `expires_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0002_products_and_inventory.sql`

### 11. `public.categories`
- **Purpose**: Product taxonomy supporting Shop Kit variant modes (sc, piece, batch, pack, shade, serial, simple). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `parent_id -> public.categories(id)`
- **Unique Constraints**: `uq_categories_business_name: (business_id, lower(name)) WHERE deleted_at IS NULL`
- **Indexes**: `uq_categories_business_name (business_id, lower(name)) WHERE deleted_at IS NULL`, `idx_categories_business_id (business_id) WHERE deleted_at IS NULL`, `idx_categories_parent_id (parent_id) WHERE parent_id IS NOT NULL`
- **RLS Policies**: `categories_select_member (SELECT): USING (public.is_business_member(business_id))`; `categories_write_inv (ALL): USING ( public.has_permission(business_id, 'inventory.categories') OR public.has_permission(business_id, 'inventory.manage') ) WITH CHECK ( public.has_permission(business_id, 'inventory.categories') OR public.has_permission(business_id, 'inventory.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.categories(id)`, referenced by `products.category_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `parent_id` | `UUID` | YES | `—` |
| `name` | `TEXT` | NO | `—` |
| `category_type` | `TEXT` | NO | `DEFAULT 'simple'` |
| `size_set_id` | `TEXT` | YES | `—` |
| `art_id` | `TEXT` | YES | `—` |
| `attribute_schema` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `counter_visible` | `BOOLEAN` | NO | `DEFAULT true` |
| `sort_order` | `INTEGER` | NO | `DEFAULT 0` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 12. `public.products`
- **Purpose**: Master product catalog shared across branches of a business. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `category_id -> public.categories(id)`
- **Unique Constraints**: `uq_products_business_sku: (business_id, lower(sku)) WHERE sku IS NOT NULL AND deleted_at IS NULL`
- **Indexes**: `uq_products_business_sku (business_id, lower(sku)) WHERE sku IS NOT NULL AND deleted_at IS NULL`, `idx_products_business_category (business_id, category_id) WHERE deleted_at IS NULL`, `idx_products_business_name (business_id, lower(name)) WHERE deleted_at IS NULL`
- **RLS Policies**: `products_select (SELECT): USING (public.is_business_member(business_id))`; `products_all (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.categories(id)`, referenced by `product_images.product_id`, referenced by `product_variants.product_id`, referenced by `sale_items.product_id`, referenced by `customer_order_items.product_id`, referenced by `quotation_items.product_id`, referenced by `purchase_order_items.product_id`, referenced by `product_tax_rates.product_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `category_id` | `UUID` | YES | `—` |
| `sku` | `TEXT` | YES | `—` |
| `name` | `TEXT` | NO | `—` |
| `brand` | `TEXT` | YES | `—` |
| `art_id` | `TEXT` | YES | `—` |
| `description` | `TEXT` | YES | `—` |
| `unit_of_measure` | `TEXT` | NO | `DEFAULT 'piece'` |
| `is_measured` | `BOOLEAN` | NO | `DEFAULT false` |
| `track_inventory` | `BOOLEAN` | NO | `DEFAULT true` |
| `allow_negative_stock` | `BOOLEAN` | NO | `DEFAULT false` |
| `has_variants` | `BOOLEAN` | NO | `DEFAULT false` |
| `requires_batch` | `BOOLEAN` | NO | `DEFAULT false` |
| `requires_expiry` | `BOOLEAN` | NO | `DEFAULT false` |
| `requires_serial` | `BOOLEAN` | NO | `DEFAULT false` |
| `base_cost_price` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `base_selling_price` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `karat` | `TEXT` | YES | `—` |
| `weight_grams` | `NUMERIC(10,3)` | YES | `—` |
| `making_charge` | `NUMERIC(14,2)` | YES | `—` |
| `warranty_months` | `INTEGER` | YES | `—` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `metadata` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 13. `public.product_images`
- **Purpose**: Storage-backed product gallery images. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `product_id -> public.products(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_product_images_product_id (product_id)`, `idx_product_images_business_id (business_id)`
- **RLS Policies**: `product_images_select (SELECT): USING (public.is_business_member(business_id))`; `product_images_all (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.products(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `storage_path` | `TEXT` | NO | `—` |
| `image_url` | `TEXT` | YES | `—` |
| `is_primary` | `BOOLEAN` | NO | `DEFAULT false` |
| `sort_order` | `INTEGER` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 14. `public.product_attributes`
- **Purpose**: Attribute definitions (Colour, Size, Shade, Karat, Pack, Storage). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `uq_product_attributes_business_name: (business_id, lower(name))`
- **Indexes**: `uq_product_attributes_business_name (business_id, lower(name))`
- **RLS Policies**: `product_attributes_select (SELECT): USING (public.is_business_member(business_id))`; `product_attributes_all (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `variant_attribute_values.attribute_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `display_type` | `TEXT` | NO | `DEFAULT 'text'` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 15. `public.product_variants`
- **Purpose**: Sellable/purchasable SKU variants (default 1 row even for simple items). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `product_id -> public.products(id)`
- **Unique Constraints**: `uq_product_variants_business_sku: (business_id, lower(sku)) WHERE sku IS NOT NULL AND deleted_at IS NULL`
- **Indexes**: `uq_product_variants_business_sku (business_id, lower(sku)) WHERE sku IS NOT NULL AND deleted_at IS NULL`, `idx_product_variants_product_id (product_id) WHERE deleted_at IS NULL`, `idx_product_variants_business_id (business_id) WHERE deleted_at IS NULL`
- **RLS Policies**: `product_variants_select (SELECT): USING (public.is_business_member(business_id))`; `product_variants_all (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.products(id)`, referenced by `variant_attribute_values.variant_id`, referenced by `product_barcodes.variant_id`, referenced by `product_batches.variant_id`, referenced by `serial_numbers.variant_id`, referenced by `stock_levels.variant_id`, referenced by `stock_movements.variant_id`, referenced by `stock_count_items.variant_id`, referenced by `stock_transfer_items.variant_id`, referenced by `stock_reservations.variant_id`, referenced by `sale_items.variant_id`, referenced by `customer_order_items.variant_id`, referenced by `quotation_items.variant_id`, and 5 more child tables

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `sku` | `TEXT` | YES | `—` |
| `variant_name` | `TEXT` | NO | `DEFAULT 'Standard'` |
| `colour_name` | `TEXT` | YES | `—` |
| `size_name` | `TEXT` | YES | `—` |
| `shade_name` | `TEXT` | YES | `—` |
| `cost_price` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `selling_price` | `NUMERIC(14,2)` | YES | `—` |
| `reorder_level` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `is_default` | `BOOLEAN` | NO | `DEFAULT false` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 16. `public.variant_attribute_values`
- **Purpose**: Normalized attribute-value pairs attached to a product variant. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `variant_id -> public.product_variants(id)`, `attribute_id -> public.product_attributes(id)`
- **Unique Constraints**: `CONSTRAINT uq_variant_attr_pair UNIQUE (variant_id, attribute_id)`
- **Indexes**: `idx_variant_attribute_values_business_id (business_id)`
- **RLS Policies**: `variant_attribute_values_select (SELECT): USING (public.is_business_member(business_id))`; `variant_attribute_values_all (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.product_variants(id)`, references `public.product_attributes(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `attribute_id` | `UUID` | NO | `—` |
| `attribute_value` | `TEXT` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 17. `public.product_barcodes`
- **Purpose**: Barcode registry mapped to specific product variants. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: `CONSTRAINT uq_product_barcodes_business_code UNIQUE (business_id, barcode)`
- **Indexes**: `idx_product_barcodes_variant_id (variant_id)`
- **RLS Policies**: `product_barcodes_select (SELECT): USING (public.is_business_member(business_id))`; `product_barcodes_all (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.product_variants(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `barcode` | `TEXT` | NO | `—` |
| `barcode_type` | `TEXT` | NO | `DEFAULT 'EAN13'` |
| `is_primary` | `BOOLEAN` | NO | `DEFAULT false` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 18. `public.product_batches`
- **Purpose**: Lot/batch and expiry tracking per branch (Pharmacy, Grocery, Cosmetics). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: `CONSTRAINT uq_product_batches_branch_variant_no UNIQUE (branch_id, variant_id, batch_number)`
- **Indexes**: `idx_product_batches_business_expiry (business_id, expiry_date) WHERE quantity_on_hand > 0`, `idx_product_batches_branch_variant (branch_id, variant_id)`
- **RLS Policies**: `product_batches_select (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `product_batches_all (ALL): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.product_variants(id)`, referenced by `stock_movements.batch_id`, referenced by `stock_count_items.batch_id`, referenced by `stock_transfer_items.batch_id`, referenced by `stock_reservations.batch_id`, referenced by `sale_items.batch_id`, referenced by `goods_receipt_items.batch_id`, referenced by `sales_return_items.batch_id`, referenced by `exchange_items.batch_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_number` | `TEXT` | NO | `—` |
| `manufacture_date` | `DATE` | YES | `—` |
| `expiry_date` | `DATE` | YES | `—` |
| `cost_price` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `quantity_on_hand` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 19. `public.serial_numbers`
- **Purpose**: IMEI / serial number registry for serialized retail (Mobile Phones). FK links to sale_items & goods_receipt_items are added in Phases 3 & 5. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `variant_id -> public.product_variants(id)`, `sold_sale_item_id -> public.sale_items(id)`, `goods_receipt_id -> public.goods_receipts(id)`
- **Unique Constraints**: `CONSTRAINT uq_serial_numbers_business_serial UNIQUE (business_id, serial_number)`
- **Indexes**: `idx_serial_numbers_branch_status (branch_id, variant_id, status)`
- **RLS Policies**: `serial_numbers_select (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `serial_numbers_all (ALL): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.product_variants(id)`, references `public.sale_items(id)`, references `public.goods_receipts(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `serial_number` | `TEXT` | NO | `—` |
| `imei_secondary` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'in_stock'` |
| `goods_receipt_id` | `UUID` | YES | `—` |
| `sold_sale_item_id` | `UUID` | YES | `—` |
| `warranty_expires_at` | `DATE` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 20. `public.stock_levels`
- **Purpose**: Authoritative on-hand and reserved stock quantities per branch/variant. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: `CONSTRAINT uq_stock_levels_branch_variant UNIQUE (branch_id, variant_id)`
- **Indexes**: `idx_stock_levels_business_branch (business_id, branch_id)`, `idx_stock_levels_variant_id (variant_id)`, `idx_stock_levels_low_stock_watch (business_id, branch_id, quantity_on_hand) WHERE quantity_on_hand <= reorder_level`
- **RLS Policies**: `stock_levels_select (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `stock_levels_all (ALL): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.product_variants(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `quantity_on_hand` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `quantity_reserved` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `reorder_level` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `average_cost` | `NUMERIC(14,4)` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 21. `public.stock_movements`
- **Purpose**: Append-only audit ledger for every inventory quantity change. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`, `performed_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_stock_movements_branch_variant_date (branch_id, variant_id, created_at DESC)`, `idx_stock_movements_business_ref (business_id, reference_type, reference_id)`
- **RLS Policies**: `stock_movements_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `stock_movements_insert_inv (INSERT): WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `movement_type` | `TEXT` | NO | `—` |
| `quantity_delta` | `NUMERIC(14,3)` | NO | `—` |
| `unit_cost` | `NUMERIC(14,4)` | NO | `DEFAULT 0` |
| `reference_type` | `TEXT` | YES | `—` |
| `reference_id` | `UUID` | YES | `—` |
| `reason` | `TEXT` | YES | `—` |
| `performed_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 22. `public.stock_counts`
- **Purpose**: Physical inventory verification / cycle-count sessions. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `counted_by -> public.business_members(id)`, `approved_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_stock_counts_business_number UNIQUE (business_id, count_number)`
- **Indexes**: `idx_stock_counts_branch_status (branch_id, status)`
- **RLS Policies**: `stock_counts_select (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `stock_counts_all (ALL): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `stock_count_items.stock_count_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `count_number` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `counted_by` | `UUID` | YES | `—` |
| `approved_by` | `UUID` | YES | `—` |
| `started_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `completed_at` | `TIMESTAMPTZ` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 23. `public.stock_count_items`
- **Purpose**: Expected vs physically counted quantities within a stock count session. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `stock_count_id -> public.stock_counts(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: `CONSTRAINT uq_stock_count_items_line UNIQUE NULLS NOT DISTINCT (stock_count_id, variant_id, batch_id)`
- **Indexes**: `idx_stock_count_items_business_id (business_id)`
- **RLS Policies**: `stock_count_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `stock_count_items_write_inv (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.stock_counts(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `stock_count_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `expected_qty` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `counted_qty` | `NUMERIC(14,3)` | YES | `—` |
| `variance_qty` | `NUMERIC(14,3)` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 24. `public.stock_transfers`
- **Purpose**: Inter-branch stock movement requests and dispatch headers. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `from_branch_id -> public.branches(id)`, `to_branch_id -> public.branches(id)`, `requested_by -> public.business_members(id)`, `approved_by -> public.business_members(id)`, `received_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_stock_transfers_business_no UNIQUE (business_id, transfer_number)`
- **Indexes**: `idx_stock_transfers_branches (business_id, from_branch_id, to_branch_id)`
- **RLS Policies**: `stock_transfers_select_branch (SELECT): USING ( public.has_branch_access(business_id, from_branch_id) OR public.has_branch_access(business_id, to_branch_id) )`; `stock_transfers_write_inv (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.branches(id)`, references `public.business_members(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `stock_transfer_items.transfer_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `from_branch_id` | `UUID` | NO | `—` |
| `to_branch_id` | `UUID` | NO | `—` |
| `transfer_number` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `requested_by` | `UUID` | YES | `—` |
| `approved_by` | `UUID` | YES | `—` |
| `received_by` | `UUID` | YES | `—` |
| `sent_at` | `TIMESTAMPTZ` | YES | `—` |
| `received_at` | `TIMESTAMPTZ` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 25. `public.stock_transfer_items`
- **Purpose**: Variant quantities dispatched and received on an inter-branch transfer. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `transfer_id -> public.stock_transfers(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_stock_transfer_items_transfer_id (transfer_id)`, `idx_stock_transfer_items_business_id (business_id)`
- **RLS Policies**: `stock_transfer_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `stock_transfer_items_write_inv (ALL): USING (public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.stock_transfers(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `transfer_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `quantity_sent` | `NUMERIC(14,3)` | NO | `—` |
| `quantity_received` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 26. `public.stock_reservations`
- **Purpose**: Temporary stock allocations held for open customer orders or held bills. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_stock_reservations_active (branch_id, variant_id) WHERE status = 'active'`, `idx_stock_reservations_source (source_type, source_id)`
- **RLS Policies**: `stock_reservations_select (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `stock_reservations_all (ALL): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'inventory.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `source_type` | `TEXT` | NO | `—` |
| `source_id` | `UUID` | NO | `—` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'active'` |
| `expires_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0003_pos_and_payments.sql`

### 27. `public.payment_methods`
- **Purpose**: Business-configured tender channels available on POS registers. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `CONSTRAINT uq_payment_methods_business_code UNIQUE (business_id, method_code, display_name)`
- **Indexes**: `idx_payment_methods_business_id (business_id) WHERE is_active = true`
- **RLS Policies**: `payment_methods_select_member (SELECT): USING (public.is_business_member(business_id))`; `payment_methods_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `sale_payments.payment_method_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `display_name` | `TEXT` | NO | `—` |
| `account_label` | `TEXT` | YES | `—` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `sort_order` | `INTEGER` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 28. `public.printers`
- **Purpose**: Thermal and document printer configurations attached to branches/devices. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_printers_branch_id (branch_id)`, `idx_printers_business_id (business_id)`
- **RLS Policies**: `printers_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `printers_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`, referenced by `print_jobs.printer_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | YES | `—` |
| `name` | `TEXT` | NO | `—` |
| `connection_type` | `TEXT` | NO | `DEFAULT 'usb'` |
| `paper_width` | `TEXT` | NO | `DEFAULT '80mm'` |
| `auto_print` | `BOOLEAN` | NO | `DEFAULT true` |
| `open_drawer_on_cash` | `BOOLEAN` | NO | `DEFAULT true` |
| `copies` | `INTEGER` | NO | `DEFAULT 1` |
| `status` | `TEXT` | NO | `DEFAULT 'connected'` |
| `is_default` | `BOOLEAN` | NO | `DEFAULT false` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 29. `public.receipt_templates`
- **Purpose**: Receipt header/footer and visibility toggles for thermal printing. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_receipt_templates_business_id (business_id)`
- **RLS Policies**: `receipt_templates_select_member (SELECT): USING (public.is_business_member(business_id))`; `receipt_templates_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `receipts.template_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `name` | `TEXT` | NO | `DEFAULT 'Default Receipt'` |
| `header_note` | `TEXT` | YES | `—` |
| `footer_note` | `TEXT` | YES | `—` |
| `show_phone` | `BOOLEAN` | NO | `DEFAULT true` |
| `show_address` | `BOOLEAN` | NO | `DEFAULT true` |
| `show_cashier` | `BOOLEAN` | NO | `DEFAULT true` |
| `show_barcode` | `BOOLEAN` | NO | `DEFAULT true` |
| `show_urdu_labels` | `BOOLEAN` | NO | `DEFAULT false` |
| `is_default` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 30. `public.sales`
- **Purpose**: POS bill headers recording totals, customer link, FBR status, and sync id. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`, `cashier_member_id -> public.business_members(id)`, `customer_id -> public.customers(id)`, `shift_id -> public.cash_shifts(id)`
- **Unique Constraints**: `CONSTRAINT uq_sales_branch_bill_number UNIQUE (branch_id, bill_number)`, `uq_sales_business_client_sync: (business_id, client_sync_id) WHERE client_sync_id IS NOT NULL`
- **Indexes**: `uq_sales_business_client_sync (business_id, client_sync_id) WHERE client_sync_id IS NOT NULL`, `idx_sales_business_sold_at (business_id, sold_at DESC)`, `idx_sales_branch_sold_at (branch_id, sold_at DESC)`, `idx_sales_customer_id (customer_id) WHERE customer_id IS NOT NULL`, `idx_sales_shift_id (shift_id) WHERE shift_id IS NOT NULL`, `idx_sales_branch_status_sold_at (branch_id, status, sold_at DESC)`
- **RLS Policies**: `sales_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `sales_write_pos (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`, references `public.business_members(id)`, references `public.customers(id)`, references `public.cash_shifts(id)`, referenced by `sale_items.sale_id`, referenced by `sale_discounts.sale_id`, referenced by `sale_payments.sale_id`, referenced by `receipts.sale_id`, referenced by `print_jobs.sale_id`, referenced by `quotations.converted_sale_id`, referenced by `sales_returns.original_sale_id`, referenced by `exchanges.replacement_sale_id`, referenced by `fbr_submissions.sale_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | YES | `—` |
| `shift_id` | `UUID` | YES | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `cashier_member_id` | `UUID` | YES | `—` |
| `bill_number` | `BIGINT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'completed'` |
| `subtotal_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `discount_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `tax_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `total_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `paid_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `due_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `change_given` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `refunded_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `fbr_status` | `TEXT` | NO | `DEFAULT 'not_required'` |
| `fbr_invoice_no` | `TEXT` | YES | `—` |
| `client_sync_id` | `TEXT` | YES | `—` |
| `offline_pending` | `BOOLEAN` | NO | `DEFAULT false` |
| `notes` | `TEXT` | YES | `—` |
| `sold_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 31. `public.sale_items`
- **Purpose**: Immutable line-item snapshots preserving historical names, SKUs & prices. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `sale_id -> public.sales(id)`, `product_id -> public.products(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_sale_items_sale_id (sale_id)`, `idx_sale_items_business_variant (business_id, variant_id)`
- **RLS Policies**: `sale_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `sale_items_write_pos (ALL): USING (public.has_permission(business_id, 'pos.sell')) WITH CHECK (public.has_permission(business_id, 'pos.sell'))`
- **Relationships**: references `public.businesses(id)`, references `public.sales(id)`, references `public.products(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`, referenced by `serial_numbers.sold_sale_item_id`, referenced by `sale_discounts.sale_item_id`, referenced by `sales_return_items.original_sale_item_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `sale_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `product_name_snapshot` | `TEXT` | NO | `—` |
| `variant_label_snapshot` | `TEXT` | NO | `DEFAULT ''` |
| `sku_snapshot` | `TEXT` | YES | `—` |
| `unit_cost_snapshot` | `NUMERIC(14,4)` | NO | `DEFAULT 0` |
| `unit_price` | `NUMERIC(14,2)` | NO | `—` |
| `original_unit_price` | `NUMERIC(14,2)` | NO | `—` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `line_discount_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `tax_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `returned_quantity` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `note` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 32. `public.sale_discounts`
- **Purpose**: Discounts applied at bill or line level with manager approval tracking. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `sale_id -> public.sales(id)`, `sale_item_id -> public.sale_items(id)`, `applied_by -> public.business_members(id)`, `approved_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_sale_discounts_sale_id (sale_id)`, `idx_sale_discounts_business_id (business_id)`
- **RLS Policies**: `sale_discounts_select_member (SELECT): USING (public.is_business_member(business_id))`; `sale_discounts_write_pos (ALL): USING (public.has_permission(business_id, 'pos.discount.apply')) WITH CHECK (public.has_permission(business_id, 'pos.discount.apply'))`
- **Relationships**: references `public.businesses(id)`, references `public.sales(id)`, references `public.sale_items(id)`, references `public.business_members(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `sale_id` | `UUID` | NO | `—` |
| `sale_item_id` | `UUID` | YES | `—` |
| `discount_scope` | `TEXT` | NO | `—` |
| `discount_mode` | `TEXT` | NO | `—` |
| `discount_value` | `NUMERIC(14,2)` | NO | `—` |
| `discount_amount` | `NUMERIC(14,2)` | NO | `—` |
| `reason` | `TEXT` | YES | `—` |
| `applied_by` | `UUID` | YES | `—` |
| `approved_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 33. `public.sale_payments`
- **Purpose**: Single or split payment legs collected against a sale. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `sale_id -> public.sales(id)`, `payment_method_id -> public.payment_methods(id)`, `recorded_by -> public.business_members(id)`, `shift_id -> public.cash_shifts(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_sale_payments_sale_id (sale_id)`, `idx_sale_payments_shift_id (shift_id) WHERE shift_id IS NOT NULL`, `idx_sale_payments_business_paid_at (business_id, paid_at DESC)`
- **RLS Policies**: `sale_payments_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `sale_payments_write_pos (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.sales(id)`, references `public.payment_methods(id)`, references `public.business_members(id)`, references `public.cash_shifts(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `sale_id` | `UUID` | NO | `—` |
| `shift_id` | `UUID` | YES | `—` |
| `payment_method_id` | `UUID` | YES | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `tendered_amount` | `NUMERIC(14,2)` | YES | `—` |
| `reference_no` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'settled'` |
| `recorded_by` | `UUID` | YES | `—` |
| `paid_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 34. `public.held_bills`
- **Purpose**: Temporarily parked register carts awaiting resume or discard. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`, `cashier_member_id -> public.business_members(id)`, `customer_id -> public.customers(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_held_bills_branch_status (branch_id, status) WHERE status = 'held'`, `idx_held_bills_business_id (business_id)`
- **RLS Policies**: `held_bills_branch_pos (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`, references `public.business_members(id)`, references `public.customers(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | YES | `—` |
| `cashier_member_id` | `UUID` | YES | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `hold_number` | `INTEGER` | NO | `—` |
| `cart_payload` | `JSONB` | NO | `DEFAULT '[]'::jsonb` |
| `discount_payload` | `JSONB` | YES | `—` |
| `note` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'held'` |
| `held_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `resumed_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 35. `public.receipts`
- **Purpose**: Generated receipt payloads for thermal printing and reprint history. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `sale_id -> public.sales(id)`, `template_id -> public.receipt_templates(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_receipts_sale_id (sale_id)`, `idx_receipts_business_id (business_id)`
- **RLS Policies**: `receipts_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `receipts_insert_pos (INSERT): WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.sell') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.sales(id)`, references `public.receipt_templates(id)`, referenced by `print_jobs.receipt_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `sale_id` | `UUID` | NO | `—` |
| `template_id` | `UUID` | YES | `—` |
| `receipt_number` | `TEXT` | NO | `—` |
| `render_format` | `TEXT` | NO | `DEFAULT 'thermal_80mm'` |
| `payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `generated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 36. `public.print_jobs`
- **Purpose**: Tracks receipt print attempts, failures, and manual reprint queue. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`, `printer_id -> public.printers(id)`, `sale_id -> public.sales(id)`, `receipt_id -> public.receipts(id)`, `queued_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_print_jobs_branch_status (branch_id, status, created_at DESC)`, `idx_print_jobs_sale_id (sale_id) WHERE sale_id IS NOT NULL`
- **RLS Policies**: `print_jobs_branch_pos (ALL): USING (public.has_branch_access(business_id, branch_id)) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND ( public.has_permission(business_id, 'pos.sell') OR public.has_permission(business_id, 'pos.bills.view') ) )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`, references `public.printers(id)`, references `public.sales(id)`, references `public.receipts(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | YES | `—` |
| `printer_id` | `UUID` | YES | `—` |
| `sale_id` | `UUID` | YES | `—` |
| `receipt_id` | `UUID` | YES | `—` |
| `job_type` | `TEXT` | NO | `DEFAULT 'sale_receipt'` |
| `status` | `TEXT` | NO | `DEFAULT 'queued'` |
| `copies` | `INTEGER` | NO | `DEFAULT 1` |
| `attempts` | `INTEGER` | NO | `DEFAULT 0` |
| `error_message` | `TEXT` | YES | `—` |
| `queued_by` | `UUID` | YES | `—` |
| `completed_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0004_customers_khata_and_orders.sql`

### 37. `public.customers`
- **Purpose**: Customer directory supporting walk-in Khata balances and refunds owed. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`
- **Unique Constraints**: `uq_customers_business_phone: (business_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL`
- **Indexes**: `uq_customers_business_phone (business_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL`, `idx_customers_business_name (business_id, lower(full_name)) WHERE deleted_at IS NULL`, `idx_customers_khata_outstanding (business_id, khata_balance DESC) WHERE khata_balance > 0 AND deleted_at IS NULL`
- **RLS Policies**: `customers_select_member (SELECT): USING (public.is_business_member(business_id))`; `customers_write_khata_or_pos (ALL): USING ( public.has_permission(business_id, 'khata.manage') OR public.has_permission(business_id, 'pos.sell') ) WITH CHECK ( public.has_permission(business_id, 'khata.manage') OR public.has_permission(business_id, 'pos.sell') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, referenced by `sales.customer_id`, referenced by `held_bills.customer_id`, referenced by `customer_credit_limits.customer_id`, referenced by `customer_message_consents.customer_id`, referenced by `customer_orders.customer_id`, referenced by `quotations.customer_id`, referenced by `customer_ledger.customer_id`, referenced by `customer_payments.customer_id`, referenced by `customer_message_drafts.customer_id`, referenced by `notification_drafts.customer_id`, referenced by `sales_returns.customer_id`, referenced by `refunds.customer_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | YES | `—` |
| `full_name` | `TEXT` | NO | `—` |
| `phone` | `TEXT` | YES | `—` |
| `email` | `TEXT` | YES | `—` |
| `city` | `TEXT` | YES | `—` |
| `address` | `TEXT` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `khata_balance` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `refund_owed` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `last_activity_at` | `TIMESTAMPTZ` | YES | `—` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 38. `public.customer_credit_limits`
- **Purpose**: Credit cap and overdue blocking rules per Khata customer. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `customer_id -> public.customers(id)`, `approved_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_customer_credit_limits_customer UNIQUE (customer_id)`
- **Indexes**: `idx_customer_credit_limits_business_id (business_id)`
- **RLS Policies**: `customer_credit_limits_select (SELECT): USING (public.is_business_member(business_id))`; `customer_credit_limits_all (ALL): USING (public.has_permission(business_id, 'khata.manage')) WITH CHECK (public.has_permission(business_id, 'khata.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.customers(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | NO | `—` |
| `credit_limit` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `payment_terms_days` | `INTEGER` | NO | `DEFAULT 30` |
| `block_on_overdue` | `BOOLEAN` | NO | `DEFAULT false` |
| `approved_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 39. `public.customer_message_consents`
- **Purpose**: Tracks WhatsApp/SMS reminder consent proof for compliance. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `customer_id -> public.customers(id)`
- **Unique Constraints**: `CONSTRAINT uq_customer_consent_channel UNIQUE (customer_id, channel)`
- **Indexes**: `idx_customer_message_consents_business_id (business_id)`
- **RLS Policies**: `customer_message_consents_select (SELECT): USING (public.is_business_member(business_id))`; `customer_message_consents_all (ALL): USING (public.has_permission(business_id, 'khata.manage')) WITH CHECK (public.has_permission(business_id, 'khata.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.customers(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | NO | `—` |
| `channel` | `TEXT` | NO | `—` |
| `consented` | `BOOLEAN` | NO | `DEFAULT false` |
| `evidence_note` | `TEXT` | YES | `—` |
| `consented_at` | `TIMESTAMPTZ` | YES | `—` |
| `revoked_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 40. `public.customer_orders`
- **Purpose**: Online, social (WhatsApp/Instagram/Facebook), and manual customer orders. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `customer_id -> public.customers(id)`, `created_by -> public.business_members(id)`, `confirmed_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_customer_orders_business_no UNIQUE (business_id, order_number)`
- **Indexes**: `idx_customer_orders_branch_status (branch_id, status, created_at DESC)`, `idx_customer_orders_customer_id (customer_id) WHERE customer_id IS NOT NULL`
- **RLS Policies**: `customer_orders_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `customer_orders_write_orders (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'orders.manage') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'orders.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.customers(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `customer_order_items.order_id`, referenced by `order_events.order_id`, referenced by `shipments.order_id`, referenced by `customer_message_drafts.order_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `order_number` | `TEXT` | NO | `—` |
| `source` | `TEXT` | NO | `DEFAULT 'manual_whatsapp'` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `customer_name_snapshot` | `TEXT` | YES | `—` |
| `customer_phone_snapshot` | `TEXT` | YES | `—` |
| `delivery_address` | `TEXT` | YES | `—` |
| `delivery_city` | `TEXT` | YES | `—` |
| `subtotal_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `discount_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `delivery_fee` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `total_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `created_by` | `UUID` | YES | `—` |
| `confirmed_by` | `UUID` | YES | `—` |
| `confirmed_at` | `TIMESTAMPTZ` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 41. `public.customer_order_items`
- **Purpose**: Product variant lines requested and shipped for an order. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `order_id -> public.customer_orders(id)`, `product_id -> public.products(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_customer_order_items_order_id (order_id)`, `idx_customer_order_items_business_id (business_id)`
- **RLS Policies**: `customer_order_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `customer_order_items_write_orders (ALL): USING (public.has_permission(business_id, 'orders.manage')) WITH CHECK (public.has_permission(business_id, 'orders.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.customer_orders(id)`, references `public.products(id)`, references `public.product_variants(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `order_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `product_name_snapshot` | `TEXT` | NO | `—` |
| `variant_label_snapshot` | `TEXT` | NO | `DEFAULT ''` |
| `unit_price` | `NUMERIC(14,2)` | NO | `—` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `shipped_quantity` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 42. `public.order_events`
- **Purpose**: Audit timeline of order state changes and packing checkpoints. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `order_id -> public.customer_orders(id)`, `actor_member_id -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_order_events_order_id (order_id, created_at)`, `idx_order_events_business_id (business_id)`
- **RLS Policies**: `order_events_select_member (SELECT): USING (public.is_business_member(business_id))`; `order_events_insert_orders (INSERT): WITH CHECK (public.has_permission(business_id, 'orders.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.customer_orders(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `order_id` | `UUID` | NO | `—` |
| `event_type` | `TEXT` | NO | `—` |
| `actor_member_id` | `UUID` | YES | `—` |
| `payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 43. `public.shipments`
- **Purpose**: Courier parcels and manual COD tracking linked to customer orders. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `order_id -> public.customer_orders(id)`
- **Unique Constraints**: `CONSTRAINT uq_shipments_business_no UNIQUE (business_id, shipment_number)`
- **Indexes**: `idx_shipments_order_id (order_id)`, `idx_shipments_business_status (business_id, status)`
- **RLS Policies**: `shipments_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `shipments_write_orders (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'orders.manage') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'orders.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.customer_orders(id)`, referenced by `courier_settlement_items.shipment_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `order_id` | `UUID` | NO | `—` |
| `shipment_number` | `TEXT` | NO | `—` |
| `courier_name` | `TEXT` | NO | `—` |
| `tracking_number` | `TEXT` | YES | `—` |
| `city` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'prepared'` |
| `cod_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `needs_review` | `BOOLEAN` | NO | `DEFAULT false` |
| `notes` | `TEXT` | YES | `—` |
| `dispatched_at` | `TIMESTAMPTZ` | YES | `—` |
| `delivered_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 44. `public.courier_settlements`
- **Purpose**: COD payout reconciliation batches received from courier companies. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `recorded_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_courier_settlements_ref UNIQUE (business_id, courier_name, settlement_ref)`
- **Indexes**: `idx_courier_settlements_business_date (business_id, settlement_date DESC)`
- **RLS Policies**: `courier_settlements_select_member (SELECT): USING (public.is_business_member(business_id))`; `courier_settlements_write_orders (ALL): USING (public.has_permission(business_id, 'orders.manage')) WITH CHECK (public.has_permission(business_id, 'orders.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.business_members(id)`, referenced by `courier_settlement_items.settlement_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `courier_name` | `TEXT` | NO | `—` |
| `settlement_ref` | `TEXT` | NO | `—` |
| `settlement_date` | `DATE` | NO | `—` |
| `gross_cod_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `courier_fee_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `net_received_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `recorded_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 45. `public.courier_settlement_items`
- **Purpose**: Shipment-level breakdown inside a courier COD settlement. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `settlement_id -> public.courier_settlements(id)`, `shipment_id -> public.shipments(id)`
- **Unique Constraints**: `CONSTRAINT uq_courier_settlement_shipment UNIQUE (shipment_id)`
- **Indexes**: `idx_courier_settlement_items_settlement_id (settlement_id)`, `idx_courier_settlement_items_business_id (business_id)`
- **RLS Policies**: `courier_settlement_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `courier_settlement_items_write_orders (ALL): USING (public.has_permission(business_id, 'orders.manage')) WITH CHECK (public.has_permission(business_id, 'orders.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.courier_settlements(id)`, references `public.shipments(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `settlement_id` | `UUID` | NO | `—` |
| `shipment_id` | `UUID` | NO | `—` |
| `cod_collected` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `courier_fee` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `net_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 46. `public.quotations`
- **Purpose**: Customer price quotes convertible directly into POS sales. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `customer_id -> public.customers(id)`, `converted_sale_id -> public.sales(id)`, `created_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_quotations_business_no UNIQUE (business_id, quote_number)`
- **Indexes**: `idx_quotations_branch_status (branch_id, status)`
- **RLS Policies**: `quotations_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `quotations_write_quotes (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.quotes.manage') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.quotes.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.customers(id)`, references `public.sales(id)`, references `public.business_members(id)`, referenced by `quotation_items.quotation_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `quote_number` | `TEXT` | NO | `—` |
| `customer_name_snapshot` | `TEXT` | NO | `DEFAULT 'Walk-in Customer'` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `valid_until` | `DATE` | NO | `—` |
| `discount_payload` | `JSONB` | YES | `—` |
| `subtotal_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `discount_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `total_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `converted_sale_id` | `UUID` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 47. `public.quotation_items`
- **Purpose**: Line items quoted to a customer. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `quotation_id -> public.quotations(id)`, `product_id -> public.products(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_quotation_items_quotation_id (quotation_id)`, `idx_quotation_items_business_id (business_id)`
- **RLS Policies**: `quotation_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `quotation_items_write_quotes (ALL): USING (public.has_permission(business_id, 'pos.quotes.manage')) WITH CHECK (public.has_permission(business_id, 'pos.quotes.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.quotations(id)`, references `public.products(id)`, references `public.product_variants(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `quotation_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `product_name_snapshot` | `TEXT` | NO | `—` |
| `variant_label_snapshot` | `TEXT` | NO | `DEFAULT ''` |
| `unit_price` | `NUMERIC(14,2)` | NO | `—` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `line_discount_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 48. `public.customer_ledger`
- **Purpose**: Khata double-entry customer credit/payment/return ledger. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `customer_id -> public.customers(id)`, `recorded_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_customer_ledger_customer_date (customer_id, occurred_at DESC)`, `idx_customer_ledger_business_due (business_id, due_date) WHERE due_date IS NOT NULL`
- **RLS Policies**: `customer_ledger_select (SELECT): USING (public.is_business_member(business_id))`; `customer_ledger_all (ALL): USING (public.has_permission(business_id, 'khata.manage')) WITH CHECK (public.has_permission(business_id, 'khata.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.customers(id)`, references `public.business_members(id)`, referenced by `ledger_allocations.debit_ledger_id`, referenced by `ledger_allocations.credit_ledger_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | NO | `—` |
| `entry_type` | `TEXT` | NO | `—` |
| `reference_type` | `TEXT` | YES | `—` |
| `reference_id` | `UUID` | YES | `—` |
| `debit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `credit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `running_balance` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `due_date` | `DATE` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `recorded_by` | `UUID` | YES | `—` |
| `occurred_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 49. `public.customer_payments`
- **Purpose**: Payments received from Khata customers toward open balances. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `customer_id -> public.customers(id)`, `collected_by -> public.business_members(id)`, `shift_id -> public.cash_shifts(id)`
- **Unique Constraints**: `CONSTRAINT uq_customer_payments_business_no UNIQUE (business_id, payment_number)`
- **Indexes**: `idx_customer_payments_customer_date (customer_id, paid_at DESC)`, `idx_customer_payments_shift_id (shift_id) WHERE shift_id IS NOT NULL`
- **RLS Policies**: `customer_payments_select (SELECT): USING (public.is_business_member(business_id))`; `customer_payments_all (ALL): USING (public.has_permission(business_id, 'khata.manage')) WITH CHECK (public.has_permission(business_id, 'khata.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.customers(id)`, references `public.business_members(id)`, references `public.cash_shifts(id)`, referenced by `ledger_allocations.payment_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | NO | `—` |
| `shift_id` | `UUID` | YES | `—` |
| `payment_number` | `TEXT` | NO | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `reference_no` | `TEXT` | YES | `—` |
| `collected_by` | `UUID` | YES | `—` |
| `paid_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 50. `public.ledger_allocations`
- **Purpose**: Matches customer payments or returns against specific Khata debit bills. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `payment_id -> public.customer_payments(id)`, `debit_ledger_id -> public.customer_ledger(id)`, `credit_ledger_id -> public.customer_ledger(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_ledger_allocations_debit_id (debit_ledger_id)`, `idx_ledger_allocations_business_id (business_id)`
- **RLS Policies**: `ledger_allocations_select (SELECT): USING (public.is_business_member(business_id))`; `ledger_allocations_all (ALL): USING (public.has_permission(business_id, 'khata.manage')) WITH CHECK (public.has_permission(business_id, 'khata.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.customer_payments(id)`, references `public.customer_ledger(id)`, references `public.customer_ledger(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `payment_id` | `UUID` | YES | `—` |
| `debit_ledger_id` | `UUID` | NO | `—` |
| `credit_ledger_id` | `UUID` | NO | `—` |
| `allocated_amount` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 51. `public.customer_message_drafts`
- **Purpose**: Drafted and sent Khata reminders or order notifications per customer. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `customer_id -> public.customers(id)`, `order_id -> public.customer_orders(id)`, `created_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_customer_message_drafts_business_status (business_id, status)`
- **RLS Policies**: `customer_message_drafts_select (SELECT): USING (public.is_business_member(business_id))`; `customer_message_drafts_all (ALL): USING (public.has_permission(business_id, 'khata.manage')) WITH CHECK (public.has_permission(business_id, 'khata.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.customers(id)`, references `public.customer_orders(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `order_id` | `UUID` | YES | `—` |
| `channel` | `TEXT` | NO | `—` |
| `template_key` | `TEXT` | YES | `—` |
| `message_body` | `TEXT` | NO | `—` |
| `balance_at_send` | `NUMERIC(14,2)` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `created_by` | `UUID` | YES | `—` |
| `sent_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 52. `public.notification_drafts`
- **Purpose**: Internal operational alerts and scheduled reminder drafts. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `target_member_id -> public.business_members(id)`, `customer_id -> public.customers(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_notification_drafts_business_status (business_id, status)`
- **RLS Policies**: `notification_drafts_member (ALL): USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.business_members(id)`, references `public.customers(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | YES | `—` |
| `target_member_id` | `UUID` | YES | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `category` | `TEXT` | NO | `—` |
| `channel` | `TEXT` | NO | `DEFAULT 'in_app'` |
| `title` | `TEXT` | NO | `—` |
| `body` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `scheduled_for` | `TIMESTAMPTZ` | YES | `—` |
| `sent_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0005_suppliers_and_purchasing.sql`

### 53. `public.suppliers`
- **Purpose**: Wholesale vendors and manufacturers supplying stock to the business. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_suppliers_business_name (business_id, lower(name)) WHERE deleted_at IS NULL`
- **RLS Policies**: `suppliers_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `suppliers_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `supplier_ledger.supplier_id`, referenced by `purchase_orders.supplier_id`, referenced by `goods_receipts.supplier_id`, referenced by `supplier_bills.supplier_id`, referenced by `supplier_payments.supplier_id`, referenced by `supplier_credit_notes.supplier_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `contact_person` | `TEXT` | YES | `—` |
| `phone` | `TEXT` | YES | `—` |
| `email` | `TEXT` | YES | `—` |
| `city` | `TEXT` | YES | `—` |
| `address` | `TEXT` | YES | `—` |
| `makes_notes` | `TEXT` | YES | `—` |
| `opening_balance` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `current_balance` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `payment_terms_days` | `INTEGER` | NO | `DEFAULT 15` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 54. `public.supplier_ledger`
- **Purpose**: Accounts payable ledger tracking vendor bills, payments, and credits. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `supplier_id -> public.suppliers(id)`, `recorded_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_supplier_ledger_supplier_date (supplier_id, occurred_at DESC)`, `idx_supplier_ledger_business_id (business_id)`
- **RLS Policies**: `supplier_ledger_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_ledger_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.suppliers(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `supplier_id` | `UUID` | NO | `—` |
| `entry_type` | `TEXT` | NO | `—` |
| `reference_type` | `TEXT` | YES | `—` |
| `reference_id` | `UUID` | YES | `—` |
| `debit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `credit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `running_balance` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `notes` | `TEXT` | YES | `—` |
| `recorded_by` | `UUID` | YES | `—` |
| `occurred_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 55. `public.purchase_orders`
- **Purpose**: Purchase orders issued to suppliers with approval and receipt status. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `supplier_id -> public.suppliers(id)`, `created_by -> public.business_members(id)`, `approved_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_purchase_orders_business_no UNIQUE (business_id, po_number)`
- **Indexes**: `idx_purchase_orders_branch_status (branch_id, status, order_date DESC)`, `idx_purchase_orders_supplier_id (supplier_id)`
- **RLS Policies**: `purchase_orders_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `purchase_orders_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.suppliers(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `purchase_order_items.purchase_order_id`, referenced by `goods_receipts.purchase_order_id`, referenced by `supplier_bills.purchase_order_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `supplier_id` | `UUID` | NO | `—` |
| `po_number` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `order_date` | `DATE` | NO | `—` |
| `expected_date` | `DATE` | YES | `—` |
| `subtotal_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `total_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `is_billed` | `BOOLEAN` | NO | `DEFAULT false` |
| `created_by` | `UUID` | YES | `—` |
| `approved_by` | `UUID` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 56. `public.purchase_order_items`
- **Purpose**: Variant quantities and agreed unit costs on a purchase order. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `purchase_order_id -> public.purchase_orders(id)`, `product_id -> public.products(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_purchase_order_items_po_id (purchase_order_id)`, `idx_purchase_order_items_business_id (business_id)`
- **RLS Policies**: `purchase_order_items_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `purchase_order_items_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.purchase_orders(id)`, references `public.products(id)`, references `public.product_variants(id)`, referenced by `goods_receipt_items.purchase_order_item_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `purchase_order_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `product_name_snapshot` | `TEXT` | NO | `—` |
| `variant_label_snapshot` | `TEXT` | NO | `DEFAULT ''` |
| `quantity_ordered` | `NUMERIC(14,3)` | NO | `—` |
| `quantity_received` | `NUMERIC(14,3)` | NO | `DEFAULT 0` |
| `po_unit_cost` | `NUMERIC(14,4)` | NO | `—` |
| `actual_unit_cost` | `NUMERIC(14,4)` | YES | `—` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 57. `public.goods_receipts`
- **Purpose**: Goods Received Notes (GRN) recording physical deliveries into a branch. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `purchase_order_id -> public.purchase_orders(id)`, `supplier_id -> public.suppliers(id)`, `received_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_goods_receipts_business_no UNIQUE (business_id, grn_number)`
- **Indexes**: `idx_goods_receipts_po_id (purchase_order_id) WHERE purchase_order_id IS NOT NULL`, `idx_goods_receipts_branch_date (branch_id, received_at DESC)`
- **RLS Policies**: `goods_receipts_select_purch (SELECT): USING ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.receive')) )`; `goods_receipts_write_recv (ALL): USING ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage')) ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage')) )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.purchase_orders(id)`, references `public.suppliers(id)`, references `public.business_members(id)`, referenced by `serial_numbers.goods_receipt_id`, referenced by `goods_receipt_items.goods_receipt_id`, referenced by `supplier_bills.goods_receipt_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `purchase_order_id` | `UUID` | YES | `—` |
| `supplier_id` | `UUID` | NO | `—` |
| `grn_number` | `TEXT` | NO | `—` |
| `received_by` | `UUID` | YES | `—` |
| `received_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 58. `public.goods_receipt_items`
- **Purpose**: Variant quantities, actual landing cost, and batch numbers received. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `goods_receipt_id -> public.goods_receipts(id)`, `purchase_order_item_id -> public.purchase_order_items(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_goods_receipt_items_grn_id (goods_receipt_id)`, `idx_goods_receipt_items_business_id (business_id)`
- **RLS Policies**: `goods_receipt_items_select_purch (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.receive'))`; `goods_receipt_items_write_recv (ALL): USING (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.receive') OR public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.goods_receipts(id)`, references `public.purchase_order_items(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `goods_receipt_id` | `UUID` | NO | `—` |
| `purchase_order_item_id` | `UUID` | YES | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `quantity_received` | `NUMERIC(14,3)` | NO | `—` |
| `actual_unit_cost` | `NUMERIC(14,4)` | NO | `—` |
| `batch_number` | `TEXT` | YES | `—` |
| `expiry_date` | `DATE` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 59. `public.supplier_bills`
- **Purpose**: Vendor invoices (draft for owner review, or posted payable liability). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `supplier_id -> public.suppliers(id)`, `purchase_order_id -> public.purchase_orders(id)`, `goods_receipt_id -> public.goods_receipts(id)`, `created_by -> public.business_members(id)`, `posted_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_supplier_bills_supplier_ref UNIQUE (business_id, supplier_id, bill_ref)`
- **Indexes**: `idx_supplier_bills_business_status (business_id, status, due_date)`, `idx_supplier_bills_supplier_id (supplier_id)`, `idx_supplier_bills_open_due (business_id, due_date) WHERE status = 'posted'`
- **RLS Policies**: `supplier_bills_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_bills_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.suppliers(id)`, references `public.purchase_orders(id)`, references `public.goods_receipts(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `supplier_bill_items.supplier_bill_id`, referenced by `supplier_payment_allocations.supplier_bill_id`, referenced by `supplier_credit_notes.supplier_bill_id`, referenced by `supplier_credit_allocations.supplier_bill_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `supplier_id` | `UUID` | NO | `—` |
| `purchase_order_id` | `UUID` | YES | `—` |
| `goods_receipt_id` | `UUID` | YES | `—` |
| `bill_ref` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `invoice_date` | `DATE` | NO | `—` |
| `due_date` | `DATE` | NO | `—` |
| `total_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `paid_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `credited_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `created_by` | `UUID` | YES | `—` |
| `posted_by` | `UUID` | YES | `—` |
| `posted_at` | `TIMESTAMPTZ` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 60. `public.supplier_bill_items`
- **Purpose**: Line items billed on a supplier invoice. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `supplier_bill_id -> public.supplier_bills(id)`, `variant_id -> public.product_variants(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_supplier_bill_items_bill_id (supplier_bill_id)`, `idx_supplier_bill_items_business_id (business_id)`
- **RLS Policies**: `supplier_bill_items_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_bill_items_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.supplier_bills(id)`, references `public.product_variants(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `supplier_bill_id` | `UUID` | NO | `—` |
| `variant_id` | `UUID` | YES | `—` |
| `description` | `TEXT` | NO | `—` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `unit_cost` | `NUMERIC(14,4)` | NO | `—` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 61. `public.supplier_payments`
- **Purpose**: Payments disbursed to vendors via cash, bank, or mobile wallets. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `supplier_id -> public.suppliers(id)`, `paid_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_supplier_payments_business_no UNIQUE (business_id, payment_number)`
- **Indexes**: `idx_supplier_payments_supplier_date (supplier_id, paid_at DESC)`
- **RLS Policies**: `supplier_payments_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_payments_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.suppliers(id)`, references `public.business_members(id)`, referenced by `supplier_payment_allocations.payment_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `supplier_id` | `UUID` | NO | `—` |
| `payment_number` | `TEXT` | NO | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `reference_no` | `TEXT` | YES | `—` |
| `paid_by` | `UUID` | YES | `—` |
| `paid_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 62. `public.supplier_payment_allocations`
- **Purpose**: Allocates vendor payments across one or more posted supplier bills. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `payment_id -> public.supplier_payments(id)`, `supplier_bill_id -> public.supplier_bills(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_supplier_pay_alloc_bill_id (supplier_bill_id)`, `idx_supplier_pay_alloc_business_id (business_id)`
- **RLS Policies**: `supplier_payment_allocations_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_payment_allocations_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.supplier_payments(id)`, references `public.supplier_bills(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `payment_id` | `UUID` | NO | `—` |
| `supplier_bill_id` | `UUID` | NO | `—` |
| `allocated_amount` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 63. `public.supplier_credit_notes`
- **Purpose**: Vendor credit adjustments for damaged goods, short shipments, or rebates. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `supplier_id -> public.suppliers(id)`, `supplier_bill_id -> public.supplier_bills(id)`, `created_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_supplier_credit_notes_no UNIQUE (business_id, credit_note_number)`
- **Indexes**: `idx_supplier_credit_notes_supplier_id (supplier_id)`
- **RLS Policies**: `supplier_credit_notes_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_credit_notes_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.suppliers(id)`, references `public.supplier_bills(id)`, references `public.business_members(id)`, referenced by `supplier_credit_allocations.credit_note_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `supplier_id` | `UUID` | NO | `—` |
| `supplier_bill_id` | `UUID` | YES | `—` |
| `credit_note_number` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `reason` | `TEXT` | NO | `—` |
| `issued_date` | `DATE` | NO | `—` |
| `created_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 64. `public.supplier_credit_allocations`
- **Purpose**: Applies supplier credit notes against open supplier bills. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `credit_note_id -> public.supplier_credit_notes(id)`, `supplier_bill_id -> public.supplier_bills(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_supplier_credit_alloc_bill_id (supplier_bill_id)`, `idx_supplier_credit_alloc_business_id (business_id)`
- **RLS Policies**: `supplier_credit_allocations_select (SELECT): USING (public.has_permission(business_id, 'purchasing.view') OR public.has_permission(business_id, 'purchasing.manage'))`; `supplier_credit_allocations_all (ALL): USING (public.has_permission(business_id, 'purchasing.manage')) WITH CHECK (public.has_permission(business_id, 'purchasing.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.supplier_credit_notes(id)`, references `public.supplier_bills(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `credit_note_id` | `UUID` | NO | `—` |
| `supplier_bill_id` | `UUID` | NO | `—` |
| `allocated_amount` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0006_returns_and_exchanges.sql`

### 65. `public.sales_returns`
- **Purpose**: Return headers supporting both receipt-linked and manager-approved no-bill returns. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `original_sale_id -> public.sales(id)`, `customer_id -> public.customers(id)`, `processed_by -> public.business_members(id)`, `approved_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_sales_returns_business_no UNIQUE (business_id, return_number)`
- **Indexes**: `idx_sales_returns_original_sale (original_sale_id) WHERE original_sale_id IS NOT NULL`, `idx_sales_returns_branch_date (branch_id, returned_at DESC)`
- **RLS Policies**: `sales_returns_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `sales_returns_write_pos (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.returns.process') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.returns.process') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.sales(id)`, references `public.customers(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `sales_return_items.sales_return_id`, referenced by `refunds.sales_return_id`, referenced by `exchanges.sales_return_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `original_sale_id` | `UUID` | YES | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `return_number` | `TEXT` | NO | `—` |
| `return_type` | `TEXT` | NO | `DEFAULT 'with_bill'` |
| `status` | `TEXT` | NO | `DEFAULT 'completed'` |
| `total_return_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `reason` | `TEXT` | YES | `—` |
| `processed_by` | `UUID` | YES | `—` |
| `approved_by` | `UUID` | YES | `—` |
| `returned_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 66. `public.sales_return_items`
- **Purpose**: Individual variants returned, item condition, and restock flag. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `sales_return_id -> public.sales_returns(id)`, `original_sale_item_id -> public.sale_items(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_sales_return_items_return_id (sales_return_id)`, `idx_sales_return_items_business_id (business_id)`
- **RLS Policies**: `sales_return_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `sales_return_items_write_pos (ALL): USING (public.has_permission(business_id, 'pos.returns.process')) WITH CHECK (public.has_permission(business_id, 'pos.returns.process'))`
- **Relationships**: references `public.businesses(id)`, references `public.sales_returns(id)`, references `public.sale_items(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `sales_return_id` | `UUID` | NO | `—` |
| `original_sale_item_id` | `UUID` | YES | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `product_name_snapshot` | `TEXT` | NO | `—` |
| `variant_label_snapshot` | `TEXT` | NO | `DEFAULT ''` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `unit_price` | `NUMERIC(14,2)` | NO | `—` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `condition` | `TEXT` | NO | `DEFAULT 'resellable'` |
| `restocked` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 67. `public.refunds`
- **Purpose**: Refund liabilities created from sales returns or exchange net balances. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `sales_return_id -> public.sales_returns(id)`, `customer_id -> public.customers(id)`, `issued_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_refunds_business_no UNIQUE (business_id, refund_number)`
- **Indexes**: `idx_refunds_business_status (business_id, status)`, `idx_refunds_customer_id (customer_id) WHERE customer_id IS NOT NULL`
- **RLS Policies**: `refunds_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `refunds_write_pay (ALL): USING ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'pos.refunds.pay') OR public.has_permission(business_id, 'pos.returns.process')) ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'pos.refunds.pay') OR public.has_permission(business_id, 'pos.returns.process')) )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.sales_returns(id)`, references `public.customers(id)`, references `public.business_members(id)`, referenced by `refund_payments.refund_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `sales_return_id` | `UUID` | YES | `—` |
| `customer_id` | `UUID` | YES | `—` |
| `refund_number` | `TEXT` | NO | `—` |
| `total_amount` | `NUMERIC(14,2)` | NO | `—` |
| `paid_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `status` | `TEXT` | NO | `DEFAULT 'owed'` |
| `issued_by` | `UUID` | YES | `—` |
| `issued_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 68. `public.refund_payments`
- **Purpose**: Disbursement legs settling an owed refund (cash, wallet, bank, khata). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `refund_id -> public.refunds(id)`, `paid_by -> public.business_members(id)`, `shift_id -> public.cash_shifts(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_refund_payments_refund_id (refund_id)`, `idx_refund_payments_shift_id (shift_id) WHERE shift_id IS NOT NULL`
- **RLS Policies**: `refund_payments_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `refund_payments_write_pay (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.refunds.pay') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.refunds.pay') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.refunds(id)`, references `public.business_members(id)`, references `public.cash_shifts(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `refund_id` | `UUID` | NO | `—` |
| `shift_id` | `UUID` | YES | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `reference_no` | `TEXT` | YES | `—` |
| `paid_by` | `UUID` | YES | `—` |
| `paid_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 69. `public.exchanges`
- **Purpose**: Product swap linking a sales return to a replacement sale and net diff. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `sales_return_id -> public.sales_returns(id)`, `replacement_sale_id -> public.sales(id)`, `processed_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_exchanges_business_no UNIQUE (business_id, exchange_number)`
- **Indexes**: `idx_exchanges_branch_date (branch_id, exchanged_at DESC)`
- **RLS Policies**: `exchanges_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `exchanges_write_pos (ALL): USING ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.returns.process') ) WITH CHECK ( public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'pos.returns.process') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.sales_returns(id)`, references `public.sales(id)`, references `public.business_members(id)`, referenced by `exchange_items.exchange_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `sales_return_id` | `UUID` | NO | `—` |
| `replacement_sale_id` | `UUID` | YES | `—` |
| `exchange_number` | `TEXT` | NO | `—` |
| `return_credit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `replacement_total_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `net_difference_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `processed_by` | `UUID` | YES | `—` |
| `exchanged_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 70. `public.exchange_items`
- **Purpose**: Line-by-line record of returned vs replacement items in an exchange. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `exchange_id -> public.exchanges(id)`, `variant_id -> public.product_variants(id)`, `batch_id -> public.product_batches(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_exchange_items_exchange_id (exchange_id)`, `idx_exchange_items_business_id (business_id)`
- **RLS Policies**: `exchange_items_select_member (SELECT): USING (public.is_business_member(business_id))`; `exchange_items_write_pos (ALL): USING (public.has_permission(business_id, 'pos.returns.process')) WITH CHECK (public.has_permission(business_id, 'pos.returns.process'))`
- **Relationships**: references `public.businesses(id)`, references `public.exchanges(id)`, references `public.product_variants(id)`, references `public.product_batches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `exchange_id` | `UUID` | NO | `—` |
| `direction` | `TEXT` | NO | `—` |
| `variant_id` | `UUID` | NO | `—` |
| `batch_id` | `UUID` | YES | `—` |
| `quantity` | `NUMERIC(14,3)` | NO | `—` |
| `unit_price` | `NUMERIC(14,2)` | NO | `—` |
| `line_total` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0007_cash_expenses_and_payroll.sql`

### 71. `public.cash_drawers`
- **Purpose**: Physical register cash drawers operated within a branch. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_cash_drawers_branch_id (branch_id) WHERE deleted_at IS NULL`
- **RLS Policies**: `cash_drawers_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `cash_drawers_manage_settings (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`, referenced by `cash_shifts.cash_drawer_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | YES | `—` |
| `name` | `TEXT` | NO | `—` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 72. `public.cash_shifts`
- **Purpose**: Register opening float, active session, blind/counted close, & variance. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `cash_drawer_id -> public.cash_drawers(id)`, `opened_by -> public.business_members(id)`, `assigned_cashier_id -> public.business_members(id)`, `closed_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_cash_shifts_business_no UNIQUE (business_id, shift_number)`, `uq_cash_shifts_one_open_per_drawer: (cash_drawer_id) WHERE status = 'open'`
- **Indexes**: `uq_cash_shifts_one_open_per_drawer (cash_drawer_id) WHERE status = 'open'`, `idx_cash_shifts_branch_date (branch_id, business_date DESC)`
- **RLS Policies**: `cash_shifts_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.view'))`; `cash_shifts_insert_open (INSERT): WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.shift.open'))`; `cash_shifts_update_close (UPDATE): USING ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'cash.shift.close') OR public.has_permission(business_id, 'cash.shift.open')) ) WITH CHECK (public.has_branch_access(business_id, branch_id))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.cash_drawers(id)`, references `public.business_members(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `sales.shift_id`, referenced by `sale_payments.shift_id`, referenced by `customer_payments.shift_id`, referenced by `refund_payments.shift_id`, referenced by `cash_transactions.cash_shift_id`, referenced by `expense_payments.cash_shift_id`, referenced by `payroll_payments.cash_shift_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `cash_drawer_id` | `UUID` | NO | `—` |
| `shift_number` | `TEXT` | NO | `—` |
| `business_date` | `DATE` | NO | `—` |
| `opened_by` | `UUID` | YES | `—` |
| `assigned_cashier_id` | `UUID` | YES | `—` |
| `closed_by` | `UUID` | YES | `—` |
| `opening_float` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `expected_cash` | `NUMERIC(14,2)` | YES | `—` |
| `counted_cash` | `NUMERIC(14,2)` | YES | `—` |
| `variance_amount` | `NUMERIC(14,2)` | YES | `—` |
| `variance_reason` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'open'` |
| `opened_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `closed_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 73. `public.cash_transactions`
- **Purpose**: Drawer inflows/outflows with owner draft review & cancellation workflow. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `cash_shift_id -> public.cash_shifts(id)`, `created_by -> public.business_members(id)`, `reviewed_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_cash_transactions_shift_id (cash_shift_id, occurred_at DESC)`, `idx_cash_transactions_branch_status (branch_id, status, occurred_at DESC)`
- **RLS Policies**: `cash_transactions_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.view'))`; `cash_transactions_insert_draft (INSERT): WITH CHECK ( public.has_branch_access(business_id, branch_id) AND (public.has_permission(business_id, 'cash.entry.draft') OR public.has_permission(business_id, 'cash.entry.review')) )`; `cash_transactions_update_review (UPDATE): USING (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.entry.review')) WITH CHECK (public.has_branch_access(business_id, branch_id) AND public.has_permission(business_id, 'cash.entry.review'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.cash_shifts(id)`, references `public.business_members(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `cash_shift_id` | `UUID` | YES | `—` |
| `direction` | `TEXT` | NO | `—` |
| `category` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `reference_type` | `TEXT` | YES | `—` |
| `reference_id` | `UUID` | YES | `—` |
| `reference_label` | `TEXT` | YES | `—` |
| `source_label` | `TEXT` | YES | `—` |
| `reason` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'reviewed'` |
| `evidence_note` | `TEXT` | YES | `—` |
| `review_note` | `TEXT` | YES | `—` |
| `cancel_reason` | `TEXT` | YES | `—` |
| `created_by` | `UUID` | YES | `—` |
| `reviewed_by` | `UUID` | YES | `—` |
| `reviewed_at` | `TIMESTAMPTZ` | YES | `—` |
| `occurred_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 74. `public.expense_categories`
- **Purpose**: Shop overhead classifications (rent, electricity, internet, etc.). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `uq_expense_categories_business_code: (business_id, lower(code))`
- **Indexes**: `uq_expense_categories_business_code (business_id, lower(code))`
- **RLS Policies**: `expense_categories_select (SELECT): USING (public.has_permission(business_id, 'expenses.manage') OR public.has_permission(business_id, 'reports.view'))`; `expense_categories_all (ALL): USING (public.has_permission(business_id, 'expenses.manage')) WITH CHECK (public.has_permission(business_id, 'expenses.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `recurring_expenses.expense_category_id`, referenced by `expenses.expense_category_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `code` | `TEXT` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `is_system` | `BOOLEAN` | NO | `DEFAULT false` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 75. `public.recurring_expenses`
- **Purpose**: Monthly recurring overhead templates (e.g., shop rent, utility bills). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `expense_category_id -> public.expense_categories(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_recurring_expenses_branch_active (branch_id) WHERE is_active = true`
- **RLS Policies**: `recurring_expenses_select (SELECT): USING (public.has_permission(business_id, 'expenses.manage') OR public.has_permission(business_id, 'reports.view'))`; `recurring_expenses_all (ALL): USING (public.has_permission(business_id, 'expenses.manage')) WITH CHECK (public.has_permission(business_id, 'expenses.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.expense_categories(id)`, referenced by `expenses.recurring_expense_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `expense_category_id` | `UUID` | NO | `—` |
| `title` | `TEXT` | NO | `—` |
| `payee_name` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `due_day` | `INTEGER` | NO | `DEFAULT 1` |
| `start_month` | `TEXT` | NO | `—` |
| `generated_months` | `JSONB` | NO | `DEFAULT '[]'::jsonb` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 76. `public.expenses`
- **Purpose**: Individual shop expense bills (draft for owner review, or posted). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `expense_category_id -> public.expense_categories(id)`, `recurring_expense_id -> public.recurring_expenses(id)`, `created_by -> public.business_members(id)`, `posted_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_expenses_business_no UNIQUE (business_id, expense_number)`
- **Indexes**: `idx_expenses_business_status (business_id, status, due_date)`, `idx_expenses_branch_id (branch_id)`, `idx_expenses_open_due (business_id, due_date) WHERE status IN ('draft', 'posted')`
- **RLS Policies**: `expenses_select (SELECT): USING (public.has_permission(business_id, 'expenses.manage') OR public.has_permission(business_id, 'reports.view'))`; `expenses_all (ALL): USING (public.has_permission(business_id, 'expenses.manage')) WITH CHECK (public.has_permission(business_id, 'expenses.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.expense_categories(id)`, references `public.recurring_expenses(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `expense_payments.expense_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `expense_category_id` | `UUID` | NO | `—` |
| `recurring_expense_id` | `UUID` | YES | `—` |
| `expense_number` | `TEXT` | NO | `—` |
| `title` | `TEXT` | NO | `—` |
| `payee_name` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `service_charge` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `due_date` | `DATE` | NO | `—` |
| `bill_ref` | `TEXT` | YES | `—` |
| `period_label` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `paid_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `created_by` | `UUID` | YES | `—` |
| `posted_by` | `UUID` | YES | `—` |
| `posted_at` | `TIMESTAMPTZ` | YES | `—` |
| `notes` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 77. `public.expense_payments`
- **Purpose**: Payments made toward posted expense bills. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `expense_id -> public.expenses(id)`, `cash_shift_id -> public.cash_shifts(id)`, `paid_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_expense_payments_expense_id (expense_id)`, `idx_expense_payments_business_id (business_id)`
- **RLS Policies**: `expense_payments_select (SELECT): USING (public.has_permission(business_id, 'expenses.manage') OR public.has_permission(business_id, 'reports.view'))`; `expense_payments_all (ALL): USING (public.has_permission(business_id, 'expenses.manage')) WITH CHECK (public.has_permission(business_id, 'expenses.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.expenses(id)`, references `public.cash_shifts(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `expense_id` | `UUID` | NO | `—` |
| `cash_shift_id` | `UUID` | YES | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `reference_no` | `TEXT` | YES | `—` |
| `paid_by` | `UUID` | YES | `—` |
| `paid_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 78. `public.employee_records`
- **Purpose**: HR and payroll records optionally linked to a counter login member. Credentials never live in this table. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `member_id -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_employee_records_code UNIQUE (business_id, employee_code)`
- **Indexes**: `idx_employee_records_branch_active (branch_id) WHERE deleted_at IS NULL`
- **RLS Policies**: `employee_records_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `employee_records_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.business_members(id)`, referenced by `attendance.employee_id`, referenced by `staff_advances.employee_id`, referenced by `payroll_items.employee_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `member_id` | `UUID` | YES | `—` |
| `employee_code` | `TEXT` | NO | `—` |
| `full_name` | `TEXT` | NO | `—` |
| `job_title` | `TEXT` | NO | `—` |
| `phone` | `TEXT` | YES | `—` |
| `base_salary` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `hired_date` | `DATE` | YES | `—` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `deleted_at` | `TIMESTAMPTZ` | YES | `—` |

### 79. `public.attendance`
- **Purpose**: Daily attendance tracking for payroll calculation. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `employee_id -> public.employee_records(id)`, `recorded_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date)`
- **Indexes**: `idx_attendance_branch_date (branch_id, attendance_date DESC)`
- **RLS Policies**: `attendance_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `attendance_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.employee_records(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `employee_id` | `UUID` | NO | `—` |
| `attendance_date` | `DATE` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'present'` |
| `check_in_at` | `TIMESTAMPTZ` | YES | `—` |
| `check_out_at` | `TIMESTAMPTZ` | YES | `—` |
| `overtime_hours` | `NUMERIC(6,2)` | NO | `DEFAULT 0` |
| `notes` | `TEXT` | YES | `—` |
| `recorded_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 80. `public.staff_advances`
- **Purpose**: Salary advances issued to staff with recovery balance tracking. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `employee_id -> public.employee_records(id)`, `issued_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_staff_advances_employee_status (employee_id, status)`
- **RLS Policies**: `staff_advances_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `staff_advances_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.employee_records(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `employee_id` | `UUID` | NO | `—` |
| `advance_date` | `DATE` | NO | `—` |
| `amount` | `NUMERIC(14,2)` | NO | `—` |
| `recovered_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `status` | `TEXT` | NO | `DEFAULT 'open'` |
| `notes` | `TEXT` | YES | `—` |
| `issued_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 81. `public.payroll`
- **Purpose**: Monthly payroll run header (draft for owner review, or posted). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `created_by -> public.business_members(id)`, `posted_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_payroll_branch_period UNIQUE (business_id, branch_id, period_key)`
- **Indexes**: `idx_payroll_business_status (business_id, status)`
- **RLS Policies**: `payroll_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `payroll_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.business_members(id)`, references `public.business_members(id)`, referenced by `payroll_items.payroll_id`, referenced by `payroll_payments.payroll_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `period_key` | `TEXT` | NO | `—` |
| `working_days` | `INTEGER` | NO | `DEFAULT 30` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `total_gross` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `total_net` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `created_by` | `UUID` | YES | `—` |
| `posted_by` | `UUID` | YES | `—` |
| `posted_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 82. `public.payroll_items`
- **Purpose**: Employee-level earnings, deductions, advance recovery, and net pay. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `payroll_id -> public.payroll(id)`, `employee_id -> public.employee_records(id)`
- **Unique Constraints**: `CONSTRAINT uq_payroll_items_emp UNIQUE (payroll_id, employee_id)`
- **Indexes**: `idx_payroll_items_business_id (business_id)`
- **RLS Policies**: `payroll_items_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `payroll_items_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.payroll(id)`, references `public.employee_records(id)`, referenced by `payroll_payment_allocations.payroll_item_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `payroll_id` | `UUID` | NO | `—` |
| `employee_id` | `UUID` | NO | `—` |
| `paid_days` | `NUMERIC(5,2)` | NO | `DEFAULT 30` |
| `base_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `allowance_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `bonus_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `overtime_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `reduction_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `advance_recovery_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `net_payable` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `paid_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 83. `public.payroll_payments`
- **Purpose**: Salary payout batches linked to cash drawer or bank transfers. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `payroll_id -> public.payroll(id)`, `cash_shift_id -> public.cash_shifts(id)`, `paid_by -> public.business_members(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_payroll_payments_payroll_id (payroll_id)`
- **RLS Policies**: `payroll_payments_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `payroll_payments_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.payroll(id)`, references `public.cash_shifts(id)`, references `public.business_members(id)`, referenced by `payroll_payment_allocations.payroll_payment_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `payroll_id` | `UUID` | NO | `—` |
| `cash_shift_id` | `UUID` | YES | `—` |
| `method_code` | `TEXT` | NO | `—` |
| `total_amount` | `NUMERIC(14,2)` | NO | `—` |
| `reference_no` | `TEXT` | YES | `—` |
| `paid_by` | `UUID` | YES | `—` |
| `paid_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 84. `public.payroll_payment_allocations`
- **Purpose**: Maps salary payouts to individual employee payroll lines. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `payroll_payment_id -> public.payroll_payments(id)`, `payroll_item_id -> public.payroll_items(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_payroll_pay_alloc_item_id (payroll_item_id)`, `idx_payroll_pay_alloc_business_id (business_id)`
- **RLS Policies**: `payroll_payment_allocations_select (SELECT): USING (public.has_permission(business_id, 'staff.manage') OR public.has_permission(business_id, 'reports.view'))`; `payroll_payment_allocations_all (ALL): USING (public.has_permission(business_id, 'staff.manage')) WITH CHECK (public.has_permission(business_id, 'staff.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.payroll_payments(id)`, references `public.payroll_items(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `payroll_payment_id` | `UUID` | NO | `—` |
| `payroll_item_id` | `UUID` | NO | `—` |
| `allocated_amount` | `NUMERIC(14,2)` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0008_accounting_reporting_and_settings.sql`

### 85. `public.accounts`
- **Purpose**: Chart of accounts per business for financial & tax reporting. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `parent_account_id -> public.accounts(id)`
- **Unique Constraints**: `CONSTRAINT uq_accounts_business_code UNIQUE (business_id, code)`
- **Indexes**: `idx_accounts_business_type (business_id, account_type)`
- **RLS Policies**: `accounts_select (SELECT): USING (public.has_permission(business_id, 'reports.view'))`; `accounts_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.accounts(id)`, referenced by `journal_lines.account_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `code` | `TEXT` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `account_type` | `TEXT` | NO | `—` |
| `parent_account_id` | `UUID` | YES | `—` |
| `is_system` | `BOOLEAN` | NO | `DEFAULT false` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 86. `public.journal_entries`
- **Purpose**: Double-entry accounting journal headers linked to operational documents. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `posted_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_journal_entries_business_no UNIQUE (business_id, entry_number)`
- **Indexes**: `idx_journal_entries_business_date (business_id, entry_date DESC)`, `idx_journal_entries_ref (business_id, reference_type, reference_id)`
- **RLS Policies**: `journal_entries_select (SELECT): USING (public.has_permission(business_id, 'reports.view'))`; `journal_entries_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.business_members(id)`, referenced by `journal_lines.journal_entry_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | YES | `—` |
| `entry_number` | `TEXT` | NO | `—` |
| `entry_date` | `DATE` | NO | `—` |
| `reference_type` | `TEXT` | YES | `—` |
| `reference_id` | `UUID` | YES | `—` |
| `description` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'draft'` |
| `posted_by` | `UUID` | YES | `—` |
| `posted_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 87. `public.journal_lines`
- **Purpose**: Individual debit or credit lines within a journal entry. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `journal_entry_id -> public.journal_entries(id)`, `account_id -> public.accounts(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_journal_lines_entry_id (journal_entry_id)`, `idx_journal_lines_account_id (account_id)`
- **RLS Policies**: `journal_lines_select (SELECT): USING (public.has_permission(business_id, 'reports.view'))`; `journal_lines_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.journal_entries(id)`, references `public.accounts(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `journal_entry_id` | `UUID` | NO | `—` |
| `account_id` | `UUID` | NO | `—` |
| `debit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `credit_amount` | `NUMERIC(14,2)` | NO | `DEFAULT 0` |
| `memo` | `TEXT` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 88. `public.tax_rates`
- **Purpose**: GST / Sales Tax / VAT definitions configured by the business. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `CONSTRAINT uq_tax_rates_business_code UNIQUE (business_id, code)`
- **Indexes**: `idx_tax_rates_business_active (business_id) WHERE is_active = true`
- **RLS Policies**: `tax_rates_select (SELECT): USING (public.is_business_member(business_id))`; `tax_rates_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, referenced by `product_tax_rates.tax_rate_id`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `name` | `TEXT` | NO | `—` |
| `code` | `TEXT` | NO | `—` |
| `rate_percent` | `NUMERIC(6,3)` | NO | `DEFAULT 0` |
| `is_inclusive` | `BOOLEAN` | NO | `DEFAULT true` |
| `is_default` | `BOOLEAN` | NO | `DEFAULT false` |
| `is_active` | `BOOLEAN` | NO | `DEFAULT true` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 89. `public.product_tax_rates`
- **Purpose**: Assigns tax rates to specific products. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `product_id -> public.products(id)`, `tax_rate_id -> public.tax_rates(id)`
- **Unique Constraints**: `CONSTRAINT uq_product_tax_rate_pair UNIQUE (product_id, tax_rate_id)`
- **Indexes**: `idx_product_tax_rates_business_id (business_id)`
- **RLS Policies**: `product_tax_rates_select (SELECT): USING (public.is_business_member(business_id))`; `product_tax_rates_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.products(id)`, references `public.tax_rates(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `product_id` | `UUID` | NO | `—` |
| `tax_rate_id` | `UUID` | NO | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 90. `public.integrations`
- **Purpose**: External integrations (FBR POS, WhatsApp, JazzCash, Easypaisa, Raast). 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`
- **Unique Constraints**: `uq_integrations_business_branch_provider: (business_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), provider)`
- **Indexes**: `uq_integrations_business_branch_provider (business_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), provider)`
- **RLS Policies**: `integrations_select (SELECT): USING (public.is_business_member(business_id))`; `integrations_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | YES | `—` |
| `provider` | `TEXT` | NO | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'not_configured'` |
| `config` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `last_synced_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 91. `public.fbr_submissions`
- **Purpose**: Fiscal invoice queue and submission log for FBR Pakistan POS compliance. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `sale_id -> public.sales(id)`
- **Unique Constraints**: `CONSTRAINT uq_fbr_submissions_sale UNIQUE (sale_id)`
- **Indexes**: `idx_fbr_submissions_branch_status (branch_id, status)`
- **RLS Policies**: `fbr_submissions_select_branch (SELECT): USING (public.has_branch_access(business_id, branch_id))`; `fbr_submissions_write_pos_or_settings (ALL): USING ( public.has_permission(business_id, 'pos.sell') OR public.has_permission(business_id, 'settings.manage') ) WITH CHECK ( public.has_permission(business_id, 'pos.sell') OR public.has_permission(business_id, 'settings.manage') )`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.sales(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `sale_id` | `UUID` | NO | `—` |
| `pos_id` | `TEXT` | NO | `—` |
| `usin` | `TEXT` | NO | `—` |
| `fbr_invoice_no` | `TEXT` | YES | `—` |
| `status` | `TEXT` | NO | `DEFAULT 'queued'` |
| `request_payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `response_payload` | `JSONB` | YES | `—` |
| `error_message` | `TEXT` | YES | `—` |
| `attempts` | `INTEGER` | NO | `DEFAULT 0` |
| `submitted_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 92. `public.business_settings`
- **Purpose**: Tenant-wide operational policies, discount caps, language & FBR profile. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`
- **Unique Constraints**: `CONSTRAINT uq_business_settings_business UNIQUE (business_id)`
- **Indexes**: Primary key index only
- **RLS Policies**: `business_settings_select (SELECT): USING (public.is_business_member(business_id))`; `business_settings_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `default_language` | `TEXT` | NO | `DEFAULT 'en'` |
| `cashier_max_discount_pct` | `NUMERIC(5,2)` | NO | `DEFAULT 10` |
| `require_manager_for_no_bill_ret` | `BOOLEAN` | NO | `DEFAULT true` |
| `receipt_header_note` | `TEXT` | YES | `—` |
| `receipt_footer_note` | `TEXT` | YES | `—` |
| `fbr_mode` | `TEXT` | NO | `DEFAULT 'not_required'` |
| `fbr_ntn` | `TEXT` | YES | `—` |
| `fbr_strn` | `TEXT` | YES | `—` |
| `settings_payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 93. `public.branch_settings`
- **Purpose**: Branch-level POS ID, pricing tax mode, and stock policy overrides. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`
- **Unique Constraints**: `CONSTRAINT uq_branch_settings_branch UNIQUE (branch_id)`
- **Indexes**: `idx_branch_settings_business_id (business_id)`
- **RLS Policies**: `branch_settings_select (SELECT): USING (public.is_business_member(business_id))`; `branch_settings_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `fbr_pos_id` | `TEXT` | YES | `—` |
| `tax_inclusive_pricing` | `BOOLEAN` | NO | `DEFAULT true` |
| `allow_negative_stock` | `BOOLEAN` | NO | `DEFAULT false` |
| `settings_payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 94. `public.device_settings`
- **Purpose**: Per-terminal printing, offline queue, and cash drawer behavior. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `device_id -> public.pos_devices(id)`
- **Unique Constraints**: `CONSTRAINT uq_device_settings_device UNIQUE (device_id)`
- **Indexes**: `idx_device_settings_business_id (business_id)`
- **RLS Policies**: `device_settings_select (SELECT): USING (public.is_business_member(business_id))`; `device_settings_all (ALL): USING (public.has_permission(business_id, 'settings.manage')) WITH CHECK (public.has_permission(business_id, 'settings.manage'))`
- **Relationships**: references `public.businesses(id)`, references `public.pos_devices(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | NO | `—` |
| `offline_mode_enabled` | `BOOLEAN` | NO | `DEFAULT true` |
| `auto_print_receipt` | `BOOLEAN` | NO | `DEFAULT true` |
| `paper_width` | `TEXT` | NO | `DEFAULT '80mm'` |
| `settings_payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 95. `public.files_attachments`
- **Purpose**: Metadata index for receipts, bills, avatars, and evidence in Storage. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `uploaded_by -> public.business_members(id)`
- **Unique Constraints**: `CONSTRAINT uq_files_attachments_path UNIQUE (bucket_id, storage_path)`
- **Indexes**: `idx_files_attachments_entity (business_id, entity_type, entity_id)`
- **RLS Policies**: `files_attachments_member (ALL): USING (public.is_business_member(business_id)) WITH CHECK (public.is_business_member(business_id))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.business_members(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | YES | `—` |
| `bucket_id` | `TEXT` | NO | `DEFAULT 'zyro-attachments'` |
| `storage_path` | `TEXT` | NO | `—` |
| `entity_type` | `TEXT` | NO | `—` |
| `entity_id` | `UUID` | NO | `—` |
| `file_name` | `TEXT` | NO | `—` |
| `mime_type` | `TEXT` | YES | `—` |
| `file_size_bytes` | `BIGINT` | YES | `—` |
| `uploaded_by` | `UUID` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Migration `0009_audit_sync_and_transactions.sql`

### 96. `public.audit_logs`
- **Purpose**: Append-only audit trail for financial, stock, and security events. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `actor_user_id -> auth.users(id)`, `actor_member_id -> public.business_members(id)`, `device_id -> public.pos_devices(id)`
- **Unique Constraints**: None
- **Indexes**: `idx_audit_logs_business_date (business_id, created_at DESC)`, `idx_audit_logs_entity (business_id, entity_type, entity_id)`
- **RLS Policies**: `audit_logs_select_auditor (SELECT): USING (public.has_permission(business_id, 'audit.view'))`; `audit_logs_insert_member (INSERT): WITH CHECK (public.is_business_member(business_id))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `auth.users(id)`, references `public.business_members(id)`, references `public.pos_devices(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | YES | `—` |
| `actor_user_id` | `UUID` | YES | `—` |
| `actor_member_id` | `UUID` | YES | `—` |
| `device_id` | `UUID` | YES | `—` |
| `action` | `TEXT` | NO | `—` |
| `entity_type` | `TEXT` | NO | `—` |
| `entity_id` | `UUID` | YES | `—` |
| `before_data` | `JSONB` | YES | `—` |
| `after_data` | `JSONB` | YES | `—` |
| `ip_address` | `INET` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

### 97. `public.sync_operations`
- **Purpose**: Offline counter operation queue with strict per-device idempotency. 
- **Primary Key**: `id`
- **Foreign Keys**: `business_id -> public.businesses(id)`, `branch_id -> public.branches(id)`, `device_id -> public.pos_devices(id)`
- **Unique Constraints**: `CONSTRAINT uq_sync_operations_idempotency UNIQUE (business_id, device_id, idempotency_key)`
- **Indexes**: `idx_sync_operations_branch_status (branch_id, status, created_at)`
- **RLS Policies**: `sync_operations_branch (ALL): USING (public.has_branch_access(business_id, branch_id)) WITH CHECK (public.has_branch_access(business_id, branch_id))`
- **Relationships**: references `public.businesses(id)`, references `public.branches(id)`, references `public.pos_devices(id)`

| Column | Type | Nullable | Default / Generated |
| --- | --- | --- | --- |
| `id` | `UUID` | NO | `DEFAULT gen_random_uuid()` |
| `business_id` | `UUID` | NO | `—` |
| `branch_id` | `UUID` | NO | `—` |
| `device_id` | `UUID` | NO | `—` |
| `idempotency_key` | `TEXT` | NO | `—` |
| `operation_type` | `TEXT` | NO | `—` |
| `payload` | `JSONB` | NO | `DEFAULT '{}'::jsonb` |
| `status` | `TEXT` | NO | `DEFAULT 'pending'` |
| `error_message` | `TEXT` | YES | `—` |
| `resolved_entity_id` | `UUID` | YES | `—` |
| `client_created_at` | `TIMESTAMPTZ` | NO | `—` |
| `processed_at` | `TIMESTAMPTZ` | YES | `—` |
| `created_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |
| `updated_at` | `TIMESTAMPTZ` | NO | `DEFAULT now()` |

## Reporting Views (`security_invoker = true`)
- `public.v_daily_branch_sales`: Daily gross sales, discounts, tax, net sales, collections, Khata credit, and refunds per branch.
- `public.v_customer_khata_balances`: Active customers with current Khata balance, refund owed, credit limit, and last activity.
- `public.v_supplier_payables`: Posted vendor bills, open payable balance, and overdue balance per supplier.
- `public.v_stock_valuation`: Real-time branch stock on hand, reserved, available quantity, weighted moving average cost, and retail value.

## Atomic PostgreSQL Transaction RPC Functions
- `public.create_business_workspace(p_payload JSONB)`: Atomic shop onboarding (profile, business, system RBAC roles, main branch, owner membership, default cash drawer, payment methods, expense categories, receipt template, and settings).
- `public.complete_sale(p_payload JSONB)`: Idempotent POS sale completion (stock deduction, batch/serial consumption, historical item/price snapshot, payment sufficiency & Khata credit-limit validation, split payments, Khata debit, cash drawer inflow, receipt & print job).
- `public.receive_purchase_order(p_payload JSONB)`: GRN creation, weighted moving average stock cost update, batch creation, PO status update, optional draft vendor bill.
- `public.process_sales_return(p_payload JSONB)`: Return quantity validation, resellable restocking, refund liability creation.
- `public.issue_refund(p_payload JSONB)`: Settles refund liability via drawer cash, wallet, or Khata credit.
- `public.collect_khata_payment(p_payload JSONB)`: Customer payment receipt, running balance update, ledger allocation, cash drawer inflow.
- `public.close_cash_shift(p_payload JSONB)`: Expected cash reconciliation, variance calculation, and shift closure.
- `public.transfer_stock(p_payload JSONB)`: Atomic inter-branch stock deduction & credit with dual stock movements.
