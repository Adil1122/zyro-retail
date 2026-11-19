-- ============================================================================
-- Migration: 0001_core_business_and_auth.sql
-- Phase 1: Core Business, Authentication Profiles, RBAC, Branches & POS Devices
-- Notes:
--   - Relies on Supabase auth.users for credentials (never stores passwords).
--   - Row Level Security policies are centralized and enforced in Phase 10
--     (0010_rls_policies_and_indexes.sql) once all tenant tables exist.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Shared Trigger Function: automatically refresh updated_at on row updates
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. businesses
--    Root multi-tenant organization / retail shop account.
-- ----------------------------------------------------------------------------
CREATE TABLE public.businesses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  legal_name     TEXT,
  phone          TEXT NOT NULL CHECK (char_length(trim(phone)) > 0),
  email          TEXT,
  currency       TEXT NOT NULL DEFAULT 'PKR',
  timezone       TEXT NOT NULL DEFAULT 'Asia/Karachi',
  shop_kit       TEXT NOT NULL DEFAULT 'clothing'
                   CHECK (shop_kit IN ('clothing','shoes','jewellery','pharmacy','grocery','cosmetics','mobile','other')),
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','archived')),
  owner_user_id  UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_businesses_owner_user_id ON public.businesses(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_businesses_status ON public.businesses(status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. user_profiles
--    Public/app profile synced 1-to-1 with Supabase auth.users.
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL CHECK (char_length(trim(full_name)) > 0),
  short_name  TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  avatar_bg   TEXT NOT NULL DEFAULT '#08343A',
  avatar_fg   TEXT NOT NULL DEFAULT '#FFFFFF',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_profiles_phone
  ON public.user_profiles(phone)
  WHERE phone IS NOT NULL;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. permissions
--    Global catalog of atomic capability keys used by RBAC roles.
-- ----------------------------------------------------------------------------
CREATE TABLE public.permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key  TEXT NOT NULL UNIQUE,
  module          TEXT NOT NULL,
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.permissions (permission_key, module, description) VALUES
  ('dashboard.owner.view',      'dashboard',   'View owner overview, payables, and pending approvals'),
  ('dashboard.cashier.view',    'dashboard',   'View cashier shift home and print queue'),
  ('dashboard.inventory.view',  'dashboard',   'View stockkeeper home, deliveries, and sold-out watch'),
  ('pos.sell',                  'pos',         'Operate POS register, create sales, and collect payments'),
  ('pos.discount.apply',        'pos',         'Apply bill and line discounts within role cap'),
  ('pos.discount.approve',      'pos',         'Approve discounts exceeding cashier limit'),
  ('pos.bills.view',            'pos',         'View Bill Book and reprint receipts'),
  ('pos.returns.process',       'pos',         'Process customer returns and exchanges'),
  ('pos.refunds.pay',           'pos',         'Issue cash or Khata refunds to customers'),
  ('pos.quotes.manage',         'pos',         'Create and manage customer quotations'),
  ('khata.view',                'khata',       'View customer credit ledger and balances'),
  ('khata.manage',              'khata',       'Create customers, collect payments, and send reminders'),
  ('inventory.view',            'inventory',   'View catalog items, variants, and shelf stock'),
  ('inventory.manage',          'inventory',   'Create/edit products, adjust stock, and run counts'),
  ('inventory.categories',      'inventory',   'Manage categories and variant schemas'),
  ('orders.view',               'orders',      'View online/manual orders and packing progress'),
  ('orders.manage',             'orders',      'Confirm orders, create shipments, and settle COD'),
  ('purchasing.view',           'purchasing',  'View purchase orders and suppliers'),
  ('purchasing.receive',        'purchasing',  'Receive goods against approved purchase orders'),
  ('purchasing.manage',         'purchasing',  'Approve POs, manage suppliers, and post/pay vendor bills'),
  ('cash.view',                 'cash',        'View cash drawers, shifts, and cash ledger'),
  ('cash.shift.open',           'cash',        'Open a register cash shift'),
  ('cash.shift.close',          'cash',        'Count and close cash shifts'),
  ('cash.entry.draft',          'cash',        'Draft manual cash in/out entries'),
  ('cash.entry.review',         'cash',        'Approve or cancel cash draft entries'),
  ('expenses.manage',           'expenses',    'Create, post, and pay shop expense bills'),
  ('staff.manage',              'staff',       'Manage employees, attendance, advances, and payroll'),
  ('reports.view',              'reports',     'View financial, tax, and operational reports'),
  ('settings.manage',           'settings',    'Configure shop, branches, FBR, printers, and offline policy'),
  ('audit.view',                'audit',       'View system audit logs')
ON CONFLICT (permission_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. roles
--    Business-scoped role definitions (seeded system roles + custom roles).
-- ----------------------------------------------------------------------------
CREATE TABLE public.roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  display_name    TEXT NOT NULL CHECK (char_length(trim(display_name)) > 0),
  is_system_role  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_roles_business_name UNIQUE (business_id, name)
);

CREATE INDEX idx_roles_business_id ON public.roles(business_id);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. role_permissions
--    Maps each business role to one or more capability keys.
-- ----------------------------------------------------------------------------
CREATE TABLE public.role_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role_id        UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_permissions_pair UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_business_id ON public.role_permissions(business_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);

-- ----------------------------------------------------------------------------
-- 6. branches
--    Physical store locations operated by a business.
-- ----------------------------------------------------------------------------
CREATE TABLE public.branches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  code         TEXT,
  city         TEXT,
  address      TEXT,
  phone        TEXT,
  is_main      BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_branches_business_id ON public.branches(business_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_branches_single_main
  ON public.branches(business_id)
  WHERE is_main = true AND deleted_at IS NULL;

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. business_members
--    Links users (or pending phone invitations) to a business & assigned role.
-- ----------------------------------------------------------------------------
CREATE TABLE public.business_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  invited_name   TEXT,
  invited_phone  TEXT,
  role_id        UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('invited','active','suspended','removed')),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT chk_member_identity CHECK (user_id IS NOT NULL OR invited_phone IS NOT NULL)
);

CREATE UNIQUE INDEX uq_business_members_user
  ON public.business_members(business_id, user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_business_members_invite_phone
  ON public.business_members(business_id, invited_phone)
  WHERE invited_phone IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_business_members_user_id ON public.business_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_business_members_business_status ON public.business_members(business_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. member_branch_access
--    Grants a business_member access to specific branches.
-- ----------------------------------------------------------------------------
CREATE TABLE public.member_branch_access (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES public.business_members(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_member_branch_pair UNIQUE (member_id, branch_id)
);

CREATE INDEX idx_member_branch_access_business_id ON public.member_branch_access(business_id);
CREATE INDEX idx_member_branch_access_branch_id ON public.member_branch_access(branch_id);

-- ----------------------------------------------------------------------------
-- 9. pos_devices
--    Registered counters / terminals belonging to a branch.
-- ----------------------------------------------------------------------------
CREATE TABLE public.pos_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_name   TEXT NOT NULL CHECK (char_length(trim(device_name)) > 0),
  device_type   TEXT NOT NULL DEFAULT 'counter_web'
                  CHECK (device_type IN ('counter_web','tablet','phone','backoffice')),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','retired')),
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_pos_devices_business_branch ON public.pos_devices(business_id, branch_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_pos_devices_updated_at
  BEFORE UPDATE ON public.pos_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. device_sessions
--     Tracks active and historical staff counter sign-in sessions per device.
-- ----------------------------------------------------------------------------
CREATE TABLE public.device_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  device_id    UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES public.business_members(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_sessions_device_active ON public.device_sessions(device_id) WHERE ended_at IS NULL;
CREATE INDEX idx_device_sessions_member_id ON public.device_sessions(member_id);
CREATE INDEX idx_device_sessions_business_id ON public.device_sessions(business_id);

CREATE TRIGGER trg_device_sessions_updated_at
  BEFORE UPDATE ON public.device_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Helper Function: bootstrap_business_roles
--   Seeds standard Owner, Cashier, and Stockkeeper roles + permissions
--   for a newly provisioned business.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_business_roles(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_role_id     UUID;
  v_cashier_role_id   UUID;
  v_inventory_role_id UUID;
BEGIN
  -- Authorize caller when invoked via PostgREST/authenticated JWT (allow internal/migration calls where auth.uid() IS NULL)
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_user_id = auth.uid()
      AND b.deleted_at IS NULL
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.business_members bm
    JOIN public.role_permissions rp ON rp.role_id = bm.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
      AND bm.deleted_at IS NULL
      AND p.permission_key = 'settings.manage'
  ) THEN
    RAISE EXCEPTION 'Unauthorized to bootstrap roles for business %', p_business_id;
  END IF;

  INSERT INTO public.roles (business_id, name, display_name, is_system_role)
  VALUES (p_business_id, 'owner', 'Owner', true)
  ON CONFLICT (business_id, name) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_owner_role_id;

  INSERT INTO public.roles (business_id, name, display_name, is_system_role)
  VALUES (p_business_id, 'cashier', 'Cashier', true)
  ON CONFLICT (business_id, name) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_cashier_role_id;

  INSERT INTO public.roles (business_id, name, display_name, is_system_role)
  VALUES (p_business_id, 'inventory', 'Stockkeeper', true)
  ON CONFLICT (business_id, name) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO v_inventory_role_id;

  -- Owner receives all permissions
  INSERT INTO public.role_permissions (business_id, role_id, permission_id)
  SELECT p_business_id, v_owner_role_id, p.id
  FROM public.permissions p
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Cashier permissions
  INSERT INTO public.role_permissions (business_id, role_id, permission_id)
  SELECT p_business_id, v_cashier_role_id, p.id
  FROM public.permissions p
  WHERE p.permission_key IN (
    'dashboard.cashier.view',
    'pos.sell',
    'pos.discount.apply',
    'pos.bills.view',
    'pos.returns.process',
    'pos.quotes.manage',
    'khata.view',
    'khata.manage',
    'inventory.view',
    'orders.view',
    'cash.view',
    'cash.shift.open',
    'cash.entry.draft'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Stockkeeper permissions
  INSERT INTO public.role_permissions (business_id, role_id, permission_id)
  SELECT p_business_id, v_inventory_role_id, p.id
  FROM public.permissions p
  WHERE p.permission_key IN (
    'dashboard.inventory.view',
    'inventory.view',
    'inventory.manage',
    'orders.view',
    'orders.manage',
    'purchasing.view',
    'purchasing.receive',
    'expenses.manage'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;
