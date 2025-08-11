# Manage Circle Rotation

This edge function handles the core rotation logic for savings circles, including payout position management and rotation advancement.

## Environment Variables

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for database access

## Usage

Call this function with the following payload:

```json
{
  "circleId": "uuid-of-circle",
  "action": "initialize" | "advance" | "get_status",
  "adminUserId": "uuid-of-admin", // Required for initialize and advance
  "memberId": "uuid-of-member"    // Optional, for manual advancement
}
```

## Actions

### 1. **Initialize Rotation** (`action: "initialize"`)
- Assigns payout positions (1, 2, 3, ...) to all circle members
- Sets the first member's next payout date based on circle frequency
- Only admins can initialize rotation
- Required: `circleId`, `adminUserId`

### 2. **Advance Rotation** (`action: "advance"`)
- Moves the current payout member to the end of the queue
- Advances the next member to position 1
- Updates all member positions accordingly
- Only admins can advance rotation
- Required: `circleId`, `adminUserId`

### 3. **Get Rotation Status** (`action: "get_status"`)
- Returns current rotation status without making changes
- Shows all member positions and next payout information
- No permissions required (anyone can check status)
- Required: `circleId`

## Response Format

```json
{
  "success": true,
  "data": {
    "circle_id": "uuid",
    "total_members": 5,
    "current_payout_position": 2,
    "next_payout_member": "user-uuid",
    "next_payout_date": "2024-01-15T00:00:00Z",
    "rotation_complete": false,
    "members": [
      {
        "id": "member-uuid",
        "user_id": "user-uuid",
        "payout_position": 1,
        "next_payout_date": "2024-01-15T00:00:00Z",
        "display_name": "John Doe",
        "is_admin": true
      }
    ]
  },
  "message": "Rotation initialize completed successfully"
}
```

## Rotation Logic

### Position Assignment
- **Position 1**: Next member to receive payout
- **Position 2-N**: Members waiting in queue
- **Last Position**: Member who just received payout

### Advancement Rules
1. Current payout member (position 1) moves to the end
2. Member in position 2 moves to position 1
3. All other members move up by one position
4. When reaching the end, rotation cycles back to position 1

### Frequency-Based Scheduling
- **Weekly**: Next payout in 7 days
- **Biweekly**: Next payout in 14 days  
- **Monthly**: Next payout in 1 month

## Security

- Only circle admins can initialize or advance rotation
- Rotation status can be viewed by any circle member
- Uses service role key for database operations
- Validates admin permissions before allowing changes

## Database Updates

The function updates the following fields in `circle_members`:
- `payout_position`: New position in rotation queue
- `next_payout_date`: When the member will receive payout (only for position 1)

## Error Handling

- Validates circle and member existence
- Checks admin permissions
- Handles database update errors gracefully
- Returns detailed error messages for debugging

## Analytics

Tracks rotation management events for:
- Rotation initialization
- Rotation advancement
- Status checks
- Success/failure rates
