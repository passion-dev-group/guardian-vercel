
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { InfoIcon, Users, Calendar, TrendingUp } from "lucide-react";
import TermsAndConditionsDialog from "../circle/TermsAndConditionsDialog";
import { ContributionDialog } from "../circle-details/ContributionDialog";
import { AuthorizeRecurringACHButton } from "../circle-details/AuthorizeRecurringACHButton";
import { useContributionLimit } from "@/hooks/useContributionLimit";
import { FrequencyType } from "@/types/frequency";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface CircleCardProps {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: FrequencyType;
  memberCount: number;
  nextPayoutDate: Date | null;
  isYourTurn: boolean;
  circleStatus?: string;
  isAdmin?: boolean;
}

interface CircleStats {
  totalContributions: number;
  nextPayoutDate: string | null;
  nextPayoutMember: string | null;
  isYourTurn: boolean;
  contributionStatus: "up_to_date" | "due" | "overdue";
  lastContributionDate: string | null;
}

const CircleCard = ({
  id,
  name,
  contributionAmount,
  frequency,
  memberCount,
  nextPayoutDate,
  isYourTurn,
  circleStatus,
  isAdmin,
}: CircleCardProps) => {
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [stats, setStats] = useState<CircleStats | null>(null);
  const contributionLimitStatus = useContributionLimit(id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCircleStats = async () => {
      try {
        setLoading(true);
        
        // Get the current user's ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get next payout information
        const { data: nextPayoutData } = await supabase
          .from('circle_members')
          .select(`
            next_payout_date,
            payout_position,
            user_id,
            profiles!inner(display_name)
          `)
          .eq('circle_id', id)
          .eq('payout_position', 1)
          .maybeSingle();

        // Get user's contribution status
        const { data: userContributions } = await supabase
          .from('circle_transactions')
          .select('transaction_date, status, amount')
          .eq('circle_id', id)
          .eq('user_id', user.id)
          .eq('type', 'contribution')
          .order('transaction_date', { ascending: false })
          .limit(1);

        // Get total contributions for this circle
        const { data: totalContributions } = await supabase
          .from('circle_transactions')
          .select('amount')
          .eq('circle_id', id)
          .eq('type', 'contribution')
          .eq('status', 'completed');

        // Calculate contribution status
        let contributionStatus: "up_to_date" | "due" | "overdue" = "up_to_date";
        let lastContributionDate: string | null = null;

        if (userContributions && userContributions.length > 0) {
          const lastContribution = userContributions[0];
          lastContributionDate = lastContribution.transaction_date;
          
          const lastContributionDateObj = new Date(lastContribution.transaction_date);
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          
          if (lastContribution.status === "completed") {
            contributionStatus = lastContributionDateObj > oneMonthAgo ? "up_to_date" : "due";
          } else {
            contributionStatus = "overdue";
          }
        } else {
          contributionStatus = "due";
        }

        // Check if it's user's turn
        const { data: userMember } = await supabase
          .from('circle_members')
          .select('payout_position')
          .eq('circle_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        const isYourTurn = userMember?.payout_position === 1;

        setStats({
          totalContributions: totalContributions?.reduce((sum, t) => sum + t.amount, 0) || 0,
          nextPayoutDate: nextPayoutData?.next_payout_date || null,
          nextPayoutMember: (nextPayoutData?.profiles as any)?.display_name || null,
          isYourTurn,
          contributionStatus,
          lastContributionDate
        });

      } catch (error) {
        console.error("Error fetching circle stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCircleStats();
  }, [id]);

  const handleViewDetails = () => {
    trackEvent('circle_card_clicked', {
      circle_id: id,
      circle_name: name,
    });
  };

  const handleQuickContribute = () => {
    trackEvent('quick_contribution_clicked', {
      circle_id: id,
      circle_name: name,
    });
  };

  const getContributionStatusColor = (status: string) => {
    switch (status) {
      case "up_to_date": return "bg-green-100 text-green-800 border-green-200";
      case "due": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "overdue": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getContributionStatusText = (status: string) => {
    switch (status) {
      case "up_to_date": return "Up to Date";
      case "due": return "Due";
      case "overdue": return "Overdue";
      default: return "Unknown";
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {`${formatCurrency(contributionAmount)} ${frequency}`}
            </p>
          </div>
          {stats?.isYourTurn && (
            <Badge className="bg-green-500 text-white">🎯 Your Turn</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid gap-3">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Members</span>
              <span className="font-medium">{memberCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatCurrency(stats?.totalContributions || 0)}</span>
            </div>
          </div>

          {/* Next Payout Info */}
          {stats?.nextPayoutDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Next Payout</span>
              </div>
              <div className="text-blue-700">
                <div className="text-sm font-medium">
                  {stats.nextPayoutMember ? `${stats.nextPayoutMember}` : "Scheduled"}
                </div>
                <div className="text-xs">
                  {formatDateRelative(new Date(stats.nextPayoutDate))}
                </div>
              </div>
            </div>
          )}

          {/* Contribution Status */}
          {stats && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Status</span>
              <Badge className={`text-xs ${getContributionStatusColor(stats.contributionStatus)}`}>
                {getContributionStatusText(stats.contributionStatus)}
              </Badge>
            </div>
          )}

          {/* Last Contribution */}
          {stats?.lastContributionDate && (
            <div className="text-xs text-muted-foreground">
              Last contribution: {formatDateRelative(new Date(stats.lastContributionDate))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Link to={`/circles/${id}`} className="flex-1" onClick={handleViewDetails}>
            <Button className="w-full" variant="secondary">View Details</Button>
          </Link>
          <AuthorizeRecurringACHButton
            circleId={id}
            circleName={name}
            contributionAmount={contributionAmount}
            frequency={frequency}
            circleStatus={circleStatus}
            isAdmin={isAdmin}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          />
        </div>
        <div className="w-full flex justify-end">
          <TermsAndConditionsDialog 
            trigger={
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 h-auto py-1">
                <InfoIcon className="h-3 w-3" />
                <span>Terms & Conditions</span>
              </Button>
            }
          />
        </div>
      </CardFooter>

      <ContributionDialog
        isOpen={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
        circleId={id}
        circleName={name}
        contributionAmount={contributionAmount}
        frequency={frequency}
      />
    </Card>
  );
};

export default CircleCard;
