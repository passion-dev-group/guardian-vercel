import { supabase } from '@/integrations/supabase/client';
import type { 
  CircleKycSession,
  CircleUser,
  CircleKycStatus,
  CircleTransfer,
  CircleLinkAccount
} from '@/types/circle';

class CircleService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnctzmgmoopmfohdypcb.supabase.co';
  }

  /**
   * Create a KYC session with Circle
   */
  async createKycSession(userId: string): Promise<CircleKycSession> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/circle-kyc-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create KYC session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating KYC session:', error);
      throw error;
    }
  }

  /**
   * Check KYC status for a user
   */
  async checkKycStatus(userId: string): Promise<{ kycStatus: CircleKycStatus }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/circle-kyc-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check KYC status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking KYC status:', error);
      throw error;
    }
  }

  /**
   * Get Circle user data
   */
  async getUser(userId: string): Promise<CircleUser> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/circle-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Circle user:', error);
      throw error;
    }
  }

  /**
   * Save Circle account to database
   */
  async saveCircleAccount(accountData: Omit<CircleLinkAccount, 'id' | 'created_at' | 'updated_at'>): Promise<CircleLinkAccount> {
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .insert({
          user_id: accountData.user_id,
          circle_wallet_id: accountData.circle_wallet_id,
          circle_user_id: accountData.circle_user_id,
          wallet_verification_status: accountData.wallet_verification_status,
          wallet_type: accountData.wallet_type,
          is_active: accountData.is_active,
          // Set placeholder values for required Plaid fields
          plaid_item_id: '',
          plaid_access_token: '',
          institution_name: 'Circle',
          account_id: accountData.circle_wallet_id,
          account_name: 'Circle Wallet',
          account_type: 'depository',
          account_subtype: 'savings',
          mask: accountData.circle_wallet_id.slice(-4),
          verification_status: 'automatically_verified',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error saving Circle account:', error);
      throw error;
    }
  }

  /**
   * Get user's linked Circle accounts
   */
  async getLinkedAccounts(userId: string): Promise<CircleLinkAccount[]> {
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_type', 'circle')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting linked Circle accounts:', error);
      throw error;
    }
  }

  /**
   * Create a USDC test transaction for wallet verification
   */
  async createTestTransaction(walletId: string, amount: string = '0.01'): Promise<CircleTransfer> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/circle-test-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          wallet_id: walletId,
          amount 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create test transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating test transaction:', error);
      throw error;
    }
  }

  /**
   * Process USDC transfer for savings/payouts
   */
  async processUsdcTransfer(transferData: {
    source_wallet_id: string;
    destination_wallet_id?: string;
    destination_address?: string;
    amount: string;
    description?: string;
  }): Promise<CircleTransfer> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${this.baseUrl}/functions/v1/circle-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        throw new Error(`Failed to process transfer: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing USDC transfer:', error);
      throw error;
    }
  }
}

export const circleService = new CircleService();