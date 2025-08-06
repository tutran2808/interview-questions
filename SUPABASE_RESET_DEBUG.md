# Password Reset Debugging Guide

## Current Issue
The password reset is failing with "AuthSessionMissingError: Auth session missing!" which indicates a configuration problem with Supabase redirect URLs.

## Required Supabase Configuration

### 1. Check Redirect URLs in Supabase Dashboard

Go to your Supabase Dashboard → Authentication → URL Configuration and ensure you have:

**Site URL:**
```
https://nextrounds.ai
```

**Redirect URLs:**
```
https://nextrounds.ai/**
https://nextrounds.ai/auth/reset-password
https://www.nextrounds.ai/**
https://www.nextrounds.ai/auth/reset-password
```

### 2. Email Template Configuration

In Supabase Dashboard → Authentication → Email Templates → Reset Password:

**Default Template Should Use:**
```
{{ .SiteURL }}/auth/reset-password?token={{ .TokenHash }}&type=recovery
```

**Or Modern Format:**
```
{{ .SiteURL }}/auth/reset-password#access_token={{ .Token }}&expires_at={{ .ExpiresAt }}&refresh_token={{ .RefreshToken }}&token_type=bearer&type=recovery
```

## Debug Steps

### Step 1: Check Current Reset URL Format
When you get the password reset email, the URL should look like:
```
https://nextrounds.ai/auth/reset-password#access_token=XXXXX&expires_at=XXXXX&refresh_token=XXXXX&token_type=bearer&type=recovery
```

### Step 2: Test URL Manually
If the URL format is correct, the issue might be in our client configuration.

### Step 3: Check Console Logs
The recovery session should show tokens being detected and a user session being established.

## Most Likely Fix Needed

**In Supabase Dashboard:**
1. Go to Authentication → URL Configuration
2. Add `https://nextrounds.ai/auth/reset-password` to Redirect URLs
3. Save changes
4. Test password reset again

This is almost certainly a redirect URL configuration issue in Supabase.