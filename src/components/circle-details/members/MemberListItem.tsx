
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Member } from "@/types/circle";
import MemberStatusBadge from "./MemberStatusBadge";
import { Bell, ChevronDown, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemberListItemProps {
  member: Member;
  isAdmin: boolean;
  onRemind: (memberId: string, displayName: string | null, reminderType?: "gentle" | "urgent" | "overdue") => void;
  isReminding: boolean;
}

const MemberListItem = ({ member, isAdmin, onRemind, isReminding }: MemberListItemProps) => {
  return (
    <TableRow>
      <TableCell className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          {member.profile.avatar_url ? (
            <AvatarImage src={member.profile.avatar_url} alt={member.profile.display_name || "User"} />
          ) : (
            <AvatarFallback>{member.profile.display_name?.charAt(0) || "?"}</AvatarFallback>
          )}
        </Avatar>
        <span>{member.profile.display_name || "Anonymous User"}</span>
      </TableCell>
      <TableCell>
        <MemberStatusBadge status={member.contribution_status || "due"} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {member.payout_position !== null ? `#${member.payout_position}` : "Not set"}
      </TableCell>
      <TableCell className="text-right">
        {(isAdmin || member.contribution_status === "overdue") && (
          <div className="flex items-center gap-2 justify-end">
            {member.last_reminder_date && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      Last: {formatDistanceToNow(new Date(member.last_reminder_date), { addSuffix: true })}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last reminder sent {formatDistanceToNow(new Date(member.last_reminder_date), { addSuffix: true })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isReminding}
                  aria-label={`Remind ${member.profile.display_name || "user"} to contribute`}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isReminding ? "Sending..." : "Remind"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onRemind(member.id, member.profile.display_name, "gentle")}
                  disabled={isReminding}
                  className="text-green-600"
                >
                  🟢 Gentle Reminder
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onRemind(member.id, member.profile.display_name, "urgent")}
                  disabled={isReminding}
                  className="text-orange-600"
                >
                  🟠 Urgent Reminder
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onRemind(member.id, member.profile.display_name, "overdue")}
                  disabled={isReminding}
                  className="text-red-600"
                >
                  🔴 Overdue Notice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export default MemberListItem;
