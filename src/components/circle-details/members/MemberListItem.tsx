
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Member } from "@/types/circle";
import MemberStatusBadge from "./MemberStatusBadge";

interface MemberListItemProps {
  member: Member;
  isAdmin: boolean;
  onRemind: (userId: string, displayName: string | null) => void;
}

const MemberListItem = ({ member, isAdmin, onRemind }: MemberListItemProps) => {
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRemind(member.user_id, member.profile.display_name)}
            aria-label={`Remind ${member.profile.display_name || "user"} to contribute`}
          >
            Remind
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};

export default MemberListItem;
