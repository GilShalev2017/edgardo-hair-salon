export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bleach_materials: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          name: string
          strength: string | null
          stylist_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          name: string
          strength?: string | null
          stylist_id?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          name?: string
          strength?: string | null
          stylist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          stylist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          stylist_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          stylist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          brand: string | null
          code: string
          created_at: string
          id: string
          name: string
          stylist_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          stylist_id?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          stylist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          stylist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          stylist_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          stylist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      treatments: {
        Row: {
          bleach_material_id: string | null
          client_id: string
          color_ids: string[]
          created_at: string
          hair_length: Database["public"]["Enums"]["hair_length"] | null
          id: string
          notes: string | null
          occurred_at: string
          price: number | null
          stylist_id: string
          treatment_type: Database["public"]["Enums"]["treatment_type"]
          updated_at: string
        }
        Insert: {
          bleach_material_id?: string | null
          client_id: string
          color_ids?: string[]
          created_at?: string
          hair_length?: Database["public"]["Enums"]["hair_length"] | null
          id?: string
          notes?: string | null
          occurred_at?: string
          price?: number | null
          stylist_id?: string
          treatment_type: Database["public"]["Enums"]["treatment_type"]
          updated_at?: string
        }
        Update: {
          bleach_material_id?: string | null
          client_id?: string
          color_ids?: string[]
          created_at?: string
          hair_length?: Database["public"]["Enums"]["hair_length"] | null
          id?: string
          notes?: string | null
          occurred_at?: string
          price?: number | null
          stylist_id?: string
          treatment_type?: Database["public"]["Enums"]["treatment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_bleach_material_id_fkey"
            columns: ["bleach_material_id"]
            isOneToOne: false
            referencedRelation: "bleach_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      hair_length: "short" | "long"
      treatment_type:
        | "men_haircut"
        | "women_haircut"
        | "children_haircut"
        | "fringe_bangs"
        | "highlights"
        | "men_coloring"
        | "women_coloring"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      hair_length: ["short", "long"],
      treatment_type: [
        "men_haircut",
        "women_haircut",
        "children_haircut",
        "fringe_bangs",
        "highlights",
        "men_coloring",
        "women_coloring",
      ],
    },
  },
} as const
