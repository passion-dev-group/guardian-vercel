import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentNotificationService } from "@/lib/notifications";

export function NotificationTest() {
  const testContributionSuccess = () => {
    PaymentNotificationService.showPaymentNotification({
      type: 'contribution',
      success: true,
      amount: 50.00,
      circleName: 'Test Circle',
      transactionId: 'test-123',
      plaidTransferId: 'plaid-test-456',
    });
  };

  const testContributionError = () => {
    PaymentNotificationService.showPaymentNotification({
      type: 'contribution',
      success: false,
      amount: 50.00,
      circleName: 'Test Circle',
      transactionId: 'test-123',
      error: 'Insufficient funds in account',
    });
  };

  const testPayoutSuccess = () => {
    PaymentNotificationService.showPaymentNotification({
      type: 'payout',
      success: true,
      amount: 200.00,
      circleName: 'Test Circle',
      transactionId: 'test-456',
      recipientName: 'John Doe',
    });
  };

  const testPayoutError = () => {
    PaymentNotificationService.showPaymentNotification({
      type: 'payout',
      success: false,
      amount: 200.00,
      circleName: 'Test Circle',
      transactionId: 'test-456',
      error: 'Bank account not found',
    });
  };

  const testBankLinking = () => {
    PaymentNotificationService.showBankLinkingNotification(true, 'Bank of America');
  };

  const testBankLinkingError = () => {
    PaymentNotificationService.showBankLinkingNotification(false, undefined, 'Invalid credentials');
  };

  const testCircleNotifications = () => {
    PaymentNotificationService.showCircleNotification('joined', 'Test Circle');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Notification System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">Contribution Notifications</h3>
          <div className="flex gap-2">
            <Button onClick={testContributionSuccess} variant="outline" size="sm">
              Success
            </Button>
            <Button onClick={testContributionError} variant="outline" size="sm">
              Error
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Payout Notifications</h3>
          <div className="flex gap-2">
            <Button onClick={testPayoutSuccess} variant="outline" size="sm">
              Success
            </Button>
            <Button onClick={testPayoutError} variant="outline" size="sm">
              Error
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Bank Linking</h3>
          <div className="flex gap-2">
            <Button onClick={testBankLinking} variant="outline" size="sm">
              Success
            </Button>
            <Button onClick={testBankLinkingError} variant="outline" size="sm">
              Error
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Circle Notifications</h3>
          <Button onClick={testCircleNotifications} variant="outline" size="sm">
            Test Circle Join
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 