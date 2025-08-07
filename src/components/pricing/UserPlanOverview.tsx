
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Calendar, 
  CreditCard, 
  Send, 
  ArrowUpCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface UserPlanOverviewProps {
  currentPlan?: 'pay-as-you-go' | 'monthly-pass' | 'premium-circle';
  billingDate?: Date;
  usageData?: {
    contributionsThisMonth: number;
    payoutsThisMonth: number;
    inviteCreditsUsed: number;
    inviteCreditsTotal: number;
  };
}

const UserPlanOverview: React.FC<UserPlanOverviewProps> = ({ 
  currentPlan = 'pay-as-you-go',
  billingDate,
  usageData = {
    contributionsThisMonth: 3,
    payoutsThisMonth: 1,
    inviteCreditsUsed: 15,
    inviteCreditsTotal: 100
  }
}) => {
  const handleUpgrade = (planName: string) => {
    trackEvent('plan_upgrade_clicked', { current_plan: currentPlan, target_plan: planName });
  };

  const planDetails = {
    'pay-as-you-go': {
      name: 'Pay-As-You-Go',
      icon: CreditCard,
      color: 'bg-gray-100 text-gray-800',
      contributionFee: '1.5%',
      payoutFee: '$0.50',
      features: ['No monthly commitment', 'Pay only when you use', 'Standard support']
    },
    'monthly-pass': {
      name: 'Monthly Pass',
      icon: Star,
      color: 'bg-blue-100 text-blue-800',
      price: '$5/month',
      contributionFee: 'Unlimited',
      payoutFee: 'Unlimited',
      features: ['Unlimited contributions', 'Unlimited payouts', '100 free invite credits']
    },
    'premium-circle': {
      name: 'Premium Circle',
      icon: CheckCircle,
      color: 'bg-purple-100 text-purple-800',
      contributionFee: '0.75%',
      payoutFee: '$0.25',
      features: ['Reduced fees', '200 free invite credits', 'Priority support']
    }
  };

  const plan = planDetails[currentPlan];
  const Icon = plan.icon;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Current Plan</CardTitle>
                <Badge className={plan.color}>
                  {plan.name}
                </Badge>
              </div>
            </div>
            {currentPlan === 'pay-as-you-go' && (
              <Button 
                onClick={() => handleUpgrade('monthly-pass')}
                className="bg-primary hover:bg-primary/90"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Contribution Fee:</span>
                <span className="font-medium">{plan.contributionFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payout Fee:</span>
                <span className="font-medium">{plan.payoutFee}</span>
              </div>
              {'price' in plan && plan.price && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Cost:</span>
                  <span className="font-medium">{plan.price}</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Plan Features:</h4>
              <ul className="space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            This Month's Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{usageData.contributionsThisMonth}</div>
              <div className="text-sm text-gray-600">Contributions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{usageData.payoutsThisMonth}</div>
              <div className="text-sm text-gray-600">Payouts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {usageData.inviteCreditsUsed}/{usageData.inviteCreditsTotal}
              </div>
              <div className="text-sm text-gray-600">Invite Credits</div>
              {currentPlan !== 'pay-as-you-go' && (
                <Progress 
                  value={(usageData.inviteCreditsUsed / usageData.inviteCreditsTotal) * 100} 
                  className="mt-2 h-2"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      {currentPlan !== 'pay-as-you-go' && billingDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Next billing date:</span>
              <span className="font-medium">{billingDate.toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison for Upgrades */}
      {currentPlan === 'pay-as-you-go' && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-center">Ready to Save More?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <h3 className="font-semibold text-blue-600 mb-2">Monthly Pass - $5/month</h3>
                <p className="text-sm text-gray-600 mb-3">Perfect for regular savers</p>
                <Button 
                  onClick={() => handleUpgrade('monthly-pass')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Upgrade to Monthly Pass
                </Button>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <h3 className="font-semibold text-purple-600 mb-2">Premium Circle</h3>
                <p className="text-sm text-gray-600 mb-3">Best for circle organizers</p>
                <Button 
                  onClick={() => handleUpgrade('premium-circle')}
                  variant="outline"
                  className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  Upgrade to Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserPlanOverview;
