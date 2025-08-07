
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLinkedBankAccounts } from "@/hooks/useLinkedBankAccounts";
import { Loader2, Trash2 } from "lucide-react";

const LinkedAccountsList = () => {
  const { accounts, loading, error, removeAccount } = useLinkedBankAccounts();

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Linked Accounts</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading accounts...</span>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Linked Accounts</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>No bank accounts linked yet.</p>
          <p className="text-sm">Link your first bank account to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-3">Linked Accounts</h3>
      <div className="border rounded-lg divide-y">
        {accounts.map((account) => (
          <div key={account.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">
                  {account.institution_name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium">
                  {account.institution_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {account.account_name} •••• {account.mask}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {account.account_type} • {account.account_subtype}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant={account.verification_status === 'automatically_verified' ? "default" : "outline"}
              >
                {account.verification_status === 'automatically_verified' ? 'Verified' : 'Pending'}
              </Badge>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeAccount(account.id)}
                disabled={false}
                aria-label={`Remove ${account.institution_name} account`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinkedAccountsList;
