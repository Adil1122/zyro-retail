// Auto-aligned Supabase PostgreSQL Database types for ZYRO Retail POS
// Covers all 97 tables, 4 security-invoker views, and atomic PL/pgSQL RPCs.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          phone: string;
          email: string | null;
          currency: string;
          timezone: string;
          shop_kit: string;
          status: string;
          owner_user_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          phone: string;
          email?: string | null;
          currency?: string;
          timezone?: string;
          shop_kit?: string;
          status?: string;
          owner_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          phone?: string;
          email?: string | null;
          currency?: string;
          timezone?: string;
          shop_kit?: string;
          status?: string;
          owner_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          short_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          avatar_bg: string;
          avatar_fg: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          short_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          avatar_bg?: string;
          avatar_fg?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          short_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          avatar_bg?: string;
          avatar_fg?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      permissions: {
        Row: {
          id: string;
          permission_key: string;
          module: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          permission_key: string;
          module: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          permission_key?: string;
          module?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [
        ];
      };
      roles: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          display_name: string;
          is_system_role: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          display_name: string;
          is_system_role?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          display_name?: string;
          is_system_role?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          id: string;
          business_id: string;
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          code: string | null;
          city: string | null;
          address: string | null;
          phone: string | null;
          is_main: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          code?: string | null;
          city?: string | null;
          address?: string | null;
          phone?: string | null;
          is_main?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          code?: string | null;
          city?: string | null;
          address?: string | null;
          phone?: string | null;
          is_main?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          invited_name: string | null;
          invited_phone: string | null;
          role_id: string;
          status: string;
          joined_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          invited_name?: string | null;
          invited_phone?: string | null;
          role_id: string;
          status?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          invited_name?: string | null;
          invited_phone?: string | null;
          role_id?: string;
          status?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      member_branch_access: {
        Row: {
          id: string;
          business_id: string;
          member_id: string;
          branch_id: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          member_id: string;
          branch_id: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          member_id?: string;
          branch_id?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_branch_access_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_branch_access_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_branch_access_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_devices: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_name: string;
          device_type: string;
          status: string;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_name: string;
          device_type?: string;
          status?: string;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_name?: string;
          device_type?: string;
          status?: string;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pos_devices_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_devices_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      device_sessions: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string;
          member_id: string;
          started_at: string;
          ended_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id: string;
          member_id: string;
          started_at?: string;
          ended_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string;
          member_id?: string;
          started_at?: string;
          ended_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "device_sessions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "device_sessions_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "device_sessions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          parent_id: string | null;
          name: string;
          category_type: string;
          size_set_id: string | null;
          art_id: string | null;
          attribute_schema: Json;
          counter_visible: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          parent_id?: string | null;
          name: string;
          category_type?: string;
          size_set_id?: string | null;
          art_id?: string | null;
          attribute_schema?: Json;
          counter_visible?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          parent_id?: string | null;
          name?: string;
          category_type?: string;
          size_set_id?: string | null;
          art_id?: string | null;
          attribute_schema?: Json;
          counter_visible?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          sku: string | null;
          name: string;
          brand: string | null;
          art_id: string | null;
          description: string | null;
          unit_of_measure: string;
          is_measured: boolean;
          track_inventory: boolean;
          allow_negative_stock: boolean;
          has_variants: boolean;
          requires_batch: boolean;
          requires_expiry: boolean;
          requires_serial: boolean;
          base_cost_price: number;
          base_selling_price: number;
          karat: string | null;
          weight_grams: number | null;
          making_charge: number | null;
          warranty_months: number | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          sku?: string | null;
          name: string;
          brand?: string | null;
          art_id?: string | null;
          description?: string | null;
          unit_of_measure?: string;
          is_measured?: boolean;
          track_inventory?: boolean;
          allow_negative_stock?: boolean;
          has_variants?: boolean;
          requires_batch?: boolean;
          requires_expiry?: boolean;
          requires_serial?: boolean;
          base_cost_price?: number;
          base_selling_price?: number;
          karat?: string | null;
          weight_grams?: number | null;
          making_charge?: number | null;
          warranty_months?: number | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          sku?: string | null;
          name?: string;
          brand?: string | null;
          art_id?: string | null;
          description?: string | null;
          unit_of_measure?: string;
          is_measured?: boolean;
          track_inventory?: boolean;
          allow_negative_stock?: boolean;
          has_variants?: boolean;
          requires_batch?: boolean;
          requires_expiry?: boolean;
          requires_serial?: boolean;
          base_cost_price?: number;
          base_selling_price?: number;
          karat?: string | null;
          weight_grams?: number | null;
          making_charge?: number | null;
          warranty_months?: number | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          storage_path: string;
          image_url: string | null;
          is_primary: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          storage_path: string;
          image_url?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          storage_path?: string;
          image_url?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_attributes: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          display_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          display_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          display_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_attributes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          sku: string | null;
          variant_name: string;
          colour_name: string | null;
          size_name: string | null;
          shade_name: string | null;
          cost_price: number;
          selling_price: number | null;
          reorder_level: number;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          sku?: string | null;
          variant_name?: string;
          colour_name?: string | null;
          size_name?: string | null;
          shade_name?: string | null;
          cost_price?: number;
          selling_price?: number | null;
          reorder_level?: number;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          sku?: string | null;
          variant_name?: string;
          colour_name?: string | null;
          size_name?: string | null;
          shade_name?: string | null;
          cost_price?: number;
          selling_price?: number | null;
          reorder_level?: number;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_attribute_values: {
        Row: {
          id: string;
          business_id: string;
          variant_id: string;
          attribute_id: string;
          attribute_value: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          variant_id: string;
          attribute_id: string;
          attribute_value: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          variant_id?: string;
          attribute_id?: string;
          attribute_value?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_attribute_values_attribute_id_fkey";
            columns: ["attribute_id"];
            isOneToOne: false;
            referencedRelation: "product_attributes";
            referencedColumns: ["id"];
          },
        ];
      };
      product_barcodes: {
        Row: {
          id: string;
          business_id: string;
          variant_id: string;
          barcode: string;
          barcode_type: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          variant_id: string;
          barcode: string;
          barcode_type?: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          variant_id?: string;
          barcode?: string;
          barcode_type?: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_barcodes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_barcodes_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_batches: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          batch_number: string;
          manufacture_date: string | null;
          expiry_date: string | null;
          cost_price: number;
          quantity_on_hand: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          batch_number: string;
          manufacture_date?: string | null;
          expiry_date?: string | null;
          cost_price?: number;
          quantity_on_hand?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          variant_id?: string;
          batch_number?: string;
          manufacture_date?: string | null;
          expiry_date?: string | null;
          cost_price?: number;
          quantity_on_hand?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_batches_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_batches_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_batches_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      serial_numbers: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          serial_number: string;
          imei_secondary: string | null;
          status: string;
          goods_receipt_id: string | null;
          sold_sale_item_id: string | null;
          warranty_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          serial_number: string;
          imei_secondary?: string | null;
          status?: string;
          goods_receipt_id?: string | null;
          sold_sale_item_id?: string | null;
          warranty_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          variant_id?: string;
          serial_number?: string;
          imei_secondary?: string | null;
          status?: string;
          goods_receipt_id?: string | null;
          sold_sale_item_id?: string | null;
          warranty_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "serial_numbers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_sold_sale_item_id_fkey";
            columns: ["sold_sale_item_id"];
            isOneToOne: false;
            referencedRelation: "sale_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_goods_receipt_id_fkey";
            columns: ["goods_receipt_id"];
            isOneToOne: false;
            referencedRelation: "goods_receipts";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_levels: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          quantity_on_hand: number;
          quantity_reserved: number;
          reorder_level: number;
          average_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          reorder_level?: number;
          average_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          variant_id?: string;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          reorder_level?: number;
          average_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_levels_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_levels_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_levels_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          batch_id: string | null;
          movement_type: string;
          quantity_delta: number;
          unit_cost: number;
          reference_type: string | null;
          reference_id: string | null;
          reason: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          batch_id?: string | null;
          movement_type: string;
          quantity_delta: number;
          unit_cost?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          reason?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          variant_id?: string;
          batch_id?: string | null;
          movement_type?: string;
          quantity_delta?: number;
          unit_cost?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          reason?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_counts: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          count_number: string;
          status: string;
          counted_by: string | null;
          approved_by: string | null;
          started_at: string;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          count_number: string;
          status?: string;
          counted_by?: string | null;
          approved_by?: string | null;
          started_at?: string;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          count_number?: string;
          status?: string;
          counted_by?: string | null;
          approved_by?: string | null;
          started_at?: string;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_counts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_counts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_counts_counted_by_fkey";
            columns: ["counted_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_counts_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_count_items: {
        Row: {
          id: string;
          business_id: string;
          stock_count_id: string;
          variant_id: string;
          batch_id: string | null;
          expected_qty: number;
          counted_qty: number | null;
          variance_qty: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          stock_count_id: string;
          variant_id: string;
          batch_id?: string | null;
          expected_qty?: number;
          counted_qty?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          stock_count_id?: string;
          variant_id?: string;
          batch_id?: string | null;
          expected_qty?: number;
          counted_qty?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_count_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_count_items_stock_count_id_fkey";
            columns: ["stock_count_id"];
            isOneToOne: false;
            referencedRelation: "stock_counts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_count_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_count_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_transfers: {
        Row: {
          id: string;
          business_id: string;
          from_branch_id: string;
          to_branch_id: string;
          transfer_number: string;
          status: string;
          requested_by: string | null;
          approved_by: string | null;
          received_by: string | null;
          sent_at: string | null;
          received_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          from_branch_id: string;
          to_branch_id: string;
          transfer_number: string;
          status?: string;
          requested_by?: string | null;
          approved_by?: string | null;
          received_by?: string | null;
          sent_at?: string | null;
          received_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          from_branch_id?: string;
          to_branch_id?: string;
          transfer_number?: string;
          status?: string;
          requested_by?: string | null;
          approved_by?: string | null;
          received_by?: string | null;
          sent_at?: string | null;
          received_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_transfers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey";
            columns: ["from_branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey";
            columns: ["to_branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_received_by_fkey";
            columns: ["received_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_transfer_items: {
        Row: {
          id: string;
          business_id: string;
          transfer_id: string;
          variant_id: string;
          batch_id: string | null;
          quantity_sent: number;
          quantity_received: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          transfer_id: string;
          variant_id: string;
          batch_id?: string | null;
          quantity_sent: number;
          quantity_received?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          transfer_id?: string;
          variant_id?: string;
          batch_id?: string | null;
          quantity_sent?: number;
          quantity_received?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey";
            columns: ["transfer_id"];
            isOneToOne: false;
            referencedRelation: "stock_transfers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfer_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfer_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_reservations: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          batch_id: string | null;
          source_type: string;
          source_id: string;
          quantity: number;
          status: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          variant_id: string;
          batch_id?: string | null;
          source_type: string;
          source_id: string;
          quantity: number;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          variant_id?: string;
          batch_id?: string | null;
          source_type?: string;
          source_id?: string;
          quantity?: number;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_reservations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_reservations_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_reservations_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_reservations_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_methods: {
        Row: {
          id: string;
          business_id: string;
          method_code: string;
          display_name: string;
          account_label: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          method_code: string;
          display_name: string;
          account_label?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          method_code?: string;
          display_name?: string;
          account_label?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_methods_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      printers: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string | null;
          name: string;
          connection_type: string;
          paper_width: string;
          auto_print: boolean;
          open_drawer_on_cash: boolean;
          copies: number;
          status: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id?: string | null;
          name: string;
          connection_type?: string;
          paper_width?: string;
          auto_print?: boolean;
          open_drawer_on_cash?: boolean;
          copies?: number;
          status?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string | null;
          name?: string;
          connection_type?: string;
          paper_width?: string;
          auto_print?: boolean;
          open_drawer_on_cash?: boolean;
          copies?: number;
          status?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "printers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "printers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "printers_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      receipt_templates: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          header_note: string | null;
          footer_note: string | null;
          show_phone: boolean;
          show_address: boolean;
          show_cashier: boolean;
          show_barcode: boolean;
          show_urdu_labels: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name?: string;
          header_note?: string | null;
          footer_note?: string | null;
          show_phone?: boolean;
          show_address?: boolean;
          show_cashier?: boolean;
          show_barcode?: boolean;
          show_urdu_labels?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          header_note?: string | null;
          footer_note?: string | null;
          show_phone?: boolean;
          show_address?: boolean;
          show_cashier?: boolean;
          show_barcode?: boolean;
          show_urdu_labels?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipt_templates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string | null;
          shift_id: string | null;
          customer_id: string | null;
          cashier_member_id: string | null;
          bill_number: number;
          status: string;
          subtotal_amount: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          paid_amount: number;
          due_amount: number;
          change_given: number;
          refunded_amount: number;
          fbr_status: string;
          fbr_invoice_no: string | null;
          client_sync_id: string | null;
          offline_pending: boolean;
          notes: string | null;
          sold_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id?: string | null;
          shift_id?: string | null;
          customer_id?: string | null;
          cashier_member_id?: string | null;
          bill_number: number;
          status?: string;
          subtotal_amount?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          due_amount?: number;
          change_given?: number;
          refunded_amount?: number;
          fbr_status?: string;
          fbr_invoice_no?: string | null;
          client_sync_id?: string | null;
          offline_pending?: boolean;
          notes?: string | null;
          sold_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string | null;
          shift_id?: string | null;
          customer_id?: string | null;
          cashier_member_id?: string | null;
          bill_number?: number;
          status?: string;
          subtotal_amount?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          due_amount?: number;
          change_given?: number;
          refunded_amount?: number;
          fbr_status?: string;
          fbr_invoice_no?: string | null;
          client_sync_id?: string | null;
          offline_pending?: boolean;
          notes?: string | null;
          sold_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_cashier_member_id_fkey";
            columns: ["cashier_member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          product_id: string;
          variant_id: string;
          batch_id: string | null;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          sku_snapshot: string | null;
          unit_cost_snapshot: number;
          unit_price: number;
          original_unit_price: number;
          quantity: number;
          line_discount_amount: number;
          tax_amount: number;
          line_total: number;
          returned_quantity: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sale_id: string;
          product_id: string;
          variant_id: string;
          batch_id?: string | null;
          product_name_snapshot: string;
          variant_label_snapshot?: string;
          sku_snapshot?: string | null;
          unit_cost_snapshot?: number;
          unit_price: number;
          original_unit_price: number;
          quantity: number;
          line_discount_amount?: number;
          tax_amount?: number;
          line_total: number;
          returned_quantity?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          sale_id?: string;
          product_id?: string;
          variant_id?: string;
          batch_id?: string | null;
          product_name_snapshot?: string;
          variant_label_snapshot?: string;
          sku_snapshot?: string | null;
          unit_cost_snapshot?: number;
          unit_price?: number;
          original_unit_price?: number;
          quantity?: number;
          line_discount_amount?: number;
          tax_amount?: number;
          line_total?: number;
          returned_quantity?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_discounts: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          sale_item_id: string | null;
          discount_scope: string;
          discount_mode: string;
          discount_value: number;
          discount_amount: number;
          reason: string | null;
          applied_by: string | null;
          approved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sale_id: string;
          sale_item_id?: string | null;
          discount_scope: string;
          discount_mode: string;
          discount_value: number;
          discount_amount: number;
          reason?: string | null;
          applied_by?: string | null;
          approved_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          sale_id?: string;
          sale_item_id?: string | null;
          discount_scope?: string;
          discount_mode?: string;
          discount_value?: number;
          discount_amount?: number;
          reason?: string | null;
          applied_by?: string | null;
          approved_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_discounts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_discounts_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_discounts_sale_item_id_fkey";
            columns: ["sale_item_id"];
            isOneToOne: false;
            referencedRelation: "sale_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_discounts_applied_by_fkey";
            columns: ["applied_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_discounts_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_payments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          sale_id: string;
          shift_id: string | null;
          payment_method_id: string | null;
          method_code: string;
          amount: number;
          tendered_amount: number | null;
          reference_no: string | null;
          status: string;
          recorded_by: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          sale_id: string;
          shift_id?: string | null;
          payment_method_id?: string | null;
          method_code: string;
          amount: number;
          tendered_amount?: number | null;
          reference_no?: string | null;
          status?: string;
          recorded_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          sale_id?: string;
          shift_id?: string | null;
          payment_method_id?: string | null;
          method_code?: string;
          amount?: number;
          tendered_amount?: number | null;
          reference_no?: string | null;
          status?: string;
          recorded_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_payments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_payments_payment_method_id_fkey";
            columns: ["payment_method_id"];
            isOneToOne: false;
            referencedRelation: "payment_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_payments_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      held_bills: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string | null;
          cashier_member_id: string | null;
          customer_id: string | null;
          hold_number: number;
          cart_payload: Json;
          discount_payload: Json | null;
          note: string | null;
          status: string;
          held_at: string;
          resumed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id?: string | null;
          cashier_member_id?: string | null;
          customer_id?: string | null;
          hold_number: number;
          cart_payload?: Json;
          discount_payload?: Json | null;
          note?: string | null;
          status?: string;
          held_at?: string;
          resumed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string | null;
          cashier_member_id?: string | null;
          customer_id?: string | null;
          hold_number?: number;
          cart_payload?: Json;
          discount_payload?: Json | null;
          note?: string | null;
          status?: string;
          held_at?: string;
          resumed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "held_bills_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "held_bills_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "held_bills_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "held_bills_cashier_member_id_fkey";
            columns: ["cashier_member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "held_bills_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      receipts: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          sale_id: string;
          template_id: string | null;
          receipt_number: string;
          render_format: string;
          payload: Json;
          generated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          sale_id: string;
          template_id?: string | null;
          receipt_number: string;
          render_format?: string;
          payload?: Json;
          generated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          sale_id?: string;
          template_id?: string | null;
          receipt_number?: string;
          render_format?: string;
          payload?: Json;
          generated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receipts_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "receipt_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      print_jobs: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string | null;
          printer_id: string | null;
          sale_id: string | null;
          receipt_id: string | null;
          job_type: string;
          status: string;
          copies: number;
          attempts: number;
          error_message: string | null;
          queued_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id?: string | null;
          printer_id?: string | null;
          sale_id?: string | null;
          receipt_id?: string | null;
          job_type?: string;
          status?: string;
          copies?: number;
          attempts?: number;
          error_message?: string | null;
          queued_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string | null;
          printer_id?: string | null;
          sale_id?: string | null;
          receipt_id?: string | null;
          job_type?: string;
          status?: string;
          copies?: number;
          attempts?: number;
          error_message?: string | null;
          queued_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "print_jobs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_printer_id_fkey";
            columns: ["printer_id"];
            isOneToOne: false;
            referencedRelation: "printers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "print_jobs_queued_by_fkey";
            columns: ["queued_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          full_name: string;
          phone: string | null;
          email: string | null;
          city: string | null;
          address: string | null;
          notes: string | null;
          khata_balance: number;
          refund_owed: number;
          last_activity_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          notes?: string | null;
          khata_balance?: number;
          refund_owed?: number;
          last_activity_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          notes?: string | null;
          khata_balance?: number;
          refund_owed?: number;
          last_activity_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_credit_limits: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          credit_limit: number;
          payment_terms_days: number;
          block_on_overdue: boolean;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          credit_limit?: number;
          payment_terms_days?: number;
          block_on_overdue?: boolean;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          credit_limit?: number;
          payment_terms_days?: number;
          block_on_overdue?: boolean;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_credit_limits_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_credit_limits_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_credit_limits_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_message_consents: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          channel: string;
          consented: boolean;
          evidence_note: string | null;
          consented_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          channel: string;
          consented?: boolean;
          evidence_note?: string | null;
          consented_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          channel?: string;
          consented?: boolean;
          evidence_note?: string | null;
          consented_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_message_consents_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_message_consents_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_orders: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          customer_id: string | null;
          order_number: string;
          source: string;
          status: string;
          customer_name_snapshot: string | null;
          customer_phone_snapshot: string | null;
          delivery_address: string | null;
          delivery_city: string | null;
          subtotal_amount: number;
          discount_amount: number;
          delivery_fee: number;
          total_amount: number;
          created_by: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          customer_id?: string | null;
          order_number: string;
          source?: string;
          status?: string;
          customer_name_snapshot?: string | null;
          customer_phone_snapshot?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          subtotal_amount?: number;
          discount_amount?: number;
          delivery_fee?: number;
          total_amount?: number;
          created_by?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          customer_id?: string | null;
          order_number?: string;
          source?: string;
          status?: string;
          customer_name_snapshot?: string | null;
          customer_phone_snapshot?: string | null;
          delivery_address?: string | null;
          delivery_city?: string | null;
          subtotal_amount?: number;
          discount_amount?: number;
          delivery_fee?: number;
          total_amount?: number;
          created_by?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_orders_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_order_items: {
        Row: {
          id: string;
          business_id: string;
          order_id: string;
          product_id: string;
          variant_id: string;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          unit_price: number;
          quantity: number;
          shipped_quantity: number;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          order_id: string;
          product_id: string;
          variant_id: string;
          product_name_snapshot: string;
          variant_label_snapshot?: string;
          unit_price: number;
          quantity: number;
          shipped_quantity?: number;
          line_total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string;
          product_name_snapshot?: string;
          variant_label_snapshot?: string;
          unit_price?: number;
          quantity?: number;
          shipped_quantity?: number;
          line_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_order_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "customer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          id: string;
          business_id: string;
          order_id: string;
          event_type: string;
          actor_member_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          order_id: string;
          event_type: string;
          actor_member_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          order_id?: string;
          event_type?: string;
          actor_member_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "customer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_events_actor_member_id_fkey";
            columns: ["actor_member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      shipments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          order_id: string;
          shipment_number: string;
          courier_name: string;
          tracking_number: string | null;
          city: string | null;
          status: string;
          cod_amount: number;
          needs_review: boolean;
          notes: string | null;
          dispatched_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          order_id: string;
          shipment_number: string;
          courier_name: string;
          tracking_number?: string | null;
          city?: string | null;
          status?: string;
          cod_amount?: number;
          needs_review?: boolean;
          notes?: string | null;
          dispatched_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          order_id?: string;
          shipment_number?: string;
          courier_name?: string;
          tracking_number?: string | null;
          city?: string | null;
          status?: string;
          cod_amount?: number;
          needs_review?: boolean;
          notes?: string | null;
          dispatched_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "customer_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      courier_settlements: {
        Row: {
          id: string;
          business_id: string;
          courier_name: string;
          settlement_ref: string;
          settlement_date: string;
          gross_cod_amount: number;
          courier_fee_amount: number;
          net_received_amount: number;
          status: string;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          courier_name: string;
          settlement_ref: string;
          settlement_date?: string;
          gross_cod_amount?: number;
          courier_fee_amount?: number;
          net_received_amount?: number;
          status?: string;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          courier_name?: string;
          settlement_ref?: string;
          settlement_date?: string;
          gross_cod_amount?: number;
          courier_fee_amount?: number;
          net_received_amount?: number;
          status?: string;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courier_settlements_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courier_settlements_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      courier_settlement_items: {
        Row: {
          id: string;
          business_id: string;
          settlement_id: string;
          shipment_id: string;
          cod_collected: number;
          courier_fee: number;
          net_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          settlement_id: string;
          shipment_id: string;
          cod_collected?: number;
          courier_fee?: number;
          net_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          settlement_id?: string;
          shipment_id?: string;
          cod_collected?: number;
          courier_fee?: number;
          net_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courier_settlement_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courier_settlement_items_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "courier_settlements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courier_settlement_items_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      quotations: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          customer_id: string | null;
          quote_number: string;
          customer_name_snapshot: string;
          status: string;
          valid_until: string;
          discount_payload: Json | null;
          subtotal_amount: number;
          discount_amount: number;
          total_amount: number;
          converted_sale_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          customer_id?: string | null;
          quote_number: string;
          customer_name_snapshot?: string;
          status?: string;
          valid_until: string;
          discount_payload?: Json | null;
          subtotal_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          converted_sale_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          customer_id?: string | null;
          quote_number?: string;
          customer_name_snapshot?: string;
          status?: string;
          valid_until?: string;
          discount_payload?: Json | null;
          subtotal_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          converted_sale_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_converted_sale_id_fkey";
            columns: ["converted_sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      quotation_items: {
        Row: {
          id: string;
          business_id: string;
          quotation_id: string;
          product_id: string;
          variant_id: string;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          unit_price: number;
          quantity: number;
          line_discount_amount: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          quotation_id: string;
          product_id: string;
          variant_id: string;
          product_name_snapshot: string;
          variant_label_snapshot?: string;
          unit_price: number;
          quantity: number;
          line_discount_amount?: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          quotation_id?: string;
          product_id?: string;
          variant_id?: string;
          product_name_snapshot?: string;
          variant_label_snapshot?: string;
          unit_price?: number;
          quantity?: number;
          line_discount_amount?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotation_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "quotations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_ledger: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          customer_id: string;
          entry_type: string;
          reference_type: string | null;
          reference_id: string | null;
          debit_amount: number;
          credit_amount: number;
          running_balance: number;
          due_date: string | null;
          notes: string | null;
          recorded_by: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          customer_id: string;
          entry_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          running_balance?: number;
          due_date?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          customer_id?: string;
          entry_type?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          running_balance?: number;
          due_date?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_ledger_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_ledger_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_ledger_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_ledger_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_payments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          customer_id: string;
          shift_id: string | null;
          payment_number: string;
          method_code: string;
          amount: number;
          reference_no: string | null;
          collected_by: string | null;
          paid_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          customer_id: string;
          shift_id?: string | null;
          payment_number: string;
          method_code: string;
          amount: number;
          reference_no?: string | null;
          collected_by?: string | null;
          paid_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          customer_id?: string;
          shift_id?: string | null;
          payment_number?: string;
          method_code?: string;
          amount?: number;
          reference_no?: string | null;
          collected_by?: string | null;
          paid_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_collected_by_fkey";
            columns: ["collected_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_allocations: {
        Row: {
          id: string;
          business_id: string;
          payment_id: string | null;
          debit_ledger_id: string;
          credit_ledger_id: string;
          allocated_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          payment_id?: string | null;
          debit_ledger_id: string;
          credit_ledger_id: string;
          allocated_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          payment_id?: string | null;
          debit_ledger_id?: string;
          credit_ledger_id?: string;
          allocated_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_allocations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_allocations_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "customer_payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_allocations_debit_ledger_id_fkey";
            columns: ["debit_ledger_id"];
            isOneToOne: false;
            referencedRelation: "customer_ledger";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_allocations_credit_ledger_id_fkey";
            columns: ["credit_ledger_id"];
            isOneToOne: false;
            referencedRelation: "customer_ledger";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_message_drafts: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          order_id: string | null;
          channel: string;
          template_key: string | null;
          message_body: string;
          balance_at_send: number | null;
          status: string;
          created_by: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          order_id?: string | null;
          channel: string;
          template_key?: string | null;
          message_body: string;
          balance_at_send?: number | null;
          status?: string;
          created_by?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          order_id?: string | null;
          channel?: string;
          template_key?: string | null;
          message_body?: string;
          balance_at_send?: number | null;
          status?: string;
          created_by?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_message_drafts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_message_drafts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_message_drafts_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "customer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_message_drafts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_drafts: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          target_member_id: string | null;
          customer_id: string | null;
          category: string;
          channel: string;
          title: string;
          body: string;
          status: string;
          scheduled_for: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          target_member_id?: string | null;
          customer_id?: string | null;
          category: string;
          channel?: string;
          title: string;
          body: string;
          status?: string;
          scheduled_for?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          target_member_id?: string | null;
          customer_id?: string | null;
          category?: string;
          channel?: string;
          title?: string;
          body?: string;
          status?: string;
          scheduled_for?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_drafts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_drafts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_drafts_target_member_id_fkey";
            columns: ["target_member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_drafts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          city: string | null;
          address: string | null;
          makes_notes: string | null;
          opening_balance: number;
          current_balance: number;
          payment_terms_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          makes_notes?: string | null;
          opening_balance?: number;
          current_balance?: number;
          payment_terms_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          address?: string | null;
          makes_notes?: string | null;
          opening_balance?: number;
          current_balance?: number;
          payment_terms_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_ledger: {
        Row: {
          id: string;
          business_id: string;
          supplier_id: string;
          entry_type: string;
          reference_type: string | null;
          reference_id: string | null;
          debit_amount: number;
          credit_amount: number;
          running_balance: number;
          notes: string | null;
          recorded_by: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          entry_type: string;
          reference_type?: string | null;
          reference_id?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          running_balance?: number;
          notes?: string | null;
          recorded_by?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          supplier_id?: string;
          entry_type?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          debit_amount?: number;
          credit_amount?: number;
          running_balance?: number;
          notes?: string | null;
          recorded_by?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_ledger_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_ledger_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_ledger_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          supplier_id: string;
          po_number: string;
          status: string;
          order_date: string;
          expected_date: string | null;
          subtotal_amount: number;
          total_amount: number;
          is_billed: boolean;
          created_by: string | null;
          approved_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          supplier_id: string;
          po_number: string;
          status?: string;
          order_date?: string;
          expected_date?: string | null;
          subtotal_amount?: number;
          total_amount?: number;
          is_billed?: boolean;
          created_by?: string | null;
          approved_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          supplier_id?: string;
          po_number?: string;
          status?: string;
          order_date?: string;
          expected_date?: string | null;
          subtotal_amount?: number;
          total_amount?: number;
          is_billed?: boolean;
          created_by?: string | null;
          approved_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_items: {
        Row: {
          id: string;
          business_id: string;
          purchase_order_id: string;
          product_id: string;
          variant_id: string;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          quantity_ordered: number;
          quantity_received: number;
          po_unit_cost: number;
          actual_unit_cost: number | null;
          line_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          purchase_order_id: string;
          product_id: string;
          variant_id: string;
          product_name_snapshot: string;
          variant_label_snapshot?: string;
          quantity_ordered: number;
          quantity_received?: number;
          po_unit_cost: number;
          actual_unit_cost?: number | null;
          line_total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          purchase_order_id?: string;
          product_id?: string;
          variant_id?: string;
          product_name_snapshot?: string;
          variant_label_snapshot?: string;
          quantity_ordered?: number;
          quantity_received?: number;
          po_unit_cost?: number;
          actual_unit_cost?: number | null;
          line_total?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      goods_receipts: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          purchase_order_id: string | null;
          supplier_id: string;
          grn_number: string;
          received_by: string | null;
          received_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          purchase_order_id?: string | null;
          supplier_id: string;
          grn_number: string;
          received_by?: string | null;
          received_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          purchase_order_id?: string | null;
          supplier_id?: string;
          grn_number?: string;
          received_by?: string | null;
          received_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goods_receipts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipts_received_by_fkey";
            columns: ["received_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      goods_receipt_items: {
        Row: {
          id: string;
          business_id: string;
          goods_receipt_id: string;
          purchase_order_item_id: string | null;
          variant_id: string;
          batch_id: string | null;
          quantity_received: number;
          actual_unit_cost: number;
          batch_number: string | null;
          expiry_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          goods_receipt_id: string;
          purchase_order_item_id?: string | null;
          variant_id: string;
          batch_id?: string | null;
          quantity_received: number;
          actual_unit_cost: number;
          batch_number?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          goods_receipt_id?: string;
          purchase_order_item_id?: string | null;
          variant_id?: string;
          batch_id?: string | null;
          quantity_received?: number;
          actual_unit_cost?: number;
          batch_number?: string | null;
          expiry_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipt_items_goods_receipt_id_fkey";
            columns: ["goods_receipt_id"];
            isOneToOne: false;
            referencedRelation: "goods_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipt_items_purchase_order_item_id_fkey";
            columns: ["purchase_order_item_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipt_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_receipt_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_bills: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          supplier_id: string;
          purchase_order_id: string | null;
          goods_receipt_id: string | null;
          bill_ref: string;
          status: string;
          invoice_date: string;
          due_date: string;
          total_amount: number;
          paid_amount: number;
          credited_amount: number;
          created_by: string | null;
          posted_by: string | null;
          posted_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          supplier_id: string;
          purchase_order_id?: string | null;
          goods_receipt_id?: string | null;
          bill_ref: string;
          status?: string;
          invoice_date?: string;
          due_date?: string;
          total_amount?: number;
          paid_amount?: number;
          credited_amount?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          supplier_id?: string;
          purchase_order_id?: string | null;
          goods_receipt_id?: string | null;
          bill_ref?: string;
          status?: string;
          invoice_date?: string;
          due_date?: string;
          total_amount?: number;
          paid_amount?: number;
          credited_amount?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_bills_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bills_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bills_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bills_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bills_goods_receipt_id_fkey";
            columns: ["goods_receipt_id"];
            isOneToOne: false;
            referencedRelation: "goods_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bills_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bills_posted_by_fkey";
            columns: ["posted_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_bill_items: {
        Row: {
          id: string;
          business_id: string;
          supplier_bill_id: string;
          variant_id: string | null;
          description: string;
          quantity: number;
          unit_cost: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          supplier_bill_id: string;
          variant_id?: string | null;
          description: string;
          quantity: number;
          unit_cost: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          supplier_bill_id?: string;
          variant_id?: string | null;
          description?: string;
          quantity?: number;
          unit_cost?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_bill_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bill_items_supplier_bill_id_fkey";
            columns: ["supplier_bill_id"];
            isOneToOne: false;
            referencedRelation: "supplier_bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_bill_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_payments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          supplier_id: string;
          payment_number: string;
          method_code: string;
          amount: number;
          reference_no: string | null;
          paid_by: string | null;
          paid_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          supplier_id: string;
          payment_number: string;
          method_code: string;
          amount: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          supplier_id?: string;
          payment_number?: string;
          method_code?: string;
          amount?: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payments_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_payment_allocations: {
        Row: {
          id: string;
          business_id: string;
          payment_id: string;
          supplier_bill_id: string;
          allocated_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          payment_id: string;
          supplier_bill_id: string;
          allocated_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          payment_id?: string;
          supplier_bill_id?: string;
          allocated_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_payment_allocations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payment_allocations_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "supplier_payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_payment_allocations_supplier_bill_id_fkey";
            columns: ["supplier_bill_id"];
            isOneToOne: false;
            referencedRelation: "supplier_bills";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_credit_notes: {
        Row: {
          id: string;
          business_id: string;
          supplier_id: string;
          supplier_bill_id: string | null;
          credit_note_number: string;
          amount: number;
          reason: string;
          issued_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          supplier_id: string;
          supplier_bill_id?: string | null;
          credit_note_number: string;
          amount: number;
          reason: string;
          issued_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          supplier_id?: string;
          supplier_bill_id?: string | null;
          credit_note_number?: string;
          amount?: number;
          reason?: string;
          issued_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_credit_notes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_credit_notes_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_credit_notes_supplier_bill_id_fkey";
            columns: ["supplier_bill_id"];
            isOneToOne: false;
            referencedRelation: "supplier_bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_credit_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      supplier_credit_allocations: {
        Row: {
          id: string;
          business_id: string;
          credit_note_id: string;
          supplier_bill_id: string;
          allocated_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          credit_note_id: string;
          supplier_bill_id: string;
          allocated_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          credit_note_id?: string;
          supplier_bill_id?: string;
          allocated_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "supplier_credit_allocations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_credit_allocations_credit_note_id_fkey";
            columns: ["credit_note_id"];
            isOneToOne: false;
            referencedRelation: "supplier_credit_notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "supplier_credit_allocations_supplier_bill_id_fkey";
            columns: ["supplier_bill_id"];
            isOneToOne: false;
            referencedRelation: "supplier_bills";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_returns: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          original_sale_id: string | null;
          customer_id: string | null;
          return_number: string;
          return_type: string;
          status: string;
          total_return_amount: number;
          reason: string | null;
          processed_by: string | null;
          approved_by: string | null;
          returned_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          original_sale_id?: string | null;
          customer_id?: string | null;
          return_number: string;
          return_type?: string;
          status?: string;
          total_return_amount?: number;
          reason?: string | null;
          processed_by?: string | null;
          approved_by?: string | null;
          returned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          original_sale_id?: string | null;
          customer_id?: string | null;
          return_number?: string;
          return_type?: string;
          status?: string;
          total_return_amount?: number;
          reason?: string | null;
          processed_by?: string | null;
          approved_by?: string | null;
          returned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_returns_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_original_sale_id_fkey";
            columns: ["original_sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_processed_by_fkey";
            columns: ["processed_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_returns_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_return_items: {
        Row: {
          id: string;
          business_id: string;
          sales_return_id: string;
          original_sale_item_id: string | null;
          variant_id: string;
          batch_id: string | null;
          product_name_snapshot: string;
          variant_label_snapshot: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          condition: string;
          restocked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sales_return_id: string;
          original_sale_item_id?: string | null;
          variant_id: string;
          batch_id?: string | null;
          product_name_snapshot: string;
          variant_label_snapshot?: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          condition?: string;
          restocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          sales_return_id?: string;
          original_sale_item_id?: string | null;
          variant_id?: string;
          batch_id?: string | null;
          product_name_snapshot?: string;
          variant_label_snapshot?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          condition?: string;
          restocked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_return_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_return_items_sales_return_id_fkey";
            columns: ["sales_return_id"];
            isOneToOne: false;
            referencedRelation: "sales_returns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_return_items_original_sale_item_id_fkey";
            columns: ["original_sale_item_id"];
            isOneToOne: false;
            referencedRelation: "sale_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_return_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_return_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          sales_return_id: string | null;
          customer_id: string | null;
          refund_number: string;
          total_amount: number;
          paid_amount: number;
          status: string;
          issued_by: string | null;
          issued_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          sales_return_id?: string | null;
          customer_id?: string | null;
          refund_number: string;
          total_amount: number;
          paid_amount?: number;
          status?: string;
          issued_by?: string | null;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          sales_return_id?: string | null;
          customer_id?: string | null;
          refund_number?: string;
          total_amount?: number;
          paid_amount?: number;
          status?: string;
          issued_by?: string | null;
          issued_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_sales_return_id_fkey";
            columns: ["sales_return_id"];
            isOneToOne: false;
            referencedRelation: "sales_returns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      refund_payments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          refund_id: string;
          shift_id: string | null;
          method_code: string;
          amount: number;
          reference_no: string | null;
          paid_by: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          refund_id: string;
          shift_id?: string | null;
          method_code: string;
          amount: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          refund_id?: string;
          shift_id?: string | null;
          method_code?: string;
          amount?: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refund_payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_payments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_payments_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "refunds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_payments_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refund_payments_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      exchanges: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          sales_return_id: string;
          replacement_sale_id: string | null;
          exchange_number: string;
          return_credit_amount: number;
          replacement_total_amount: number;
          net_difference_amount: number;
          processed_by: string | null;
          exchanged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          sales_return_id: string;
          replacement_sale_id?: string | null;
          exchange_number: string;
          return_credit_amount?: number;
          replacement_total_amount?: number;
          net_difference_amount?: number;
          processed_by?: string | null;
          exchanged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          sales_return_id?: string;
          replacement_sale_id?: string | null;
          exchange_number?: string;
          return_credit_amount?: number;
          replacement_total_amount?: number;
          net_difference_amount?: number;
          processed_by?: string | null;
          exchanged_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exchanges_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchanges_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchanges_sales_return_id_fkey";
            columns: ["sales_return_id"];
            isOneToOne: false;
            referencedRelation: "sales_returns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchanges_replacement_sale_id_fkey";
            columns: ["replacement_sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchanges_processed_by_fkey";
            columns: ["processed_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_items: {
        Row: {
          id: string;
          business_id: string;
          exchange_id: string;
          direction: string;
          variant_id: string;
          batch_id: string | null;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          exchange_id: string;
          direction: string;
          variant_id: string;
          batch_id?: string | null;
          quantity: number;
          unit_price: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          exchange_id?: string;
          direction?: string;
          variant_id?: string;
          batch_id?: string | null;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exchange_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchange_items_exchange_id_fkey";
            columns: ["exchange_id"];
            isOneToOne: false;
            referencedRelation: "exchanges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchange_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exchange_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_drawers: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string | null;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id?: string | null;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string | null;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cash_drawers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_drawers_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_drawers_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_shifts: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          cash_drawer_id: string;
          shift_number: string;
          business_date: string;
          opened_by: string | null;
          assigned_cashier_id: string | null;
          closed_by: string | null;
          opening_float: number;
          expected_cash: number | null;
          counted_cash: number | null;
          variance_amount: number | null;
          variance_reason: string | null;
          status: string;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          cash_drawer_id: string;
          shift_number: string;
          business_date?: string;
          opened_by?: string | null;
          assigned_cashier_id?: string | null;
          closed_by?: string | null;
          opening_float?: number;
          expected_cash?: number | null;
          counted_cash?: number | null;
          variance_amount?: number | null;
          variance_reason?: string | null;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          cash_drawer_id?: string;
          shift_number?: string;
          business_date?: string;
          opened_by?: string | null;
          assigned_cashier_id?: string | null;
          closed_by?: string | null;
          opening_float?: number;
          expected_cash?: number | null;
          counted_cash?: number | null;
          variance_amount?: number | null;
          variance_reason?: string | null;
          status?: string;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_shifts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_shifts_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_shifts_cash_drawer_id_fkey";
            columns: ["cash_drawer_id"];
            isOneToOne: false;
            referencedRelation: "cash_drawers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_shifts_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_shifts_assigned_cashier_id_fkey";
            columns: ["assigned_cashier_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_shifts_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_transactions: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          cash_shift_id: string | null;
          direction: string;
          category: string;
          amount: number;
          reference_type: string | null;
          reference_id: string | null;
          reference_label: string | null;
          source_label: string | null;
          reason: string | null;
          status: string;
          evidence_note: string | null;
          review_note: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          occurred_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          cash_shift_id?: string | null;
          direction: string;
          category: string;
          amount: number;
          reference_type?: string | null;
          reference_id?: string | null;
          reference_label?: string | null;
          source_label?: string | null;
          reason?: string | null;
          status?: string;
          evidence_note?: string | null;
          review_note?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          occurred_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          cash_shift_id?: string | null;
          direction?: string;
          category?: string;
          amount?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          reference_label?: string | null;
          source_label?: string | null;
          reason?: string | null;
          status?: string;
          evidence_note?: string | null;
          review_note?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          occurred_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cash_transactions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_transactions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_transactions_cash_shift_id_fkey";
            columns: ["cash_shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cash_transactions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_categories: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          name: string;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          code: string;
          name: string;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          code?: string;
          name?: string;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_categories_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_expenses: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          expense_category_id: string;
          title: string;
          payee_name: string;
          amount: number;
          due_day: number;
          start_month: string;
          generated_months: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          expense_category_id: string;
          title: string;
          payee_name: string;
          amount?: number;
          due_day?: number;
          start_month: string;
          generated_months?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          expense_category_id?: string;
          title?: string;
          payee_name?: string;
          amount?: number;
          due_day?: number;
          start_month?: string;
          generated_months?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_expenses_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_expenses_expense_category_id_fkey";
            columns: ["expense_category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          expense_category_id: string;
          recurring_expense_id: string | null;
          expense_number: string;
          title: string;
          payee_name: string;
          amount: number;
          service_charge: number;
          due_date: string;
          bill_ref: string | null;
          period_label: string | null;
          status: string;
          paid_amount: number;
          created_by: string | null;
          posted_by: string | null;
          posted_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          expense_category_id: string;
          recurring_expense_id?: string | null;
          expense_number: string;
          title: string;
          payee_name: string;
          amount: number;
          service_charge?: number;
          due_date?: string;
          bill_ref?: string | null;
          period_label?: string | null;
          status?: string;
          paid_amount?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          expense_category_id?: string;
          recurring_expense_id?: string | null;
          expense_number?: string;
          title?: string;
          payee_name?: string;
          amount?: number;
          service_charge?: number;
          due_date?: string;
          bill_ref?: string | null;
          period_label?: string | null;
          status?: string;
          paid_amount?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_expense_category_id_fkey";
            columns: ["expense_category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_recurring_expense_id_fkey";
            columns: ["recurring_expense_id"];
            isOneToOne: false;
            referencedRelation: "recurring_expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_posted_by_fkey";
            columns: ["posted_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_payments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          expense_id: string;
          cash_shift_id: string | null;
          method_code: string;
          amount: number;
          reference_no: string | null;
          paid_by: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          expense_id: string;
          cash_shift_id?: string | null;
          method_code: string;
          amount: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          expense_id?: string;
          cash_shift_id?: string | null;
          method_code?: string;
          amount?: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_cash_shift_id_fkey";
            columns: ["cash_shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payments_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_records: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          member_id: string | null;
          employee_code: string;
          full_name: string;
          job_title: string;
          phone: string | null;
          base_salary: number;
          hired_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          member_id?: string | null;
          employee_code: string;
          full_name: string;
          job_title: string;
          phone?: string | null;
          base_salary?: number;
          hired_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          member_id?: string | null;
          employee_code?: string;
          full_name?: string;
          job_title?: string;
          phone?: string | null;
          base_salary?: number;
          hired_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employee_records_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_records_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_records_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          employee_id: string;
          attendance_date: string;
          status: string;
          check_in_at: string | null;
          check_out_at: string | null;
          overtime_hours: number;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          employee_id: string;
          attendance_date: string;
          status?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          overtime_hours?: number;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          employee_id?: string;
          attendance_date?: string;
          status?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          overtime_hours?: number;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_advances: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          employee_id: string;
          advance_date: string;
          amount: number;
          recovered_amount: number;
          status: string;
          notes: string | null;
          issued_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          employee_id: string;
          advance_date?: string;
          amount: number;
          recovered_amount?: number;
          status?: string;
          notes?: string | null;
          issued_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          employee_id?: string;
          advance_date?: string;
          amount?: number;
          recovered_amount?: number;
          status?: string;
          notes?: string | null;
          issued_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_advances_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_advances_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_advances_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_advances_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          period_key: string;
          working_days: number;
          status: string;
          total_gross: number;
          total_net: number;
          created_by: string | null;
          posted_by: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          period_key: string;
          working_days?: number;
          status?: string;
          total_gross?: number;
          total_net?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          period_key?: string;
          working_days?: number;
          status?: string;
          total_gross?: number;
          total_net?: number;
          created_by?: string | null;
          posted_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_posted_by_fkey";
            columns: ["posted_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_items: {
        Row: {
          id: string;
          business_id: string;
          payroll_id: string;
          employee_id: string;
          paid_days: number;
          base_amount: number;
          allowance_amount: number;
          bonus_amount: number;
          overtime_amount: number;
          reduction_amount: number;
          advance_recovery_amount: number;
          net_payable: number;
          paid_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          payroll_id: string;
          employee_id: string;
          paid_days?: number;
          base_amount?: number;
          allowance_amount?: number;
          bonus_amount?: number;
          overtime_amount?: number;
          reduction_amount?: number;
          advance_recovery_amount?: number;
          net_payable?: number;
          paid_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          payroll_id?: string;
          employee_id?: string;
          paid_days?: number;
          base_amount?: number;
          allowance_amount?: number;
          bonus_amount?: number;
          overtime_amount?: number;
          reduction_amount?: number;
          advance_recovery_amount?: number;
          net_payable?: number;
          paid_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_items_payroll_id_fkey";
            columns: ["payroll_id"];
            isOneToOne: false;
            referencedRelation: "payroll";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employee_records";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_payments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          payroll_id: string;
          cash_shift_id: string | null;
          method_code: string;
          total_amount: number;
          reference_no: string | null;
          paid_by: string | null;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          payroll_id: string;
          cash_shift_id?: string | null;
          method_code: string;
          total_amount: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          payroll_id?: string;
          cash_shift_id?: string | null;
          method_code?: string;
          total_amount?: number;
          reference_no?: string | null;
          paid_by?: string | null;
          paid_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payments_payroll_id_fkey";
            columns: ["payroll_id"];
            isOneToOne: false;
            referencedRelation: "payroll";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payments_cash_shift_id_fkey";
            columns: ["cash_shift_id"];
            isOneToOne: false;
            referencedRelation: "cash_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payments_paid_by_fkey";
            columns: ["paid_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      payroll_payment_allocations: {
        Row: {
          id: string;
          business_id: string;
          payroll_payment_id: string;
          payroll_item_id: string;
          allocated_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          payroll_payment_id: string;
          payroll_item_id: string;
          allocated_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          payroll_payment_id?: string;
          payroll_item_id?: string;
          allocated_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payroll_payment_allocations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payment_allocations_payroll_payment_id_fkey";
            columns: ["payroll_payment_id"];
            isOneToOne: false;
            referencedRelation: "payroll_payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payroll_payment_allocations_payroll_item_id_fkey";
            columns: ["payroll_item_id"];
            isOneToOne: false;
            referencedRelation: "payroll_items";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          id: string;
          business_id: string;
          code: string;
          name: string;
          account_type: string;
          parent_account_id: string | null;
          is_system: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          code: string;
          name: string;
          account_type: string;
          parent_account_id?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          code?: string;
          name?: string;
          account_type?: string;
          parent_account_id?: string | null;
          is_system?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accounts_parent_account_id_fkey";
            columns: ["parent_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          entry_number: string;
          entry_date: string;
          reference_type: string | null;
          reference_id: string | null;
          description: string;
          status: string;
          posted_by: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          entry_number: string;
          entry_date?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          description: string;
          status?: string;
          posted_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          entry_number?: string;
          entry_date?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          description?: string;
          status?: string;
          posted_by?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey";
            columns: ["posted_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_lines: {
        Row: {
          id: string;
          business_id: string;
          journal_entry_id: string;
          account_id: string;
          debit_amount: number;
          credit_amount: number;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          journal_entry_id: string;
          account_id: string;
          debit_amount?: number;
          credit_amount?: number;
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          journal_entry_id?: string;
          account_id?: string;
          debit_amount?: number;
          credit_amount?: number;
          memo?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_lines_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey";
            columns: ["journal_entry_id"];
            isOneToOne: false;
            referencedRelation: "journal_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_rates: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          code: string;
          rate_percent: number;
          is_inclusive: boolean;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          code: string;
          rate_percent?: number;
          is_inclusive?: boolean;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          code?: string;
          rate_percent?: number;
          is_inclusive?: boolean;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tax_rates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      product_tax_rates: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          tax_rate_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          tax_rate_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          tax_rate_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_tax_rates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_tax_rates_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_tax_rates_tax_rate_id_fkey";
            columns: ["tax_rate_id"];
            isOneToOne: false;
            referencedRelation: "tax_rates";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          provider: string;
          status: string;
          config: Json;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          provider: string;
          status?: string;
          config?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          provider?: string;
          status?: string;
          config?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integrations_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      fbr_submissions: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          sale_id: string;
          pos_id: string;
          usin: string;
          fbr_invoice_no: string | null;
          status: string;
          request_payload: Json;
          response_payload: Json | null;
          error_message: string | null;
          attempts: number;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          sale_id: string;
          pos_id: string;
          usin: string;
          fbr_invoice_no?: string | null;
          status?: string;
          request_payload?: Json;
          response_payload?: Json | null;
          error_message?: string | null;
          attempts?: number;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          sale_id?: string;
          pos_id?: string;
          usin?: string;
          fbr_invoice_no?: string | null;
          status?: string;
          request_payload?: Json;
          response_payload?: Json | null;
          error_message?: string | null;
          attempts?: number;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fbr_submissions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fbr_submissions_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fbr_submissions_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      business_settings: {
        Row: {
          id: string;
          business_id: string;
          default_language: string;
          cashier_max_discount_pct: number;
          require_manager_for_no_bill_ret: boolean;
          receipt_header_note: string | null;
          receipt_footer_note: string | null;
          fbr_mode: string;
          fbr_ntn: string | null;
          fbr_strn: string | null;
          settings_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          default_language?: string;
          cashier_max_discount_pct?: number;
          require_manager_for_no_bill_ret?: boolean;
          receipt_header_note?: string | null;
          receipt_footer_note?: string | null;
          fbr_mode?: string;
          fbr_ntn?: string | null;
          fbr_strn?: string | null;
          settings_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          default_language?: string;
          cashier_max_discount_pct?: number;
          require_manager_for_no_bill_ret?: boolean;
          receipt_header_note?: string | null;
          receipt_footer_note?: string | null;
          fbr_mode?: string;
          fbr_ntn?: string | null;
          fbr_strn?: string | null;
          settings_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      branch_settings: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          fbr_pos_id: string | null;
          tax_inclusive_pricing: boolean;
          allow_negative_stock: boolean;
          settings_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          fbr_pos_id?: string | null;
          tax_inclusive_pricing?: boolean;
          allow_negative_stock?: boolean;
          settings_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          fbr_pos_id?: string | null;
          tax_inclusive_pricing?: boolean;
          allow_negative_stock?: boolean;
          settings_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branch_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branch_settings_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      device_settings: {
        Row: {
          id: string;
          business_id: string;
          device_id: string;
          offline_mode_enabled: boolean;
          auto_print_receipt: boolean;
          paper_width: string;
          settings_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          device_id: string;
          offline_mode_enabled?: boolean;
          auto_print_receipt?: boolean;
          paper_width?: string;
          settings_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          device_id?: string;
          offline_mode_enabled?: boolean;
          auto_print_receipt?: boolean;
          paper_width?: string;
          settings_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "device_settings_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      files_attachments: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          bucket_id: string;
          storage_path: string;
          entity_type: string;
          entity_id: string;
          file_name: string;
          mime_type: string | null;
          file_size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          bucket_id?: string;
          storage_path: string;
          entity_type: string;
          entity_id: string;
          file_name: string;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          bucket_id?: string;
          storage_path?: string;
          entity_type?: string;
          entity_id?: string;
          file_name?: string;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "files_attachments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_attachments_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          actor_user_id: string | null;
          actor_member_id: string | null;
          device_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          actor_user_id?: string | null;
          actor_member_id?: string | null;
          device_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          actor_user_id?: string | null;
          actor_member_id?: string | null;
          device_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_member_id_fkey";
            columns: ["actor_member_id"];
            isOneToOne: false;
            referencedRelation: "business_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_operations: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          device_id: string;
          idempotency_key: string;
          operation_type: string;
          payload: Json;
          status: string;
          error_message: string | null;
          resolved_entity_id: string | null;
          client_created_at: string;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          device_id: string;
          idempotency_key: string;
          operation_type: string;
          payload?: Json;
          status?: string;
          error_message?: string | null;
          resolved_entity_id?: string | null;
          client_created_at: string;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          device_id?: string;
          idempotency_key?: string;
          operation_type?: string;
          payload?: Json;
          status?: string;
          error_message?: string | null;
          resolved_entity_id?: string | null;
          client_created_at?: string;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_operations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sync_operations_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sync_operations_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "pos_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_otp_challenges: {
        Row: {
          id: string;
          phone_e164: string;
          purpose: string;
          otp_hash: string;
          otp_salt: string;
          verification_token_hash: string | null;
          status: string;
          attempts: number;
          max_attempts: number;
          expires_at: string;
          verified_at: string | null;
          consumed_at: string | null;
          request_ip: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_e164: string;
          purpose: string;
          otp_hash: string;
          otp_salt: string;
          verification_token_hash?: string | null;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          expires_at: string;
          verified_at?: string | null;
          consumed_at?: string | null;
          request_ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_e164?: string;
          purpose?: string;
          otp_hash?: string;
          otp_salt?: string;
          verification_token_hash?: string | null;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          expires_at?: string;
          verified_at?: string | null;
          consumed_at?: string | null;
          request_ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_invitations: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          role_id: string;
          member_id: string | null;
          invited_name: string;
          invited_phone_e164: string;
          token_hash: string;
          status: string;
          expires_at: string;
          invited_by_member_id: string | null;
          accepted_at: string | null;
          accepted_by_user_id: string | null;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          role_id: string;
          member_id?: string | null;
          invited_name: string;
          invited_phone_e164: string;
          token_hash: string;
          status?: string;
          expires_at: string;
          invited_by_member_id?: string | null;
          accepted_at?: string | null;
          accepted_by_user_id?: string | null;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          role_id?: string;
          member_id?: string | null;
          invited_name?: string;
          invited_phone_e164?: string;
          token_hash?: string;
          status?: string;
          expires_at?: string;
          invited_by_member_id?: string | null;
          accepted_at?: string | null;
          accepted_by_user_id?: string | null;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_invitations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_invitations_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_invitations_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_daily_branch_sales: {
        Row: {
          business_id: string;
          branch_id: string;
          business_date: string;
          bill_count: number;
          gross_sales: number;
          total_discounts: number;
          total_tax: number;
          net_sales: number;
          collected_amount: number;
          khata_credit_amount: number;
          refunded_amount: number;
        };
        Relationships: [];
      };
      v_customer_khata_balances: {
        Row: {
          customer_id: string;
          business_id: string;
          branch_id: string | null;
          full_name: string;
          phone: string | null;
          khata_balance: number;
          refund_owed: number;
          credit_limit: number | null;
          last_activity_at: string | null;
        };
        Relationships: [];
      };
      v_supplier_payables: {
        Row: {
          business_id: string;
          supplier_id: string;
          supplier_name: string;
          open_bills_count: number;
          payable_balance: number;
          overdue_balance: number;
        };
        Relationships: [];
      };
      v_stock_valuation: {
        Row: {
          business_id: string;
          branch_id: string;
          product_id: string;
          product_name: string;
          variant_id: string;
          variant_name: string;
          sku: string | null;
          quantity_on_hand: number;
          quantity_reserved: number;
          available_qty: number;
          average_cost: number;
          selling_price: number;
          stock_cost_value: number;
          stock_retail_value: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      bootstrap_business_roles: { Args: { p_business_id: string }; Returns: undefined };
      is_business_member: { Args: { p_business_id: string }; Returns: boolean };
      current_business_member_id: { Args: { p_business_id: string }; Returns: string };
      has_branch_access: { Args: { p_business_id: string; p_branch_id: string }; Returns: boolean };
      has_permission: { Args: { p_business_id: string; p_permission_key: string }; Returns: boolean };
      create_business_workspace: { Args: { p_payload: Json }; Returns: Json };
      provision_owner_workspace_for_user: {
        Args: { p_user_id: string; p_payload: Json };
        Returns: Json;
      };
      accept_business_invitation_for_user: {
        Args: {
          p_user_id: string;
          p_invitation_id: string;
          p_full_name: string;
          p_phone_e164: string;
        };
        Returns: Json;
      };
      complete_sale: { Args: { p_payload: Json }; Returns: Json };
      receive_purchase_order: { Args: { p_payload: Json }; Returns: Json };
      process_sales_return: { Args: { p_payload: Json }; Returns: Json };
      issue_refund: { Args: { p_payload: Json }; Returns: Json };
      collect_khata_payment: { Args: { p_payload: Json }; Returns: Json };
      close_cash_shift: { Args: { p_payload: Json }; Returns: Json };
      transfer_stock: { Args: { p_payload: Json }; Returns: Json };
      adjust_branch_stock: { Args: { p_payload: Json }; Returns: Json };
      complete_stock_count: { Args: { p_payload: Json }; Returns: Json };
      process_footwear_exchange: { Args: { p_payload: Json }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PublicTableName = keyof Database["public"]["Tables"];
export type TableRow<T extends PublicTableName> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends PublicTableName> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends PublicTableName> = Database["public"]["Tables"][T]["Update"];
