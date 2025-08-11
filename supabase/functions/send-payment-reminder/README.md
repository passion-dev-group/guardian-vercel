# Send Payment Reminder

This edge function sends payment reminder emails to circle members using SendGrid.

## Environment Variables

- `SENDGRID_API_KEY`: Your SendGrid API key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for database access

## Usage

Call this function with the following payload:

```json
{
  "circleId": "uuid-of-circle",
  "memberId": "uuid-of-member",
  "adminUserId": "uuid-of-admin",
  "reminderType": "gentle" // optional: "gentle", "urgent", or "overdue"
}
```

## Features

- Sends HTML and plain text emails
- Different email templates based on reminder type
- Smart permission system: admins can send to anyone, members can send to overdue users
- Logs reminder attempts to database
- Tracks analytics events
- Handles errors gracefully

## Email Templates

The function sends different email templates based on the reminder type:

- **Gentle**: Standard friendly reminder
- **Urgent**: More urgent tone with orange accent
- **Overdue**: Critical tone with red accent

## Response

Returns a JSON response with:

```json
{
  "success": true,
  "email_sent": true,
  "recipient_email": "user@example.com",
  "recipient_name": "User Name",
  "message": "Payment reminder sent successfully"
}
```

## Security

- Verifies the user is a member of the circle
- Allows reminders if user is admin OR if target member is overdue
- Uses service role key for database operations
- Validates all input parameters

## Troubleshooting

### Common Issues

1. **Foreign Key Relationship Errors**
   - The function now fetches profiles separately to avoid relationship issues
   - Check that the `profiles` table exists and has the expected columns

2. **SendGrid API Key Issues**
   - Ensure `SENDGRID_API_KEY` is set in your Supabase project
   - Verify the API key has permission to send emails

3. **Database Permission Issues**
   - Ensure the service role key has access to all required tables
   - Check RLS policies if using them

### Testing Locally

1. Start Supabase locally: `supabase start`
2. Update the test file with your actual IDs
3. Run the test: `deno run --allow-net test.ts`

### Logs

The function includes extensive logging to help debug issues:
- Circle details fetching
- Member details fetching  
- Admin verification
- Email sending status
- Database logging results
