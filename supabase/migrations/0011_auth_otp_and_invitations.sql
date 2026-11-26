-- ============================================================================
-- Migration: 0011_auth_otp_and_invitations.sql
-- Phase 11: Production Phone OTP Challenges, Employee Invitations & Atomic
--           Server-Side Onboarding / Invitation Acceptance RPCs
-- Notes:
--   - Reuses existing tables from 0001_core_business_and_auth.sql:
--     businesses, user_profiles, roles, permissions, role_permissions,
--     branches, business_members, member_branch_access.
--   - Never stores plaintext OTP codes or raw invitation tokens.
--   - Strict RLS enabled on every new table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. auth_otp_challenges
--    Server-managed OTP verification challenges (hashed OTP + salt,
--    expiration, attempt limiting, and single-use verification proof token).
--    Accessed exclusively via trusted Next.js server routes using service_role.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164               TEXT NOT NULL CHECK (char_length(trim(phone_e164)) >= 8),
  purpose                  TEXT NOT NULL CHECK (purpose IN ('owner_register', 'staff_invite', 'password_reset')),
  otp_hash                 TEXT NOT NULL,
  otp_salt                 TEXT NOT NULL,
  verification_token_hash  TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'verified', 'consumed', 'expired', 'invalidated')),
  attempts                 INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts             INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  expires_at               TIMESTAMPTZ NOT NULL,
  verified_at              TIMESTAMPTZ,
  consumed_at              TIMESTAMPTZ,
  request_ip               TEXT,
  user_agent               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_phone_purpose_created
  ON public.auth_otp_challenges(phone_e164, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_otp_ip_created
  ON public.auth_otp_challenges(request_ip, created_at DESC)
  WHERE request_ip IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_otp_verification_token_hash
  ON public.auth_otp_challenges(verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

DROP TRIGGER IF EXISTS trg_auth_otp_challenges_updated_at ON public.auth_otp_challenges;
CREATE TRIGGER trg_auth_otp_challenges_updated_at
  BEFORE UPDATE ON public.auth_otp_challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Deliberately no anon/authenticated RLS policies on auth_otp_challenges.
-- Only service_role (server-side API routes) can read or mutate OTP challenges.
REVOKE ALL ON TABLE public.auth_otp_challenges FROM anon, authenticated;
GRANT ALL ON TABLE public.auth_otp_challenges TO service_role;

-- ----------------------------------------------------------------------------
-- 2. business_invitations
--    Secure single-use staff invitations linking business, branch, role,
--    invited mobile number, expiration, and hashed invitation token.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_invitations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id             UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  role_id               UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  member_id             UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  invited_name          TEXT NOT NULL CHECK (char_length(trim(invited_name)) > 0),
  invited_phone_e164    TEXT NOT NULL CHECK (char_length(trim(invited_phone_e164)) >= 8),
  token_hash            TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at            TIMESTAMPTZ NOT NULL,
  invited_by_member_id  UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  accepted_at           TIMESTAMPTZ,
  accepted_by_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at            TIMESTAMPTZ,
  revoked_by_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_invitations_business_status
  ON public.business_invitations(business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_invitations_phone_status
  ON public.business_invitations(invited_phone_e164, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_invitations_branch_id
  ON public.business_invitations(branch_id);

DROP TRIGGER IF EXISTS trg_business_invitations_updated_at ON public.business_invitations;
CREATE TRIGGER trg_business_invitations_updated_at
  BEFORE UPDATE ON public.business_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_invitations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.business_invitations TO service_role;

DROP POLICY IF EXISTS business_invitations_select_authorized ON public.business_invitations;
CREATE POLICY business_invitations_select_authorized
  ON public.business_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_business_member(business_id)
    AND (
      public.has_permission(business_id, 'staff.manage')
      OR public.has_permission(business_id, 'settings.manage')
    )
  );

DROP POLICY IF EXISTS business_invitations_insert_authorized ON public.business_invitations;
CREATE POLICY business_invitations_insert_authorized
  ON public.business_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_business_member(business_id)
    AND (
      public.has_permission(business_id, 'staff.manage')
      OR public.has_permission(business_id, 'settings.manage')
    )
  );

DROP POLICY IF EXISTS business_invitations_update_authorized ON public.business_invitations;
CREATE POLICY business_invitations_update_authorized
  ON public.business_invitations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_business_member(business_id)
    AND (
      public.has_permission(business_id, 'staff.manage')
      OR public.has_permission(business_id, 'settings.manage')
    )
  )
  WITH CHECK (
    public.is_business_member(business_id)
    AND (
      public.has_permission(business_id, 'staff.manage')
      OR public.has_permission(business_id, 'settings.manage')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Server-Only Atomic RPC: provision_owner_workspace_for_user
--    Invoked strictly by server-side owner registration API route (service_role)
--    after verified phone OTP and Supabase auth.users creation.
--    Never accepts a client-supplied role — always assigns the system 'owner' role.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_owner_workspace_for_user(
  p_user_id UUID,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name     TEXT := trim(COALESCE(p_payload->>'full_name', ''));
  v_phone         TEXT := trim(COALESCE(p_payload->>'phone', ''));
  v_shop_name     TEXT := trim(COALESCE(p_payload->>'shop_name', ''));
  v_shop_phone    TEXT := trim(COALESCE(p_payload->>'business_phone', p_payload->>'phone', ''));
  v_email         TEXT := NULLIF(trim(COALESCE(p_payload->>'email', '')), '');
  v_currency      TEXT := COALESCE(NULLIF(trim(COALESCE(p_payload->>'currency', '')), ''), 'PKR');
  v_timezone      TEXT := COALESCE(NULLIF(trim(COALESCE(p_payload->>'timezone', '')), ''), 'Asia/Karachi');
  v_shop_kit      TEXT := COALESCE(NULLIF(trim(COALESCE(p_payload->>'shop_kit', '')), ''), 'clothing');
  v_branch_name   TEXT := COALESCE(NULLIF(trim(COALESCE(p_payload->>'branch_name', '')), ''), 'Main branch');
  v_city          TEXT := NULLIF(trim(COALESCE(p_payload->>'city', '')), '');
  v_address       TEXT := NULLIF(trim(COALESCE(p_payload->>'address', '')), '');
  v_business_id   UUID;
  v_branch_id     UUID;
  v_owner_role_id UUID;
  v_member_id     UUID;
  v_drawer_id     UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF v_full_name = '' OR v_shop_name = '' OR v_phone = '' THEN
    RAISE EXCEPTION 'full_name, shop_name, and phone are required';
  END IF;

  IF v_shop_kit NOT IN ('clothing','shoes','jewellery','pharmacy','grocery','cosmetics','mobile','other') THEN
    v_shop_kit := 'other';
  END IF;

  -- Create or update user_profiles without duplicating
  INSERT INTO public.user_profiles (id, full_name, short_name, phone)
  VALUES (
    p_user_id,
    v_full_name,
    split_part(v_full_name, ' ', 1),
    v_phone
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name  = EXCLUDED.full_name,
        short_name = EXCLUDED.short_name,
        phone      = COALESCE(public.user_profiles.phone, EXCLUDED.phone);

  INSERT INTO public.businesses (
    name, phone, email, currency, timezone, shop_kit, owner_user_id, status
  ) VALUES (
    v_shop_name, v_shop_phone, v_email, v_currency, v_timezone, v_shop_kit, p_user_id, 'active'
  )
  RETURNING id INTO v_business_id;

  -- Seed system Owner, Cashier, Stockkeeper roles & role_permissions
  PERFORM public.bootstrap_business_roles(v_business_id);

  SELECT id INTO v_owner_role_id
  FROM public.roles
  WHERE business_id = v_business_id AND name = 'owner'
  LIMIT 1;

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Failed to bootstrap owner role for business %', v_business_id;
  END IF;

  INSERT INTO public.branches (business_id, name, city, address, phone, is_main, is_active)
  VALUES (v_business_id, v_branch_name, v_city, v_address, v_shop_phone, true, true)
  RETURNING id INTO v_branch_id;

  INSERT INTO public.business_members (business_id, user_id, role_id, status)
  VALUES (v_business_id, p_user_id, v_owner_role_id, 'active')
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
    v_business_id, v_branch_id, p_user_id, v_member_id,
    'business.created', 'business', v_business_id,
    jsonb_build_object(
      'shop_name', v_shop_name,
      'shop_kit', v_shop_kit,
      'branch_name', v_branch_name,
      'currency', v_currency
    )
  );

  RETURN jsonb_build_object(
    'business_id', v_business_id,
    'branch_id', v_branch_id,
    'member_id', v_member_id,
    'role_id', v_owner_role_id,
    'cash_drawer_id', v_drawer_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_owner_workspace_for_user(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_owner_workspace_for_user(UUID, JSONB) TO service_role;

-- ----------------------------------------------------------------------------
-- 4. Server-Only Atomic RPC: accept_business_invitation_for_user
--    Validates the locked invitation row, assigns the trusted role_id and
--    branch_id from business_invitations, activates membership, and marks
--    the invitation accepted so it cannot be reused.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_business_invitation_for_user(
  p_user_id        UUID,
  p_invitation_id  UUID,
  p_full_name      TEXT,
  p_phone_e164     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv         RECORD;
  v_clean_name  TEXT := trim(COALESCE(p_full_name, ''));
  v_member_id   UUID;
  v_biz_status  TEXT;
  v_role_name   TEXT;
BEGIN
  IF p_user_id IS NULL OR p_invitation_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id and p_invitation_id are required';
  END IF;

  SELECT *
  INTO v_inv
  FROM public.business_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer valid (status: %)', v_inv.status;
  END IF;

  IF v_inv.expires_at <= now() THEN
    UPDATE public.business_invitations
    SET status = 'expired'
    WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF v_inv.invited_phone_e164 <> p_phone_e164 THEN
    RAISE EXCEPTION 'Phone number does not match the invitation';
  END IF;

  SELECT status INTO v_biz_status
  FROM public.businesses
  WHERE id = v_inv.business_id AND deleted_at IS NULL;

  IF NOT FOUND OR v_biz_status <> 'active' THEN
    RAISE EXCEPTION 'Target business is inactive or unavailable';
  END IF;

  SELECT name INTO v_role_name
  FROM public.roles
  WHERE id = v_inv.role_id AND business_id = v_inv.business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assigned role is invalid for this business';
  END IF;

  IF v_clean_name = '' THEN
    v_clean_name := v_inv.invited_name;
  END IF;

  -- Upsert user_profiles safely
  INSERT INTO public.user_profiles (id, full_name, short_name, phone)
  VALUES (
    p_user_id,
    v_clean_name,
    split_part(v_clean_name, ' ', 1),
    p_phone_e164
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name  = COALESCE(NULLIF(public.user_profiles.full_name, ''), EXCLUDED.full_name),
        short_name = COALESCE(NULLIF(public.user_profiles.short_name, ''), EXCLUDED.short_name),
        phone      = COALESCE(public.user_profiles.phone, EXCLUDED.phone);

  -- Check if an existing membership row already exists for this user or invited phone
  SELECT id INTO v_member_id
  FROM public.business_members
  WHERE business_id = v_inv.business_id
    AND deleted_at IS NULL
    AND (
      user_id = p_user_id
      OR (v_inv.member_id IS NOT NULL AND id = v_inv.member_id)
      OR (user_id IS NULL AND invited_phone = p_phone_e164)
    )
  ORDER BY (user_id = p_user_id) DESC
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    UPDATE public.business_members
    SET user_id       = p_user_id,
        role_id       = v_inv.role_id,
        status        = 'active',
        invited_name  = COALESCE(invited_name, v_clean_name),
        invited_phone = COALESCE(invited_phone, p_phone_e164),
        joined_at     = now()
    WHERE id = v_member_id;
  ELSE
    INSERT INTO public.business_members (
      business_id, user_id, invited_name, invited_phone, role_id, status, joined_at
    ) VALUES (
      v_inv.business_id, p_user_id, v_clean_name, p_phone_e164, v_inv.role_id, 'active', now()
    )
    RETURNING id INTO v_member_id;
  END IF;

  INSERT INTO public.member_branch_access (business_id, member_id, branch_id, is_default)
  VALUES (v_inv.business_id, v_member_id, v_inv.branch_id, true)
  ON CONFLICT (member_id, branch_id) DO UPDATE
    SET is_default = true;

  UPDATE public.business_invitations
  SET status              = 'accepted',
      member_id           = v_member_id,
      accepted_at         = now(),
      accepted_by_user_id = p_user_id
  WHERE id = v_inv.id;

  INSERT INTO public.audit_logs (
    business_id, branch_id, actor_user_id, actor_member_id,
    action, entity_type, entity_id, after_data
  ) VALUES (
    v_inv.business_id, v_inv.branch_id, p_user_id, v_member_id,
    'invitation.accepted', 'business_invitation', v_inv.id,
    jsonb_build_object(
      'role_id', v_inv.role_id,
      'role_name', v_role_name,
      'branch_id', v_inv.branch_id
    )
  );

  RETURN jsonb_build_object(
    'invitation_id', v_inv.id,
    'business_id', v_inv.business_id,
    'branch_id', v_inv.branch_id,
    'member_id', v_member_id,
    'role_id', v_inv.role_id,
    'role_name', v_role_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_business_invitation_for_user(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_business_invitation_for_user(UUID, UUID, TEXT, TEXT) TO service_role;

-- Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
