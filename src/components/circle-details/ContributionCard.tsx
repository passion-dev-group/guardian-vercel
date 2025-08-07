import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCircleContributions } from "@/hooks/useCircleContributions";
import { ContributionDialog } from "./ContributionDialog";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { DollarSign, Calendar, AlertCircle, CheckCircle } from "lucide-react";

interface ContributionCardProps {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  frequency: string;
}

export function ContributionCard({
  circleId,
  circleName,
  contributionAmount,
  frequency,
}: ContributionCardProps) {
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const { contributionStatus, contributions, loading } = useCircleContributions(circleId);

  const getStatusBadge = () => {
    if (contributionStatus.isOverdue) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    
    if (contributionStatus.isDue) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Due
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Up to Date
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (contributionStatus.isOverdue) {
      return `Your contribution is ${contributionStatus.daysSinceLastContribution} days overdue`;
    }
    
    if (contributionStatus.isDue) {
      return `Your contribution is due (${contributionStatus.daysSinceLastContribution} days since last contribution)`;
    }
    
    if (contributionStatus.lastContributionDate) {
      return `Last contribution: ${formatDateRelative(contributionStatus.lastContributionDate)}`;
    }
    
    return "No contributions yet";
  };

  const getNextContributionDate = () => {
    if (contributionStatus.nextContributionDate) {
      return formatDateRelative(contributionStatus.nextContributionDate);
    }
    
    // Calculate next contribution date based on frequency
    const today = new Date();
    const frequencyDays = frequency === 'weekly' ? 7 : 
                         frequency === 'biweekly' ? 14 : 30;
    
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + frequencyDays);
    
    return formatDateRelative(nextDate);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Contributions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            {getStatusBadge()}
          </div>

          {/* Status Message */}
          <p className="text-sm text-muted-foreground">
            {getStatusMessage()}
          </p>

          {/* Standard Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Standard Amount:</span>
            <span className="text-sm font-semibold">{formatCurrency(contributionAmount)}</span>
          </div>

          {/* Next Contribution */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Next Contribution:</span>
            <span className="text-sm">{getNextContributionDate()}</span>
          </div>

          {/* Recent Contributions */}
          {contributions.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Recent Contributions:</p>
              <div className="space-y-1">
                {contributions.slice(0, 3).map((contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatDateRelative(new Date(contribution.transaction_date))}
                    </span>
                    <span className="font-medium">{formatCurrency(contribution.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button 
            className="w-full mt-4" 
            onClick={() => setContributionDialogOpen(true)}
            variant={contributionStatus.isOverdue ? "destructive" : "default"}
          >
            {contributionStatus.isOverdue ? "Make Overdue Contribution" : "Make Contribution"}
          </Button>
        </CardContent>
      </Card>

      <ContributionDialog
        circleId={circleId}
        circleName={circleName}
        contributionAmount={contributionAmount}
        frequency={frequency}
        isOpen={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
      />
    </>
  );
} 