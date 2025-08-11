
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import our components
import PlaidLinkButton from "@/components/bank-linking/PlaidLinkButton";
import CardEntryForm from "@/components/bank-linking/CardEntryForm";
import LinkedAccountsList from "@/components/bank-linking/LinkedAccountsList";
import SecurityNote from "@/components/bank-linking/SecurityNote";
import type { PlaidAccount } from "@/types/plaid";

const LinkBank = () => {
  const [activeTab, setActiveTab] = useState("bank");
  const [linkedAccounts, setLinkedAccounts] = useState<PlaidAccount[]>([]);
  
  // Track page view
  useEffect(() => {
    trackEvent('link_bank_page_viewed');
  }, []);
  
  // Handle successful bank linking
  const handleBankLinkSuccess = (accounts: PlaidAccount[], institutionName: string) => {
    setLinkedAccounts(prev => [...prev, ...accounts]);
    trackEvent('bank_linked_successfully', { 
      institution: institutionName,
      accounts_count: accounts.length 
    });
  };
  
  // Handle bank linking exit/error
  const handleBankLinkExit = (error?: any) => {
    if (error) {
      trackEvent('bank_linking_failed', { 
        error_type: error.error?.error_type,
        error_code: error.error?.error_code 
      });
    } else {
      trackEvent('bank_linking_cancelled');
    }
  };
  
  // Handle card saved
  const handleCardSaved = (lastFour: string) => {
    trackEvent('card_linked', { last_four: lastFour });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Link Bank Account</h1>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Intro Banner */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Securely connect your bank</CardTitle>
            <CardDescription>
              Link your bank account to enable automatic contributions and receive payouts 
              directly. Your information is encrypted and secure.
            </CardDescription>
          </CardHeader>
        </Card>
        
        {/* Main Content Area */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Linking Options */}
          <Card>
            <CardHeader>
              <CardTitle>Link Your Account</CardTitle>
              <CardDescription>
                Choose how you'd like to connect your financial account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bank">Bank Account</TabsTrigger>
                  <TabsTrigger value="card">Credit/Debit Card</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bank" className="space-y-4">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium mb-2">Connect Your Bank</h3>
                    <p className="text-muted-foreground mb-6">
                      Securely link your bank account using Plaid. This allows us to:
                    </p>
                    <ul className="text-left space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Process automatic contributions to your savings circles
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Send payouts directly to your bank account
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Check your account balance for smart savings
                      </li>
                    </ul>
                    
                    <PlaidLinkButton
                      onSuccess={handleBankLinkSuccess}
                      onExit={handleBankLinkExit}
                      className="w-full"
                    >
                      Connect Bank Account
                    </PlaidLinkButton>
                  </div>
                </TabsContent>
                
                <TabsContent value="card" className="space-y-4">
                  <div className="text-center py-4">
                    <h3 className="text-lg font-medium mb-2">Add Payment Card</h3>
                    <p className="text-muted-foreground mb-6">
                      Add a credit or debit card for manual contributions and fees.
                    </p>
                  </div>
                  <CardEntryForm onCardSaved={handleCardSaved} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Linked Accounts */}
          <div>
            <LinkedAccountsList />
          </div>
        </div>
        
        {/* Security Note */}
        <SecurityNote />
      </main>
    </div>
  );
};

export default LinkBank;
