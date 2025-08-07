
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsAndConditions = () => {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">MiTurn Circle Participation Terms & Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6 text-sm">
            <p className="text-muted-foreground italic">
              By joining a MiTurn savings circle ("Circle"), you agree to the following:
            </p>
            
            <div>
              <h3 className="font-semibold text-base mb-2">Invitation & Membership</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Joining a Circle is by invitation only. You must receive and accept a valid invite link or code.</li>
                <li>You represent that you are legally able to form binding contracts and have the financial means to contribute.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Contribution Obligation</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Each member commits to make the scheduled contributions on time (per the Circle's cadence).</li>
                <li>Once you join, the Circle's rotation and payout schedule proceed regardless of individual payment status.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Liability & Waiver</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>MiTurn provides the platform for managing contributions but does not guarantee payments or reimbursements.</li>
                <li>If you fail to contribute or miss a payment, you remain personally responsible for making up the shortfall, including any late-payment fees the Circle may assess.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Default & Profile Flagging</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Members who miss two or more scheduled payments without prior arrangement may be marked as "Inactive" or "Flagged" in their MiTurn profile.</li>
                <li>A Flagged status may restrict your ability to join new Circles or access certain features until you've settled your outstanding contributions.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Dispute Resolution</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>If a contribution dispute arises, members agree to first attempt resolution within their Circle through direct communication.</li>
                <li>MiTurn may, at its discretion, mediate or provide documentation but is not liable for members' private disputes or outcomes.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Modifications</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>MiTurn reserves the right to amend these terms at any time. Material changes will be communicated via email or in-app notification. Continued use of the service after notification constitutes acceptance of the updated terms.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Governing Law</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>These Terms are governed by the laws of the jurisdiction in which MiTurn operates, without regard to conflict-of-laws principles.</li>
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-semibold text-base mb-2">Acceptance</h3>
              <p>By clicking "Join Circle," you acknowledge that you have read, understood, and agree to these Terms & Conditions.</p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TermsAndConditions;
