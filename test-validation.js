// Quick test script for email validation functions
// Run with: node test-validation.js

const { normalizeEmail, validateEmail } = require('./src/utils/emailValidation.ts');

console.log('🧪 Testing Email Validation Functions\n');

// Test email normalization
console.log('📧 Email Normalization Tests:');
const emailTests = [
  'User+Test@Gmail.COM',
  'test.user@gmail.com', 
  'user+1@outlook.com',
  'normal@company.com'
];

emailTests.forEach(email => {
  try {
    const normalized = normalizeEmail(email);
    console.log(`${email} → ${normalized}`);
  } catch (error) {
    console.log(`❌ Error with ${email}: ${error.message}`);
  }
});

console.log('\n🔍 Email Validation Tests:');

// Test email validation
const validationTests = [
  'valid@gmail.com',
  'test@10minutemail.com', // Should be blocked
  'notanemail',
  'user@',
  '@domain.com',
  'test..test@domain.com',
  'a@b.c'
];

validationTests.forEach(email => {
  try {
    const result = validateEmail(email);
    console.log(`${email}: ${result.isValid ? '✅ Valid' : '❌ ' + result.error}`);
  } catch (error) {
    console.log(`❌ Error with ${email}: ${error.message}`);
  }
});

console.log('\n✅ Validation tests complete! Check results above.');