
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TierBadge } from '@/components/gamification/TierBadge';
import { UserTier } from '@/types/gamification';
import { Trophy, Award, Star, Diamond } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEvent } from '@/lib/analytics';

interface TierProgressProps {
  userTier: UserTier | null;
  isLoading: boolean;
}

export const TierProgress: React.FC<TierProgressProps> = ({ userTier, isLoading }) => {
  useEffect(() => {
    if (!isLoading && userTier) {
      trackEvent('tier_progress_displayed', {
        tier: userTier.tier,
        points: userTier.points,
        current_streak: userTier.current_streak,
        longest_streak: userTier.longest_streak
      });
    }
  }, [userTier, isLoading]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Tier</CardTitle>
          <CardDescription>Your progress towards the next tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!userTier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Tier</CardTitle>
          <CardDescription>You need to be logged in to see your tier</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Please log in to track your tier progress.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate progress to next tier
  let nextTier = '';
  let pointsToNextTier = 0;
  let progress = 0;
  
  if (userTier.tier === 'Bronze') {
    nextTier = 'Silver';
    pointsToNextTier = 100 - userTier.points;
    progress = (userTier.points / 100) * 100;
  } else if (userTier.tier === 'Silver') {
    nextTier = 'Gold';
    pointsToNextTier = 250 - userTier.points;
    progress = ((userTier.points - 100) / (250 - 100)) * 100;
  } else if (userTier.tier === 'Gold') {
    nextTier = 'Diamond';
    pointsToNextTier = 500 - userTier.points;
    progress = ((userTier.points - 250) / (500 - 250)) * 100;
  } else {
    // Diamond tier - already at max
    nextTier = 'Diamond';
    pointsToNextTier = 0;
    progress = 100;
  }
  
  progress = Math.min(100, Math.max(0, progress)); // Ensure progress is between 0-100
  
  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Silver':
        return <Star className="h-5 w-5 text-slate-400" />;
      case 'Gold':
        return <Trophy className="h-5 w-5 text-amber-400" />;
      case 'Diamond':
        return <Diamond className="h-5 w-5 text-blue-400" />;
      default:
        return <Award className="h-5 w-5 text-zinc-400" />;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Loyalty Tier</CardTitle>
          <TierBadge tier={userTier.tier} size="md" />
        </div>
        <CardDescription>
          {userTier.tier === 'Diamond' 
            ? 'Congratulations! You reached the highest tier' 
            : `Your progress towards ${nextTier} tier`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium">{userTier.points} points</div>
            {userTier.tier !== 'Diamond' && (
              <div className="text-sm text-muted-foreground">
                {pointsToNextTier} points to {nextTier}
              </div>
            )}
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between text-xs">
            <div className="flex flex-col items-center">
              <Award className="h-4 w-4 text-zinc-400 mb-1" />
              <span>Bronze</span>
            </div>
            <div className="flex flex-col items-center">
              <Star className="h-4 w-4 text-slate-400 mb-1" />
              <span>Silver</span>
            </div>
            <div className="flex flex-col items-center">
              <Trophy className="h-4 w-4 text-amber-400 mb-1" />
              <span>Gold</span>
            </div>
            <div className="flex flex-col items-center">
              <Diamond className="h-4 w-4 text-blue-400 mb-1" />
              <span>Diamond</span>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Earn points by making on-time payments, completing circles, earning badges and more!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
