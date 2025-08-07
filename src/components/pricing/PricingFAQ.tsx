
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: "How are fees calculated and when are they charged?",
    answer: "Contribution fees are calculated as a percentage of your contribution amount and charged when you make a contribution. Payout fees are flat rates charged when you receive a payout. Monthly Pass subscribers pay $5 on their billing date and have no per-transaction fees."
  },
  {
    question: "What is the billing cycle for Monthly Pass?",
    answer: "Monthly Pass is billed monthly from your subscription start date. For example, if you start on the 15th, you'll be billed on the 15th of each month. You can view your next billing date in your account settings."
  },
  {
    question: "Can I switch between plans?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, changes take effect immediately. When downgrading, changes take effect at the end of your current billing cycle to ensure you get full value from your current plan."
  },
  {
    question: "Are there any setup or cancellation fees?",
    answer: "No, there are no setup fees, cancellation fees, or hidden charges. You only pay the transparent fees listed in your chosen plan. You can cancel Monthly Pass or Premium Circle subscriptions at any time."
  },
  {
    question: "How do invite credits work?",
    answer: "Invite credits are used when you send SMS or email invitations to join your savings circles. Each SMS costs 1 credit, each email costs 0.5 credits. Monthly Pass includes 100 credits, Premium Circle includes 200 credits. Additional credits can be purchased at standard rates."
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer: "Monthly Pass and Premium Circle have no contribution or payout limits. Pay-As-You-Go users pay per transaction. If you exceed your invite credits on subscription plans, additional invites are charged at the reduced rate (Premium Circle) or standard rate (Monthly Pass)."
  },
  {
    question: "Are there any fees for linking bank accounts?",
    answer: "No, linking and verifying bank accounts is completely free. We use bank-level security to protect your information and there are no charges for account verification or maintenance."
  },
  {
    question: "How do refunds work if I'm not satisfied?",
    answer: "We offer a 30-day money-back guarantee for Monthly Pass and Premium Circle subscriptions. Transaction fees for Pay-As-You-Go cannot be refunded as they cover processing costs, but we're happy to help resolve any issues."
  },
  {
    question: "Do prices change for existing customers?",
    answer: "We rarely change prices, and existing customers are always notified at least 30 days in advance of any price changes. Your current plan price is locked in as long as you maintain continuous service."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover) and bank transfers for plan payments. Savings circle contributions are processed directly through your linked bank account for security."
  }
];

const PricingFAQ: React.FC = () => {
  return (
    <section className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <p className="text-lg text-gray-600">Everything you need to know about our pricing and billing</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HelpCircle className="h-5 w-5 mr-2 text-primary" />
            Common Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="mt-8 bg-gray-50">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-600 mb-4">
            Our support team is here to help you choose the right plan and answer any questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@miturn.com"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Email Support
            </a>
            <span className="hidden sm:inline text-gray-400">•</span>
            <a
              href="/help"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Help Center
            </a>
            <span className="hidden sm:inline text-gray-400">•</span>
            <a
              href="/contact"
              className="text-primary hover:text-primary/80 font-medium"
            >
              Contact Us
            </a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default PricingFAQ;
