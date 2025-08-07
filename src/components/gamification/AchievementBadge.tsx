
import React from 'react';
import { Badge as BadgeType } from '@/types/gamification';
import { 
  Award, Star, Trophy, Users, MessageSquare, BadgeCheck,
  type LucideIcon 
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface AchievementBadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  earned?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ 
  badge, 
  size = 'md',
  earned = true
}) => {
  // Map badge icons to Lucide icons
  const iconMap: Record<string, LucideIcon> = {
    'award': Award,
    'trophy': Trophy,
    'star': Star,
    'users': Users,
    'message-square': MessageSquare,
    'badge': BadgeCheck
  };
  
  const Icon = iconMap[badge.icon] || Award;
  
  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-10 h-10',
      icon: 20
    },
    md: {
      container: 'w-16 h-16',
      icon: 32
    },
    lg: {
      container: 'w-24 h-24',
      icon: 48
    }
  };
  
  const { container, icon } = sizeConfig[size];
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`relative flex items-center justify-center ${container} rounded-full`}>
          <div className={`absolute inset-0 rounded-full ${earned ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gray-300'}`}></div>
          <div className={`absolute inset-1 rounded-full bg-white dark:bg-gray-950 flex items-center justify-center`}>
            <Icon 
              size={icon} 
              className={earned ? 'text-purple-500' : 'text-gray-400'} 
              strokeWidth={earned ? 2 : 1.5}
            />
          </div>
          {earned && (
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
              <BadgeCheck size={12} className="text-white" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          {earned ? (
            <p className="text-xs text-green-500 mt-1">Earned • {badge.points} points</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Not earned • {badge.requirement}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
