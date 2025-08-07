
import { Badge } from "@/components/ui/badge";

type ContributionStatus = "paid" | "due" | "overdue";

interface MemberStatusBadgeProps {
  status: ContributionStatus;
}

const MemberStatusBadge = ({ status }: MemberStatusBadgeProps) => {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500">Paid</Badge>;
    case "due":
      return <Badge className="bg-yellow-500">Due</Badge>;
    case "overdue":
      return <Badge className="bg-red-500">Overdue</Badge>;
    default:
      return null;
  }
};

export default MemberStatusBadge;
