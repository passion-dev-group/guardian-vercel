
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Member } from "@/types/circle";
import MemberStatusBadge from "./MemberStatusBadge";
import { Bell, ChevronDown, Clock, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemberListItemProps {
  member: Member;
  isAdmin: boolean;
  onRemind: (memberId: string, displayName: string | null, reminderType?: "gentle" | "urgent" | "overdue") => void;
  isReminding: boolean;
  currentUserId?: string;
}

const MemberListItem = ({ member, isAdmin, onRemind, isReminding, currentUserId }: MemberListItemProps) => {
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
        <div className="items-center gap-2">
          {member.is_admin && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
              👑 Admin
            </Badge>
          )}
          <div>{member.profile.display_name || "Anonymous User"}</div>

        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <MemberStatusBadge status={member.contribution_status || "due"} />

          {/* Show contribution amount if available */}
          {member.contribution_history && member.contribution_history.total_contributions > 0 && (
            <div className="text-xs text-muted-foreground">
              ${member.contribution_history.total_contributions} total
            </div>
          )}

          {/* Show last contribution info */}
          {member.contribution_history?.last_contribution_date && (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(member.contribution_history.last_contribution_date), { addSuffix: true })}
              </div>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="space-y-2">
          {/* Payout Position */}
          {member.payout_position !== null ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold relative">
                      {member.payout_position}
                      {member.payout_position === 1 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {member.payout_position === 1 ? (
                        <span className="flex items-center gap-1">
                          <span className="text-green-600">🎯 Next Payout</span>
                        </span>
                      ) : (
                        `Payout #${member.payout_position}`
                      )}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {member.payout_position === 1
                      ? "This member will receive the next payout when all contributions are collected"
                      : `This member will receive payout #${member.payout_position} in the rotation order`
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs">
                      ?
                    </div>
                    <span className="text-sm text-muted-foreground">Waiting</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This member is waiting to be assigned a payout position in the rotation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Next Payout Date */}
          {member.next_payout_date && (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(member.next_payout_date), { addSuffix: true })}
              </div>
            </div>
          )}

          {/* Queue Position */}
          {member.payout_position && member.payout_position > 1 && (
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {member.payout_position === 2 ? "2nd in queue" :
                member.payout_position === 3 ? "3rd in queue" :
                  `${member.payout_position}th in queue`}
            </div>
          )}
        </div>
      </TableCell>

      {/* Contribution History Column */}
      <TableCell className="hidden lg:table-cell">
        {member.contribution_history ? (
          <div className="space-y-2">
            {/* Total Contributions */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">${member.contribution_history.total_contributions}</span>
            </div>

            {/* Contribution Count */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Contributions:</span>
              <span>{member.contribution_history.contribution_count}</span>
            </div>

            {/* Last Contribution Date */}
            {member.contribution_history.last_contribution_date && (
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last: {formatDistanceToNow(new Date(member.contribution_history.last_contribution_date), { addSuffix: true })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No data</div>
        )}
      </TableCell>
      <TableCell className="text-right">
        {/* Only show actions if user can send reminders AND it's not the current user */}
        {(isAdmin || member.contribution_status === "overdue") &&
          currentUserId && member.user_id !== currentUserId && (
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
                    <Bell className="h-4 w-4" />
                    {isReminding ? "Sending..." : "Remind"}
                    <ChevronDown className="h-4 w-4" />
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

        {/* Show a helpful message when it's the current user */}
        {currentUserId && member.user_id === currentUserId && (
          <div className="text-right space-y-1">
            <div className="text-xs text-muted-foreground">
              This is you
            </div>
          </div>
        )}

        {/* Show message when no current user (not logged in) */}
        {!currentUserId && (
          <div className="text-xs text-muted-foreground text-right">
            Login to manage
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export default MemberListItem;
