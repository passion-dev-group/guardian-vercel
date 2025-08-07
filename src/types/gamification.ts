
export interface UserTier {
  id: string;
  user_id: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  points: number;
  current_streak: number;
  longest_streak: number;
  updated_at: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  requirement: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface SocialPost {
  id: string;
  user_id: string;
  post_type: 'milestone' | 'kudos' | 'badge' | 'streak';
  content: string;
  circle_id?: string;
  target_user_id?: string;
  badge_id?: string;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  likes_count?: number;
  liked_by_user?: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}
