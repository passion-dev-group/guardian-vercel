
import React from 'react';
import PageLayout from '@/components/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { 
  Users, 
  CircleDollarSign,
  DollarSign, 
  Shield, 
  ShieldCheck, 
  Info, 
  BookOpen,
  FileText,
  HelpCircle
} from 'lucide-react';

const AboutPage: React.FC = () => {
  // Track page view on component mount
  React.useEffect(() => {
    trackEvent('about_page_viewed');
  }, []);

  const trackTabChange = (tabId: string) => {
    trackEvent('about_tab_selected', { tab_id: tabId });
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">About MiTurn</h1>
          <p className="text-lg text-muted-foreground">
            A modern platform for collaborative and individual savings
          </p>
        </div>

        <Tabs defaultValue="overview" onValueChange={trackTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
            <TabsTrigger value="privacy-terms">Privacy & Terms</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Welcome to MiTurn
                </CardTitle>
                <CardDescription>
                  A modern take on traditional savings circles with added benefits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  MiTurn is a financial community platform that combines the traditional concept of savings circles 
                  (also known as rotating savings and credit associations or ROSCAs) with modern technology and 
                  financial tools.
                </p>
                
                <p>
                  Our platform enables you to create or join savings circles with friends, family, or colleagues, 
                  where everyone contributes a fixed amount regularly, and each member takes turns receiving the pool. 
                  We've also expanded this concept to include solo savings goals with smart automation.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Collaborative Savings
                    </h3>
                    <p className="text-sm">
                      Create or join savings circles with trusted connections to achieve financial goals together.
                    </p>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <CircleDollarSign className="h-5 w-5" />
                      Solo Savings
                    </h3>
                    <p className="text-sm">
                      Set personal savings goals with automated contributions and smart reminders.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg">
                    <Link to="/signup" onClick={() => trackEvent('about_signup_clicked')}>
                      Get Started
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/how-it-works" onClick={() => trackEvent('about_learn_more_clicked')}>
                      Learn More
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Key Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Community Support</h3>
                    <p className="text-sm text-muted-foreground">
                      Build savings habits with peer accountability and motivation.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">Interest-Free Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Get access to lump sums without paying interest or fees to financial institutions.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">Automated Saving</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up recurring contributions that align with your income schedule.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">Financial Education</h3>
                    <p className="text-sm text-muted-foreground">
                      Learn better savings habits through practice and community involvement.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">Transparent System</h3>
                    <p className="text-sm text-muted-foreground">
                      Clear rotation schedules and contribution tracking for all members.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">Bank-Level Security</h3>
                    <p className="text-sm text-muted-foreground">
                      Your financial data and transactions are protected with enterprise-grade encryption.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* How It Works Tab */}
          <TabsContent value="how-it-works" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  How MiTurn Works
                </CardTitle>
                <CardDescription>
                  Step-by-step guide to collaborative and solo savings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Creating a Savings Circle</h3>
                  <ol className="space-y-4 list-decimal list-inside">
                    <li className="pl-2">
                      <span className="font-medium">Sign Up or Log In</span>: Create your MiTurn account or log in if you already have one.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Start a New Circle</span>: Click on "Create Circle" from your dashboard or the dropdown menu.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Set Circle Parameters</span>: Define the contribution amount, frequency (weekly, bi-weekly, monthly), and group size.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Invite Members</span>: Add friends, family members, or colleagues to join your circle via email or sharing a unique invitation link.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Determine Rotation Order</span>: Choose between random assignment, specific need-based order, or first-come-first-served for payout order.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Link Payment Method</span>: Connect your bank account for automated contributions and payouts.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Launch the Circle</span>: Once all members have joined and confirmed their participation, the circle begins on the set start date.
                    </li>
                  </ol>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Joining an Existing Circle</h3>
                  <ol className="space-y-4 list-decimal list-inside">
                    <li className="pl-2">
                      <span className="font-medium">Receive an Invitation</span>: Get invited via email or a shared link from an existing circle creator.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">View Circle Details</span>: Review the contribution amount, frequency, group size, and expected payout schedule.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Accept Terms & Conditions</span>: Read and accept the circle-specific terms and MiTurn's platform rules.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Add Payment Method</span>: Link your bank account for automated contributions.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Confirm Participation</span>: Formally join the circle and begin contributing according to the schedule.
                    </li>
                  </ol>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Creating a Solo Savings Goal</h3>
                  <ol className="space-y-4 list-decimal list-inside">
                    <li className="pl-2">
                      <span className="font-medium">Navigate to Savings Goals</span>: From your dashboard, select "Savings Goals" or use the dropdown menu.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Create New Goal</span>: Click "Create New Goal" and select "Solo Goal".
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Define Your Goal</span>: Set a target amount, purpose (e.g., vacation, emergency fund), and deadline.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Set Contribution Schedule</span>: Choose how much and how often you want to contribute (daily, weekly, monthly).
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Enable Automation</span>: Opt for automatic transfers from your linked account to your savings goal.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Track Progress</span>: Monitor your advancement toward your goal with visual progress trackers and notifications.
                    </li>
                  </ol>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contribution & Payout Process</h3>
                  <ol className="space-y-4 list-decimal list-inside">
                    <li className="pl-2">
                      <span className="font-medium">Regular Contributions</span>: All members contribute the agreed amount on schedule, typically processed through automatic withdrawals.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Pool Collection</span>: Contributions are collected in a secure holding account.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Rotation Payouts</span>: On payout dates, the full pool amount is transferred to the designated recipient according to the predetermined rotation.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Transparent Records</span>: All transactions are recorded and visible to circle members, ensuring full transparency.
                    </li>
                    <li className="pl-2">
                      <span className="font-medium">Completion</span>: The circle continues until each member has received a payout, at which point it can be renewed or closed.
                    </li>
                  </ol>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild>
                      <Link to="/create-circle" onClick={() => trackEvent('about_create_circle_clicked')}>
                        Create a Circle
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/savings-goals" onClick={() => trackEvent('about_solo_goal_clicked')}>
                        Start a Solo Goal
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Privacy & Terms Tab */}
          <TabsContent value="privacy-terms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Data Privacy & Security
                </CardTitle>
                <CardDescription>
                  How we protect your information and financial data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  At MiTurn, we take your privacy and financial security extremely seriously. 
                  Our platform employs bank-level encryption and security protocols to ensure 
                  your personal and financial information remains protected.
                </p>
                
                <div className="space-y-4 mt-4">
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">Data Encryption</h4>
                    <p className="text-sm">
                      All sensitive data is encrypted using industry-standard 256-bit encryption both in transit and at rest.
                    </p>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">Secure Banking Connections</h4>
                    <p className="text-sm">
                      We use secure, tokenized connections to financial institutions that never store your actual banking credentials.
                    </p>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">Limited Data Collection</h4>
                    <p className="text-sm">
                      We collect only the information necessary to provide our services and do not sell your personal data to third parties.
                    </p>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">Regular Security Audits</h4>
                    <p className="text-sm">
                      Our systems undergo regular security assessments and penetration testing by independent security firms.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Link 
                    to="/privacy" 
                    className="text-primary underline" 
                    onClick={() => trackEvent('privacy_policy_viewed')}
                  >
                    View our complete Privacy Policy
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Terms & Conditions
                </CardTitle>
                <CardDescription>
                  Important information about using MiTurn services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  By using MiTurn, you agree to our platform's Terms & Conditions, which govern 
                  your use of the service. Below are key highlights from our terms:
                </p>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Member Responsibilities</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Making timely contributions according to the circle's schedule</li>
                        <li>Providing accurate personal and financial information</li>
                        <li>Maintaining sufficient funds in your linked account for scheduled contributions</li>
                        <li>Notifying the circle admin and MiTurn support if you anticipate payment issues</li>
                        <li>Treating other circle members with respect and honesty</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Platform Fees</AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-2">MiTurn charges minimal fees to maintain the platform and process transactions:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Basic membership</strong>: Free</li>
                        <li><strong>Circle creation</strong>: Free for first circle, $5 for each additional active circle</li>
                        <li><strong>Transaction fee</strong>: 1% of each contribution (capped at $5)</li>
                        <li><strong>Premium features</strong>: $4.99/month for advanced analytics, priority support, and custom circle rules</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger>Default & Dispute Resolution</AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-2">In case of contribution defaults or disputes:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Members who miss payments may be subject to late fees and removal from the circle</li>
                        <li>MiTurn provides a mediation service for disputes between circle members</li>
                        <li>Unresolved disputes can be escalated to our Trust & Safety team</li>
                        <li>Defaulting members may be restricted from joining future circles</li>
                        <li>Repeated defaults will result in account suspension</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-4">
                    <AccordionTrigger>Circle Cancellation</AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-2">For circle cancellations:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Circles can be canceled before the first contribution with unanimous member consent</li>
                        <li>After contributions begin, circles can only be canceled with 75% member approval</li>
                        <li>Remaining funds will be distributed proportionally based on contributions made</li>
                        <li>MiTurn reserves the right to suspend circles that violate our Terms of Service</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-5">
                    <AccordionTrigger>Account Termination</AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-2">MiTurn may terminate accounts for:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Providing false information</li>
                        <li>Repeated missed payments or defaults</li>
                        <li>Fraudulent activity or misuse of the platform</li>
                        <li>Violation of our community guidelines</li>
                        <li>Users may also voluntarily close accounts after fulfilling all circle obligations</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="mt-4">
                  <Link 
                    to="/terms" 
                    className="text-primary underline" 
                    onClick={() => trackEvent('terms_conditions_viewed')}
                  >
                    View our complete Terms & Conditions
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Common questions about MiTurn's services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="faq-1">
                    <AccordionTrigger>What is a savings circle?</AccordionTrigger>
                    <AccordionContent>
                      A savings circle (also known as a ROSCA, susu, tanda, or chit fund in different cultures) is a group of individuals 
                      who agree to contribute a fixed amount of money on a regular schedule. The total collected amount is given to one 
                      member each round in rotation until all members have received a payout. MiTurn modernizes this traditional concept 
                      with technology, automation, and enhanced security.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-2">
                    <AccordionTrigger>Is my money safe with MiTurn?</AccordionTrigger>
                    <AccordionContent>
                      Yes. MiTurn uses bank-level security measures to protect your financial information and transactions. 
                      All funds are held in FDIC-insured accounts (up to applicable limits), and we employ multiple layers of 
                      encryption and security protocols. Additionally, our platform is regularly audited by independent 
                      security firms to ensure the highest standards of protection.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-3">
                    <AccordionTrigger>How do payouts work?</AccordionTrigger>
                    <AccordionContent>
                      Payouts follow the predetermined rotation schedule established when the circle was created. When it's 
                      your turn to receive the pool, the collected funds are automatically transferred to your linked bank 
                      account within 1-2 business days of the scheduled payout date. You'll receive notifications before and 
                      after the payout occurs.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-4">
                    <AccordionTrigger>What happens if someone doesn't pay?</AccordionTrigger>
                    <AccordionContent>
                      MiTurn has multiple safeguards in place to minimize defaults:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Automatic withdrawals help ensure timely payments</li>
                        <li>Members receive reminders before contribution due dates</li>
                        <li>Grace periods allow for short delays</li>
                      </ul>
                      If a member repeatedly fails to contribute, they may be removed from the circle and their account flagged. 
                      For circles with the optional protection plan, MiTurn will cover missed payments to ensure other members 
                      receive their full expected amounts.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-5">
                    <AccordionTrigger>Can I withdraw from a circle early?</AccordionTrigger>
                    <AccordionContent>
                      Early withdrawal policies depend on the specific terms set for your circle:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>If you haven't yet received your payout, you may forfeit your right to future payouts</li>
                        <li>You remain obligated to continue your contributions unless a replacement member is found</li>
                        <li>Some circles have specific early withdrawal penalties as agreed upon at creation</li>
                      </ul>
                      We strongly encourage members to only join circles they are confident they can complete.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-6">
                    <AccordionTrigger>What are the fees for using MiTurn?</AccordionTrigger>
                    <AccordionContent>
                      MiTurn aims to keep our services accessible with transparent fee structure:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Basic membership: Free</li>
                        <li>Circle creation: First circle is free, $5 for each additional active circle</li>
                        <li>Transaction fee: 1% of each contribution (capped at $5)</li>
                        <li>Premium features: $4.99/month for advanced analytics, priority support, and custom circle rules</li>
                      </ul>
                      All fees are clearly displayed before you commit to any transaction.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-7">
                    <AccordionTrigger>How is the payout order determined?</AccordionTrigger>
                    <AccordionContent>
                      When creating a circle, the organizer can choose from several options for determining payout order:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Random assignment (computer-generated)</li>
                        <li>Need-based (members indicate preference and urgency)</li>
                        <li>First-come-first-served (based on join order)</li>
                        <li>Manual assignment (circle organizer specifies exact order)</li>
                      </ul>
                      The selected method and resulting schedule is visible to all members before they commit to joining.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-8">
                    <AccordionTrigger>Can I invite people I don't know to my circle?</AccordionTrigger>
                    <AccordionContent>
                      While technically possible, we strongly recommend only inviting people you know and trust to your circles. 
                      The success of savings circles relies on mutual trust and accountability. MiTurn provides verification features 
                      and trust scores for members, but these are supplements to, not replacements for, personal relationships and trust.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-9">
                    <AccordionTrigger>Is MiTurn available internationally?</AccordionTrigger>
                    <AccordionContent>
                      Currently, MiTurn is available in the United States with plans for international expansion. 
                      Our roadmap includes Canada, the UK, and select European and Latin American countries in the coming year. 
                      Sign up for our newsletter to be notified when MiTurn becomes available in your region.
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="faq-10">
                    <AccordionTrigger>How do I contact customer support?</AccordionTrigger>
                    <AccordionContent>
                      We offer several support channels:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>In-app chat support (available 9am-8pm ET weekdays)</li>
                        <li>Email support at help@miturn.com (24-48 hour response time)</li>
                        <li>Help center with guides and tutorials at help.miturn.com</li>
                        <li>Phone support for premium members at 1-800-MITURN-1</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <div className="flex justify-center mt-8">
                  <Button asChild variant="outline">
                    <Link to="/help" onClick={() => trackEvent('about_help_center_clicked')}>
                      Visit Help Center
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default AboutPage;
