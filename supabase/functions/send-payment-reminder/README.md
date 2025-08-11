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
- Verifies admin permissions before sending
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

- Verifies the user is an admin of the circle
- Uses service role key for database operations
- Validates all input parameters
