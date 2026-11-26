-- ============================================================================
-- Seed Script: 001_footwear_demo_seed.sql
-- ZYRO Retail POS — Footwear-Only Production-Grade Idempotent Demo Dataset
--
-- Safety Guarantees:
--   1. Strictly idempotent — safe to re-run multiple times (guards on business
--      + unique keys / seed marker).
--   2. NEVER truncates, drops, or modifies schema or auth.users / auth.identities.
--   3. Automatically targets the existing active business (or 'Adil Foot Wear')
--      and its existing owner & main branch.
--   4. Reconciles every branch/variant stock_levels.quantity_on_hand directly
--      from SUM(stock_movements.quantity_delta) so inventory & ledger match 100%.
-- ============================================================================

DO $$
DECLARE
  v_business_id       UUID;
  v_main_branch_id    UUID;
  v_branch2_id        UUID;
  v_owner_member_id   UUID;
  v_sizing_attr_id    UUID;

  -- Category IDs (10 Footwear categories)
  v_cat_sneakers      UUID;
  v_cat_formal        UUID;
  v_cat_casual        UUID;
  v_cat_sandals       UUID;
  v_cat_slippers      UUID;
  v_cat_boots         UUID;
  v_cat_sports        UUID;
  v_cat_school        UUID;
  v_cat_heels         UUID;
  v_cat_flats         UUID;

  -- Working variables
  v_prod_id           UUID;
  v_var_id            UUID;
  v_cust_ids          UUID[] := ARRAY[]::UUID[];
  v_var_ids           UUID[] := ARRAY[]::UUID[];
  v_var_prod_ids      UUID[] := ARRAY[]::UUID[];
  v_var_prices        NUMERIC[] := ARRAY[]::NUMERIC[];
  v_var_costs         NUMERIC[] := ARRAY[]::NUMERIC[];
  v_var_names         TEXT[] := ARRAY[]::TEXT[];
  v_var_labels        TEXT[] := ARRAY[]::TEXT[];
  v_var_skus          TEXT[] := ARRAY[]::TEXT[];

  v_sale_id           UUID;
  v_sale_item_id      UUID;
  v_first_sale_id     UUID;
  v_first_sale_item   UUID;
  v_first_sale_var    UUID;
  v_first_sale_price  NUMERIC;
  v_second_sale_id    UUID;
  v_second_sale_item  UUID;
  v_second_sale_var   UUID;
  v_second_sale_price NUMERIC;
  v_third_sale_id     UUID;
  v_third_sale_item   UUID;
  v_third_sale_var    UUID;
  v_third_sale_price  NUMERIC;
  v_fourth_sale_id    UUID;
  v_fourth_sale_item  UUID;
  v_fourth_sale_var   UUID;
  v_fourth_sale_price NUMERIC;

  v_return_id         UUID;
  v_refund_id         UUID;
  v_exchange_id       UUID;
  v_repl_sale_id      UUID;
  v_count_id          UUID;
  v_bill_no           BIGINT;
  v_cur_branch        UUID;
  v_cust_id           UUID;
  v_idx1              INT;
  v_idx2              INT;
  v_qty1              INT;
  v_subtotal          NUMERIC;
  v_discount          NUMERIC;
  v_total             NUMERIC;
  v_paid              NUMERIC;
  v_due               NUMERIC;
  v_method            TEXT;
  v_sold_at           TIMESTAMPTZ;
  v_running_bal       NUMERIC;

  -- Product catalog seed record loop
  r_prod              RECORD;
  v_col               TEXT;
  v_sz                TEXT;
  v_vsku              TEXT;
  v_barcode           TEXT;
  v_bc_seq            INT := 10001;
  v_open_main         INT;
  v_open_b2           INT;
  v_reorder           INT;
  v_i                 INT;
BEGIN
  -- 1. Resolve target active business (preferring existing footwear business)
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE deleted_at IS NULL
  ORDER BY (CASE WHEN shop_kit = 'shoes' THEN 0 ELSE 1 END), created_at ASC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE NOTICE 'No active business found in public.businesses. Register an owner first, then run this seed.';
    RETURN;
  END IF;

  -- Resolve main branch
  SELECT id INTO v_main_branch_id
  FROM public.branches
  WHERE business_id = v_business_id AND deleted_at IS NULL
  ORDER BY is_main DESC, created_at ASC
  LIMIT 1;

  IF v_main_branch_id IS NULL THEN
    RAISE EXCEPTION 'No branch found for business %', v_business_id;
  END IF;

  -- Resolve owner member
  SELECT bm.id INTO v_owner_member_id
  FROM public.business_members bm
  LEFT JOIN public.roles r ON r.id = bm.role_id
  WHERE bm.business_id = v_business_id AND bm.status = 'active'
  ORDER BY (CASE WHEN lower(r.name) = 'owner' THEN 0 ELSE 1 END), bm.created_at ASC
  LIMIT 1;

  -- 2. Ensure a second clearly labeled demo branch exists for multi-branch testing
  SELECT id INTO v_branch2_id
  FROM public.branches
  WHERE business_id = v_business_id AND deleted_at IS NULL AND id <> v_main_branch_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_branch2_id IS NULL THEN
    INSERT INTO public.branches (business_id, name, code, city, address, phone, is_main, is_active)
    VALUES (
      v_business_id,
      'DHA Branch (Demo)',
      'DHA-02',
      'Lahore',
      'Phase 5 Commercial Area, DHA, Lahore',
      '+923001122334',
      false,
      true
    )
    RETURNING id INTO v_branch2_id;
  END IF;

  IF v_owner_member_id IS NOT NULL AND v_branch2_id IS NOT NULL THEN
    INSERT INTO public.member_branch_access (business_id, member_id, branch_id, is_default)
    VALUES (v_business_id, v_owner_member_id, v_branch2_id, false)
    ON CONFLICT (member_id, branch_id) DO NOTHING;
  END IF;

  -- 3. Ensure default payment methods exist
  INSERT INTO public.payment_methods (business_id, method_code, display_name, is_active, sort_order)
  VALUES
    (v_business_id, 'cash',  'Cash',          true, 1),
    (v_business_id, 'jazz',  'JazzCash',      true, 2),
    (v_business_id, 'easy',  'Easypaisa',     true, 3),
    (v_business_id, 'raast', 'Raast QR',      true, 4),
    (v_business_id, 'card',  'Card / POS',    true, 5),
    (v_business_id, 'bank',  'Bank transfer', true, 6),
    (v_business_id, 'khata', 'Khata credit',  true, 7),
    (v_business_id, 'other', 'Other',         true, 8)
  ON CONFLICT (business_id, method_code, display_name) DO NOTHING;

  -- 4. Ensure 'Sizing System' attribute exists
  SELECT id INTO v_sizing_attr_id
  FROM public.product_attributes
  WHERE business_id = v_business_id AND lower(name) = 'sizing system'
  LIMIT 1;

  IF v_sizing_attr_id IS NULL THEN
    INSERT INTO public.product_attributes (business_id, name, display_type)
    VALUES (v_business_id, 'Sizing System', 'text')
    RETURNING id INTO v_sizing_attr_id;
  END IF;

  -- 5. Seed all 10 Footwear Categories (idempotent)
  INSERT INTO public.categories (business_id, name, category_type, size_set_id, art_id, attribute_schema, counter_visible, sort_order, is_active)
  VALUES
    (v_business_id, 'Sneakers',     'sc', 'EU', 'sneaker', '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 1, true),
    (v_business_id, 'Formal Shoes', 'sc', 'UK', 'loafer',  '{"category_scope":"footwear","default_sizing_system":"UK"}'::jsonb, true, 2, true),
    (v_business_id, 'Casual Shoes', 'sc', 'EU', 'loafer',  '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 3, true),
    (v_business_id, 'Sandals',      'sc', 'EU', 'chappal', '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 4, true),
    (v_business_id, 'Slippers',     'sc', 'EU', 'chappal', '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 5, true),
    (v_business_id, 'Boots',        'sc', 'UK', 'boot',    '{"category_scope":"footwear","default_sizing_system":"UK"}'::jsonb, true, 6, true),
    (v_business_id, 'Sports Shoes', 'sc', 'US', 'sneaker', '{"category_scope":"footwear","default_sizing_system":"US"}'::jsonb, true, 7, true),
    (v_business_id, 'School Shoes', 'sc', 'EU', 'loafer',  '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 8, true),
    (v_business_id, 'Heels',        'sc', 'EU', 'heel',    '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 9, true),
    (v_business_id, 'Flats',        'sc', 'EU', 'flat',    '{"category_scope":"footwear","default_sizing_system":"EU"}'::jsonb, true, 10, true)
  ON CONFLICT (business_id, lower(name)) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_cat_sneakers FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'sneakers' AND deleted_at IS NULL;
  SELECT id INTO v_cat_formal   FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'formal shoes' AND deleted_at IS NULL;
  SELECT id INTO v_cat_casual   FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'casual shoes' AND deleted_at IS NULL;
  SELECT id INTO v_cat_sandals  FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'sandals' AND deleted_at IS NULL;
  SELECT id INTO v_cat_slippers FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'slippers' AND deleted_at IS NULL;
  SELECT id INTO v_cat_boots    FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'boots' AND deleted_at IS NULL;
  SELECT id INTO v_cat_sports   FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'sports shoes' AND deleted_at IS NULL;
  SELECT id INTO v_cat_school   FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'school shoes' AND deleted_at IS NULL;
  SELECT id INTO v_cat_heels    FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'heels' AND deleted_at IS NULL;
  SELECT id INTO v_cat_flats    FROM public.categories WHERE business_id = v_business_id AND lower(name) = 'flats' AND deleted_at IS NULL;

  -- 6. Seed 16 Footwear Products across all 8 brands, 10 types, and EU/UK/US sizing systems
  FOR r_prod IN
    SELECT * FROM (VALUES
      ('NK-PEG41',  'Nike Air Zoom Pegasus 41',      'Nike',        'Pegasus 41',      'Sports Shoes', 'Men',    'Breathable mesh', 'Rubber',     'Engineered mesh', 'US', v_cat_sports,   'sneaker', 12500::NUMERIC, 18900::NUMERIC, ARRAY['Black','White'],   ARRAY['8','9','10','11'],         4),
      ('NK-AF1',    'Nike Air Force 1 Low',          'Nike',        'AF1-07',          'Sneakers',     'Unisex', 'Full-grain leather','Rubber cupsole','Leather',     'EU', v_cat_sneakers, 'sneaker', 11000::NUMERIC, 16500::NUMERIC, ARRAY['White','Black'],   ARRAY['40','41','42','43'],       4),
      ('AD-ULT24',  'Adidas Ultraboost Light',       'Adidas',      'UB-Light',        'Sports Shoes', 'Men',    'Primeknit',       'Continental rubber','Primeknit','UK', v_cat_sports,   'sneaker', 13200::NUMERIC, 19800::NUMERIC, ARRAY['Navy','Black'],    ARRAY['7','8','9','10'],          4),
      ('AD-STAN',   'Adidas Stan Smith Classic',     'Adidas',      'FX5500',          'Sneakers',     'Unisex', 'Synthetic leather','Rubber',    'Recycled synth',  'EU', v_cat_sneakers, 'sneaker',  8800::NUMERIC, 13500::NUMERIC, ARRAY['White','Green'],   ARRAY['39','40','41','42'],       3),
      ('PM-SUEDE',  'Puma Suede Classic XXI',        'Puma',        '374915',          'Sneakers',     'Unisex', 'Suede',           'Rubber',     'Soft suede',      'EU', v_cat_sneakers, 'sneaker',  7900::NUMERIC, 12400::NUMERIC, ARRAY['Black','Red'],     ARRAY['40','41','42','43'],       3),
      ('PM-SOFR',   'Puma Softride Enzo Evo',        'Puma',        'Enzo Evo',        'Sports Shoes', 'Men',    'Textile',         'EVA + rubber','Mesh knit',       'US', v_cat_sports,   'sneaker',  7400::NUMERIC, 11800::NUMERIC, ARRAY['Grey','Black'],    ARRAY['8','9','10'],              3),
      ('BT-OXF01',  'Bata Ambassador Leather Oxford','Bata',        'AMB-821',         'Formal Shoes', 'Men',    'Genuine leather', 'TPR',        'Calf leather',    'UK', v_cat_formal,   'loafer',   4200::NUMERIC,  6990::NUMERIC, ARRAY['Black','Brown'],   ARRAY['7','8','9','10'],          5),
      ('BT-SCH01',  'Bata North Star School Shoe',   'Bata',        'NS-SCH01',        'School Shoes', 'Kids',   'Synthetic',       'PVC',        'Easy-wipe PU',    'EU', v_cat_school,   'loafer',   1450::NUMERIC,  2490::NUMERIC, ARRAY['Black'],           ARRAY['34','35','36','37','38'],  6),
      ('SV-CHET01', 'Servis Cheetah Runner',         'Servis',      'CH-902',          'Casual Shoes', 'Men',    'Mesh + PU',       'Phylon',     'Air mesh',        'EU', v_cat_casual,   'sneaker',  2900::NUMERIC,  4800::NUMERIC, ARRAY['Navy','Grey'],     ARRAY['40','41','42','43','44'],  5),
      ('SV-LOAF02', 'Servis Don Carlos Penny Loafer','Servis',      'DC-405',          'Formal Shoes', 'Men',    'Leather',         'Neolite',    'Polished leather','UK', v_cat_formal,   'loafer',   3600::NUMERIC,  5950::NUMERIC, ARRAY['Brown','Tan'],     ARRAY['7','8','9','10'],          4),
      ('SK-GOWK7',  'Skechers GOwalk 7 Slip-Ins',    'Skechers',    'GW7-2166',        'Casual Shoes', 'Unisex', 'Stretch knit',    'ULTRA GO EVA','Engineered knit', 'US', v_cat_casual,   'sneaker',  9500::NUMERIC, 14900::NUMERIC, ARRAY['Navy','Black'],    ARRAY['7','8','9','10'],          3),
      ('RB-CLSL',   'Reebok Classic Leather Legacy', 'Reebok',      'GY0952',          'Sneakers',     'Men',    'Leather + nylon', 'Rubber',     'Garment leather', 'UK', v_cat_sneakers, 'sneaker',  8400::NUMERIC, 13200::NUMERIC, ARRAY['White','Grey'],    ARRAY['7','8','9','10'],          3),
      ('LB-PESH01', 'Peshawari Handcrafted Chappal', 'Local Brand', 'LHR-PSH-01',      'Sandals',      'Men',    'Cowhide leather', 'Tyre rubber','Hand-stitched leather','EU', v_cat_sandals,'chappal',  2600::NUMERIC,  4500::NUMERIC, ARRAY['Brown','Black','Tan'], ARRAY['40','41','42','43','44'], 5),
      ('LB-SLIP01', 'Comfort Cloud Ortho Slipper',   'Local Brand', 'CC-SL09',         'Slippers',     'Unisex', 'EVA foam',        'Anti-slip EVA','Molded EVA',     'EU', v_cat_slippers, 'chappal',   750::NUMERIC,  1450::NUMERIC, ARRAY['Black','Beige'],   ARRAY['39','40','41','42','43'],  6),
      ('LB-CHEL01', 'Anarkali Chelsea Leather Boot', 'Local Brand', 'ANK-BT77',        'Boots',        'Men',    'Full-grain leather','Stacked rubber','Oiled leather','UK', v_cat_boots,    'boot',     5400::NUMERIC,  8900::NUMERIC, ARRAY['Brown','Black'],   ARRAY['7','8','9','10'],          3),
      ('LB-HEEL01', 'Zari Block Heel Mule',          'Local Brand', 'ZR-HL22',         'Heels',        'Women',  'Suede + velvet',  'TPU non-slip','Soft velvet',     'EU', v_cat_heels,    'heel',     2200::NUMERIC,  3950::NUMERIC, ARRAY['Maroon','Black','Beige'], ARRAY['36','37','38','39','40'], 4),
      ('LB-FLAT01', 'Classic Khussa Comfort Flat',   'Local Brand', 'KH-FL18',         'Flats',        'Women',  'Leather + embroidery','Leather sole','Embroidered leather','EU', v_cat_flats,'flat',  1650::NUMERIC,  3200::NUMERIC, ARRAY['Gold','Beige','Black'], ARRAY['36','37','38','39','40'], 5)
    ) AS t(sku, name, brand, model, ftype, gender, material, sole_mat, upper_mat, sizing_sys, cat_id, art_id, cost_p, sell_p, colours, sizes, reorder_lvl)
  LOOP
    SELECT id INTO v_prod_id
    FROM public.products
    WHERE business_id = v_business_id AND lower(sku) = lower(r_prod.sku) AND deleted_at IS NULL
    LIMIT 1;

    IF v_prod_id IS NULL THEN
      INSERT INTO public.products (
        business_id, category_id, sku, name, brand, art_id, description,
        unit_of_measure, is_measured, track_inventory, allow_negative_stock,
        has_variants, base_cost_price, base_selling_price, is_active, metadata
      ) VALUES (
        v_business_id,
        r_prod.cat_id,
        r_prod.sku,
        r_prod.name,
        r_prod.brand,
        r_prod.art_id,
        r_prod.brand || ' ' || r_prod.model || ' — ' || r_prod.ftype || ' (' || r_prod.gender || ').',
        'pair',
        false,
        true,
        false,
        true,
        r_prod.cost_p,
        r_prod.sell_p,
        true,
        jsonb_build_object(
          'category_scope', 'footwear',
          'model', r_prod.model,
          'footwear_type', r_prod.ftype,
          'gender', r_prod.gender,
          'material', r_prod.material,
          'sole_material', r_prod.sole_mat,
          'upper_material', r_prod.upper_mat,
          'sizing_system', r_prod.sizing_sys,
          'reorder_level', r_prod.reorder_lvl
        )
      )
      RETURNING id INTO v_prod_id;
    END IF;

    -- Create variants for each colour x size
    FOREACH v_col IN ARRAY r_prod.colours LOOP
      FOREACH v_sz IN ARRAY r_prod.sizes LOOP
        v_vsku := r_prod.sku || '-' || upper(left(regexp_replace(v_col, '[^A-Za-z0-9]', '', 'g'), 3)) || '-' || r_prod.sizing_sys || v_sz;
        v_barcode := '896400' || lpad(v_bc_seq::TEXT, 7, '0');
        v_bc_seq := v_bc_seq + 1;

        SELECT id INTO v_var_id
        FROM public.product_variants
        WHERE business_id = v_business_id AND lower(sku) = lower(v_vsku) AND deleted_at IS NULL
        LIMIT 1;

        IF v_var_id IS NULL THEN
          INSERT INTO public.product_variants (
            business_id, product_id, sku, variant_name, colour_name, size_name,
            cost_price, selling_price, reorder_level, is_default, is_active
          ) VALUES (
            v_business_id,
            v_prod_id,
            v_vsku,
            v_col || ' · ' || r_prod.sizing_sys || ' ' || v_sz,
            v_col,
            v_sz,
            r_prod.cost_p,
            r_prod.sell_p,
            r_prod.reorder_lvl,
            false,
            true
          )
          RETURNING id INTO v_var_id;

          -- Attach Sizing System attribute value
          INSERT INTO public.variant_attribute_values (business_id, variant_id, attribute_id, attribute_value)
          VALUES (v_business_id, v_var_id, v_sizing_attr_id, r_prod.sizing_sys)
          ON CONFLICT (variant_id, attribute_id) DO NOTHING;

          -- Attach primary EAN13 barcode
          INSERT INTO public.product_barcodes (business_id, variant_id, barcode, barcode_type, is_primary)
          VALUES (v_business_id, v_var_id, v_barcode, 'EAN13', true)
          ON CONFLICT (business_id, barcode) DO NOTHING;

          -- Realistic opening stock mix: normal, low stock (<= reorder), and deliberate out-of-stock (0)
          IF (v_bc_seq % 11) = 0 THEN
            v_open_main := 0; -- Out of stock in Main branch
            v_open_b2   := 4;
          ELSIF (v_bc_seq % 5) = 0 THEN
            v_open_main := GREATEST(1, r_prod.reorder_lvl - 1); -- Low stock
            v_open_b2   := 2;
          ELSE
            v_open_main := 10 + (v_bc_seq % 9); -- Healthy stock
            v_open_b2   := 6 + (v_bc_seq % 6);
          END IF;

          v_reorder := r_prod.reorder_lvl;

          INSERT INTO public.stock_levels (business_id, branch_id, variant_id, quantity_on_hand, quantity_reserved, reorder_level, average_cost)
          VALUES
            (v_business_id, v_main_branch_id, v_var_id, v_open_main, 0, v_reorder, r_prod.cost_p),
            (v_business_id, v_branch2_id,     v_var_id, v_open_b2,   0, v_reorder, r_prod.cost_p)
          ON CONFLICT (branch_id, variant_id) DO NOTHING;

          IF v_open_main > 0 THEN
            INSERT INTO public.stock_movements (business_id, branch_id, variant_id, movement_type, quantity_delta, unit_cost, reference_type, reason, performed_by, created_at)
            VALUES (v_business_id, v_main_branch_id, v_var_id, 'opening_stock', v_open_main, r_prod.cost_p, 'demo_seed', 'Initial footwear opening stock', v_owner_member_id, now() - INTERVAL '25 days');
          END IF;

          IF v_open_b2 > 0 THEN
            INSERT INTO public.stock_movements (business_id, branch_id, variant_id, movement_type, quantity_delta, unit_cost, reference_type, reason, performed_by, created_at)
            VALUES (v_business_id, v_branch2_id, v_var_id, 'opening_stock', v_open_b2, r_prod.cost_p, 'demo_seed', 'Initial footwear opening stock', v_owner_member_id, now() - INTERVAL '25 days');
          END IF;
        END IF;

        -- Collect variants that have plenty of stock for seeding sales cleanly
        IF array_length(v_var_ids, 1) IS NULL OR array_length(v_var_ids, 1) < 60 THEN
          v_var_ids      := array_append(v_var_ids, v_var_id);
          v_var_prod_ids := array_append(v_var_prod_ids, v_prod_id);
          v_var_prices   := array_append(v_var_prices, r_prod.sell_p);
          v_var_costs    := array_append(v_var_costs, r_prod.cost_p);
          v_var_names    := array_append(v_var_names, r_prod.name);
          v_var_labels   := array_append(v_var_labels, v_col || ' · ' || r_prod.sizing_sys || ' ' || v_sz);
          v_var_skus     := array_append(v_var_skus, v_vsku);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 7. Seed 5 Footwear Suppliers (idempotent by business + name)
  INSERT INTO public.suppliers (business_id, name, contact_person, phone, city, address, makes_notes, payment_terms_days)
  SELECT v_business_id, s.name, s.contact, s.phone, s.city, s.addr, s.notes, s.terms
  FROM (VALUES
    ('Lahore Footwear Distributors (Demo)', 'Haji Rasheed',   '+923004112233', 'Lahore',     'Shah Alam Market, Lahore',       'Nike, Adidas & Puma athletic imports', 21),
    ('Bata & Servis Wholesale Hub (Demo)',  'Kamran Siddiq',  '+923214556677', 'Lahore',     'Brandreth Road, Lahore',         'Formal, school & casual lines',        15),
    ('Peshawar Leather Works (Demo)',       'Javed Afridi',   '+923339887766', 'Peshawar',   'Qissa Khwani Bazaar, Peshawar',  'Handcrafted Peshawari chappals & boots',30),
    ('Sialkot Sports Footwear Co (Demo)',   'Bilal Chaudhry', '+923017778899', 'Sialkot',    'Wazirabad Road, Sialkot',        'Sports runners & EVA slippers',        20),
    ('Anarkali Ladies Footwear (Demo)',     'Sanaullah Khan', '+923454332211', 'Lahore',     'Anarkali Bazaar, Lahore',        'Heels, mules & khussa flats',          15)
  ) AS s(name, contact, phone, city, addr, notes, terms)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.suppliers ex
    WHERE ex.business_id = v_business_id AND lower(ex.name) = lower(s.name) AND ex.deleted_at IS NULL
  );

  -- 8. Seed 20 Demo Customers (idempotent by business + phone)
  INSERT INTO public.customers (business_id, branch_id, full_name, phone, city, address, notes)
  VALUES
    (v_business_id, v_main_branch_id, 'Usman Tariq (Demo)',      '+923001110001', 'Lahore', 'Model Town Block B',       'Regular sneaker buyer'),
    (v_business_id, v_main_branch_id, 'Ayesha Siddiqui (Demo)',  '+923001110002', 'Lahore', 'Gulberg III',              'Prefers EU 38 heels & flats'),
    (v_business_id, v_main_branch_id, 'Bilal Ahmed (Demo)',      '+923001110003', 'Lahore', 'Johar Town Phase 2',       'Khata regular'),
    (v_business_id, v_main_branch_id, 'Hamza Raza (Demo)',       '+923001110004', 'Lahore', 'Wapda Town',               'Running shoes EU 42'),
    (v_business_id, v_main_branch_id, 'Fatima Noor (Demo)',      '+923001110005', 'Lahore', 'Bahria Town Sector C',     'Family footwear buyer'),
    (v_business_id, v_main_branch_id, 'Zainab Malik (Demo)',     '+923001110006', 'Lahore', 'DHA Phase 3',              'Khussa & casual flats'),
    (v_business_id, v_main_branch_id, 'Saad Mahmood (Demo)',     '+923001110007', 'Lahore', 'Cavalry Ground',           'UK 9 formal shoes'),
    (v_business_id, v_main_branch_id, 'Hina Shahzad (Demo)',     '+923001110008', 'Lahore', 'Garden Town',              'Kids school shoes'),
    (v_business_id, v_main_branch_id, 'Faisal Nawaz (Demo)',     '+923001110009', 'Lahore', 'Iqbal Town',               'Peshawari chappal collector'),
    (v_business_id, v_main_branch_id, 'Sadia Imran (Demo)',      '+923001110010', 'Lahore', 'Faisal Town',              'Skechers walking shoes'),
    (v_business_id, v_branch2_id,     'Omar Farooq (Demo)',      '+923001110011', 'Lahore', 'DHA Phase 5',              'Athletic sneakers US 10'),
    (v_business_id, v_branch2_id,     'Mariam Khalid (Demo)',    '+923001110012', 'Lahore', 'DHA Phase 6',              'Festive heels & mules'),
    (v_business_id, v_branch2_id,     'Taimoor Hassan (Demo)',   '+923001110013', 'Lahore', 'Cantt Sarwar Road',        'Chelsea boots UK 8'),
    (v_business_id, v_branch2_id,     'Nadia Akram (Demo)',      '+923001110014', 'Lahore', 'Askari X',                 'Family & school shoes'),
    (v_business_id, v_branch2_id,     'Kashif Javed (Demo)',     '+923001110015', 'Lahore', 'DHA Phase 4',              'Khata corporate account'),
    (v_business_id, v_branch2_id,     'Rabia Zafar (Demo)',      '+923001110016', 'Lahore', 'DHA Phase 2',              'Running & walking shoes'),
    (v_business_id, v_main_branch_id, 'Waqas Butt (Demo)',       '+923001110017', 'Lahore', 'Shadman Colony',           'Wholesale occasional buyer'),
    (v_business_id, v_main_branch_id, 'Mehwish Iqbal (Demo)',    '+923001110018', 'Lahore', 'Samanabad',                'Casual flats EU 37'),
    (v_business_id, v_branch2_id,     'Salman Qureshi (Demo)',   '+923001110019', 'Lahore', 'DHA Phase 8',              'Nike & Adidas buyer'),
    (v_business_id, v_main_branch_id, 'Amina Yousaf (Demo)',     '+923001110020', 'Lahore', 'Township',                 'Ortho slippers & sandals')
  ON CONFLICT (business_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL DO NOTHING;

  SELECT array_agg(id ORDER BY created_at ASC) INTO v_cust_ids
  FROM public.customers
  WHERE business_id = v_business_id AND deleted_at IS NULL AND phone LIKE '+9230011100%';

  -- 9. Seed 30 Demo Sales across both branches (idempotent via client_sync_id)
  --    Covers Cash, Card, Bank, JazzCash, Easypaisa, Raast, Split, Partial+Khata, Full Khata
  IF NOT EXISTS (
    SELECT 1 FROM public.sales
    WHERE business_id = v_business_id
      AND client_sync_id IN ('DEMO-FOOTWEAR-SALE-01', 'seed-footwear-sale-001')
  ) THEN
    FOR v_i IN 1..30 LOOP
      v_cur_branch := CASE WHEN v_i <= 20 THEN v_main_branch_id ELSE v_branch2_id END;
      v_sold_at    := now() - ((31 - v_i) || ' hours')::INTERVAL - ((v_i % 5) || ' days')::INTERVAL;
      v_cust_id    := CASE WHEN v_i % 4 = 0 THEN NULL ELSE v_cust_ids[((v_i - 1) % array_length(v_cust_ids, 1)) + 1] END;

      -- Pick an in-stock variant for this branch
      SELECT sl.variant_id, pv.product_id, COALESCE(pv.selling_price, p.base_selling_price), pv.cost_price, p.name, pv.variant_name, pv.sku
      INTO v_var_id, v_prod_id, v_first_sale_price, v_subtotal, v_vsku, v_col, v_sz
      FROM public.stock_levels sl
      JOIN public.product_variants pv ON pv.id = sl.variant_id
      JOIN public.products p ON p.id = pv.product_id
      WHERE sl.branch_id = v_cur_branch AND sl.quantity_on_hand >= 3 AND pv.deleted_at IS NULL
      ORDER BY md5(sl.variant_id::TEXT || v_i::TEXT)
      LIMIT 1;

      EXIT WHEN v_var_id IS NULL;

      v_qty1     := CASE WHEN v_i % 7 = 0 THEN 2 ELSE 1 END;
      v_subtotal := ROUND(v_first_sale_price * v_qty1, 2);
      v_discount := CASE WHEN v_i % 5 = 0 THEN ROUND(v_subtotal * 0.05, 0) ELSE 0 END;
      v_total    := GREATEST(0, v_subtotal - v_discount);

      -- Cycle realistic payment methods
      v_method := CASE (v_i % 9)
        WHEN 1 THEN 'cash'
        WHEN 2 THEN 'card'
        WHEN 3 THEN 'jazz'
        WHEN 4 THEN 'easy'
        WHEN 5 THEN 'bank'
        WHEN 6 THEN 'raast'
        WHEN 7 THEN 'split'
        WHEN 8 THEN 'partial'
        ELSE        'khata'
      END;

      -- Ensure Khata / Partial bills always have a customer
      IF v_method IN ('khata', 'partial') AND v_cust_id IS NULL THEN
        v_cust_id := v_cust_ids[1];
      END IF;

      IF v_method = 'khata' THEN
        v_paid := 0;
        v_due  := v_total;
      ELSIF v_method = 'partial' THEN
        v_paid := ROUND(v_total * 0.5, 0);
        v_due  := v_total - v_paid;
      ELSE
        v_paid := v_total;
        v_due  := 0;
      END IF;

      SELECT COALESCE(MAX(bill_number), 1000) + 1 INTO v_bill_no
      FROM public.sales WHERE branch_id = v_cur_branch;

      INSERT INTO public.sales (
        business_id, branch_id, customer_id, cashier_member_id, bill_number,
        status, subtotal_amount, discount_amount, tax_amount, total_amount,
        paid_amount, due_amount, change_given, refunded_amount, fbr_status,
        client_sync_id, notes, sold_at
      ) VALUES (
        v_business_id, v_cur_branch, v_cust_id, v_owner_member_id, v_bill_no,
        'completed', v_subtotal, v_discount, 0, v_total,
        v_paid, v_due, 0, 0, 'not_required',
        'DEMO-FOOTWEAR-SALE-' || lpad(v_i::TEXT, 2, '0'),
        'Demo footwear sale',
        v_sold_at
      )
      RETURNING id INTO v_sale_id;

      INSERT INTO public.sale_items (
        business_id, sale_id, product_id, variant_id,
        product_name_snapshot, variant_label_snapshot, sku_snapshot,
        unit_cost_snapshot, unit_price, original_unit_price,
        quantity, line_discount_amount, tax_amount, line_total
      ) VALUES (
        v_business_id, v_sale_id, v_prod_id, v_var_id,
        v_vsku, v_col, v_sz,
        0, v_first_sale_price, v_first_sale_price,
        v_qty1, 0, 0, v_subtotal
      )
      RETURNING id INTO v_sale_item_id;

      -- Deduct stock via stock_levels + stock_movements
      UPDATE public.stock_levels
      SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_qty1)
      WHERE branch_id = v_cur_branch AND variant_id = v_var_id;

      INSERT INTO public.stock_movements (
        business_id, branch_id, variant_id, movement_type, quantity_delta,
        unit_cost, reference_type, reference_id, reason, performed_by, created_at
      ) VALUES (
        v_business_id, v_cur_branch, v_var_id, 'sale', -v_qty1,
        0, 'sale', v_sale_id, 'Bill #' || v_bill_no, v_owner_member_id, v_sold_at
      );

      -- Payment legs
      IF v_method = 'split' THEN
        INSERT INTO public.sale_payments (business_id, branch_id, sale_id, method_code, amount, tendered_amount, recorded_by, paid_at)
        VALUES
          (v_business_id, v_cur_branch, v_sale_id, 'cash', ROUND(v_total * 0.5, 0), ROUND(v_total * 0.5, 0), v_owner_member_id, v_sold_at),
          (v_business_id, v_cur_branch, v_sale_id, 'jazz', v_total - ROUND(v_total * 0.5, 0), NULL, v_owner_member_id, v_sold_at);
      ELSIF v_method = 'partial' THEN
        INSERT INTO public.sale_payments (business_id, branch_id, sale_id, method_code, amount, tendered_amount, recorded_by, paid_at)
        VALUES
          (v_business_id, v_cur_branch, v_sale_id, 'cash',  v_paid, v_paid, v_owner_member_id, v_sold_at),
          (v_business_id, v_cur_branch, v_sale_id, 'khata', v_due,  NULL,   v_owner_member_id, v_sold_at);
      ELSE
        INSERT INTO public.sale_payments (business_id, branch_id, sale_id, method_code, amount, tendered_amount, recorded_by, paid_at)
        VALUES (v_business_id, v_cur_branch, v_sale_id, v_method, v_total, CASE WHEN v_method = 'cash' THEN v_total ELSE NULL END, v_owner_member_id, v_sold_at);
      END IF;

      -- Update Khata ledger if due > 0
      IF v_due > 0 AND v_cust_id IS NOT NULL THEN
        UPDATE public.customers
        SET khata_balance = khata_balance + v_due, last_activity_at = v_sold_at
        WHERE id = v_cust_id
        RETURNING khata_balance INTO v_running_bal;

        INSERT INTO public.customer_ledger (
          business_id, branch_id, customer_id, entry_type, reference_type, reference_id,
          debit_amount, credit_amount, running_balance, notes, recorded_by, occurred_at
        ) VALUES (
          v_business_id, v_cur_branch, v_cust_id, 'sale_credit', 'sale', v_sale_id,
          v_due, 0, v_running_bal, 'Credit sale Bill #' || v_bill_no, v_owner_member_id, v_sold_at
        );
      END IF;

      -- Receipt snapshot
      INSERT INTO public.receipts (business_id, branch_id, sale_id, receipt_number, render_format, payload, generated_at)
      VALUES (
        v_business_id, v_cur_branch, v_sale_id, 'RCP-' || v_bill_no, 'thermal_80mm',
        jsonb_build_object('bill_number', v_bill_no, 'total_amount', v_total, 'paid_amount', v_paid, 'due_amount', v_due),
        v_sold_at
      );

      -- Save references to first 4 Main-branch sales for returns & exchanges demo
      IF v_i = 1 THEN
        v_first_sale_id := v_sale_id; v_first_sale_item := v_sale_item_id; v_first_sale_var := v_var_id;
      ELSIF v_i = 2 THEN
        v_second_sale_id := v_sale_id; v_second_sale_item := v_sale_item_id; v_second_sale_var := v_var_id;
      ELSIF v_i = 3 THEN
        v_third_sale_id := v_sale_id; v_third_sale_item := v_sale_item_id; v_third_sale_var := v_var_id;
      ELSIF v_i = 4 THEN
        v_fourth_sale_id := v_sale_id; v_fourth_sale_item := v_sale_item_id; v_fourth_sale_var := v_var_id;
      END IF;
    END LOOP;
  END IF;

  -- 10. Seed 2 Held Bills (without deducting stock)
  IF NOT EXISTS (
    SELECT 1 FROM public.held_bills WHERE business_id = v_business_id AND status = 'held'
  ) AND array_length(v_var_ids, 1) >= 2 THEN
    INSERT INTO public.held_bills (business_id, branch_id, cashier_member_id, customer_id, hold_number, cart_payload, note, status)
    VALUES
      (
        v_business_id, v_main_branch_id, v_owner_member_id, v_cust_ids[1], 101,
        jsonb_build_array(jsonb_build_object(
          'key', v_var_ids[1], 'productId', v_var_prod_ids[1], 'variantId', v_var_ids[1],
          'name', v_var_names[1], 'variantText', v_var_labels[1], 'colourName', split_part(v_var_labels[1], ' · ', 1),
          'sizeName', split_part(v_var_labels[1], ' ', 4), 'sizingSystem', 'EU',
          'sku', v_var_skus[1], 'price', v_var_prices[1], 'originalPrice', v_var_prices[1],
          'qty', 1, 'lineDiscount', 0
        )),
        'Demo held bill — customer checking another size',
        'held'
      ),
      (
        v_business_id, v_main_branch_id, v_owner_member_id, v_cust_ids[2], 102,
        jsonb_build_array(jsonb_build_object(
          'key', v_var_ids[2], 'productId', v_var_prod_ids[2], 'variantId', v_var_ids[2],
          'name', v_var_names[2], 'variantText', v_var_labels[2], 'colourName', split_part(v_var_labels[2], ' · ', 1),
          'sizeName', split_part(v_var_labels[2], ' ', 4), 'sizingSystem', 'EU',
          'sku', v_var_skus[2], 'price', v_var_prices[2], 'originalPrice', v_var_prices[2],
          'qty', 1, 'lineDiscount', 0
        )),
        'Demo held bill — waiting for companion to confirm colour',
        'held'
      );
  END IF;

  -- 11. Seed Sample Stock Adjustments (damage, shrinkage, manual positive count correction)
  IF NOT EXISTS (
    SELECT 1 FROM public.stock_movements
    WHERE business_id = v_business_id AND reference_type IN ('demo_adjustment', 'seed_adjustment')
  ) AND array_length(v_var_ids, 1) >= 4 THEN
    INSERT INTO public.stock_movements (business_id, branch_id, variant_id, movement_type, quantity_delta, unit_cost, reference_type, reason, performed_by, created_at)
    VALUES
      (v_business_id, v_main_branch_id, v_var_ids[1], 'damage',     -1, v_var_costs[1], 'demo_adjustment', 'Scuffed display pair (right shoe)', v_owner_member_id, now() - INTERVAL '4 days'),
      (v_business_id, v_main_branch_id, v_var_ids[2], 'shrinkage',  -1, v_var_costs[2], 'demo_adjustment', 'Missing box during rack audit',     v_owner_member_id, now() - INTERVAL '3 days'),
      (v_business_id, v_main_branch_id, v_var_ids[3], 'adjustment',  2, v_var_costs[3], 'demo_adjustment', 'Found 2 extra pairs in backstore',  v_owner_member_id, now() - INTERVAL '2 days');
  END IF;

  -- 12. Seed 1 Completed Stock Count Session
  IF NOT EXISTS (
    SELECT 1 FROM public.stock_counts
    WHERE business_id = v_business_id AND count_number IN ('CNT-DEMO-001', 'CNT-0001')
  ) AND array_length(v_var_ids, 1) >= 3 THEN
    INSERT INTO public.stock_counts (business_id, branch_id, count_number, status, counted_by, approved_by, completed_at, notes)
    VALUES (v_business_id, v_main_branch_id, 'CNT-DEMO-001', 'approved', v_owner_member_id, v_owner_member_id, now() - INTERVAL '1 day', 'Weekly footwear shelf audit (Demo)')
    RETURNING id INTO v_count_id;

    INSERT INTO public.stock_count_items (business_id, stock_count_id, variant_id, expected_qty, counted_qty, notes)
    SELECT v_business_id, v_count_id, sl.variant_id, sl.quantity_on_hand,
           CASE WHEN sl.variant_id = v_var_ids[1] THEN GREATEST(0, sl.quantity_on_hand - 1) ELSE sl.quantity_on_hand END,
           CASE WHEN sl.variant_id = v_var_ids[1] THEN '1 pair short on sneaker wall' ELSE 'Verified exact' END
    FROM public.stock_levels sl
    WHERE sl.branch_id = v_main_branch_id AND sl.variant_id = ANY(v_var_ids[1:3])
    ON CONFLICT DO NOTHING;
  END IF;

  -- 13. Seed 2 Returns (1 Resellable restocked + 1 Damaged NOT restocked)
  IF v_first_sale_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_returns WHERE business_id = v_business_id AND return_number = 'RET-DEMO-001'
  ) THEN
    SELECT unit_price INTO v_first_sale_price FROM public.sale_items WHERE id = v_first_sale_item;

    INSERT INTO public.sales_returns (business_id, branch_id, original_sale_id, return_number, return_type, status, total_return_amount, reason, processed_by, returned_at)
    VALUES (v_business_id, v_main_branch_id, v_first_sale_id, 'RET-DEMO-001', 'with_bill', 'completed', v_first_sale_price, 'Wrong size — customer requested cash refund', v_owner_member_id, now() - INTERVAL '10 hours')
    RETURNING id INTO v_return_id;

    INSERT INTO public.sales_return_items (business_id, sales_return_id, original_sale_item_id, variant_id, product_name_snapshot, variant_label_snapshot, quantity, unit_price, line_total, condition, restocked)
    SELECT v_business_id, v_return_id, si.id, si.variant_id, si.product_name_snapshot, si.variant_label_snapshot, 1, si.unit_price, si.unit_price, 'resellable', true
    FROM public.sale_items si WHERE si.id = v_first_sale_item;

    UPDATE public.sale_items SET returned_quantity = returned_quantity + 1 WHERE id = v_first_sale_item;
    UPDATE public.sales SET refunded_amount = refunded_amount + v_first_sale_price, status = 'refunded' WHERE id = v_first_sale_id;

    INSERT INTO public.stock_movements (business_id, branch_id, variant_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by, created_at)
    VALUES (v_business_id, v_main_branch_id, v_first_sale_var, 'sale_return', 1, 0, 'sales_return', v_return_id, 'Resellable return RET-DEMO-001', v_owner_member_id, now() - INTERVAL '10 hours');

    INSERT INTO public.refunds (business_id, branch_id, sales_return_id, refund_number, total_amount, paid_amount, status, issued_by, issued_at)
    VALUES (v_business_id, v_main_branch_id, v_return_id, 'RFD-DEMO-001', v_first_sale_price, v_first_sale_price, 'paid', v_owner_member_id, now() - INTERVAL '10 hours')
    RETURNING id INTO v_refund_id;

    INSERT INTO public.refund_payments (business_id, branch_id, refund_id, method_code, amount, paid_by, paid_at)
    VALUES (v_business_id, v_main_branch_id, v_refund_id, 'cash', v_first_sale_price, v_owner_member_id, now() - INTERVAL '10 hours');
  END IF;

  IF v_second_sale_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_returns WHERE business_id = v_business_id AND return_number = 'RET-DEMO-002'
  ) THEN
    SELECT unit_price INTO v_second_sale_price FROM public.sale_items WHERE id = v_second_sale_item;

    INSERT INTO public.sales_returns (business_id, branch_id, original_sale_id, return_number, return_type, status, total_return_amount, reason, processed_by, returned_at)
    VALUES (v_business_id, v_main_branch_id, v_second_sale_id, 'RET-DEMO-002', 'with_bill', 'completed', v_second_sale_price, 'Damaged sole stitching — not restocked', v_owner_member_id, now() - INTERVAL '8 hours')
    RETURNING id INTO v_return_id;

    INSERT INTO public.sales_return_items (business_id, sales_return_id, original_sale_item_id, variant_id, product_name_snapshot, variant_label_snapshot, quantity, unit_price, line_total, condition, restocked)
    SELECT v_business_id, v_return_id, si.id, si.variant_id, si.product_name_snapshot, si.variant_label_snapshot, 1, si.unit_price, si.unit_price, 'damaged', false
    FROM public.sale_items si WHERE si.id = v_second_sale_item;

    UPDATE public.sale_items SET returned_quantity = returned_quantity + 1 WHERE id = v_second_sale_item;
    UPDATE public.sales SET refunded_amount = refunded_amount + v_second_sale_price, status = 'refunded' WHERE id = v_second_sale_id;

    INSERT INTO public.refunds (business_id, branch_id, sales_return_id, refund_number, total_amount, paid_amount, status, issued_by, issued_at)
    VALUES (v_business_id, v_main_branch_id, v_return_id, 'RFD-DEMO-002', v_second_sale_price, v_second_sale_price, 'paid', v_owner_member_id, now() - INTERVAL '8 hours')
    RETURNING id INTO v_refund_id;

    INSERT INTO public.refund_payments (business_id, branch_id, refund_id, method_code, amount, paid_by, paid_at)
    VALUES (v_business_id, v_main_branch_id, v_refund_id, 'bank', v_second_sale_price, v_owner_member_id, now() - INTERVAL '8 hours');
  END IF;

  -- 14. Seed 1 Footwear Size Exchange (preserving original sale)
  IF v_third_sale_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.exchanges WHERE business_id = v_business_id AND exchange_number = 'EXC-DEMO-001'
  ) THEN
    SELECT unit_price INTO v_third_sale_price FROM public.sale_items WHERE id = v_third_sale_item;

    -- Find a sibling variant of the same product with stock
    SELECT pv.id, pv.product_id, COALESCE(pv.selling_price, p.base_selling_price), p.name, pv.variant_name, pv.sku
    INTO v_var_id, v_prod_id, v_fourth_sale_price, v_vsku, v_col, v_sz
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    JOIN public.stock_levels sl ON sl.variant_id = pv.id AND sl.branch_id = v_main_branch_id
    WHERE pv.product_id = (SELECT product_id FROM public.product_variants WHERE id = v_third_sale_var)
      AND pv.id <> v_third_sale_var
      AND sl.quantity_on_hand >= 1
    LIMIT 1;

    IF v_var_id IS NOT NULL THEN
      INSERT INTO public.sales_returns (business_id, branch_id, original_sale_id, return_number, return_type, status, total_return_amount, reason, processed_by, returned_at)
      VALUES (v_business_id, v_main_branch_id, v_third_sale_id, 'RET-EXC-DEMO-001', 'with_bill', 'completed', v_third_sale_price, 'Size exchange (Demo)', v_owner_member_id, now() - INTERVAL '5 hours')
      RETURNING id INTO v_return_id;

      INSERT INTO public.sales_return_items (business_id, sales_return_id, original_sale_item_id, variant_id, product_name_snapshot, variant_label_snapshot, quantity, unit_price, line_total, condition, restocked)
      SELECT v_business_id, v_return_id, si.id, si.variant_id, si.product_name_snapshot, si.variant_label_snapshot, 1, si.unit_price, si.unit_price, 'resellable', true
      FROM public.sale_items si WHERE si.id = v_third_sale_item;

      UPDATE public.sale_items SET returned_quantity = returned_quantity + 1 WHERE id = v_third_sale_item;

      SELECT COALESCE(MAX(bill_number), 1000) + 1 INTO v_bill_no FROM public.sales WHERE branch_id = v_main_branch_id;

      INSERT INTO public.sales (
        business_id, branch_id, cashier_member_id, bill_number, status,
        subtotal_amount, discount_amount, tax_amount, total_amount, paid_amount, due_amount,
        notes, sold_at
      ) VALUES (
        v_business_id, v_main_branch_id, v_owner_member_id, v_bill_no, 'completed',
        v_fourth_sale_price, 0, 0, v_fourth_sale_price, v_fourth_sale_price, 0,
        'Replacement for exchange EXC-DEMO-001', now() - INTERVAL '5 hours'
      )
      RETURNING id INTO v_repl_sale_id;

      INSERT INTO public.sale_items (
        business_id, sale_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, sku_snapshot,
        unit_cost_snapshot, unit_price, original_unit_price, quantity, line_discount_amount, tax_amount, line_total
      ) VALUES (
        v_business_id, v_repl_sale_id, v_prod_id, v_var_id, v_vsku, v_col, v_sz,
        0, v_fourth_sale_price, v_fourth_sale_price, 1, 0, 0, v_fourth_sale_price
      );

      INSERT INTO public.exchanges (
        business_id, branch_id, sales_return_id, replacement_sale_id, exchange_number,
        return_credit_amount, replacement_total_amount, net_difference_amount, processed_by, exchanged_at
      ) VALUES (
        v_business_id, v_main_branch_id, v_return_id, v_repl_sale_id, 'EXC-DEMO-001',
        v_third_sale_price, v_fourth_sale_price, v_fourth_sale_price - v_third_sale_price, v_owner_member_id, now() - INTERVAL '5 hours'
      )
      RETURNING id INTO v_exchange_id;

      INSERT INTO public.exchange_items (business_id, exchange_id, direction, variant_id, quantity, unit_price, line_total)
      VALUES
        (v_business_id, v_exchange_id, 'returned',    v_third_sale_var, 1, v_third_sale_price,  v_third_sale_price),
        (v_business_id, v_exchange_id, 'replacement', v_var_id,         1, v_fourth_sale_price, v_fourth_sale_price);

      INSERT INTO public.stock_movements (business_id, branch_id, variant_id, movement_type, quantity_delta, unit_cost, reference_type, reference_id, reason, performed_by, created_at)
      VALUES
        (v_business_id, v_main_branch_id, v_third_sale_var, 'exchange_in',   1, 0, 'exchange', v_exchange_id, 'Exchange EXC-DEMO-001 returned',    v_owner_member_id, now() - INTERVAL '5 hours'),
        (v_business_id, v_main_branch_id, v_var_id,         'exchange_out', -1, 0, 'exchange', v_exchange_id, 'Exchange EXC-DEMO-001 replacement', v_owner_member_id, now() - INTERVAL '5 hours');
    END IF;
  END IF;

  -- 15. Reconcile stock_levels.quantity_on_hand from SUM(stock_movements.quantity_delta)
  --     so every variant in every branch is 100% consistent with its movement ledger.
  UPDATE public.stock_levels sl
  SET quantity_on_hand = GREATEST(0, COALESCE(mv.net_qty, 0))
  FROM (
    SELECT branch_id, variant_id, SUM(quantity_delta) AS net_qty
    FROM public.stock_movements
    WHERE business_id = v_business_id
    GROUP BY branch_id, variant_id
  ) mv
  WHERE sl.business_id = v_business_id
    AND sl.branch_id = mv.branch_id
    AND sl.variant_id = mv.variant_id;

  RAISE NOTICE 'ZYRO Footwear demo seed completed cleanly for business % (Main branch %, Branch 2 %).',
    v_business_id, v_main_branch_id, v_branch2_id;
END $$;
