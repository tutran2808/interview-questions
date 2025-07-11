# Custom Email Setup for Next Rounds AI

## 🎯 **Current Issue**
Emails are sent from "Supabase Auth <noreply@mail.app.supabase.io>" instead of "Next Rounds AI"

## 🔧 **Solution: Set Up Custom SMTP**

### **Option 1: SendGrid (Recommended)**

#### **Step 1: Create SendGrid Account**
1. Go to [SendGrid.com](https://sendgrid.com) → **Free Account**
2. Verify your account (may require phone verification)
3. Complete setup wizard

#### **Step 2: Create API Key**
1. **Settings** → **API Keys** → **Create API Key**
2. **Full Access** permissions
3. Copy the API key (starts with `SG.`)

#### **Step 3: Set Up Domain Authentication**
1. **Settings** → **Sender Authentication** → **Domain Authentication**
2. Add your domain: `nextrounds.ai`
3. Follow DNS setup instructions (add CNAME records)

#### **Step 4: Configure Supabase SMTP**
1. **Supabase Dashboard** → **Authentication** → **Settings**
2. **SMTP Settings** section:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [Your SendGrid API Key]
   Sender Name: Next Rounds AI
   Sender Email: noreply@nextrounds.ai
   ```

#### **Step 5: Update Email Templates**
1. **Supabase** → **Authentication** → **Email Templates**
2. Update **"Confirm signup"** template:
   ```
   Subject: Welcome to Next Rounds AI - Confirm Your Email
   
   Body: 
   Welcome to Next Rounds AI!
   
   Click the link below to confirm your email address and start generating personalized interview questions:
   
   {{ .ConfirmationURL }}
   
   If you didn't create an account, you can safely ignore this email.
   
   Best regards,
   The Next Rounds AI Team
   ```

3. Update **"Reset password"** template:
   ```
   Subject: Reset Your Next Rounds AI Password
   
   Body:
   Hi there,
   
   We received a request to reset your password for your Next Rounds AI account.
   
   Click the link below to reset your password:
   
   {{ .ConfirmationURL }}
   
   If you didn't request this, you can safely ignore this email.
   
   Best regards,
   The Next Rounds AI Team
   ```

### **Option 2: Alternative Email Services**

#### **Mailgun**
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: [Your Mailgun SMTP username]
SMTP Password: [Your Mailgun SMTP password]
```

#### **Amazon SES**
```
SMTP Host: email-smtp.[region].amazonaws.com
SMTP Port: 587
SMTP User: [Your SES SMTP username]
SMTP Password: [Your SES SMTP password]
```

## 📋 **DNS Records Needed**

### **For SendGrid Domain Authentication**
Add these CNAME records to Namecheap:

```
Host: s1._domainkey
Value: s1.domainkey.u[number].wl.sendgrid.net

Host: s2._domainkey  
Value: s2.domainkey.u[number].wl.sendgrid.net
```
(Exact values provided by SendGrid)

## ✅ **Testing Email Delivery**

### **Test Steps**
1. Configure SMTP in Supabase
2. Create a test account on your site
3. Check if email arrives from "Next Rounds AI"
4. Test password reset functionality

### **Troubleshooting**
- Check spam folder
- Verify DNS records are propagated
- Test SMTP credentials with tools like [SMTP Tester](https://www.gmass.co/smtp-test)

## 💰 **Cost Comparison**

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| SendGrid | 100 emails/day | $14.95/month (40K emails) |
| Mailgun | 1,000 emails/month | $15/month (10K emails) |
| Amazon SES | 62,000 emails/month (first year) | $0.10 per 1,000 emails |

## 🎯 **Recommended Setup for Next Rounds AI**

1. **Start with SendGrid** (easiest setup)
2. **Domain authentication** for `nextrounds.ai`
3. **Custom email templates** with your branding
4. **Monitor delivery rates** in SendGrid dashboard

## ⚡ **Quick Start (10 minutes)**

1. **Create SendGrid account** (2 min)
2. **Get API key** (1 min)
3. **Configure Supabase SMTP** (2 min)
4. **Update email templates** (3 min)
5. **Test email delivery** (2 min)

After setup, all emails will show:
**"Next Rounds AI <noreply@nextrounds.ai>"** ✅

Instead of:
**"Supabase Auth <noreply@mail.app.supabase.io>"** ❌