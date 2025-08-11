import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCircleRotation } from "@/hooks/useCircleRotation";
import { useAuth } from "@/contexts/AuthContext";
import { Play, RotateCcw, RefreshCw, Users, Calendar, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RotationManagerProps {
  circleId: string;
  isAdmin: boolean;
}

const RotationManager = ({ circleId, isAdmin }: RotationManagerProps) => {
  const { user } = useAuth();
  const { 
    rotationStatus, 
    getRotationStatus, 
    initializeRotation, 
    advanceRotation, 
    isLoading 
  } = useCircleRotation();
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Load rotation status on component mount
  useEffect(() => {
    if (circleId) {
      getRotationStatus(circleId);
    }
  }, [circleId]);

  // Check if rotation is initialized
  useEffect(() => {
    if (rotationStatus) {
      const hasPositions = rotationStatus.members.some(m => m.payout_position !== null);
      setIsInitialized(hasPositions);
    }
  }, [rotationStatus]);

  const handleInitializeRotation = async () => {
    if (!user) return;
    
    const result = await initializeRotation(circleId);
    if (result.success) {
      // Refresh the status
      await getRotationStatus(circleId);
    }
  };

  const handleAdvanceRotation = async () => {
    if (!user) return;
    
    const result = await advanceRotation(circleId);
    if (result.success) {
      // Refresh the status
      await getRotationStatus(circleId);
    }
  };

  const handleRefreshStatus = async () => {
    await getRotationStatus(circleId);
  };

  if (!rotationStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Rotation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading rotation status...
              </div>
            ) : (
              <Button onClick={handleRefreshStatus} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Rotation Status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextPayoutMember = rotationStatus.members.find(m => m.payout_position === 1);
  const currentPayoutMember = rotationStatus.members.find(m => 
    m.payout_position === rotationStatus.current_payout_position
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          Rotation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rotation Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {rotationStatus.total_members}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Members
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {rotationStatus.current_payout_position}
            </div>
            <div className="text-sm text-muted-foreground">Current Position</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {nextPayoutMember ? "1" : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Next Payout</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {rotationStatus.rotation_complete ? "✓" : "○"}
            </div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Next Payout Info */}
        {nextPayoutMember && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Next Payout</span>
            </div>
            <div className="text-green-700">
              <div className="font-medium">{nextPayoutMember.display_name}</div>
              {nextPayoutMember.next_payout_date && (
                <div className="text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(nextPayoutMember.next_payout_date), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Payout Info */}
        {currentPayoutMember && currentPayoutMember.payout_position !== 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Play className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Current Payout</span>
            </div>
            <div className="text-blue-700">
              <div className="font-medium">{currentPayoutMember.display_name}</div>
              <div className="text-sm">Position #{currentPayoutMember.payout_position}</div>
            </div>
          </div>
        )}

        {/* Member List */}
        <div>
          <h4 className="font-medium mb-3">Member Positions</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {rotationStatus.members
              .sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0))
              .map((member) => (
                <div 
                  key={member.id}
                  className={`flex items-center justify-between p-2 rounded-md border ${
                    member.payout_position === 1 
                      ? 'bg-green-50 border-green-200' 
                      : member.payout_position === rotationStatus.current_payout_position
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={member.payout_position === 1 ? "default" : "secondary"}>
                      #{member.payout_position || "—"}
                    </Badge>
                    <span className="font-medium">{member.display_name}</span>
                    {member.is_admin && (
                      <Badge variant="outline" className="text-xs">Admin</Badge>
                    )}
                  </div>
                  
                  {member.payout_position === 1 && member.next_payout_date && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(member.next_payout_date), { addSuffix: true })}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            {!isInitialized ? (
              <Button 
                onClick={handleInitializeRotation} 
                disabled={isLoading}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Initialize Rotation
              </Button>
            ) : (
              <Button 
                onClick={handleAdvanceRotation} 
                disabled={isLoading}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Advance Rotation
              </Button>
            )}
            
            <Button 
              onClick={handleRefreshStatus} 
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RotationManager;
