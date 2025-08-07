
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface InviteLinkDisplayProps {
  inviteLink: string;
}

const InviteLinkDisplay = ({ inviteLink }: InviteLinkDisplayProps) => {
  if (!inviteLink) return null;

  

  return (
    <div className="p-4 border rounded-md bg-muted">
      <p className="font-medium text-sm mb-2">Invite Link:</p>
      <div className="flex gap-2 items-center">
        <Input
          value={inviteLink}
          readOnly
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(inviteLink)}
        >
          Copy
        </Button>
      </div>
    </div>
  );
};

export default InviteLinkDisplay;
