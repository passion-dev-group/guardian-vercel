import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRecurringContributions } from '@/hooks/useRecurringContributions';
import { useLinkedBankAccounts } from '@/hooks/useLinkedBankAccounts';
import { CreateRecurringContributionData } from '@/types/transactions';
import { formatCurrency, formatDateRelative } from '@/lib/utils';
import { PaymentNotificationService } from '@/lib/notifications';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export function RecurringContributionsManager() {
  const {
    recurringContributions,
    loading,
    error,
    stats,
    createRecurringContribution,
    updateRecurringContribution,
    deleteRecurringContribution,
    toggleRecurringContribution,
    refresh,
  } = useRecurringContributions();

  const { accounts } = useLinkedBankAccounts();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState<CreateRecurringContributionData>({
    circle_id: '',
    amount: 0,
    frequency: 'weekly',
    day_of_week: 1, // Monday
    day_of_month: 1,
  });

  const handleCreateRecurringContribution = async () => {
    if (!formData.circle_id || formData.amount <= 0) {
      PaymentNotificationService.showErrorNotification(
        'Invalid Data',
        'Please fill in all required fields with valid values.'
      );
      return;
    }

    if (accounts.length === 0) {
      PaymentNotificationService.showErrorNotification(
        'No Bank Account',
        'Please link a bank account before setting up recurring contributions.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      await createRecurringContribution(formData);
      
      PaymentNotificationService.showSuccessNotification(
        'Recurring Contribution Created',
        `Successfully set up recurring contribution of ${formatCurrency(formData.amount)}.`
      );

      setIsCreateDialogOpen(false);
      setFormData({
        circle_id: '',
        amount: 0,
        frequency: 'weekly',
        day_of_week: 1,
        day_of_month: 1,
      });
    } catch (error) {
      PaymentNotificationService.showErrorNotification(
        'Creation Failed',
        error instanceof Error ? error.message : 'Failed to create recurring contribution.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRecurringContribution = async (id: string) => {
    try {
      await toggleRecurringContribution(id);
      const contribution = recurringContributions.find(rc => rc.id === id);
      if (contribution) {
        PaymentNotificationService.showSuccessNotification(
          'Status Updated',
          `Recurring contribution ${contribution.is_active ? 'paused' : 'activated'}.`
        );
      }
    } catch (error) {
      PaymentNotificationService.showErrorNotification(
        'Update Failed',
        error instanceof Error ? error.message : 'Failed to update recurring contribution.'
      );
    }
  };

  const handleDeleteRecurringContribution = async (id: string) => {
    try {
      await deleteRecurringContribution(id);
      PaymentNotificationService.showSuccessNotification(
        'Recurring Contribution Deleted',
        'Successfully deleted recurring contribution.'
      );
    } catch (error) {
      PaymentNotificationService.showErrorNotification(
        'Deletion Failed',
        error instanceof Error ? error.message : 'Failed to delete recurring contribution.'
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paused: 'secondary',
      overdue: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load recurring contributions</p>
            <Button onClick={refresh} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-lg font-semibold">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Pause className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Paused</p>
                <p className="text-lg font-semibold">{stats.pausedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-lg font-semibold">{stats.overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recurring Contributions</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Recurring Contribution
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Recurring Contribution</DialogTitle>
              <DialogDescription>
                Set up automatic contributions to your savings circle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Every 3 Months</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency !== 'monthly' && (
                <div>
                  <Label htmlFor="day-of-week">Day of Week</Label>
                  <Select 
                    value={formData.day_of_week?.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div>
                  <Label htmlFor="day-of-month">Day of Month</Label>
                  <Input
                    id="day-of-month"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.day_of_month}
                    onChange={(e) => setFormData(prev => ({ ...prev, day_of_month: parseInt(e.target.value) || 1 }))}
                    placeholder="1-31"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRecurringContribution} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recurring Contributions List */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : recurringContributions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recurring contributions set up</p>
              <p className="text-sm">Create your first recurring contribution to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringContributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(contribution.status)}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{contribution.circle.name}</p>
                        {getStatusBadge(contribution.status)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{formatCurrency(contribution.amount)} • {contribution.frequency}</p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Next: {contribution.next_contribution_date_formatted}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={contribution.is_active}
                      onCheckedChange={() => handleToggleRecurringContribution(contribution.id)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRecurringContribution(contribution.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 