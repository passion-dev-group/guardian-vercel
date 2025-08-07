
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateRelative } from "@/lib/utils";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { InfoIcon, DollarSign } from "lucide-react";
import TermsAndConditionsDialog from "../circle/TermsAndConditionsDialog";
import { ContributionDialog } from "../circle-details/ContributionDialog";
import { useState } from "react";

interface CircleCardProps {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: string;
  memberCount: number;
  nextPayoutDate: Date | null;
  isYourTurn: boolean;
}

const CircleCard = ({
  id,
  name,
  contributionAmount,
  frequency,
  memberCount,
  nextPayoutDate,
  isYourTurn,
}: CircleCardProps) => {
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);

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
    setContributionDialogOpen(true);
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
          {isYourTurn && (
            <Badge className="bg-green-500">Your Turn</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid gap-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="font-medium">{memberCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next Payout</span>
            <span className="font-medium">
              {nextPayoutDate 
                ? formatDateRelative(nextPayoutDate) 
                : "Not scheduled"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Link to={`/circles/${id}`} className="flex-1" onClick={handleViewDetails}>
            <Button className="w-full" variant="secondary">View Details</Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleQuickContribute}
            className="flex items-center gap-1"
          >
            <DollarSign className="h-3 w-3" />
            Contribute
          </Button>
        </div>
        <div className="w-full flex justify-end">
          <TermsAndConditionsDialog 
            trigger={
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 h-auto py-1">
                <InfoIcon className="h-3 w-3" />
                <span>Terms & Conditions</span>
              </Button>
            }
            showActions={false}
          />
        </div>
      </CardFooter>

      <ContributionDialog
        circleId={id}
        circleName={name}
        contributionAmount={contributionAmount}
        frequency={frequency}
        isOpen={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
      />
    </Card>
  );
};

export default CircleCard;
