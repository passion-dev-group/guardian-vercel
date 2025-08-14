
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      circles: {
        Row: {
          id: string
          name: string
          contribution_amount: number
          frequency: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          contribution_amount: number
          frequency: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          contribution_amount?: number
          frequency?: string
          created_at?: string
          created_by?: string
        }
      }
      circle_members: {
        Row: {
          id: string
          user_id: string
          circle_id: string
          created_at: string
          payout_position: number | null
          next_payout_date: string | null
          is_admin: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          circle_id: string
          created_at?: string
          payout_position?: number | null
          next_payout_date?: string | null
          is_admin?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          circle_id?: string
          created_at?: string
          payout_position?: number | null
          next_payout_date?: string | null
          is_admin?: boolean | null
        }
      }
      circle_transactions: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          amount: number
          type: string
          status: string
          transaction_date: string
          created_at: string
          description: string | null
          plaid_transfer_id: string | null
          plaid_authorization_id: string | null
          processed_at: string | null
          updated_at: string | null
          metadata: any | null
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          amount: number
          type: string
          status: string
          transaction_date?: string
          created_at?: string
          description?: string | null
          plaid_transfer_id?: string | null
          plaid_authorization_id?: string | null
          processed_at?: string | null
          updated_at?: string | null
          metadata?: any | null
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          amount?: number
          type?: string
          status?: string
          transaction_date?: string
          created_at?: string
          description?: string | null
          plaid_transfer_id?: string | null
          plaid_authorization_id?: string | null
          processed_at?: string | null
          updated_at?: string | null
          metadata?: any | null
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          display_name: string | null
          email: string | null
          phone: string | null
          mfa_enabled: boolean | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          updated_at?: string | null
          display_name?: string | null
          email: string | null
          phone: string | null
          mfa_enabled: boolean | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          updated_at?: string | null
          display_name?: string | null
          email: string | null
          phone: string | null
          mfa_enabled: boolean | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      linked_bank_accounts: {
        Row: {
          id: string
          user_id: string
          plaid_item_id: string
          plaid_access_token: string
          institution_name: string
          account_id: string
          account_name: string
          account_type: string
          account_subtype: string
          mask: string
          verification_status: string
          is_active: boolean
          phone_number?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plaid_item_id: string
          plaid_access_token: string
          institution_name: string
          account_id: string
          account_name: string
          account_type: string
          account_subtype: string
          mask: string
          verification_status?: string
          is_active?: boolean
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plaid_item_id?: string
          plaid_access_token?: string
          institution_name?: string
          account_id?: string
          account_name?: string
          account_type?: string
          account_subtype?: string
          mask?: string
          verification_status?: string
          is_active?: boolean
          phone_number?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_circle_balance: {
        Args: {
          circle_id_param: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
