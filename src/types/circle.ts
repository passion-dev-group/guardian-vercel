
import { FrequencyType } from './frequency';

export interface MemberProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface Member {
  id: string;
  user_id: string;
  payout_position: number | null;
  next_payout_date: string | null;
  is_admin: boolean;
  profile: MemberProfile;
  contribution_status?: "paid" | "due" | "overdue";
  last_reminder_date?: string | null;
  contribution_history?: {
    total_contributions: number;
    total_payouts: number;
    contribution_count: number;
    payout_count: number;
    last_contribution_date: string | null;
  };
}

export interface Circle {
  id: string;
  name: string;
  contribution_amount: number;
  frequency: FrequencyType;
  created_at: string;
  created_by: string;
  status?: string; // Adding the status field that was missing
  memberCount?: number; // Adding member count for dashboard display
  start_date?: string; // Date when the circle will begin
  min_members?: number; // Minimum members required to start
  max_members?: number; // Maximum members allowed
}
