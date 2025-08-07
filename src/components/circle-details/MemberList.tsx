
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { useMembersList } from "@/hooks/useMembersList";
import MemberListItem from "@/components/circle-details/members/MemberListItem";
import LoadingSpinner from "@/components/LoadingSpinner";

interface MemberListProps {
  circleId: string | undefined;
  isAdmin: boolean;
}

const MemberList = ({ circleId, isAdmin }: MemberListProps) => {
  const { members, loading } = useMembersList(circleId);
  const { toast } = useToast();
  
  const handleRemindMember = async (memberId: string, displayName: string | null) => {
    // In a real app, this would send an actual notification
    toast({
      title: "Reminder sent",
      description: `Payment reminder sent to ${displayName || 'user'}`,
    });
    
    trackEvent('circle_payment_reminder_sent', {
      circle_id: circleId,
      recipient_id: memberId
    });
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
            <TableHead>Member</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Position</TableHead>
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
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MemberList;
