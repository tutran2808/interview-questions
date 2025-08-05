# Subscription Lifecycle Setup Guide

This guide will help you implement the complete subscription lifecycle management with proper renewal handling.

## Step 1: Database Migration

You need to add the `subscription_end_date` column to your Supabase database.

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project → **SQL Editor**
3. Create a new query and paste this SQL:

```sql
-- Migration: Add subscription_end_date column to users table
-- This enables proper subscription lifecycle management

ALTER TABLE users 
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Add comment to document the column purpose
COMMENT ON COLUMN users.subscription_end_date IS 'Date when subscription access ends (for canceled subscriptions that remain active until period end)';

-- Optional: Create an index for efficient queries on subscription end dates
CREATE INDEX idx_users_subscription_end_date ON users(subscription_end_date) 
WHERE subscription_end_date IS NOT NULL;
```

4. Click **Run** to execute the migration

### Option B: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db reset # This will run all migrations including the new one
```

## Step 2: Update Stripe Webhook Events

You need to add the `invoice.payment_succeeded` event to your Stripe webhook to handle automatic renewals.

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click on your existing webhook endpoint
4. Click **Add events**
5. Search for and add: `invoice.payment_succeeded`
6. Click **Add events** to save

Your webhook should now listen for these events:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created` 
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded` ← **NEW**

## Step 3: Deploy and Test

### Deploy to Production
```bash
# Commit all changes
git add .
git commit -m "Add subscription lifecycle management with renewal handling"
git push

# Your Vercel deployment will automatically include the new cron job
```

### Test the Setup
1. **Test renewal webhook**:
   - Create a test subscription in Stripe
   - Use Stripe CLI to simulate renewal: `stripe trigger invoice.payment_succeeded`
   - Check Vercel logs to see renewal processing

2. **Test cancellation flow**:
   - Cancel a test subscription (set to cancel at period end)
   - Verify `subscription_end_date` is set in database
   - Wait for period to end or manually call the downgrade API

3. **Test downgrade API**:
   ```bash
   # Check what subscriptions need processing
   curl https://your-domain.com/api/process-subscription-downgrades

   # Process downgrades (if any expired)
   curl -X POST https://your-domain.com/api/process-subscription-downgrades
   ```

## Step 4: Verify Cron Job Setup

The `vercel.json` file configures a daily cron job at 2 AM UTC to automatically process subscription downgrades.

### Check Cron Status:
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project → **Functions** tab
3. Look for **Cron Jobs** section
4. You should see: `process-subscription-downgrades` scheduled for `0 2 * * *`

### Manual Cron Trigger (for testing):
```bash
# You can manually trigger the cron job
curl -X POST https://your-domain.com/api/process-subscription-downgrades
```

## How the Complete Flow Works

### 🟢 New Subscription
1. User completes checkout → `checkout.session.completed` webhook
2. User upgraded to Pro plan immediately
3. `subscription_end_date` set to end of current billing period

### 🟡 Subscription Cancellation (but stays active until end of period)
1. User cancels → `customer.subscription.updated` webhook
2. User keeps Pro access → `subscription_end_date` remains set to period end
3. User sees "subscription ending" warning in app

### 🔄 Automatic Renewal
1. Stripe processes renewal → `invoice.payment_succeeded` webhook  
2. `subscription_end_date` updated to new period end → User continues with Pro access
3. User gets 2-day renewal notification before next billing cycle

### 🔴 Subscription Expiration
1. Daily cron job runs → Checks for expired subscriptions
2. Users with `subscription_end_date` < now → Downgraded to Free
3. `subscription_end_date` cleared, plan set to `free`

### 📅 Important: ALL Pro subscriptions have end dates
- **Active subscriptions**: End date = current billing period end
- **Canceled subscriptions**: End date = when access actually ends
- **Renewed subscriptions**: End date = new billing period end
- **2-day warning**: Users notified before renewal/expiration

## Monitoring and Debugging

### Check Logs:
- **Vercel**: Project → Functions → View Function Logs
- **Stripe**: Dashboard → Developers → Webhooks → View Events

### Common Issues:
1. **Webhook not firing**: Check Stripe webhook events configuration
2. **Database errors**: Verify the migration ran successfully
3. **Cron not running**: Check Vercel project settings and limits

### API Endpoints for Monitoring:
- `GET /api/process-subscription-downgrades` - See pending downgrades
- `GET /api/usage` - Check user subscription status
- `POST /api/process-subscription-downgrades` - Manually process downgrades

## Environment Variables Required

Make sure these are set in your Vercel environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` 
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

---

🎉 **You're all set!** Your subscription system now properly handles the complete lifecycle including renewals and automatic downgrades.