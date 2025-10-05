# do-daily-check Edge Function

## Overview

This edge function runs daily via Supabase cron to check for circles where the current cycle has ended and processes payouts to members.

## Purpose

1. **Check for Ended Cycles**: Identifies circles where the `next_payout_date` for the current payout member (position 1) has passed
2. **Process Payouts**: Creates payout transaction records to distribute contributed funds to the designated member
3. **Advance Rotation**: Moves to the next member in the payout rotation

## How It Works

### Cycle Detection

A cycle is considered ended when:
- A circle member has `payout_position = 1` (current recipient)
- Their `next_payout_date` is less than or equal to the current date (or test clock virtual time in sandbox)
- The circle is in an active state

#### Sandbox vs Production

**Production Mode:**
- Uses actual current time for cycle end detection
- Compares `next_payout_date` against `new Date().toISOString()`

**Sandbox Mode (PLAID_ENV=sandbox):**
- Uses Plaid test clock virtual time for cycle end detection
- For each circle, retrieves the `test_clock_id` from the `circles` table (set when circle was started)
- Queries the test clock's current virtual time via `sandboxTransferTestClockGet`
- Compares `next_payout_date` against the test clock's `virtual_time`
- Falls back to actual time if test clock is not found or unavailable

### Payout Processing

When a cycle ends, the function:
1. **Gets Contributions**: Fetches all completed contributions for the current cycle from `circle_transactions`
2. **Calculates Pool**: Sums up all completed contribution amounts to determine total payout
3. **Creates Payout Record**: Inserts a payout transaction in `circle_transactions` with status 'pending'
4. **Advances Rotation**: Updates all member positions:
   - Current payout member (position 1) moves to the end of the rotation
   - All other members move up one position
   - Next member in position 1 gets assigned the next payout date based on circle frequency
5. **Marks Cycle Complete**: Updates the database to reflect the completed cycle

### Implementation Details

The function creates a **ledger-based** payout system:
- Contributions from all members are tracked in `circle_transactions` as completed transactions
- When a cycle ends, these funds are "moved" to the current positioned member via a payout transaction record
- The actual bank transfer (via Plaid) can be handled separately, triggered by the payout record
- The rotation automatically advances to ensure fair distribution

## Configuration

### Cron Schedule

- **Schedule**: `@daily` (runs once per day at midnight UTC)
- **Function**: `do-daily-check`
- **JWT Required**: No (runs as system cron job)

Configured in `supabase/functions/config.toml`:

```toml
[[cron]]
name = "daily-cycle-check"
schedule = "@daily"
function = "do-daily-check"
payload = { }

[functions.do-daily-check]
verify_jwt = false
max_retries = 2
timeout_seconds = 60
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Daily cycle check completed",
  "circles_checked": 3,
  "payouts_processed": 2,
  "payouts_failed": 1,
  "details": [
    {
      "circle_id": "uuid",
      "circle_name": "Family Savings",
      "member_id": "uuid",
      "next_payout_date": "2025-10-01T00:00:00Z",
      "success": true
    }
  ]
}
```

### No Cycles to Process

```json
{
  "success": true,
  "message": "No cycles to process today",
  "circles_checked": 0,
  "payouts_processed": 0
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## Database Tables Used

- **circles**: Circle information (name, frequency, contribution_amount, status, test_clock_id)
  - `test_clock_id`: Plaid sandbox test clock ID (shared by all members of the circle)
- **circle_members**: Member information including payout_position and next_payout_date
- **circle_transactions**: Records both contributions and payout transactions
  - Contributions: `type='contribution'`, `status='completed'`
  - Payouts: `type='payout'`, `status='pending'` (updated to 'completed' when bank transfer finishes)

## Related Functions

- `process-circle-payout`: Will be called to process the actual payout
- `manage-circle-rotation`: Handles rotation advancement
- `track-analytics-event`: Logs daily check events for monitoring

## Testing

### Manual Testing

To manually trigger the function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/do-daily-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Or use the Supabase CLI:

```bash
supabase functions invoke do-daily-check --no-verify-jwt
```

### Sandbox Testing with Test Clocks

In sandbox mode, you can simulate cycle completion by advancing test clocks:

1. **Create a circle** - This creates test clocks for all recurring transfers
2. **Advance the test clock** to the next payout date:
   ```bash
   # Use the admin-recurring endpoint to advance the test clock
   curl -X POST https://your-project.supabase.co/functions/v1/admin-recurring \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{
       "action": "advance_clock",
       "test_clock_id": "test_clock_xxx",
       "days_to_advance": 7
     }'
   ```
3. **Trigger the cycle check**:
   ```bash
   supabase functions invoke do-daily-check --no-verify-jwt
   ```

The function will detect that the test clock's virtual time has passed the `next_payout_date` and process the payout.

## Future Enhancements

1. **Bank Transfer Integration**: Connect payout records to actual Plaid transfers via webhook or separate processor
2. **Notifications**: Send notifications to members when payout is processed
3. **Enhanced Error Handling**: Implement retry logic for failed payouts
4. **Scheduling Options**: Allow custom schedule times (e.g., specific time of day)
5. **Partial Payouts**: Support scenarios where not all contributions are completed

## Monitoring

The function logs analytics events via `track-analytics-event` with:
- `circles_processed`: Number of circles checked
- `payouts_successful`: Number of successful payouts
- `payouts_failed`: Number of failed payouts
- `check_date`: Timestamp of the check

Monitor these events in your analytics dashboard to track system health.

