
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { UserBadge } from '@/types/gamification';
import { formatDateRelative } from '@/lib/utils';
import { Award, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEvent } from '@/lib/analytics';

interface BadgesSectionProps {
  badges: UserBadge[];
  isLoading: boolean;
}

export const BadgesSection: React.FC<BadgesSectionProps> = ({ badges, isLoading }) => {
  useEffect(() => {
    // Track that badges were displayed when loaded
    if (!isLoading && badges.length > 0) {
      trackEvent('badges_displayed', {
        count: badges.length,
        badge_names: badges.map(b => b.badge?.name).join(',')
      });
    }
  }, [badges, isLoading]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5" />
            Your Badges
          </CardTitle>
          <CardDescription>
            Badges you've earned through your savings journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5" />
            Your Badges
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Earn badges by creating circles, making on-time payments, 
                and participating in the MiTurn community.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <CardDescription>
          {badges.length > 0 
            ? `You've earned ${badges.length} badge${badges.length > 1 ? 's' : ''}`
            : "You haven't earned any badges yet"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <p>Complete actions like making on-time payments and participating in circles to earn badges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {badges.map((userBadge) => (
              <div key={userBadge.id} className="flex flex-col items-center text-center">
                <AchievementBadge badge={userBadge.badge!} />
                <span className="mt-2 text-xs font-medium truncate max-w-full">
                  {userBadge.badge?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateRelative(new Date(userBadge.earned_at))}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
