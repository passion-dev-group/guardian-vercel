import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

export interface Referral {
  id: string;
  referral_code: string;
  referred_email: string | null;
  referred_phone: string | null;
  status: 'pending' | 'registered' | 'completed' | 'rewarded';
  reward_amount: number;
  reward_claimed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface ReferralStats {
  total_referrals: number;
  pending_referrals: number;
  completed_referrals: number;
  total_rewards: number;
  unclaimed_rewards: number;
  referrals: Referral[];
}

export interface ReferralLeaderboardUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_referrals: number;
  successful_referrals: number;
  total_rewards: number;
  rank: number;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's referral statistics
  const fetchReferralStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_referral_stats', {
        p_user_id: user.id
      });

      if (error) throw error;

      setStats(data || {
        total_referrals: 0,
        pending_referrals: 0,
        completed_referrals: 0,
        total_rewards: 0,
        unclaimed_rewards: 0,
        referrals: []
      });

      trackEvent('referral_stats_viewed', {
        total_referrals: data?.total_referrals || 0,
        completed_referrals: data?.completed_referrals || 0
      });

    } catch (err) {
      console.error('Error fetching referral stats:', err);
      setError('Failed to load referral statistics');
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch referral leaderboard
  const fetchLeaderboard = useCallback(async (limit: number = 10) => {
    try {
      const { data, error } = await supabase.rpc('get_referral_leaderboard', {
        p_limit: limit
      });

      if (error) throw error;

      setLeaderboard(data || []);

    } catch (err) {
      console.error('Error fetching referral leaderboard:', err);
      toast.error('Failed to load referral leaderboard');
    }
  }, []);

  // Generate a new referral code
  const generateReferralCode = useCallback(async (email?: string, phone?: string) => {
    if (!user) {
      toast.error('You must be logged in to generate referral codes');
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('generate_referral_code', {
        p_user_id: user.id,
        p_email: email || null,
        p_phone: phone || null
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Referral code generated successfully!');
        
        trackEvent('referral_code_generated', {
          has_email: !!email,
          has_phone: !!phone
        });

        // Refresh stats to show the new referral
        fetchReferralStats();

        return {
          code: data.referral_code,
          link: data.referral_link
        };
      } else {
        throw new Error('Failed to generate referral code');
      }

    } catch (err) {
      console.error('Error generating referral code:', err);
      toast.error('Failed to generate referral code');
      return null;
    }
  }, [user, fetchReferralStats]);

  // Claim all unclaimed referral rewards
  const claimRewards = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to claim rewards');
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('claim_referral_rewards', {
        p_user_id: user.id
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Claimed ${data.rewards_claimed} rewards totaling $${data.total_amount}!`);
        
        trackEvent('referral_rewards_claimed', {
          rewards_count: data.rewards_claimed,
          total_amount: data.total_amount
        });

        // Refresh stats to show updated claimed status
        fetchReferralStats();
        return true;
      } else {
        toast.error(data.error || 'No rewards to claim');
        return false;
      }

    } catch (err) {
      console.error('Error claiming rewards:', err);
      toast.error('Failed to claim rewards');
      return false;
    }
  }, [user, fetchReferralStats]);

  // Share referral code via various methods
  const shareReferralCode = useCallback(async (
    code: string, 
    method: 'copy' | 'email' | 'sms' | 'social',
    options?: {
      recipientEmail?: string;
      recipientName?: string;
      personalMessage?: string;
      referrerName?: string;
    }
  ) => {
    const referralLink = `${window.location.origin}/signup?ref=${code}`;
    
    try {
      switch (method) {
        case 'copy':
          await navigator.clipboard.writeText(referralLink);
          toast.success('Referral link copied to clipboard!');
          break;
          
        case 'email':
          if (options?.recipientEmail && options?.referrerName) {
            // Use SendGrid integration for personalized emails
            try {
              const { data, error } = await supabase.functions.invoke('send-referral-email', {
                body: {
                  recipientEmail: options.recipientEmail,
                  recipientName: options.recipientName,
                  referrerName: options.referrerName,
                  referralCode: code,
                  personalMessage: options.personalMessage
                }
              });

              if (error) throw error;

              if (data.success) {
                toast.success(`Referral email sent to ${options.recipientEmail}!`);
              } else {
                throw new Error(data.error || 'Failed to send email');
              }
            } catch (emailError) {
              console.error('Error sending referral email:', emailError);
              toast.error('Failed to send referral email. Please try again.');
              // Fallback to mailto
              const emailSubject = 'Join me on this amazing savings platform!';
              const emailBody = `Hi! I've been using this great savings circle platform and thought you'd love it too. Use my referral link to get started: ${referralLink}`;
              window.open(`mailto:${options.recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`);
            }
          } else {
            // Fallback to mailto for generic sharing
            const emailSubject = 'Join me on this amazing savings platform!';
            const emailBody = `Hi! I've been using this great savings circle platform and thought you'd love it too. Use my referral link to get started: ${referralLink}`;
            window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`);
          }
          break;
          
        case 'sms':
          const smsText = `Check out this savings platform I'm using! Join with my referral link: ${referralLink}`;
          window.open(`sms:?body=${encodeURIComponent(smsText)}`);
          break;
          
        case 'social':
          // Generic social sharing (could be enhanced with specific platforms)
          if (navigator.share) {
            await navigator.share({
              title: 'Join me on this savings platform!',
              text: 'I\'ve been saving money with savings circles. Join me!',
              url: referralLink
            });
          } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(referralLink);
            toast.success('Referral link copied to clipboard!');
          }
          break;
      }

      trackEvent('referral_shared', {
        method,
        referral_code: code,
        has_recipient_email: !!options?.recipientEmail
      });

    } catch (err) {
      console.error('Error sharing referral code:', err);
      toast.error('Failed to share referral code');
    }
  }, []);

  // Process referral completion (called when someone signs up with a referral code)
  const processReferralCompletion = useCallback(async (
    referralCode: string, 
    referredUserId: string, 
    completionType: 'signup' | 'first_circle' | 'first_contribution' = 'signup'
  ) => {
    try {
      const { data, error } = await supabase.rpc('process_referral_completion', {
        p_referral_code: referralCode,
        p_referred_user_id: referredUserId,
        p_completion_type: completionType
      });

      if (error) throw error;

      if (data.success) {
        trackEvent('referral_completed', {
          completion_type: completionType,
          reward_amount: data.reward_amount
        });

        return {
          success: true,
          referrerId: data.referrer_id,
          rewardAmount: data.reward_amount,
          completionType: data.completion_type
        };
      } else {
        console.error('Referral completion failed:', data.error);
        return { success: false, error: data.error };
      }

    } catch (err) {
      console.error('Error processing referral completion:', err);
      return { success: false, error: 'Failed to process referral completion' };
    }
  }, []);

  // Initialize data on mount and user change
  useEffect(() => {
    fetchReferralStats();
    fetchLeaderboard();
  }, [fetchReferralStats, fetchLeaderboard]);

  return {
    // Data
    stats,
    leaderboard,
    loading,
    error,

    // Actions
    generateReferralCode,
    claimRewards,
    shareReferralCode,
    processReferralCompletion,
    
    // Refresh functions
    refreshStats: fetchReferralStats,
    refreshLeaderboard: fetchLeaderboard
  };
};
