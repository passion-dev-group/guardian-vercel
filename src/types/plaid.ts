export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PlaidAccessTokenResponse {
  access_token: string;
  item_id: string;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  mask: string;
  type: 'depository' | 'credit' | 'loan' | 'investment';
  subtype: string;
  verification_status: 'pending_automatic_verification' | 'pending_manual_verification' | 'automatically_verified' | 'manually_verified';
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
    unofficial_currency_code: string | null;
  };
}

export interface PlaidInstitution {
  institution_id: string;
  name: string;
  products: string[];
  country_codes: string[];
  url?: string;
  primary_color?: string;
  logo?: string;
  routing_numbers?: string[];
  oauth?: boolean;
}

export interface PlaidLinkSuccess {
  public_token: string;
  metadata: {
    institution: PlaidInstitution;
    accounts: PlaidAccount[];
    link_session_id: string;
  };
}

export interface PlaidLinkExit {
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
    display_message?: string;
  };
  metadata: {
    institution: PlaidInstitution;
    link_session_id: string;
    request_id: string;
  };
}

export interface LinkedBankAccount {
  id: string;
  user_id: string;
  plaid_item_id: string;
  plaid_access_token: string;
  institution_name: string;
  account_id: string;
  plaid_account_id?: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  mask: string;
  verification_status: string;
  is_active: boolean;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccountBalance {
  account_id: string;
  available: number;
  current: number;
  currency: string;
  last_updated: string;
} 