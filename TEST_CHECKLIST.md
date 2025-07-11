# 🧪 Fraud Prevention Test Checklist

## ⚡ **Quick Local Testing (5 minutes)**

### **Step 1: Start Local Server**
```bash
cd "/Users/tutran/Documents/official interview generation"
npm run dev
```
Visit: `http://localhost:3000`

### **Step 2: Basic Visual Tests** ✅
- [ ] Click "Start Free" button
- [ ] Type `invalid-email` → Should show red X
- [ ] Type `test@gmail.com` → Should show green ✓  
- [ ] Submit button disabled for invalid email
- [ ] Submit button enabled for valid email

### **Step 3: Disposable Email Test** ✅
- [ ] Try `test@10minutemail.com`
- [ ] Should show: "Temporary email addresses are not allowed"
- [ ] Submit button should be disabled

### **Step 4: Database Duplicate Test** ✅
**If you have an existing account:**
- [ ] Try signing up with same email
- [ ] Should show: "Account already exists"
- [ ] Should auto-switch to login mode after 5 seconds

**If you don't have an account:**
- [ ] Create account with `test@gmail.com`
- [ ] Try signing up again with `test@gmail.com`
- [ ] Should be blocked

### **Step 5: Email Variation Test** ✅
**If you have account with `user@gmail.com`:**
- [ ] Try `user+1@gmail.com` → Should be blocked
- [ ] Try `u.s.e.r@gmail.com` → Should be blocked  
- [ ] Try `USER@GMAIL.COM` → Should be blocked

## 🚀 **Advanced Testing (10 minutes)**

### **Rate Limiting Test** ✅
- [ ] Try signing up 6 times quickly with different emails
- [ ] Should block after 5 attempts
- [ ] Should show wait time message

### **Forgot Password Test** ✅
- [ ] Click "Forgot Password" 
- [ ] Try 4 password resets quickly
- [ ] Should block after 3 attempts

### **Cross-Browser Test** ✅
- [ ] Test on Chrome
- [ ] Test on Safari/Firefox
- [ ] Check mobile Safari (iPhone)

## 🔧 **Development Tools Check** ✅

### **Console Logs** (F12 → Console)
- [ ] No JavaScript errors
- [ ] Email validation logs appear
- [ ] Database query logs appear

### **Network Tab** (F12 → Network)  
- [ ] Supabase requests show up
- [ ] Authentication requests work
- [ ] No 500/400 errors

## 📱 **Mobile Testing** ✅

```bash
# Get your local IP
ipconfig getifaddr en0  # Mac
ipconfig               # Windows
```

**Test on phone:** `http://[YOUR_IP]:3000`
- [ ] Signup modal opens correctly
- [ ] Email validation works on mobile
- [ ] Touch interactions work smoothly

## 🎯 **Production Deploy Checklist**

Before pushing to production:
- [ ] All local tests pass ✅
- [ ] No console errors ✅
- [ ] Mobile experience works ✅
- [ ] Database integration works ✅
- [ ] Rate limiting functions ✅

**Deploy Commands:**
```bash
git add .
git commit -m "Tested fraud prevention - ready for production"
git push origin main
```

## 🚨 **If Something Doesn't Work**

### **Email Validation Not Working:**
1. Check browser console for errors
2. Verify `src/utils/emailValidation.ts` exists
3. Try refreshing the page

### **Database Check Failing:**
1. Check `.env.local` has correct Supabase keys
2. Verify Supabase project is accessible
3. Check network tab for failed requests

### **Visual Feedback Missing:**
1. Hard refresh the page (Cmd+Shift+R)
2. Check if CSS classes are applied
3. Verify no styling conflicts

## ⭐ **Expected Test Results**

**✅ PASS - These should work:**
- Valid emails like `user@company.com`
- New accounts with unique emails  
- Proper error messages
- Visual feedback (colors, icons)
- Auto-redirect for existing users

**❌ FAIL - These should be blocked:**
- Disposable emails (`test@10minutemail.com`)
- Email variations (`user+1@gmail.com` if `user@gmail.com` exists)
- Invalid formats (`notanemail`, `user@`)
- Too many rapid signup attempts
- Existing email addresses

## 🎉 **Success!**

If all tests pass, your fraud prevention system is working perfectly and ready for production! 🛡️