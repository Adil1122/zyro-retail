-- ============================================================================
-- Migration: 0002_products_and_inventory.sql
-- Phase 2: Product Catalog, Variants, Barcodes, Batches, Serials & Inventory
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 11. categories
--     Product taxonomy supporting Shop Kit variant modes (sc, piece, batch,
--     pack, shade, serial, simple).
-- ----------------------------------------------------------------------------
CREATE TABLE public.categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name             TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  category_type    TEXT NOT NULL DEFAULT 'simple'
                     CHECK (category_type IN ('sc','piece','batch','pack','shade','serial','simple')),
  size_set_id      TEXT,
  art_id           TEXT,
  attribute_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  counter_visible  BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_categories_business_name
  ON public.categories(business_id, lower(name))
  WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_business_id ON public.categories(business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id) WHERE parent_id IS NOT NULL;

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. products
--     Master product catalog shared across branches of a business.
-- ----------------------------------------------------------------------------
CREATE TABLE public.products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sku                   TEXT,
  name                  TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  brand                 TEXT,
  art_id                TEXT,
  description           TEXT,
  unit_of_measure       TEXT NOT NULL DEFAULT 'piece',
  is_measured           BOOLEAN NOT NULL DEFAULT false,
  track_inventory       BOOLEAN NOT NULL DEFAULT true,
  allow_negative_stock  BOOLEAN NOT NULL DEFAULT false,
  has_variants          BOOLEAN NOT NULL DEFAULT false,
  requires_batch        BOOLEAN NOT NULL DEFAULT false,
  requires_expiry       BOOLEAN NOT NULL DEFAULT false,
  requires_serial       BOOLEAN NOT NULL DEFAULT false,
  base_cost_price       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_cost_price >= 0),
  base_selling_price    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_selling_price >= 0),
  karat                 TEXT,
  weight_grams          NUMERIC(10,3) CHECK (weight_grams IS NULL OR weight_grams >= 0),
  making_charge         NUMERIC(14,2) CHECK (making_charge IS NULL OR making_charge >= 0),
  warranty_months       INTEGER CHECK (warranty_months IS NULL OR warranty_months >= 0),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_products_business_sku
  ON public.products(business_id, lower(sku))
  WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_products_business_category ON public.products(business_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_business_name ON public.products(business_id, lower(name)) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 13. product_images
--     Storage-backed product gallery images.
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  image_url     TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_business_id ON public.product_images(business_id);

-- ----------------------------------------------------------------------------
-- 14. product_attributes
--     Attribute definitions (Colour, Size, Shade, Karat, Pack, Storage).
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_attributes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  display_type  TEXT NOT NULL DEFAULT 'text'
                  CHECK (display_type IN ('text','swatch','size_grid')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_product_attributes_business_name
  ON public.product_attributes(business_id, lower(name));

CREATE TRIGGER trg_product_attributes_updated_at
  BEFORE UPDATE ON public.product_attributes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 15. product_variants
--     Sellable/purchasable SKU variants (default 1 row even for simple items).
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_variants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku            TEXT,
  variant_name   TEXT NOT NULL DEFAULT 'Standard',
  colour_name    TEXT,
  size_name      TEXT,
  shade_name     TEXT,
  cost_price     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  selling_price  NUMERIC(14,2) CHECK (selling_price IS NULL OR selling_price >= 0),
  reorder_level  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  is_default     BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_product_variants_business_sku
  ON public.product_variants(business_id, lower(sku))
  WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_variants_business_id ON public.product_variants(business_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 16. variant_attribute_values
--     Normalized attribute-value pairs attached to a product variant.
-- ----------------------------------------------------------------------------
CREATE TABLE public.variant_attribute_values (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  variant_id       UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_id     UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  attribute_value  TEXT NOT NULL CHECK (char_length(trim(attribute_value)) > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_variant_attr_pair UNIQUE (variant_id, attribute_id)
);

CREATE INDEX idx_variant_attribute_values_business_id ON public.variant_attribute_values(business_id);

-- ----------------------------------------------------------------------------
-- 17. product_barcodes
--     Barcode registry mapped to specific product variants.
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_barcodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  variant_id    UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  barcode       TEXT NOT NULL CHECK (char_length(trim(barcode)) > 0),
  barcode_type  TEXT NOT NULL DEFAULT 'EAN13'
                  CHECK (barcode_type IN ('EAN13','EAN8','CODE128','UPC','CUSTOM')),
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_barcodes_business_code UNIQUE (business_id, barcode)
);

CREATE INDEX idx_product_barcodes_variant_id ON public.product_barcodes(variant_id);

-- ----------------------------------------------------------------------------
-- 18. product_batches
--     Lot/batch and expiry tracking per branch (Pharmacy, Grocery, Cosmetics).
-- ----------------------------------------------------------------------------
CREATE TABLE public.product_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  variant_id        UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  batch_number      TEXT NOT NULL CHECK (char_length(trim(batch_number)) > 0),
  manufacture_date  DATE,
  expiry_date       DATE,
  cost_price        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  quantity_on_hand  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_batches_branch_variant_no UNIQUE (branch_id, variant_id, batch_number)
);

CREATE INDEX idx_product_batches_business_expiry ON public.product_batches(business_id, expiry_date)
  WHERE quantity_on_hand > 0;
CREATE INDEX idx_product_batches_branch_variant ON public.product_batches(branch_id, variant_id);

CREATE TRIGGER trg_product_batches_updated_at
  BEFORE UPDATE ON public.product_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 19. serial_numbers
--     IMEI / serial number registry for serialized retail (Mobile Phones).
--     FK links to sale_items & goods_receipt_items are added in Phases 3 & 5.
-- ----------------------------------------------------------------------------
CREATE TABLE public.serial_numbers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id            UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  variant_id           UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  serial_number        TEXT NOT NULL CHECK (char_length(trim(serial_number)) > 0),
  imei_secondary       TEXT,
  status               TEXT NOT NULL DEFAULT 'in_stock'
                         CHECK (status IN ('in_stock','reserved','sold','returned','damaged','transferred')),
  goods_receipt_id     UUID,
  sold_sale_item_id    UUID,
  warranty_expires_at  DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_serial_numbers_business_serial UNIQUE (business_id, serial_number)
);

CREATE INDEX idx_serial_numbers_branch_status ON public.serial_numbers(branch_id, variant_id, status);

CREATE TRIGGER trg_serial_numbers_updated_at
  BEFORE UPDATE ON public.serial_numbers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 20. stock_levels
--     Authoritative on-hand and reserved stock quantities per branch/variant.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_levels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id          UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  variant_id         UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity_on_hand   NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_reserved  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  reorder_level      NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  average_cost       NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (average_cost >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_levels_branch_variant UNIQUE (branch_id, variant_id)
);

CREATE INDEX idx_stock_levels_business_branch ON public.stock_levels(business_id, branch_id);
CREATE INDEX idx_stock_levels_variant_id ON public.stock_levels(variant_id);

CREATE TRIGGER trg_stock_levels_updated_at
  BEFORE UPDATE ON public.stock_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 21. stock_movements
--     Append-only audit ledger for every inventory quantity change.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id        UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  movement_type   TEXT NOT NULL CHECK (movement_type IN (
                    'opening_stock','purchase_receipt','sale','sale_return',
                    'exchange_in','exchange_out','adjustment','stock_count',
                    'transfer_out','transfer_in','damage','shrinkage'
                  )),
  quantity_delta  NUMERIC(14,3) NOT NULL CHECK (quantity_delta <> 0),
  unit_cost       NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reference_type  TEXT,
  reference_id    UUID,
  reason          TEXT,
  performed_by    UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_branch_variant_date
  ON public.stock_movements(branch_id, variant_id, created_at DESC);
CREATE INDEX idx_stock_movements_business_ref
  ON public.stock_movements(business_id, reference_type, reference_id);

-- ----------------------------------------------------------------------------
-- 22. stock_counts
--     Physical inventory verification / cycle-count sessions.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_counts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  count_number  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','in_progress','submitted','approved','cancelled')),
  counted_by    UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  approved_by   UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_counts_business_number UNIQUE (business_id, count_number)
);

CREATE INDEX idx_stock_counts_branch_status ON public.stock_counts(branch_id, status);

CREATE TRIGGER trg_stock_counts_updated_at
  BEFORE UPDATE ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 23. stock_count_items
--     Expected vs physically counted quantities within a stock count session.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_count_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stock_count_id  UUID NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  variant_id      UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id        UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  expected_qty    NUMERIC(14,3) NOT NULL DEFAULT 0,
  counted_qty     NUMERIC(14,3) CHECK (counted_qty IS NULL OR counted_qty >= 0),
  variance_qty    NUMERIC(14,3) GENERATED ALWAYS AS (COALESCE(counted_qty, expected_qty) - expected_qty) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_count_items_line UNIQUE NULLS NOT DISTINCT (stock_count_id, variant_id, batch_id)
);

CREATE INDEX idx_stock_count_items_business_id ON public.stock_count_items(business_id);

CREATE TRIGGER trg_stock_count_items_updated_at
  BEFORE UPDATE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 24. stock_transfers
--     Inter-branch stock movement requests and dispatch headers.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  to_branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  transfer_number  TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','in_transit','received','cancelled')),
  requested_by     UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  received_by      UUID REFERENCES public.business_members(id) ON DELETE SET NULL,
  sent_at          TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_stock_transfers_diff_branch CHECK (from_branch_id <> to_branch_id),
  CONSTRAINT uq_stock_transfers_business_no UNIQUE (business_id, transfer_number)
);

CREATE INDEX idx_stock_transfers_branches ON public.stock_transfers(business_id, from_branch_id, to_branch_id);

CREATE TRIGGER trg_stock_transfers_updated_at
  BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 25. stock_transfer_items
--     Variant quantities dispatched and received on an inter-branch transfer.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_transfer_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  transfer_id        UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  variant_id         UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id           UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  quantity_sent      NUMERIC(14,3) NOT NULL CHECK (quantity_sent > 0),
  quantity_received  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_transfer_items_transfer_id ON public.stock_transfer_items(transfer_id);
CREATE INDEX idx_stock_transfer_items_business_id ON public.stock_transfer_items(business_id);

CREATE TRIGGER trg_stock_transfer_items_updated_at
  BEFORE UPDATE ON public.stock_transfer_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 26. stock_reservations
--     Temporary stock allocations held for open customer orders or held bills.
-- ----------------------------------------------------------------------------
CREATE TABLE public.stock_reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  variant_id   UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  batch_id     UUID REFERENCES public.product_batches(id) ON DELETE SET NULL,
  source_type  TEXT NOT NULL CHECK (source_type IN ('customer_order','held_bill')),
  source_id    UUID NOT NULL,
  quantity     NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','released','fulfilled','expired')),
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_reservations_active
  ON public.stock_reservations(branch_id, variant_id)
  WHERE status = 'active';
CREATE INDEX idx_stock_reservations_source ON public.stock_reservations(source_type, source_id);

CREATE TRIGGER trg_stock_reservations_updated_at
  BEFORE UPDATE ON public.stock_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
