# Switch to Stripe Live API - Setup Guide

## 🚀 Steps to Enable Live Stripe Payments

### 1. Get Live API Keys from Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Switch from "Test data" to "Live data"** (toggle in left sidebar)
3. Navigate to **Developers → API Keys**
4. Copy your live keys:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)

### 2. Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables
2. Update these variables with your **LIVE** keys:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
```

### 3. Set Up Live Webhook Endpoint

1. In Stripe Dashboard (Live mode) → **Developers → Webhooks**
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `https://your-domain.com/api/webhook/stripe`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
5. After creating, copy the **Webhook signing secret**
6. Update Vercel environment variable:

```
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
```

### 4. Test Live Payments (Important!)

⚠️ **Use a real card for testing live mode** - Test cards won't work!

1. Use a small amount first (like $0.50) for testing
2. Test the complete flow:
   - Sign up → Upgrade to Pro → Payment → Webhook → Database update
3. Check Stripe Dashboard to confirm payment
4. Verify user gets upgraded in your app
5. Test cancellation/downgrade flow

### 5. Business Setup Requirements

Before going live, ensure you have:
- ✅ **Business details** complete in Stripe Dashboard
- ✅ **Bank account** connected for payouts
- ✅ **Tax information** submitted
- ✅ **Identity verification** completed (if required)

### 6. Update Pricing (Optional)

If you want to use Stripe Products instead of price_data:

1. Create a **Product** in Stripe Dashboard (Live mode)
2. Add a **Price** to the product ($6.99/month)
3. Copy the Price ID (starts with `price_...`)
4. Update the checkout code to use the Price ID

### 7. Current Configuration

✅ **Already Updated**:
- Product name: "Next Rounds AI - Pro Plan"
- Price: $6.99/month
- Webhook handling for subscription events
- Proper user upgrade/downgrade logic

## 🔒 Security Checklist

- ✅ Environment variables are set in Vercel (not in code)
- ✅ Webhook secret is configured
- ✅ Using server-side API for secret operations
- ✅ User authentication verified before payments

## 🚨 Important Notes

1. **Test thoroughly** before announcing live payments
2. **Monitor Stripe Dashboard** for payment issues
3. **Set up email notifications** in Stripe for failed payments
4. **Have a customer support plan** for payment issues
5. **Backup your environment variables** securely

## 📱 After Going Live

1. **Update your domain** in Stripe settings
2. **Set up proper customer support** email
3. **Monitor webhook deliveries** in Stripe Dashboard
4. **Test the complete user flow** regularly

## 🛟 Rollback Plan

If you need to switch back to test mode:
1. Replace live keys with test keys in Vercel
2. Update webhook endpoint URL
3. Redeploy the application

## ✅ Ready to Go Live!

Once you've completed steps 1-3 above, your Next Rounds AI app will be ready to accept real payments!