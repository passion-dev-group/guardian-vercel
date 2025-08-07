
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const plans = [
  {
    id: 'pay-as-you-go',
    name: 'Pay-As-You-Go',
    description: 'Perfect for occasional savers',
    contributionFee: '1.5%',
    payoutFee: '$0.50',
    features: [
      'No monthly commitment',
      'Pay only when you use',
      'Standard support',
      'Basic circle features'
    ],
    popular: false,
    cta: 'Get Started'
  },
  {
    id: 'monthly-pass',
    name: 'Monthly Pass',
    description: 'Best value for regular savers',
    price: '$5',
    period: '/month',
    contributionFee: 'Unlimited',
    payoutFee: 'Unlimited',
    features: [
      'Unlimited contributions',
      'Unlimited payouts',
      '100 free invite credits',
      'Priority email support',
      'Advanced analytics'
    ],
    popular: true,
    cta: 'Start Free Trial'
  },
  {
    id: 'premium-circle',
    name: 'Premium Circle',
    description: 'For serious circle organizers',
    contributionFee: '0.75%',
    payoutFee: '$0.25',
    features: [
      'Reduced fees',
      '200 free invite credits',
      '50% off additional invites',
      'Priority phone support',
      'Custom circle branding',
      'Advanced member management'
    ],
    popular: false,
    cta: 'Upgrade Now'
  }
];

const PricingTable: React.FC = () => {
  const handlePlanSelect = (planId: string, planName: string) => {
    trackEvent('plan_selected', { plan_id: planId, plan_name: planName });
  };

  return (
    <section className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-lg text-gray-600">All plans include our core savings circle features</p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <table className="w-full border-collapse bg-white rounded-lg shadow-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-6 text-left font-semibold text-gray-900">Features</th>
              {plans.map((plan) => (
                <th key={plan.id} className="p-6 text-center relative">
                  {plan.popular && (
                    <Badge className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-primary text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  <div className="mt-2">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    {plan.price && (
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-primary">{plan.price}</span>
                        <span className="text-gray-600">{plan.period}</span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-4 font-medium text-gray-900">Contribution Fee</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center text-gray-600">
                  {plan.contributionFee}
                </td>
              ))}
            </tr>
            <tr className="border-t bg-gray-50">
              <td className="p-4 font-medium text-gray-900">Payout Fee</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center text-gray-600">
                  {plan.payoutFee}
                </td>
              ))}
            </tr>
            {plans[0].features.map((_, index) => (
              <tr key={index} className={`border-t ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                <td className="p-4 font-medium text-gray-900">
                  {plans.find(p => p.features[index])?.features[index] || ''}
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="p-4 text-center">
                    {plan.features[index] ? (
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t">
              <td className="p-4"></td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center">
                  <Button
                    className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handlePlanSelect(plan.id, plan.name)}
                  >
                    {plan.cta}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              {plan.price && (
                <div className="mt-4">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contribution Fee:</span>
                  <span className="font-medium">{plan.contributionFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payout Fee:</span>
                  <span className="font-medium">{plan.payoutFee}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => handlePlanSelect(plan.id, plan.name)}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default PricingTable;
