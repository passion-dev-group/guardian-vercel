
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Medal, Diamond } from 'lucide-react';
import { UserTier } from '@/types/gamification';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TierBadgeProps {
  tier: UserTier['tier'];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ 
  tier, 
  size = 'md',
  showLabel = true 
}) => {
  let tierConfig = {
    icon: Award,
    color: 'bg-zinc-400',
    textColor: 'text-zinc-950',
    label: 'Bronze'
  };
  
  switch (tier) {
    case 'Silver':
      tierConfig = {
        icon: Star,
        color: 'bg-slate-300',
        textColor: 'text-slate-950',
        label: 'Silver'
      };
      break;
    case 'Gold':
      tierConfig = {
        icon: Medal,
        color: 'bg-amber-400',
        textColor: 'text-amber-950',
        label: 'Gold'
      };
      break;
    case 'Diamond':
      tierConfig = {
        icon: Diamond,
        color: 'bg-blue-300',
        textColor: 'text-blue-950',
        label: 'Diamond'
      };
      break;
  }
  
  const Icon = tierConfig.icon;
  const sizeClasses = {
    sm: 'text-xs py-0 h-5 px-1.5',
    md: 'text-sm py-0.5 px-2',
    lg: 'text-base py-1 px-3'
  };
  
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${tierConfig.color} ${tierConfig.textColor} ${sizeClasses[size]} flex items-center gap-1 font-semibold`}>
          <Icon size={iconSizes[size]} className="shrink-0" />
          {showLabel && <span>{tierConfig.label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tierConfig.label} tier</p>
      </TooltipContent>
    </Tooltip>
  );
};
