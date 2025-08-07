
import { useState } from "react";
import { ChevronDown, Check, X, LightbulbIcon } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export interface CircleOverviewProps {
  className?: string;
}

const CircleOverview = ({ className }: CircleOverviewProps) => {
  const [openTip, setOpenTip] = useState<string | null>(null);
  
  const handleTipClick = (tipId: string) => {
    setOpenTip(openTip === tipId ? null : tipId);
    trackEvent('tip_clicked', { tip_id: tipId });
  };
  
  // Track overview viewed on component mount
  useState(() => {
    trackEvent('overview_viewed');
  });
  
  return (
    <section className={`circle-overview space-y-8 ${className || ""}`}>
      <div>
        <h2 className="text-2xl font-semibold mb-3">Circle Overview</h2>
        <p className="text-muted-foreground">
          Rotating savings circles allow members to pool money together, with each member receiving
          the full pot on a rotating schedule. MiTurn automates the entire process, handling
          contributions and payouts while providing transparency and accountability for all members.
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Check className="text-green-500" />
            <span>Benefits of Joining</span>
          </CardTitle>
          <CardDescription>
            Why joining a savings circle might be right for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <Check className="text-green-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>No interest rates or hidden fees - just pure community savings</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="text-green-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>Transparent management with clear consequences for missed payments</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="text-green-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>Save toward a specific target with structured payments</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="text-green-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>Develop a consistent savings habit through regular contributions</span>
            </li>
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <X className="text-red-500" />
            <span>Important Considerations</span>
          </CardTitle>
          <CardDescription>
            Factors to consider before committing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <X className="text-red-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>Credit risk if your income changes (e.g., job loss or reduction)</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="text-red-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>Requires consistent financial discipline for the duration of the circle</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="text-red-500 mt-1 h-5 w-5 flex-shrink-0" />
              <span>Money is locked in the circle until your designated payout date</span>
            </li>
          </ul>
          <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-sm">
            <p><strong>Note:</strong> Always plan your contributions around essential expenses first.</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="tips-section">
        <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
          <LightbulbIcon className="text-amber-500" />
          Smart Saving Tips
        </h3>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tip-1">
            <AccordionTrigger 
              onClick={() => handleTipClick('prioritize-savings')}
              className="hover:text-primary"
            >
              Prioritize your contributions
            </AccordionTrigger>
            <AccordionContent>
              Set aside your contribution amount first each payment cycle before allocating funds for 
              non-essential expenses. This "pay yourself first" approach ensures you never miss a payment.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="tip-2">
            <AccordionTrigger 
              onClick={() => handleTipClick('invest-surplus')}
              className="hover:text-primary"
            >
              Consider investing surplus funds
            </AccordionTrigger>
            <AccordionContent>
              If you receive your payout early in the circle's lifecycle, consider investing the lump sum 
              in a low-risk vehicle to generate passive yield while continuing your regular contributions.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="tip-3">
            <AccordionTrigger 
              onClick={() => handleTipClick('realistic-contribution')}
              className="hover:text-primary"
            >
              Choose a realistic contribution
            </AccordionTrigger>
            <AccordionContent>
              Select a contribution amount you can comfortably afford even during financially tight months. 
              It's better to join a circle with a lower contribution than to risk missing payments.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
};

export default CircleOverview;
