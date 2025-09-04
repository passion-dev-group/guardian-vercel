-- Create referral email logs table for tracking email sending

CREATE TABLE IF NOT EXISTS referral_email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  referral_code TEXT NOT NULL REFERENCES referrals(referral_code) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_email_logs_referrer_id ON referral_email_logs(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_email_logs_referral_code ON referral_email_logs(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_email_logs_sent_at ON referral_email_logs(sent_at);

-- Enable Row Level Security
ALTER TABLE referral_email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own email logs" ON referral_email_logs
  FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY "Service role can manage email logs" ON referral_email_logs
  FOR ALL TO service_role USING (true);

-- Add comments for documentation
COMMENT ON TABLE referral_email_logs IS 'Logs all referral email sending attempts for tracking and analytics';
COMMENT ON COLUMN referral_email_logs.referrer_id IS 'User who sent the referral email';
COMMENT ON COLUMN referral_email_logs.recipient_email IS 'Email address where referral was sent';
COMMENT ON COLUMN referral_email_logs.referral_code IS 'Referral code that was shared';
COMMENT ON COLUMN referral_email_logs.success IS 'Whether the email was sent successfully';
COMMENT ON COLUMN referral_email_logs.error_message IS 'Error message if email sending failed';
