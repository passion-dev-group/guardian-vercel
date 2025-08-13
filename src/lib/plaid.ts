import { supabase } from '@/integrations/supabase/client';
import type { 
  PlaidLinkTokenResponse, 
  PlaidAccessTokenResponse, 
  PlaidAccount,
  LinkedBankAccount,
  BankAccountBalance 
} from '@/types/plaid';

class PlaidService {
  private baseUrl: string;

  constructor() {
    // In production, this would be your backend API endpoint
    // this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:54321/functions/v1';
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnctzmgmoopmfohdypcb.supabase.co';
  }

  /**
   * Create a link token for Plaid Link
   */
  async createLinkToken(userId: string): Promise<PlaidLinkTokenResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/plaid-create-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create link token: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<PlaidAccessTokenResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/plaid-exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ public_token: publicToken }),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange token: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  /**
   * Get accounts for a linked item
   */
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/plaid-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      console.log('***getAccounts response***', response);
      if (!response.ok) {
        throw new Error(`Failed to get accounts: ${response.statusText}`);
      }

      const data = await response.json();
      return data.accounts;
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw error;
    }
  }

  /**
   * Get account balances
   */
  async getAccountBalances(accessToken: string): Promise<BankAccountBalance[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/plaid-balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ access_token: accessToken }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get balances: ${response.statusText}`);
      }

      const data = await response.json();
      return data.accounts;
    } catch (error) {
      console.error('Error getting account balances:', error);
      throw error;
    }
  }

  /**
   * Save linked bank account to database
   */
  async saveLinkedAccount(accountData: Omit<LinkedBankAccount, 'id' | 'created_at' | 'updated_at'>): Promise<LinkedBankAccount> {
    try {
      console.log('accountData', accountData);
              const { data, error } = await supabase
          .from('linked_bank_accounts')
          .insert({
            user_id: accountData.user_id,
            plaid_item_id: accountData.plaid_item_id,
            plaid_access_token: accountData.plaid_access_token,
            institution_name: accountData.institution_name,
            account_id: accountData.account_id,
            account_name: accountData.account_name,
            account_type: accountData.account_type,
            account_subtype: accountData.account_subtype,
            mask: accountData.mask,
            verification_status: accountData.verification_status,
            phone_number: accountData.phone_number,
            is_active: accountData.is_active,
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error saving linked account:', error);
      throw error;
    }
  }

  /**
   * Get user's linked bank accounts
   */
  async getLinkedAccounts(userId: string): Promise<LinkedBankAccount[]> {
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting linked accounts:', error);
      throw error;
    }
  }

  /**
   * Remove a linked bank account
   */
  async removeLinkedAccount(accountId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('linked_bank_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error removing linked account:', error);
      throw error;
    }
  }

  /**
   * Process a circle contribution payment
   */
  async processCirclePayment(paymentData: {
    user_id: string;
    circle_id: string;
    amount: number;
    account_id: string;
    access_token: string;
    description?: string;
  }): Promise<{
    success: boolean;
    transaction_id: string;
    message: string;
    amount: number;
    plaid_transfer_id?: string;
    plaid_authorization_id?: string;
    error?: string;
    plaid_error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/process-circle-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Payment failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing circle payment:', error);
      throw error;
    }
  }

  /**
   * Process a circle payout to a member
   */
  async processCirclePayout(payoutData: {
    circle_id: string;
    member_id: string;
    admin_user_id: string;
    payout_amount: number;
  }): Promise<{
    success: boolean;
    transaction_id: string;
    message: string;
    amount: number;
    error?: string;
    new_payout_position?: number;
    next_payout_date?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/process-circle-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payoutData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Payout failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing circle payout:', error);
      throw error;
    }
  }

  /**
   * Create a transfer authorization with Plaid
   */
  async createTransferAuthorization(authData: {
    access_token: string;
    account_id: string;
    type: 'debit' | 'credit';
    amount: string;
    ach_class: 'ppd' | 'ccd';
    user: {
      legal_name: string;
      phone_number: string;
      email_address: string;
      address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
    };
    device: {
      user_agent: string;
      ip_address: string;
    };
  }): Promise<{
    success: boolean;
    authorization_id: string;
    status: string;
    amount: string;
    decision: string;
    decision_rationale?: any;
    guarantee_decision?: string;
    guarantee_decision_rationale?: any;
    error?: string;
    plaid_error?: string;
    plaid_message?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/plaid-transfer-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(authData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create transfer authorization: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating transfer authorization:', error);
      throw error;
    }
  }

  /**
   * Create a transfer with Plaid
   */
  async createTransfer(transferData: {
    access_token: string;
    account_id: string;
    authorization_id: string;
    type: 'debit' | 'credit';
    amount: string;
    description: string;
    ach_class: 'ppd' | 'ccd';
    user: {
      legal_name: string;
      phone_number: string;
      email_address: string;
      address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
      };
    };
    device: {
      user_agent: string;
      ip_address: string;
    };
  }): Promise<{
    success: boolean;
    transfer_id: string;
    status: string;
    amount: string;
    description: string;
    created: string;
    error?: string;
    plaid_error?: string;
    plaid_message?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/plaid-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create transfer: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw error;
    }
  }

}

export const plaidService = new PlaidService(); 