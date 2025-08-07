
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, CreditCard, Send, Shield } from 'lucide-react';

const PricingDetails: React.FC = () => {
  return (
    <section className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pricing Details</h2>
        <p className="text-lg text-gray-600">Everything you need to know about our transparent pricing</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-primary" />
            Detailed Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="contribution-fees">
              <AccordionTrigger className="text-left">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-primary" />
                  Contribution Fees
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-gray-600">
                  <p>
                    <strong>Pay-As-You-Go:</strong> 1.5% of each contribution you make to any savings circle.
                  </p>
                  <p>
                    <strong>Monthly Pass:</strong> No contribution fees! Make unlimited contributions for just $5/month.
                  </p>
                  <p>
                    <strong>Premium Circle:</strong> Reduced rate of 0.75% per contribution, perfect for high-volume savers.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg mt-4">
                    <p className="text-sm">
                      <strong>Example:</strong> Contributing $500 costs $7.50 (Pay-As-You-Go), $0 (Monthly Pass), or $3.75 (Premium Circle).
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payout-fees">
              <AccordionTrigger className="text-left">
                <div className="flex items-center">
                  <Send className="h-4 w-4 mr-2 text-primary" />
                  Payout Fees
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-gray-600">
                  <p>
                    <strong>Pay-As-You-Go:</strong> $0.50 flat fee per payout, regardless of amount.
                  </p>
                  <p>
                    <strong>Monthly Pass:</strong> No payout fees! Receive unlimited payouts.
                  </p>
                  <p>
                    <strong>Premium Circle:</strong> Reduced flat fee of $0.25 per payout.
                  </p>
                  <div className="bg-green-50 p-4 rounded-lg mt-4">
                    <p className="text-sm">
                      <strong>Note:</strong> Payouts are processed within 1-2 business days to your linked bank account.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="invite-credits">
              <AccordionTrigger className="text-left">
                <div className="flex items-center">
                  <Send className="h-4 w-4 mr-2 text-primary" />
                  Invite Credits
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-gray-600">
                  <p>
                    <strong>Pay-As-You-Go:</strong> $0.10 per SMS invite, $0.05 per email invite.
                  </p>
                  <p>
                    <strong>Monthly Pass:</strong> 100 free invite credits (mix of SMS/email), then standard rates apply.
                  </p>
                  <p>
                    <strong>Premium Circle:</strong> 200 free invite credits, plus 50% off additional invites.
                  </p>
                  <div className="bg-purple-50 p-4 rounded-lg mt-4">
                    <p className="text-sm">
                      <strong>Tip:</strong> Email invites are more cost-effective and have higher acceptance rates!
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="no-hidden-costs">
              <AccordionTrigger className="text-left">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-primary" />
                  No Hidden Costs
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-gray-600">
                  <p>We believe in complete transparency. Here's what's always free:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Account creation and verification</li>
                    <li>Joining existing savings circles</li>
                    <li>Bank account linking and verification</li>
                    <li>Basic customer support</li>
                    <li>Standard security features</li>
                    <li>Mobile app access</li>
                  </ul>
                  <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <p className="text-sm font-medium">
                      The only costs are the transparent fees listed above. No setup fees, no cancellation fees, no surprises.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
};

export default PricingDetails;
