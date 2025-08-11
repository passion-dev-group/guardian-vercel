import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCircleRotation } from "@/hooks/useCircleRotation";
import { RotateCcw, Users, Calendar, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface RotationOverviewWidgetProps {
  circleId: string;
  circleName: string;
  isAdmin: boolean;
}

const RotationOverviewWidget = ({ circleId, circleName, isAdmin }: RotationOverviewWidgetProps) => {
  const { rotationStatus, getRotationStatus, isLoading } = useCircleRotation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Load rotation status on component mount
  useEffect(() => {
    if (circleId) {
      getRotationStatus(circleId);
    }
  }, [circleId]);

  if (!rotationStatus) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Rotation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <RotateCcw className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Button 
                onClick={() => getRotationStatus(circleId)} 
                variant="outline" 
                size="sm"
              >
                Load Status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextPayoutMember = rotationStatus.members.find(m => m.payout_position === 1);
  const hasPositions = rotationStatus.members.some(m => m.payout_position !== null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Rotation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-primary">
              {rotationStatus.total_members}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Members
            </div>
          </div>
          
          <div>
            <div className="text-lg font-bold text-green-600">
              {hasPositions ? "✓" : "○"}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          
          <div>
            <div className="text-lg font-bold text-blue-600">
              {nextPayoutMember ? "1" : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Next</div>
          </div>
        </div>

        {/* Next Payout Info */}
        {nextPayoutMember && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Next Payout</span>
            </div>
            <div className="text-green-700">
              <div className="font-medium text-sm">{nextPayoutMember.display_name}</div>
              {nextPayoutMember.next_payout_date && (
                <div className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(nextPayoutMember.next_payout_date), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expandable Member List */}
        {isExpanded && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <h4 className="text-sm font-medium">Member Positions</h4>
            {rotationStatus.members
              .sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0))
              .map((member) => (
                <div 
                  key={member.id}
                  className={`flex items-center justify-between p-2 rounded-md border text-xs ${
                    member.payout_position === 1 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={member.payout_position === 1 ? "default" : "secondary"} className="text-xs">
                      #{member.payout_position || "—"}
                    </Badge>
                    <span className="font-medium">{member.display_name}</span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button 
            onClick={() => setIsExpanded(!isExpanded)} 
            variant="ghost" 
            size="sm"
            className="text-xs"
          >
            {isExpanded ? "Show Less" : "Show Members"}
          </Button>
          
          <Link to={`/circles/${circleId}`}>
            <Button variant="outline" size="sm" className="w-full text-xs">
              Manage Rotation
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default RotationOverviewWidget;
