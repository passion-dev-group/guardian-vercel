# Auto-Process Payouts Edge Function

This Edge Function automatically processes payouts when savings circle cycles end, eliminating the need for manual payout processing.

## How It Works

### 1. **Automatic Cycle Detection**
- Monitors all active circles for payout readiness
- Checks if the current cycle has ended based on frequency (weekly/biweekly/monthly)
- Verifies sufficient funds are available for payout

### 2. **Payout Processing**
- Creates payout transaction records with `auto_processed: true` flag
- Transfers funds to the member in payout position #1
- Updates transaction status to 'processing' (actual bank transfer handled by Plaid)

### 3. **Rotation Management**
- Automatically advances the payout rotation
- Moves current payout member to the end of the queue
- Promotes next member to position #1
- Calculates and sets next payout date based on circle frequency

### 4. **Scheduling**
- Runs every 6 hours via Vercel Cron (`0 */6 * * *`)
- Triggered by `/api/auto-payouts` endpoint
- Processes all eligible circles in a single run

## Configuration

### Environment Variables Required
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

### Cron Schedule
```json
{
  "crons": [
    {
      "path": "/api/auto-payouts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Payout Eligibility Criteria

A circle is eligible for automatic payout when:

1. **Status**: Circle is marked as 'active'
2. **Timing**: Current date >= next payout date
3. **Funds**: Sufficient collected contributions available
4. **Members**: At least one member in payout position #1
5. **Contributions**: All required contributions are confirmed as 'posted' by Plaid

## Database Updates

### Tables Modified
- `circle_transactions`: New payout transaction records
- `circle_members`: Payout position and date updates

### Transaction Metadata
```json
{
  "auto_processed": true,
  "trigger": "cycle_end",
  "circle_frequency": "weekly|biweekly|monthly",
  "available_pool": 1000.00
}
```

## Error Handling

- Individual circle failures don't stop processing of other circles
- Comprehensive logging for debugging
- Graceful fallback for missing data or insufficient funds

## Monitoring

### Logs to Watch
- `🔄 Starting automatic payout processing...`
- `✅ Processed payout for circle: [Circle Name]`
- `❌ Error processing circle [Circle Name]: [Error Details]`
- `🎯 Auto-payout processing complete. Processed: X, Errors: Y`

### Success Indicators
- Payout transactions created with 'processing' status
- Member positions advanced correctly
- Next payout dates calculated and set

## Manual Override

If needed, payouts can still be processed manually through:
- Existing payout management interfaces
- Direct database updates
- Admin override functions

## Security

- Uses service role key for database access
- Only processes active circles
- Validates all data before processing
- No user input accepted (cron-triggered only)

## Troubleshooting

### Common Issues
1. **Insufficient Funds**: Check contribution status and Plaid webhook confirmations
2. **Missing Payout Dates**: Ensure rotation initialization completed
3. **Database Errors**: Verify service role permissions and table structure

### Debug Steps
1. Check Edge Function logs in Supabase dashboard
2. Verify cron job execution in Vercel dashboard
3. Review database transaction records
4. Confirm circle member payout positions
