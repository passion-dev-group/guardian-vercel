
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Clock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const QuickActionsBar = () => {
  const handleActionClick = (actionName: string) => {
    trackEvent('dashboard_quick_action_clicked', { action: actionName });
  };

  return (
    <nav className="flex flex-col gap-2 sm:flex-row sm:gap-4" aria-label="Quick actions">
      <Button className="flex-1" asChild>
        <Link to="/create-circle" onClick={() => handleActionClick('create_circle')}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Circle
        </Link>
      </Button>
      <Button variant="outline" className="flex-1" asChild>
        <Link to="/link-bank" onClick={() => handleActionClick('link_bank')}>
          <Clock className="mr-2 h-4 w-4" />
          Link Bank Account
        </Link>
      </Button>
    </nav>
  );
};

export default QuickActionsBar;
