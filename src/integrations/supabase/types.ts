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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      engagement_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_source: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          metadata: Json | null
          opportunity_id: string | null
          page_path: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_source?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          page_path?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_source?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          application_status: string
          category: string
          confirmation_timestamp: string | null
          created_at: string | null
          feedback_duration_ms: number | null
          feedback_subtype: string | null
          feedback_text: string | null
          feedback_type: string
          id: string
          metadata: Json | null
          opportunity_id: string
          triggered_delay_ms: number | null
          user_id: string
        }
        Insert: {
          application_status?: string
          category: string
          confirmation_timestamp?: string | null
          created_at?: string | null
          feedback_duration_ms?: number | null
          feedback_subtype?: string | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          metadata?: Json | null
          opportunity_id: string
          triggered_delay_ms?: number | null
          user_id: string
        }
        Update: {
          application_status?: string
          category?: string
          confirmation_timestamp?: string | null
          created_at?: string | null
          feedback_duration_ms?: number | null
          feedback_subtype?: string | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string
          triggered_delay_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          category: Database["public"]["Enums"]["opportunity_category"]
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string
          details_bullets: string | null
          end_date: string | null
          external_link: string | null
          id: string
          item_order: number
          job_description: string | null
          poster_banner_crop: Json | null
          poster_url: string | null
          sectors: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["opportunity_category"]
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description: string
          details_bullets?: string | null
          end_date?: string | null
          external_link?: string | null
          id?: string
          item_order?: number
          job_description?: string | null
          poster_banner_crop?: Json | null
          poster_url?: string | null
          sectors?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["opportunity_category"]
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          details_bullets?: string | null
          end_date?: string | null
          external_link?: string | null
          id?: string
          item_order?: number
          job_description?: string | null
          poster_banner_crop?: Json | null
          poster_url?: string | null
          sectors?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_applications: {
        Row: {
          clicked_at: string | null
          id: string
          opportunity_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          opportunity_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          id?: string
          opportunity_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_premium: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_premium?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_premium?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          created_at: string | null
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          id: string
          referral_source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      event_type:
        | "view"
        | "click_get_access"
        | "click_apply"
        | "feedback_useful"
        | "feedback_not_useful"
        | "page_view"
        | "click_login"
        | "click_logout"
        | "item_viewed"
        | "click_admin_action"
        | "page_time"
      opportunity_category:
        | "funding"
        | "events"
        | "hiring"
        | "news"
        | "something_new"
      opportunity_status: "draft" | "published" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      event_type: [
        "view",
        "click_get_access",
        "click_apply",
        "feedback_useful",
        "feedback_not_useful",
        "page_view",
        "click_login",
        "click_logout",
        "item_viewed",
        "click_admin_action",
        "page_time",
      ],
      opportunity_category: [
        "funding",
        "events",
        "hiring",
        "news",
        "something_new",
      ],
      opportunity_status: ["draft", "published", "archived"],
    },
  },
} as const
