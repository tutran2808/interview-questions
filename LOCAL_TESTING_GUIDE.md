# Local Testing Guide for Fraud Prevention

## 🚀 **Step 1: Start Local Development Server**

```bash
# Navigate to your project directory
cd "/Users/tutran/Documents/official interview generation"

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The app will run at: `http://localhost:3000`

## 🔧 **Step 2: Environment Setup**

Make sure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 **Step 3: Test Scenarios (In Order)**

### **Test 1: Email Validation (Visual Feedback)**

1. **Open** `http://localhost:3000`
2. **Click** "Start Free" or sign-up button
3. **Try these emails** and watch the real-time feedback:

**Invalid Emails (Should show red X):**
```
notanemail
user@
@domain.com
test@10minutemail.com
user@tempmail.org
```

**Valid Emails (Should show green ✓):**
```
test@gmail.com
user@company.com
john.doe@business.org
```

**Expected:** Red border + red X for invalid, green border + green ✓ for valid

### **Test 2: Submit Button Behavior**

1. **Type invalid email** → Button should be **disabled (grayed out)**
2. **Type valid email** → Button should be **enabled (full color)**
3. **Leave email empty** → Button should be **disabled**

### **Test 3: Disposable Email Detection**

Try signing up with these emails:
```
test@10minutemail.com
user@tempmail.org
fake@guerrillamail.com
spam@mailinator.com
throwaway@sharklasers.com
```

**Expected:** Error message: "Temporary email addresses are not allowed"

### **Test 4: Email Normalization & Duplicates**

**First**, create an account with: `testuser@gmail.com`

**Then**, try signing up with these variations:
```
test.user@gmail.com
testuser+1@gmail.com
testuser+test@gmail.com
TESTUSER@GMAIL.COM
TestUser@Gmail.com
```

**Expected:** "An account with this email (or a similar variation) already exists"

### **Test 5: Rate Limiting**

**Signup Rate Limiting:**
1. Try signing up **6 times quickly** with different valid emails
2. **Expected:** After 5 attempts: "Too many signup attempts. Please wait X minutes"

**Password Reset Rate Limiting:**
1. Go to **"Forgot Password"** mode
2. Try **4 password resets** with the same email quickly
3. **Expected:** After 3 attempts: "Too many reset attempts. Please wait X minutes"

### **Test 6: Database Integration**

**Create Real Account:**
1. Sign up with a **valid, unique email**
2. **Check your email** for confirmation
3. **Confirm the account**

**Test Existing Account Detection:**
1. Try signing up **again with the same email**
2. **Expected:** "Account already exists, please sign in"
3. **Should auto-switch** to login mode after 5 seconds

## 🔍 **Step 4: Browser Developer Tools Testing**

### **Check Console Logs:**
1. **Open browser Dev Tools** (F12)
2. **Go to Console tab**
3. **Watch for logs** during signup attempts:
   - Email validation results
   - Database check results
   - Error messages

### **Check Network Tab:**
1. **Go to Network tab**
2. **Try signing up**
3. **Look for requests** to:
   - Supabase database (users table queries)
   - Authentication endpoints

## 🖥️ **Step 5: Test on Different Browsers**

Test the signup flow on:
- **Chrome** (primary)
- **Safari** (Mac users)
- **Firefox** (cross-browser compatibility)
- **Mobile Safari** (iPhone/iPad)
- **Chrome Mobile** (Android)

## 📱 **Step 6: Mobile Testing**

1. **Start dev server:** `npm run dev`
2. **Get your local IP:** `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
3. **Access from phone:** `http://[YOUR_IP]:3000`
4. **Test signup flow** on mobile devices

## 🚨 **Step 7: Error Scenarios Testing**

### **Network Issues:**
1. **Disconnect internet** briefly during signup
2. **Expected:** "Unable to verify account status. Please try again."

### **Invalid Database State:**
1. **Check Supabase dashboard** for created users
2. **Verify email normalization** is working correctly

### **Form Validation:**
- Try **empty fields**
- Try **short passwords** (< 6 chars)
- Try **invalid email formats**

## ✅ **Success Checklist**

Before deploying to production, confirm:

- [ ] **Email validation** shows proper visual feedback
- [ ] **Submit button** disabled for invalid emails
- [ ] **Disposable emails** are blocked
- [ ] **Email variations** are detected as duplicates
- [ ] **Rate limiting** works for both signup and password reset
- [ ] **Existing users** get helpful messages
- [ ] **Database queries** work correctly
- [ ] **Auto-redirect** to login mode works
- [ ] **Mobile experience** is smooth
- [ ] **Console shows no errors**
- [ ] **All browsers** work correctly

## 🔧 **Debugging Tips**

### **If Email Validation Doesn't Work:**
- Check browser console for JavaScript errors
- Verify `emailValidation.ts` is imported correctly
- Check if validation functions are being called

### **If Database Check Fails:**
- Verify Supabase credentials in `.env.local`
- Check Supabase dashboard for table permissions
- Look for network errors in dev tools

### **If Rate Limiting Doesn't Work:**
- Rate limiting is in-memory, so restarts clear it
- Try multiple rapid attempts within same session

## 🚀 **Ready for Production**

Once all tests pass locally:
1. **Commit your changes:** `git add . && git commit -m "Test fraud prevention"`
2. **Push to GitHub:** `git push origin main`
3. **Vercel auto-deploys** the changes
4. **Test on production domain** with a few key scenarios

## 🎯 **Quick Test Command**

```bash
# One-liner to start testing
npm run dev && open http://localhost:3000
```

This opens your local server and the app in your default browser, ready for testing!