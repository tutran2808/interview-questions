-- Migration: Add subscription_end_date column to users table
-- This enables proper subscription lifecycle management

ALTER TABLE users 
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Add comment to document the column purpose
COMMENT ON COLUMN users.subscription_end_date IS 'Date when subscription access ends (for canceled subscriptions that remain active until period end)';

-- Optional: Create an index for efficient queries on subscription end dates
CREATE INDEX idx_users_subscription_end_date ON users(subscription_end_date) 
WHERE subscription_end_date IS NOT NULL;