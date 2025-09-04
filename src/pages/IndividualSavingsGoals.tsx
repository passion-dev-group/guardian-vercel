import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Grid3X3, List, Plus } from "lucide-react";
import { useSoloSavingsGoals } from "@/hooks/useSoloSavingsGoals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";

type ViewMode = 'grid' | 'list';

const IndividualSavingsGoals = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const navigate = useNavigate();
  const { goals: soloGoals, isLoading: isLoadingGoals } = useSoloSavingsGoals();

  // Track page view
  useEffect(() => {
    trackEvent('individual_savings_goals_viewed');
  }, []);

  // Calculate summary statistics
  const totalTarget = soloGoals?.reduce((sum, goal) => sum + goal.target_amount, 0) || 0;
  const totalCurrent = soloGoals?.reduce((sum, goal) => sum + goal.current_amount, 0) || 0;
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const handleCreateGoal = () => {
    // TODO: Implement goal creation modal or navigate to create goal page
    // For now, this is a placeholder
    console.log('Create goal clicked');
  };

  const renderGoalCard = (goal: any) => {
    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    const isNearTarget = progress >= 80;
    const isOnTrack = progress >= 50;

    return (
      <Card key={goal.id} className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {goal.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={isNearTarget ? "default" : isOnTrack ? "secondary" : "outline"}
                  className={`text-xs ${
                    isNearTarget ? 'bg-green-100 text-green-800' : 
                    isOnTrack ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isNearTarget ? 'Near Target' : isOnTrack ? 'On Track' : 'Getting Started'}
                </Badge>
                {goal.daily_transfer_enabled && (
                  <Badge variant="outline" className="text-xs">
                    Auto-save
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-muted-foreground text-xs">Saved</div>
                <div className="font-semibold text-green-600">
                  ${goal.current_amount.toFixed(2)}
                </div>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-muted-foreground text-xs">Target</div>
                <div className="font-semibold">
                  ${goal.target_amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {goal.target_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(goal.target_date), 'MMM dd')}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>${(goal.target_amount - goal.current_amount).toFixed(2)} to go</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => navigate(`/individual-savings-goals/${goal.id}`)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGoalList = (goal: any) => {
    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    const isNearTarget = progress >= 80;
    const isOnTrack = progress >= 50;

    return (
      <Card key={goal.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{goal.name}</h3>
                  <Badge 
                    variant={isNearTarget ? "default" : isOnTrack ? "secondary" : "outline"}
                    className={`text-xs ${
                      isNearTarget ? 'bg-green-100 text-green-800' : 
                      isOnTrack ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isNearTarget ? 'Near Target' : isOnTrack ? 'On Track' : 'Getting Started'}
                  </Badge>
                  {goal.daily_transfer_enabled && (
                    <Badge variant="outline" className="text-xs">
                      Auto-save
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}</span>
                  <span>{Math.round(progress)}% complete</span>
                  {goal.target_date && (
                    <span>Due {format(new Date(goal.target_date), 'MMM dd, yyyy')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20">
                <Progress value={progress} className="h-2" />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/individual-savings-goals/${goal.id}`)}
              >
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Individual Savings Goals</h1>
              <p className="text-muted-foreground mt-2">
                Set personal savings targets and track your progress towards financial goals.
              </p>
            </div>
            <Button onClick={handleCreateGoal} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Goal
            </Button>
          </div>

          {/* Summary Cards */}
          {!isLoadingGoals && soloGoals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{soloGoals.length}</div>
                    <div className="text-sm text-muted-foreground">Active Goals</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${totalCurrent.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Saved</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">${totalTarget.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Target</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(overallProgress)}%</div>
                    <div className="text-sm text-muted-foreground">Overall Progress</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Goals Display Section */}
        <div className="space-y-6">
          {/* View Toggle and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-2"
              >
                <Grid3X3 className="h-4 w-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {!isLoadingGoals && soloGoals.length > 0 && (
                <span>{soloGoals.length} goal{soloGoals.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Goals Display */}
          {isLoadingGoals ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Loading goals...</div>
            </div>
          ) : soloGoals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No solo savings goals yet.</div>
              <Button onClick={handleCreateGoal}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </div>
          ) : (
            <div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {soloGoals.map(renderGoalCard)}
                </div>
              ) : (
                <div className="space-y-3">
                  {soloGoals.map(renderGoalList)}
                </div>
              )}
            </div>
          )}
        </div>


      </div>
    </PageLayout>
  );
};

export default IndividualSavingsGoals;
