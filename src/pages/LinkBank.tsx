
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import CircleLinkButton from "@/components/bank-linking/CircleLinkButton";
import CircleWalletVerification from "@/components/bank-linking/CircleWalletVerification";
import LinkedAccountsList from "@/components/bank-linking/LinkedAccountsList";
import SecurityNote from "@/components/bank-linking/SecurityNote";
import type { CircleUser } from "@/types/circle";

const LinkBank = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  
  // Track page view
  useEffect(() => {
    trackEvent('link_bank_page_viewed');
  }, []);
  
  // Handle successful Circle KYC
  const handleCircleSuccess = (user: CircleUser) => {
    setLinkedAccounts(prev => [...prev, ...user.wallets]);
    trackEvent('circle_wallet_linked', { 
      user_id: user.id,
      wallet_count: user.wallets.length 
    });
  };
  
  // Handle Circle KYC error
  const handleCircleError = (error?: any) => {
    if (error) {
      trackEvent('circle_kyc_failed', { 
        error_type: error?.type || 'unknown',
        error_message: error?.message || 'KYC failed' 
      });
    } else {
      trackEvent('circle_kyc_cancelled');
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Connect Circle Wallet</h1>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Intro Banner */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Connect your Circle wallet</CardTitle>
            <CardDescription>
              Complete KYC verification with Circle to create a USDC wallet for 
              automatic contributions and secure payouts.
            </CardDescription>
          </CardHeader>
        </Card>
        
        {/* Main Content Area */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Linking Options */}
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Verify your identity and create a USDC wallet with Circle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="wallet">Circle Wallet</TabsTrigger>
                </TabsList>
                
                <TabsContent value="wallet" className="space-y-4">
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium mb-2">Connect with Circle</h3>
                    <p className="text-muted-foreground mb-6">
                      Complete identity verification to create your USDC wallet. Circle provides:
                    </p>
                    <ul className="text-left space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Full KYC/AML compliance with regulatory standards
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Secure USDC wallet for payments and transfers
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        On-chain transaction verification and transparency
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Instant settlements and low transaction fees
                      </li>
                    </ul>
                    
                    <CircleLinkButton
                      onSuccess={handleCircleSuccess}
                      onError={handleCircleError}
                      className="w-full"
                    >
                      Connect with Circle
                    </CircleLinkButton>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Connected Wallets */}
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
