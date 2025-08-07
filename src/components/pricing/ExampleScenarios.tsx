
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, PiggyBank } from 'lucide-react';

const scenarios = [
  {
    title: 'Casual Saver',
    icon: PiggyBank,
    description: 'Sarah contributes $200 monthly to one savings circle',
    details: {
      contribution: 200,
      frequency: 'monthly',
      circles: 1
    },
    calculations: {
      payAsYouGo: {
        contribution: 200 * 0.015,
        payout: 1 * 0.50,
        total: (200 * 0.015) + (1 * 0.50)
      },
      monthlyPass: {
        total: 5
      },
      premiumCircle: {
        contribution: 200 * 0.0075,
        payout: 1 * 0.25,
        total: (200 * 0.0075) + (1 * 0.25)
      }
    }
  },
  {
    title: 'Regular Saver',
    icon: TrendingUp,
    description: 'Mike contributes $500 bi-weekly across 2 savings circles',
    details: {
      contribution: 500,
      frequency: 'bi-weekly',
      circles: 2
    },
    calculations: {
      payAsYouGo: {
        contribution: (500 * 2.17) * 0.015,
        payout: 2.17 * 0.50,
        total: ((500 * 2.17) * 0.015) + (2.17 * 0.50)
      },
      monthlyPass: {
        total: 5
      },
      premiumCircle: {
        contribution: (500 * 2.17) * 0.0075,
        payout: 2.17 * 0.25,
        total: ((500 * 2.17) * 0.0075) + (2.17 * 0.25)
      }
    }
  },
  {
    title: 'Circle Organizer',
    icon: Users,
    description: 'Lisa manages multiple circles with $1,000 weekly contributions',
    details: {
      contribution: 1000,
      frequency: 'weekly',
      circles: 3
    },
    calculations: {
      payAsYouGo: {
        contribution: (1000 * 4.33) * 0.015,
        payout: 4.33 * 0.50,
        total: ((1000 * 4.33) * 0.015) + (4.33 * 0.50)
      },
      monthlyPass: {
        total: 5
      },
      premiumCircle: {
        contribution: (1000 * 4.33) * 0.0075,
        payout: 4.33 * 0.25,
        total: ((1000 * 4.33) * 0.0075) + (4.33 * 0.25)
      }
    }
  }
];

const ExampleScenarios: React.FC = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBestPlan = (scenario: typeof scenarios[0]) => {
    const costs = [
      { name: 'Pay-As-You-Go', cost: scenario.calculations.payAsYouGo.total },
      { name: 'Monthly Pass', cost: scenario.calculations.monthlyPass.total },
      { name: 'Premium Circle', cost: scenario.calculations.premiumCircle.total }
    ];
    
    return costs.reduce((prev, current) => (prev.cost < current.cost) ? prev : current);
  };

  return (
    <section className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Real-World Examples</h2>
        <p className="text-lg text-gray-600">See how different saving patterns affect your monthly costs</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {scenarios.map((scenario, index) => {
          const Icon = scenario.icon;
          const bestPlan = getBestPlan(scenario);
          
          return (
            <Card key={index} className="relative">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{scenario.title}</CardTitle>
                <p className="text-gray-600 text-sm">{scenario.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Scenario Details */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <span className="ml-2 font-medium">{formatCurrency(scenario.details.contribution)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency:</span>
                        <span className="ml-2 font-medium capitalize">{scenario.details.frequency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Comparison */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Monthly Costs:</h4>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pay-As-You-Go:</span>
                      <span className="font-medium">{formatCurrency(scenario.calculations.payAsYouGo.total)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Pass:</span>
                      <span className="font-medium">{formatCurrency(scenario.calculations.monthlyPass.total)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Premium Circle:</span>
                      <span className="font-medium">{formatCurrency(scenario.calculations.premiumCircle.total)}</span>
                    </div>
                  </div>

                  {/* Best Plan Recommendation */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Best Plan:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {bestPlan.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Saves {formatCurrency(Math.max(...[
                        scenario.calculations.payAsYouGo.total,
                        scenario.calculations.monthlyPass.total,
                        scenario.calculations.premiumCircle.total
                      ]) - bestPlan.cost)} per month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Call-out */}
      <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Key Takeaway</h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              <strong>Monthly Pass</strong> is ideal for regular savers contributing $100+ monthly, while 
              <strong> Pay-As-You-Go</strong> works best for occasional users. 
              <strong> Premium Circle</strong> offers the best value for high-volume savers and circle organizers.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ExampleScenarios;
