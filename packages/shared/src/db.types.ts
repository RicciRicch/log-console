export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          details: Json;
          id: string;
          opened_at: string;
          resolution: Database['public']['Enums']['alert_resolution'] | null;
          resolved_at: string | null;
          resolved_by: string | null;
          shipment_id: string;
          tenant_id: string;
          type: Database['public']['Enums']['alert_type'];
        };
        Insert: {
          details?: Json;
          id?: string;
          opened_at?: string;
          resolution?: Database['public']['Enums']['alert_resolution'] | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          shipment_id: string;
          tenant_id: string;
          type: Database['public']['Enums']['alert_type'];
        };
        Update: {
          details?: Json;
          id?: string;
          opened_at?: string;
          resolution?: Database['public']['Enums']['alert_resolution'] | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          shipment_id?: string;
          tenant_id?: string;
          type?: Database['public']['Enums']['alert_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_shipment_id_tenant_id_fkey';
            columns: ['shipment_id', 'tenant_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id', 'tenant_id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          created_at: string;
          data: Json;
          entity: string;
          entity_id: string | null;
          id: number;
          tenant_id: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          data?: Json;
          entity: string;
          entity_id?: string | null;
          id?: never;
          tenant_id: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          data?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          tenant_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      cod_items: {
        Row: {
          amount: number;
          cod_payment_id: string | null;
          collected_at: string | null;
          courier_paid_on: string | null;
          created_at: string;
          currency: string;
          id: string;
          payout_id: string | null;
          phase: Database['public']['Enums']['cod_phase'];
          shipment_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          cod_payment_id?: string | null;
          collected_at?: string | null;
          courier_paid_on?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          payout_id?: string | null;
          phase?: Database['public']['Enums']['cod_phase'];
          shipment_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          cod_payment_id?: string | null;
          collected_at?: string | null;
          courier_paid_on?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          payout_id?: string | null;
          phase?: Database['public']['Enums']['cod_phase'];
          shipment_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cod_items_cod_payment_id_tenant_id_fkey';
            columns: ['cod_payment_id', 'tenant_id'];
            isOneToOne: false;
            referencedRelation: 'cod_payments';
            referencedColumns: ['id', 'tenant_id'];
          },
          {
            foreignKeyName: 'cod_items_payout_id_tenant_id_fkey';
            columns: ['payout_id', 'tenant_id'];
            isOneToOne: false;
            referencedRelation: 'payouts';
            referencedColumns: ['id', 'tenant_id'];
          },
          {
            foreignKeyName: 'cod_items_shipment_id_tenant_id_fkey';
            columns: ['shipment_id', 'tenant_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id', 'tenant_id'];
          },
        ];
      };
      cod_payments: {
        Row: {
          amount: number;
          client_ref: string | null;
          courier_code: string;
          created_at: string;
          currency: string;
          id: string;
          import_id: string | null;
          match_error: string | null;
          matched_at: string | null;
          paid_on: string;
          picked_up_on: string | null;
          shipment_id: string | null;
          tenant_id: string;
          tracking_number: string;
        };
        Insert: {
          amount: number;
          client_ref?: string | null;
          courier_code: string;
          created_at?: string;
          currency?: string;
          id?: string;
          import_id?: string | null;
          match_error?: string | null;
          matched_at?: string | null;
          paid_on: string;
          picked_up_on?: string | null;
          shipment_id?: string | null;
          tenant_id: string;
          tracking_number: string;
        };
        Update: {
          amount?: number;
          client_ref?: string | null;
          courier_code?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          import_id?: string | null;
          match_error?: string | null;
          matched_at?: string | null;
          paid_on?: string;
          picked_up_on?: string | null;
          shipment_id?: string | null;
          tenant_id?: string;
          tracking_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cod_payments_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cod_payments_shipment_id_tenant_id_fkey';
            columns: ['shipment_id', 'tenant_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id', 'tenant_id'];
          },
          {
            foreignKeyName: 'cod_payments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      courier_accounts: {
        Row: {
          client_id: string | null;
          courier_code: string;
          created_at: string;
          id: string;
          is_default: boolean;
          secret_last4: string | null;
          tenant_id: string;
          updated_at: string;
          vault_secret_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          courier_code: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          secret_last4?: string | null;
          tenant_id: string;
          updated_at?: string;
          vault_secret_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          courier_code?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          secret_last4?: string | null;
          tenant_id?: string;
          updated_at?: string;
          vault_secret_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'courier_accounts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      import_mappings: {
        Row: {
          column_map: Json;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['import_kind'];
          name: string;
          options: Json;
          tenant_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          column_map: Json;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['import_kind'];
          name?: string;
          options?: Json;
          tenant_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          column_map?: Json;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['import_kind'];
          name?: string;
          options?: Json;
          tenant_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'import_mappings_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      imports: {
        Row: {
          created_at: string;
          created_by: string | null;
          errors: Json;
          file_name: string | null;
          file_path: string | null;
          finished_at: string | null;
          id: string;
          kind: Database['public']['Enums']['import_kind'];
          mapping_id: string | null;
          rows_error: number;
          rows_ok: number;
          rows_total: number;
          source: Database['public']['Enums']['import_source'];
          started_at: string | null;
          status: Database['public']['Enums']['import_status'];
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          errors?: Json;
          file_name?: string | null;
          file_path?: string | null;
          finished_at?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['import_kind'];
          mapping_id?: string | null;
          rows_error?: number;
          rows_ok?: number;
          rows_total?: number;
          source?: Database['public']['Enums']['import_source'];
          started_at?: string | null;
          status?: Database['public']['Enums']['import_status'];
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          errors?: Json;
          file_name?: string | null;
          file_path?: string | null;
          finished_at?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['import_kind'];
          mapping_id?: string | null;
          rows_error?: number;
          rows_ok?: number;
          rows_total?: number;
          source?: Database['public']['Enums']['import_source'];
          started_at?: string | null;
          status?: Database['public']['Enums']['import_status'];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'imports_mapping_id_fkey';
            columns: ['mapping_id'];
            isOneToOne: false;
            referencedRelation: 'import_mappings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'imports_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: Database['public']['Enums']['member_role'];
          tenant_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database['public']['Enums']['member_role'];
          tenant_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database['public']['Enums']['member_role'];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          is_active: boolean;
          role: Database['public']['Enums']['member_role'];
          tenant_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          is_active?: boolean;
          role?: Database['public']['Enums']['member_role'];
          tenant_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          is_active?: boolean;
          role?: Database['public']['Enums']['member_role'];
          tenant_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      payouts: {
        Row: {
          client_ref: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          file_path: string | null;
          id: string;
          item_count: number;
          note: string | null;
          tenant_id: string;
          total: number;
        };
        Insert: {
          client_ref?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          file_path?: string | null;
          id?: string;
          item_count: number;
          note?: string | null;
          tenant_id: string;
          total: number;
        };
        Update: {
          client_ref?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          file_path?: string | null;
          id?: string;
          item_count?: number;
          note?: string | null;
          tenant_id?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'payouts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      sheet_connections: {
        Row: {
          auth_type: string;
          created_at: string;
          id: string;
          is_active: boolean;
          last_error: string | null;
          last_synced_at: string | null;
          sheet_name: string;
          spreadsheet_id: string;
          status_column: string;
          tenant_id: string;
          tracking_column: string;
          updated_at: string;
        };
        Insert: {
          auth_type?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          last_error?: string | null;
          last_synced_at?: string | null;
          sheet_name: string;
          spreadsheet_id: string;
          status_column: string;
          tenant_id: string;
          tracking_column: string;
          updated_at?: string;
        };
        Update: {
          auth_type?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          last_error?: string | null;
          last_synced_at?: string | null;
          sheet_name?: string;
          spreadsheet_id?: string;
          status_column?: string;
          tenant_id?: string;
          tracking_column?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sheet_connections_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      shipment_events: {
        Row: {
          description: string | null;
          id: number;
          location: string | null;
          occurred_at: string;
          raw_reason: string | null;
          raw_status: string;
          recorded_at: string;
          seq: number;
          shipment_id: string;
          status: Database['public']['Enums']['unified_status'] | null;
          tenant_id: string;
        };
        Insert: {
          description?: string | null;
          id?: never;
          location?: string | null;
          occurred_at: string;
          raw_reason?: string | null;
          raw_status: string;
          recorded_at?: string;
          seq?: number;
          shipment_id: string;
          status?: Database['public']['Enums']['unified_status'] | null;
          tenant_id: string;
        };
        Update: {
          description?: string | null;
          id?: never;
          location?: string | null;
          occurred_at?: string;
          raw_reason?: string | null;
          raw_status?: string;
          recorded_at?: string;
          seq?: number;
          shipment_id?: string;
          status?: Database['public']['Enums']['unified_status'] | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shipment_events_shipment_id_tenant_id_fkey';
            columns: ['shipment_id', 'tenant_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id', 'tenant_id'];
          },
        ];
      };
      shipments: {
        Row: {
          client_ref: string | null;
          cod_amount: number;
          courier_code: string;
          created_at: string;
          currency: string;
          id: string;
          import_id: string | null;
          is_final: boolean;
          items: Json;
          last_poll_error: string | null;
          last_polled_at: string | null;
          last_status_at: string | null;
          note: string | null;
          order_ref: string | null;
          raw_status: string | null;
          recipient_address: string | null;
          recipient_city: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          recipient_postal_code: string | null;
          status: Database['public']['Enums']['unified_status'];
          status_description: string | null;
          tenant_id: string;
          tracking_number: string;
          updated_at: string;
        };
        Insert: {
          client_ref?: string | null;
          cod_amount?: number;
          courier_code: string;
          created_at?: string;
          currency?: string;
          id?: string;
          import_id?: string | null;
          is_final?: boolean;
          items?: Json;
          last_poll_error?: string | null;
          last_polled_at?: string | null;
          last_status_at?: string | null;
          note?: string | null;
          order_ref?: string | null;
          raw_status?: string | null;
          recipient_address?: string | null;
          recipient_city?: string | null;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          recipient_postal_code?: string | null;
          status?: Database['public']['Enums']['unified_status'];
          status_description?: string | null;
          tenant_id: string;
          tracking_number: string;
          updated_at?: string;
        };
        Update: {
          client_ref?: string | null;
          cod_amount?: number;
          courier_code?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          import_id?: string | null;
          is_final?: boolean;
          items?: Json;
          last_poll_error?: string | null;
          last_polled_at?: string | null;
          last_status_at?: string | null;
          note?: string | null;
          order_ref?: string | null;
          raw_status?: string | null;
          recipient_address?: string | null;
          recipient_city?: string | null;
          recipient_name?: string | null;
          recipient_phone?: string | null;
          recipient_postal_code?: string | null;
          status?: Database['public']['Enums']['unified_status'];
          status_description?: string | null;
          tenant_id?: string;
          tracking_number?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shipments_import_id_fkey';
            columns: ['import_id'];
            isOneToOne: false;
            referencedRelation: 'imports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shipments_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_settings: {
        Row: {
          stuck_after_days: number;
          tenant_id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          stuck_after_days?: number;
          tenant_id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          stuck_after_days?: number;
          tenant_id?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_settings_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitations: { Args: never; Returns: number };
      create_payout: {
        Args: { p_cod_item_ids: string[]; p_note?: string; p_tenant_id: string };
        Returns: string;
      };
      create_tenant: {
        Args: { p_admin_email: string; p_name: string };
        Returns: string;
      };
      get_courier_secret: {
        Args: { p_courier_code: string; p_tenant_id: string };
        Returns: string;
      };
      match_cod_payments: { Args: { p_tenant_id: string }; Returns: Json };
      set_courier_secret: {
        Args: { p_courier_code: string; p_secret: string; p_tenant_id: string };
        Returns: string;
      };
      tenant_members: {
        Args: { p_tenant_id: string };
        Returns: {
          created_at: string;
          email: string;
          is_active: boolean;
          role: Database['public']['Enums']['member_role'];
          user_id: string;
        }[];
      };
    };
    Enums: {
      alert_resolution: 'auto' | 'manual';
      alert_type: 'failed_delivery' | 'stuck';
      cod_phase: 'awaiting_collection' | 'collected_by_courier' | 'paid_by_courier' | 'paid_out';
      import_kind: 'shipments' | 'cod_payments';
      import_source: 'file' | 'google_sheet';
      import_status: 'pending' | 'processing' | 'done' | 'failed';
      member_role: 'admin' | 'operator';
      unified_status:
        'created' | 'in_transit' | 'failed_delivery' | 'delivered' | 'returning' | 'returned';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      alert_resolution: ['auto', 'manual'],
      alert_type: ['failed_delivery', 'stuck'],
      cod_phase: ['awaiting_collection', 'collected_by_courier', 'paid_by_courier', 'paid_out'],
      import_kind: ['shipments', 'cod_payments'],
      import_source: ['file', 'google_sheet'],
      import_status: ['pending', 'processing', 'done', 'failed'],
      member_role: ['admin', 'operator'],
      unified_status: [
        'created',
        'in_transit',
        'failed_delivery',
        'delivered',
        'returning',
        'returned',
      ],
    },
  },
} as const;
