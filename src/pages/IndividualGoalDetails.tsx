import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, Calendar, DollarSign, TrendingUp, Edit, Settings } from "lucide-react";
import { useSoloSavingsGoals } from "@/hooks/useSoloSavingsGoals";
import { trackEvent } from "@/lib/analytics";
import { format } from "date-fns";

const IndividualGoalDetails = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, isLoading, updateGoal } = useSoloSavingsGoals();
  const [isEditing, setIsEditing] = useState(false);

  // Find the specific goal
  const goal = goals?.find(g => g.id === goalId);

  // Track page view
  useEffect(() => {
    if (goalId) {
      trackEvent('individual_goal_details_viewed', { goal_id: goalId });
    }
  }, [goalId]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-4xl">
          <div className="text-center py-12">
            <div className="text-muted-foreground">Loading goal details...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!goal) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-4xl">
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">Goal not found</div>
            <Button onClick={() => navigate('/individual-savings-goals')}>
              Back to Goals
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  const isNearTarget = progress >= 80;
  const isOnTrack = progress >= 50;
  const remainingAmount = goal.target_amount - goal.current_amount;

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/individual-savings-goals')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Goals
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                {goal.name}
              </h1>
              <p className="text-muted-foreground mt-2">
                Individual Savings Goal
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge 
                  variant={isNearTarget ? "default" : isOnTrack ? "secondary" : "outline"}
                  className={`${
                    isNearTarget ? 'bg-green-100 text-green-800' : 
                    isOnTrack ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isNearTarget ? 'Near Target' : isOnTrack ? 'On Track' : 'Getting Started'}
                </Badge>
                {goal.daily_transfer_enabled && (
                  <Badge variant="outline">
                    Auto-save Enabled
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${goal.current_amount.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Amount saved so far
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${goal.target_amount.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Goal amount
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                ${remainingAmount.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Amount left to save
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Goal Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Goal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Goal Name</span>
                <span className="font-medium">{goal.name}</span>
              </div>
              
              {goal.target_date && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Target Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {format(new Date(goal.target_date), 'MMMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Daily Transfers</span>
                <span className={`font-medium ${goal.daily_transfer_enabled ? 'text-green-600' : 'text-gray-500'}`}>
                  {goal.daily_transfer_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {goal.created_at ? format(new Date(goal.created_at), 'MMM dd, yyyy') : 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Add Contribution
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Setup Recurring
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default IndividualGoalDetails;
