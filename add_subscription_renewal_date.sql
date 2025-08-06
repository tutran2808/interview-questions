-- Migration: Add subscription_renewal_date column to users table
-- This enables proper renewal date tracking for auto-renewing subscriptions

ALTER TABLE users 
ADD COLUMN subscription_renewal_date TIMESTAMP WITH TIME ZONE;

-- Add comment to document the column purpose
COMMENT ON COLUMN users.subscription_renewal_date IS 'Date when subscription will renew next (for active auto-renewing subscriptions)';

-- Optional: Create an index for efficient queries on subscription renewal dates
CREATE INDEX idx_users_subscription_renewal_date ON users(subscription_renewal_date) 
WHERE subscription_renewal_date IS NOT NULL;