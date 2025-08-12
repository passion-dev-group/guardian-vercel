
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { useMembersList } from "@/hooks/useMembersList";
import { usePaymentReminder } from "@/hooks/usePaymentReminder";
import MemberListItem from "@/components/circle-details/members/MemberListItem";
import LoadingSpinner from "@/components/LoadingSpinner";

interface MemberListProps {
  circleId: string | undefined;
  isAdmin: boolean;
  currentUserId?: string;
}

const MemberList = ({ circleId, isAdmin, currentUserId }: MemberListProps) => {
  const { members, loading } = useMembersList(circleId);
  const { sendReminder, isSending } = usePaymentReminder();
  
  const handleRemindMember = async (memberId: string, displayName: string | null, reminderType: "gentle" | "urgent" | "overdue" = "gentle") => {
    if (!circleId) return;
    console.log("Sending reminder to member:",circleId, memberId, displayName, reminderType);
    try {
      const result = await sendReminder({
        circleId,
        memberId,
        reminderType
      });
      
      if (result.success) {
        trackEvent('circle_payment_reminder_sent', {
          circle_id: circleId,
          recipient_id: memberId,
          reminder_type: reminderType
        });
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };
  
  if (!circleId) {
    return <div className="text-center py-4 text-red-500">Error: No circle ID provided</div>;
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="medium" />
      </div>
    );
  }
  
  if (members.length === 0) {
    return (
      <div className="bg-muted/30 rounded-md p-8 text-center">
        <h3 className="font-medium mb-2">No Members Found</h3>
        <p className="text-muted-foreground text-sm mb-4">
          This circle doesn't have any members yet or you may not have permission to view them.
        </p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                <span>Member</span>
                <div className="text-xs text-muted-foreground font-normal">
                  (👑 = Admin)
                </div>
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">
              <div className="flex items-center gap-2">
                <span>Payout Order</span>
                <div className="text-xs text-muted-foreground font-normal">
                  (Rotation Queue)
                </div>
              </div>
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              <div className="flex items-center gap-2">
                <span>Contribution History</span>
                <div className="text-xs text-muted-foreground font-normal">
                  (Total & Count)
                </div>
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberListItem 
              key={member.id}
              member={member}
              isAdmin={isAdmin}
              onRemind={handleRemindMember}
              isReminding={isSending}
              currentUserId={currentUserId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MemberList;
