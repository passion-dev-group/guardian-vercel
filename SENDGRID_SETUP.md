# SendGrid Email Integration Setup

This document explains how to set up SendGrid for sending circle invitation emails in the MiTurn application.

## Overview

The application uses SendGrid to send beautiful HTML invitation emails when users create savings circles and invite members. The integration is implemented through Supabase Edge Functions for security and reliability.

## Setup Instructions

### 1. SendGrid Account Setup

1. Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Verify your sender domain (e.g., `miturn.app`) in SendGrid
3. Create an API key with "Mail Send" permissions
4. Note down your API key

### 2. Environment Variables

Add the following environment variable to your Supabase project:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

You can set this in the Supabase dashboard:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Add the environment variable under "Environment Variables"

### 3. Sender Email Configuration

The emails are sent from `invitations@miturn.app`. Make sure this email address is verified in your SendGrid account.

### 4. Deploy the Edge Function

The `send-circle-invitation` edge function needs to be deployed to your Supabase project:

```bash
supabase functions deploy send-circle-invitation
```

## How It Works

### Email Flow

1. User creates a circle and adds member emails
2. `useCircleForm` hook calls the `send-circle-invitation` edge function
3. Edge function fetches circle details and invite code from database
4. SendGrid API sends beautiful HTML emails to all recipients
5. Email status is updated in the `circle_members_invites` table

### Email Template

The invitation emails include:
- Beautiful HTML design with gradient header
- Circle name and inviter name
- Direct link to join the circle
- 7-day expiration notice
- Fallback plain text version

### Database Integration

The system updates the `circle_members_invites` table with:
- `status`: 'sent' or 'failed'
- `sent_at`: timestamp when email was sent

## Usage

### From useCircleForm Hook

The `useCircleForm` hook automatically sends invitation emails when a circle is created:

```typescript
const { onSubmit } = useCircleForm();
// Emails are sent automatically when circle is created
```

### From useSendInvitations Hook

For manual invitation sending:

```typescript
import { useSendInvitations } from '@/hooks/useSendInvitations';

const { sendCircleInvitations, resendInvitation, isSending } = useSendInvitations();

// Send invitations to multiple recipients
const result = await sendCircleInvitations(circleId, userId, [
  { email: 'user1@example.com', name: 'User One' },
  { email: 'user2@example.com', name: 'User Two' }
]);

// Resend a single invitation
const success = await resendInvitation(circleId, userId, 'user@example.com', 'User Name');
```

### From useContacts Hook

The `useContacts` hook automatically uses SendGrid for email invitations:

```typescript
import { useContacts } from '@/hooks/useContacts';

const { sendInvites } = useContacts();
const result = await sendInvites(circleId);
```

## Testing

### Local Development

1. Set up your SendGrid API key in Supabase environment variables
2. Deploy the edge function: `supabase functions deploy send-circle-invitation`
3. Create a circle with member emails to test the flow

### Production

1. Ensure your domain is verified in SendGrid
2. Set up proper DNS records for email deliverability
3. Monitor SendGrid dashboard for delivery rates and bounces

## Troubleshooting

### Common Issues

1. **"No SendGrid API key found"**: Check that `SENDGRID_API_KEY` is set in Supabase environment variables
2. **Emails not sending**: Verify your sender domain is authenticated in SendGrid
3. **Poor deliverability**: Check SendGrid dashboard for bounces and spam reports

### Debugging

Check the Supabase function logs:
```bash
supabase functions logs send-circle-invitation
```

### Monitoring

Monitor email delivery in:
- SendGrid dashboard
- Supabase function logs
- Application analytics events

## Security Considerations

- API keys are stored securely in Supabase environment variables
- Email sending is handled server-side in edge functions
- No sensitive data is exposed to the client
- Rate limiting is handled by SendGrid

## Cost Considerations

- SendGrid offers 100 emails/day on free tier
- Monitor usage in SendGrid dashboard
- Consider upgrading plan for higher volume

## Future Enhancements

- Email templates customization
- A/B testing for email content
- Advanced analytics and tracking
- SMS integration for phone numbers
- Bulk invitation management 