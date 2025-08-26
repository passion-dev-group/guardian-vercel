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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          metadata: Json | null
          plaid_authorization_id: string | null
          plaid_transfer_id: string | null
          processed_at: string | null
          status: string
          transaction_date: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          circle_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          plaid_authorization_id?: string | null
          plaid_transfer_id?: string | null
          processed_at?: string | null
          status: string
          transaction_date?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          circle_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          plaid_authorization_id?: string | null
          plaid_transfer_id?: string | null
          processed_at?: string | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string | null
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
          max_members: number | null
          min_members: number | null
          name: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          contribution_amount: number
          created_at?: string
          created_by: string
          frequency: string
          id?: string
          max_members?: number | null
          min_members?: number | null
          name: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          max_members?: number | null
          min_members?: number | null
          name?: string
          start_date?: string | null
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
      linked_bank_accounts: {
        Row: {
          account_id: string
          account_name: string
          account_subtype: string
          account_type: string
          circle_user_id: string | null
          circle_wallet_id: string | null
          created_at: string | null
          id: string
          institution_name: string
          is_active: boolean
          mask: string
          phone_number: string | null
          plaid_access_token: string
          plaid_account_id: string | null
          plaid_item_id: string
          updated_at: string | null
          user_id: string
          verification_status: string
          wallet_type: string | null
          wallet_verification_status: string | null
        }
        Insert: {
          account_id: string
          account_name: string
          account_subtype: string
          account_type: string
          circle_user_id?: string | null
          circle_wallet_id?: string | null
          created_at?: string | null
          id?: string
          institution_name: string
          is_active?: boolean
          mask: string
          phone_number?: string | null
          plaid_access_token: string
          plaid_account_id?: string | null
          plaid_item_id: string
          updated_at?: string | null
          user_id: string
          verification_status?: string
          wallet_type?: string | null
          wallet_verification_status?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          account_subtype?: string
          account_type?: string
          circle_user_id?: string | null
          circle_wallet_id?: string | null
          created_at?: string | null
          id?: string
          institution_name?: string
          is_active?: boolean
          mask?: string
          phone_number?: string | null
          plaid_access_token?: string
          plaid_account_id?: string | null
          plaid_item_id?: string
          updated_at?: string | null
          user_id?: string
          verification_status?: string
          wallet_type?: string | null
          wallet_verification_status?: string | null
        }
        Relationships: []
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
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          mfa_enabled: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          mfa_enabled?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          mfa_enabled?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_contributions: {
        Row: {
          amount: number
          circle_id: string
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean
          next_contribution_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          circle_id: string
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean
          next_contribution_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          circle_id?: string
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_contribution_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_contributions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
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
      solo_savings_recurring_contributions: {
        Row: {
          amount: number
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          goal_id: string
          id: string
          is_active: boolean
          next_contribution_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          goal_id: string
          id?: string
          is_active?: boolean
          next_contribution_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          goal_id?: string
          id?: string
          is_active?: boolean
          next_contribution_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_savings_recurring_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "solo_savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_savings_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          goal_id: string
          id: string
          metadata: Json | null
          status: string
          transaction_date: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          goal_id: string
          id?: string
          metadata?: Json | null
          status?: string
          transaction_date: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          goal_id?: string
          id?: string
          metadata?: Json | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_savings_transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "solo_savings_goals"
            referencedColumns: ["id"]
          },
        ]
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
      user_notification_preferences: {
        Row: {
          email_enabled: boolean
          sms_enabled: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          circle_id: string | null
          created_at: string
          enabled: boolean
          id: string
          scheduled_for: string | null
          type: string
          user_id: string
        }
        Insert: {
          circle_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          scheduled_for?: string | null
          type: string
          user_id: string
        }
        Update: {
          circle_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          scheduled_for?: string | null
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
          veriff_reason: string | null
          veriff_response: string | null
          veriff_status: string | null
        }
        Insert: {
          driver_license_url: string
          id?: string
          secondary_document_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          veriff_reason?: string | null
          veriff_response?: string | null
          veriff_status?: string | null
        }
        Update: {
          driver_license_url?: string
          id?: string
          secondary_document_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          veriff_reason?: string | null
          veriff_response?: string | null
          veriff_status?: string | null
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
      match_contacts: {
        Args: { contact_emails: string[]; contact_phones: string[] }
        Returns: {
          email: string
          matched: boolean
          phone: string
          user_id: string
        }[]
      }
      process_solo_savings_contributions_job: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      app_role: ["admin", "user"],
    },
  },
} as const
