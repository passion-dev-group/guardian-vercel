
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface MemberInvitationProps {
  members: string[];
  addMember: (email: string) => boolean;
  removeMember: (email: string) => void;
}

const MemberInvitation = ({ members, addMember, removeMember }: MemberInvitationProps) => {
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const handleAddMember = () => {
    if (addMember(newMemberEmail)) {
      setNewMemberEmail("");
    }
  };

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">Invite Members</legend>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="Enter email address"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddMember();
              }
            }}
          />
        </div>
        <Button 
          type="button" 
          onClick={handleAddMember}
          variant="outline"
        >
          Add
        </Button>
      </div>

      {members.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-sm text-muted-foreground">Invited members:</p>
          <div className="flex flex-wrap gap-2">
            {members.map((email) => (
              <div 
                key={email} 
                className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeMember(email)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
};

export default MemberInvitation;
