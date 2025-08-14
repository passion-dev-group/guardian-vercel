# Plaid Transfer Webhook

This function handles webhooks from Plaid when transfer statuses change (contributions and payouts).

## Webhook URL

Once deployed, your webhook URL will be:
```
https://[YOUR_PROJECT_REF].supabase.co/functions/v1/plaid-transfer-webhook
```

## Setting up the Webhook in Plaid Dashboard

1. Go to your Plaid Dashboard
2. Navigate to **Team Settings** > **Webhooks**
3. Add a new webhook with the URL above
4. Select the following webhook types:
   - `TRANSFER_STATUS_UPDATED`
   - `TRANSFER_EVENTS_UPDATE`
   - `TRANSFER_CREATED`
   - `ACCOUNT_UPDATED`
   - `ACCOUNT_BALANCE_UPDATED`
   - `SYNC_UPDATES_AVAILABLE`
   - `RECURRING_TRANSACTIONS_UPDATE`
   - `TRANSACTIONS_REMOVED`
   - `DEFAULT_UPDATE`
   - `INITIAL_UPDATE`
   - `HISTORICAL_UPDATE`

## What the Webhook Handles

> **Note**: The `SYNC_UPDATES_AVAILABLE` webhook indicates that new transaction data is available. You'll need to implement the actual transaction fetching logic using Plaid's `/transactions/sync` endpoint to retrieve and store the new transactions in your database.

### Transfer Status Updates
- **pending**: Transfer is being processed
- **posted**: Transfer completed successfully
- **failed**: Transfer failed
- **cancelled**: Transfer was cancelled
- **returned**: Transfer was returned (ACH return)

### Account Updates
- **ACCOUNT_UPDATED**: Account information has changed
- **ACCOUNT_BALANCE_UPDATED**: Account balance has been updated

### Transaction Updates
- **SYNC_UPDATES_AVAILABLE**: New transactions data is available (main webhook to handle)
- **RECURRING_TRANSACTIONS_UPDATE**: New recurring transactions available (subscriptions, bills, etc.)
- **TRANSACTIONS_REMOVED**: Transactions have been deleted/removed
- **DEFAULT_UPDATE**: Default update notification
- **INITIAL_UPDATE**: Initial data load notification
- **HISTORICAL_UPDATE**: Historical data load notification

### Database Updates
The webhook automatically updates the `circle_transactions` table with:
- New status based on Plaid's response
- `processed_at` timestamp
- Metadata including failure reasons and webhook data

### Special Handling
- **Failed Payouts**: Logs failure for manual review
- **Failed Contributions**: Logs failure for manual review
- **Successful Transfers**: Updates transaction status to completed

## Security Considerations

In production, you should:
1. Verify webhook signatures from Plaid
2. Use environment variables for sensitive data
3. Implement rate limiting
4. Add authentication if needed

## Testing

You can test the webhook using Plaid's webhook testing tools in the dashboard, or by sending a POST request with sample data:

### Transfer Webhook Test
```json
{
  "webhook_type": "TRANSFER",
  "webhook_code": "TRANSFER_STATUS_UPDATED",
  "transfer_id": "test_transfer_123",
  "transfer_status": "posted",
  "transfer_amount": "100.00",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "sandbox"
}
```

### Transactions Webhook Test
```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "SYNC_UPDATES_AVAILABLE",
  "item_id": "test_item_123",
  "new_transactions": 5,
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "sandbox"
}
```

### Recurring Transactions Test
```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "RECURRING_TRANSACTIONS_UPDATE",
  "item_id": "test_item_123",
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "sandbox"
}
```

### Transactions Removed Test
```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "TRANSACTIONS_REMOVED",
  "item_id": "test_item_123",
  "removed_transactions": ["txn_123", "txn_456"],
  "timestamp": "2024-01-01T00:00:00Z",
  "environment": "sandbox"
}
```

## Environment Variables Required

- `PLAID_CLIENT_ID`: Your Plaid client ID
- `PLAID_SECRET`: Your Plaid secret key
- `PLAID_ENV`: Environment (sandbox/production)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
