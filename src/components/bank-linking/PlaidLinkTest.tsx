import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlaidLinkButton from "./PlaidLinkButton";
import { useLinkedBankAccounts } from "@/hooks/useLinkedBankAccounts";
import type { PlaidAccount } from "@/types/plaid";

const PlaidLinkTest = () => {
  const { accounts, isLoading, refreshAccounts } = useLinkedBankAccounts();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleSuccess = (accounts: PlaidAccount[], institutionName: string) => {
    addTestResult(`✅ Successfully linked ${institutionName} with ${accounts.length} accounts`);
    refreshAccounts();
  };

  const handleExit = (error?: any) => {
    if (error) {
      addTestResult(`❌ Plaid Link failed: ${error.error?.display_message || 'Unknown error'}`);
    } else {
      addTestResult(`ℹ️ Plaid Link exited without error`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plaid Integration Test</CardTitle>
          <CardDescription>
            Test the Plaid bank linking integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <PlaidLinkButton
              onSuccess={handleSuccess}
              onExit={handleExit}
              variant="default"
            >
              Test Bank Linking
            </PlaidLinkButton>
            
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-muted/30">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-sm">No test results yet</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>
            Currently linked bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground">No accounts linked yet</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{account.institution_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.account_name} •••• {account.mask}
                    </div>
                  </div>
                  <Badge variant={account.verification_status === 'automatically_verified' ? 'default' : 'outline'}>
                    {account.verification_status === 'automatically_verified' ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaidLinkTest; 