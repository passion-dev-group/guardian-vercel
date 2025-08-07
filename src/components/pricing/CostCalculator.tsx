
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

const CostCalculator: React.FC = () => {
  const [contributionAmount, setContributionAmount] = useState<number>(500);
  const [frequency, setFrequency] = useState<string>('monthly');
  const [calculations, setCalculations] = useState({
    payAsYouGo: { contribution: 0, payout: 0, total: 0 },
    monthlyPass: { contribution: 0, payout: 0, total: 0 },
    premiumCircle: { contribution: 0, payout: 0, total: 0 }
  });

  const frequencyMultipliers = {
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 0.33
  };

  useEffect(() => {
    const monthlyContributions = contributionAmount * (frequencyMultipliers[frequency as keyof typeof frequencyMultipliers] || 1);
    const monthlyPayouts = frequencyMultipliers[frequency as keyof typeof frequencyMultipliers] || 1;

    // Pay-As-You-Go calculations
    const payAsYouGoContribution = monthlyContributions * 0.015;
    const payAsYouGoPayout = monthlyPayouts * 0.50;
    const payAsYouGoTotal = payAsYouGoContribution + payAsYouGoPayout;

    // Monthly Pass calculations (flat $5)
    const monthlyPassTotal = 5;

    // Premium Circle calculations
    const premiumContribution = monthlyContributions * 0.0075;
    const premiumPayout = monthlyPayouts * 0.25;
    const premiumTotal = premiumContribution + premiumPayout;

    setCalculations({
      payAsYouGo: {
        contribution: payAsYouGoContribution,
        payout: payAsYouGoPayout,
        total: payAsYouGoTotal
      },
      monthlyPass: {
        contribution: 0,
        payout: 0,
        total: monthlyPassTotal
      },
      premiumCircle: {
        contribution: premiumContribution,
        payout: premiumPayout,
        total: premiumTotal
      }
    });

    // Track calculator usage
    trackEvent('calculator_used', {
      contribution_amount: contributionAmount,
      frequency: frequency
    });
  }, [contributionAmount, frequency]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBestPlan = () => {
    const costs = [
      { name: 'Pay-As-You-Go', cost: calculations.payAsYouGo.total },
      { name: 'Monthly Pass', cost: calculations.monthlyPass.total },
      { name: 'Premium Circle', cost: calculations.premiumCircle.total }
    ];
    
    return costs.reduce((prev, current) => (prev.cost < current.cost) ? prev : current);
  };

  return (
    <section className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Cost Calculator</h2>
        <p className="text-lg text-gray-600">See how much you'll pay with each plan based on your savings habits</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-primary" />
            Calculate Your Monthly Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Controls */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="contribution-amount">Contribution Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="contribution-amount"
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(Number(e.target.value))}
                    className="pl-8"
                    min="1"
                    step="10"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Amount you contribute each time</p>
              </div>

              <div>
                <Label htmlFor="frequency">Contribution Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">How often you contribute</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Best Plan for You:</h4>
                <p className="text-blue-800">
                  <strong>{getBestPlan().name}</strong> - {formatCurrency(getBestPlan().cost)}/month
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Cost Breakdown</h3>
              
              {/* Pay-As-You-Go */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Pay-As-You-Go</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Contribution fees:</span>
                    <span>{formatCurrency(calculations.payAsYouGo.contribution)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payout fees:</span>
                    <span>{formatCurrency(calculations.payAsYouGo.payout)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(calculations.payAsYouGo.total)}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Pass */}
              <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                <h4 className="font-medium text-gray-900 mb-2">Monthly Pass</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Monthly fee:</span>
                    <span>{formatCurrency(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contribution fees:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payout fees:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(calculations.monthlyPass.total)}</span>
                  </div>
                </div>
              </div>

              {/* Premium Circle */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Premium Circle</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Contribution fees:</span>
                    <span>{formatCurrency(calculations.premiumCircle.contribution)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payout fees:</span>
                    <span>{formatCurrency(calculations.premiumCircle.payout)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(calculations.premiumCircle.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default CostCalculator;
