
export interface MemberProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface Member {
  id: string;
  user_id: string;
  payout_position: number | null;
  next_payout_date: string | null;
  profile: MemberProfile;
  contribution_status?: "paid" | "due" | "overdue";
}

export interface Circle {
  id: string;
  name: string;
  contribution_amount: number;
  frequency: string;
  created_at: string;
  created_by: string;
  status?: string; // Adding the status field that was missing
  memberCount?: number; // Adding member count for dashboard display
}

// Circle API Integration Types
export interface CircleKycStatus {
  status: 'pending' | 'approved' | 'denied' | 'review';
  userId?: string;
  verificationToken?: string;
  createdAt?: string;
  reviewReasons?: string[];
}

export interface CircleWallet {
  id: string;
  address: string;
  userId: string;
  status: 'pending' | 'active' | 'suspended';
  balances: {
    usdc: string;
    currency: string;
  };
  createdAt: string;
}

export interface CircleUser {
  id: string;
  kycStatus: CircleKycStatus;
  wallets: CircleWallet[];
  createdAt: string;
}

export interface CircleKycSession {
  sessionToken: string;
  expiresAt: string;
  redirectUrl: string;
}

export interface CircleTransfer {
  id: string;
  source: {
    type: 'wallet';
    id: string;
  };
  destination: {
    type: 'wallet' | 'blockchain';
    id?: string;
    address?: string;
    chain?: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
  createdAt: string;
}

export interface CircleLinkAccount {
  id: string;
  user_id: string;
  circle_wallet_id: string;
  circle_user_id: string;
  wallet_verification_status: 'pending' | 'verified' | 'failed';
  wallet_type: 'circle';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
