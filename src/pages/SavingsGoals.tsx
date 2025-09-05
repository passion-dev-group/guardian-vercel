import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useSoloSavingsGoals } from '@/hooks/useSoloSavingsGoals';
import PageLayout from '@/components/PageLayout';
import GoalCard from '@/components/savings/GoalCard';
import GoalForm from '@/components/savings/GoalForm';
import SoloGoalForm from '@/components/savings/SoloGoalForm';
import CircleCard from '@/components/dashboard/CircleCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Circle } from '@/types/circle';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, Banknote, ArrowUpDown, Users, User } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const SavingsGoals = () => {
  const { user } = useAuth();
  const { goals: circleGoals, isLoading: isLoadingCircleGoals } = useSavingsGoals();
  const { goals: soloGoals, isLoading: isLoadingSoloGoals } = useSoloSavingsGoals();
  
  // State for user's joined circles (saving circles)
  const [userCircles, setUserCircles] = useState<Circle[]>([]);
  const [isLoadingUserCircles, setIsLoadingUserCircles] = useState(true);

  const [isNewCircleGoalDialogOpen, setIsNewCircleGoalDialogOpen] = useState(false);
  const [isNewSoloGoalDialogOpen, setIsNewSoloGoalDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Fetch user's joined circles (saving circles)
  const fetchUserCircles = async () => {
    if (!user) {
      setUserCircles([]);
      setIsLoadingUserCircles(false);
      return;
    }

    try {
      setIsLoadingUserCircles(true);
      
      // Fetch circles with member counts in a single optimized query
      const { data, error } = await supabase
        .from("circle_members")
        .select(
          `
          circle_id,
          circles!inner (
            id,
            name,
            contribution_amount,
            frequency,
            status,
            created_at,
            created_by,
            start_date,
            min_members,
            max_members
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user circles:", error);
        return;
      }

      if (!data || data.length === 0) {
        setUserCircles([]);
        return;
      }

      // Extract unique circles and get their member counts
      const circleIds = [...new Set(data.map(member => member.circle_id))];
      
      // Fetch member counts for all circles in a single query
      const { data: memberCounts, error: countError } = await supabase
        .from('circle_members')
        .select('circle_id')
        .in('circle_id', circleIds);

      if (countError) {
        console.error("Error fetching member counts:", countError);
      }

      // Count members per circle
      const memberCountMap = new Map<string, number>();
      memberCounts?.forEach(member => {
        const count = memberCountMap.get(member.circle_id) || 0;
        memberCountMap.set(member.circle_id, count + 1);
      });

      // Process circles with member counts
      const processedCircles: Circle[] = data
        .map(member => member.circles)
        .filter(Boolean)
        .map((circle: any) => ({
          id: circle.id,
          name: circle.name,
          contribution_amount: circle.contribution_amount,
          frequency: circle.frequency,
          status: circle.status,
          created_at: circle.created_at,
          created_by: circle.created_by,
          start_date: circle.start_date,
          min_members: circle.min_members,
          max_members: circle.max_members,
          memberCount: memberCountMap.get(circle.id) || 0
        }));

      // Remove duplicates (in case user is in same circle multiple times)
      const uniqueCircles = processedCircles.filter(
        (circle, index, self) => 
          index === self.findIndex(c => c.id === circle.id)
      );

      setUserCircles(uniqueCircles);
    } catch (err) {
      console.error("Error in fetchUserCircles:", err);
    } finally {
      setIsLoadingUserCircles(false);
    }
  };

  // Track page view
  useEffect(() => {
    trackEvent('savings_goals_page_viewed');
  }, []);

  // Fetch user circles when user changes
  useEffect(() => {
    fetchUserCircles();
  }, [user?.id]);
  
  const handleCreateCircleGoalSuccess = () => {
    setIsNewCircleGoalDialogOpen(false);
  };
  
  const handleCreateSoloGoalSuccess = () => {
    setIsNewSoloGoalDialogOpen(false);
  };
  
  // Separate active and paused goals
  const activeCircleGoals = circleGoals?.filter(goal => goal.is_active) || [];
  const pausedCircleGoals = circleGoals?.filter(goal => !goal.is_active) || [];
  
  const activeSoloGoals = soloGoals?.filter(goal => goal.daily_transfer_enabled) || [];
  const pausedSoloGoals = soloGoals?.filter(goal => !goal.daily_transfer_enabled) || [];
  
  const isLoading = isLoadingCircleGoals || isLoadingSoloGoals || isLoadingUserCircles;
  const hasAnyGoals = (circleGoals && circleGoals.length > 0) || (soloGoals && soloGoals.length > 0) || (userCircles && userCircles.length > 0);
  
  const renderGoalCards = (goals, type = 'circle') => {
    if (type === 'circle') {
      return goals.map((goal) => (
        <GoalCard
          key={goal.id}
          id={goal.id}
          name={goal.name}
          targetAmount={goal.target_amount}
          currentAmount={goal.current_amount}
          isActive={goal.is_active}
          createdAt={goal.created_at}
        />
      ));
    } else {
      return goals.map((goal) => (
        <Link
          key={goal.id}
          to={`/savings-goals/${goal.id}`}
          className="block"
        >
          <div className="border rounded-lg p-4 h-full hover:border-primary transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium">{goal.name}</h3>
                <p className="text-sm text-muted-foreground">Individual Goal</p>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-muted h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full" 
                  style={{ 
                    width: `${Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))}%` 
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>${goal.current_amount.toFixed(2)}</span>
                <span>${goal.target_amount.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <span className={`text-xs px-2 py-1 rounded-full ${goal.daily_transfer_enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                {goal.daily_transfer_enabled ? 'Active' : 'Paused'}
              </span>
              <Button variant="outline" size="sm">View Details</Button>
            </div>
          </div>
        </Link>
      ));
    }
  };

  const renderUserCircles = (circles) => {
    return circles.map((circle) => (
      <CircleCard
        key={circle.id}
        id={circle.id}
        name={circle.name}
        contributionAmount={circle.contribution_amount}
        frequency={circle.frequency}
        memberCount={circle.memberCount || 0}
        nextPayoutDate={null} // We don't have this info in this context
        isYourTurn={false} // We don't have this info in this context
      />
    ));
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Savings Goals</h1>
            <p className="text-muted-foreground">
              Set goals and automate your savings journey
            </p>
          </div>
          
          <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2 sm:gap-4">          
            <Dialog open={isNewCircleGoalDialogOpen} onOpenChange={setIsNewCircleGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Users className="h-4 w-4 mr-2" />
                  New Circle Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <GoalForm onComplete={handleCreateCircleGoalSuccess} />
              </DialogContent>
            </Dialog>
            <Dialog open={isNewSoloGoalDialogOpen} onOpenChange={setIsNewSoloGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Solo Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <SoloGoalForm onComplete={handleCreateSoloGoalSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Goals</TabsTrigger>
            <TabsTrigger value="solo">
              <User className="h-4 w-4 mr-2" /> Individual
            </TabsTrigger>
            <TabsTrigger value="circle">
              <Users className="h-4 w-4 mr-2" /> Circle
            </TabsTrigger>
          </TabsList>
        
          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading savings goals...</p>
              </div>
            </div>
          ) : hasAnyGoals ? (
            <>
              {/* All Goals Tab */}
              <TabsContent value="all" className="space-y-8">
                {/* Solo Goals */}
                {(activeSoloGoals.length > 0 || pausedSoloGoals.length > 0) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Individual Goals</h2>
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {activeSoloGoals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-md font-medium">Active</h3>
                          <span className="bg-primary/10 text-primary text-sm px-2 py-0.5 rounded-full">
                            {activeSoloGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(activeSoloGoals, 'solo')}
                        </div>
                      </div>
                    )}
                    
                    {pausedSoloGoals.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-md font-medium">Paused</h3>
                          <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full">
                            {pausedSoloGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(pausedSoloGoals, 'solo')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* User Joined Circles (Saving Circles) */}
                {userCircles.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Saving Circles</h2>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {renderUserCircles(userCircles)}
                    </div>
                  </div>
                )}
                
                {/* Circle Goals */}
                {(activeCircleGoals.length > 0 || pausedCircleGoals.length > 0) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Circle Goals</h2>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {activeCircleGoals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-md font-medium">Active</h3>
                          <span className="bg-primary/10 text-primary text-sm px-2 py-0.5 rounded-full">
                            {activeCircleGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(activeCircleGoals)}
                        </div>
                      </div>
                    )}
                    
                    {pausedCircleGoals.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-md font-medium">Paused</h3>
                          <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full">
                            {pausedCircleGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(pausedCircleGoals)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              {/* Solo Goals Tab */}
              <TabsContent value="solo" className="space-y-8">
                {activeSoloGoals.length > 0 || pausedSoloGoals.length > 0 ? (
                  <div>
                    {activeSoloGoals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-semibold">Active Goals</h2>
                          <span className="bg-primary/10 text-primary text-sm px-2 py-0.5 rounded-full">
                            {activeSoloGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(activeSoloGoals, 'solo')}
                        </div>
                      </div>
                    )}
                    
                    {pausedSoloGoals.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-semibold">Paused Goals</h2>
                          <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full">
                            {pausedSoloGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(pausedSoloGoals, 'solo')}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No individual goals</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                      Create your first individual savings goal to automate saving toward your personal targets.
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsNewSoloGoalDialogOpen(true)}
                    >
                      Create Individual Goal
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              {/* Circle Tab */}
              <TabsContent value="circle" className="space-y-8">
                {/* Circle Goals */}
                {(activeCircleGoals.length > 0 || pausedCircleGoals.length > 0) && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Circle Goals</h2>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {activeCircleGoals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-md font-medium">Active</h3>
                          <span className="bg-primary/10 text-primary text-sm px-2 py-0.5 rounded-full">
                            {activeCircleGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(activeCircleGoals)}
                        </div>
                      </div>
                    )}
                    
                    {pausedCircleGoals.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-md font-medium">Paused</h3>
                          <span className="bg-muted text-muted-foreground text-sm px-2 py-0.5 rounded-full">
                            {pausedCircleGoals.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {renderGoalCards(pausedCircleGoals)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User Joined Circles (Saving Circles) */}
                {userCircles.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Saving Circles</h2>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {renderUserCircles(userCircles)}
                    </div>
                  </div>
                )}

                {/* Empty state when no circles */}
                {activeCircleGoals.length === 0 && pausedCircleGoals.length === 0 && userCircles.length === 0 && (
                  <div className="bg-muted/30 rounded-lg p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No circles yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                      Join or create a savings circle to start saving together with others.
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => setIsNewCircleGoalDialogOpen(true)}
                      >
                        Create Circle Goal
                      </Button>
                      <Button asChild>
                        <Link to="/join-circle">
                          Join Existing Circle
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </>
          ) : (
            <div className="bg-muted/30 rounded-lg p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ArrowUpDown className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-6 text-xl font-semibold">No savings goals yet</h2>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Start automating your savings by creating goals for the things that matter to you.
                Our system will analyze your spending and help you save without even thinking about it.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                <Button 
                  size="lg" 
                  onClick={() => setIsNewSoloGoalDialogOpen(true)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Create Solo Goal
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => setIsNewCircleGoalDialogOpen(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Create Circle Goal
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SavingsGoals;
