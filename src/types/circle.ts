
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
