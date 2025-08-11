export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      automated_savings: {
        Row: {
          amount: number
          created_at: string
          executed_at: string | null
          goal_id: string
          id: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          executed_at?: string | null
          goal_id: string
          id?: string
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          executed_at?: string | null
          goal_id?: string
          id?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_savings_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
          requirement: string
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points?: number
          requirement: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement?: string
        }
        Relationships: []
      }
      circle_invites: {
        Row: {
          circle_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invite_code: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          invite_code: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invite_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_invites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          is_admin: boolean | null
          next_payout_date: string | null
          payout_position: number | null
          user_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          is_admin?: boolean | null
          next_payout_date?: string | null
          payout_position?: number | null
          user_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          is_admin?: boolean | null
          next_payout_date?: string | null
          payout_position?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_members_invites: {
        Row: {
          circle_id: string
          created_at: string
          email: string
          id: string
          invite_code: string
          invited_by: string
          status: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          email: string
          id?: string
          invite_code: string
          invited_by: string
          status: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_invites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_transactions: {
        Row: {
          amount: number
          circle_id: string
          created_at: string
          description: string | null
          id: string
          status: string
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          circle_id: string
          created_at?: string
          description?: string | null
          id?: string
          status: string
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          circle_id?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_transactions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          contribution_amount: number
          created_at: string
          created_by: string
          frequency: string
          id: string
          name: string
          status: string | null
        }
        Insert: {
          contribution_amount: number
          created_at?: string
          created_by: string
          frequency: string
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      daily_allocations: {
        Row: {
          created_at: string
          date: string
          goal_id: string
          id: string
          status: string
          suggested_amount: number
          suggested_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          goal_id: string
          id?: string
          status?: string
          suggested_amount: number
          suggested_percentage: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          status?: string
          suggested_amount?: number
          suggested_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_allocations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          circle_id: string | null
          created_at: string
          id: string
          invite_type: string
          recipient_email: string | null
          recipient_phone: string | null
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          circle_id?: string | null
          created_at?: string
          id?: string
          invite_type?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          circle_id?: string | null
          created_at?: string
          id?: string
          invite_type?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          allocation_type: string
          allocation_value: number
          created_at: string
          current_amount: number
          id: string
          is_active: boolean
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_type: string
          allocation_value: number
          created_at?: string
          current_amount?: number
          id?: string
          is_active?: boolean
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_type?: string
          allocation_value?: number
          created_at?: string
          current_amount?: number
          id?: string
          is_active?: boolean
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_preferences: {
        Row: {
          created_at: string
          max_monthly_limit: number
          next_transfer_date: string | null
          transfer_frequency: string
          updated_at: string
          user_id: string
          vacation_mode: boolean
        }
        Insert: {
          created_at?: string
          max_monthly_limit?: number
          next_transfer_date?: string | null
          transfer_frequency?: string
          updated_at?: string
          user_id: string
          vacation_mode?: boolean
        }
        Update: {
          created_at?: string
          max_monthly_limit?: number
          next_transfer_date?: string | null
          transfer_frequency?: string
          updated_at?: string
          user_id?: string
          vacation_mode?: boolean
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          badge_id: string | null
          circle_id: string | null
          content: string
          created_at: string
          id: string
          post_type: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          circle_id?: string | null
          content: string
          created_at?: string
          id?: string
          post_type: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string | null
          circle_id?: string | null
          content?: string
          created_at?: string
          id?: string
          post_type?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_automated_savings: {
        Row: {
          amount: number
          created_at: string
          executed_at: string | null
          goal_id: string
          id: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          executed_at?: string | null
          goal_id: string
          id?: string
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          executed_at?: string | null
          goal_id?: string
          id?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_automated_savings_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "solo_savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_daily_allocations: {
        Row: {
          created_at: string
          date: string
          goal_id: string
          id: string
          status: string
          suggested_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          goal_id: string
          id?: string
          status?: string
          suggested_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          status?: string
          suggested_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_daily_allocations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "solo_savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          daily_transfer_enabled: boolean | null
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          daily_transfer_enabled?: boolean | null
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          daily_transfer_enabled?: boolean | null
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          circle_id: string | null
          created_at: string
          enabled: boolean
          id: string
          type: string
          user_id: string
        }
        Insert: {
          circle_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          type: string
          user_id: string
        }
        Update: {
          circle_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          user_id: string
          email_enabled: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          email_enabled: boolean
          sms_enabled: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          email_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tiers: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          longest_streak: number
          points: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          longest_streak?: number
          points?: number
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          longest_streak?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          driver_license_url: string
          id: string
          secondary_document_url: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          driver_license_url: string
          id?: string
          secondary_document_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          driver_license_url?: string
          id?: string
          secondary_document_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
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
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      match_contacts: {
        Args: { contact_emails: string[]; contact_phones: string[] }
        Returns: {
          email: string
          phone: string
          matched: boolean
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
