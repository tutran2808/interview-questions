// Email validation and fraud prevention utilities

// List of common disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
  'yopmail.com', 'temp-mail.org', 'throwaway.email', 'sharklasers.com',
  'getnada.com', 'maildrop.cc', 'temp-mail.io', 'mohmal.com',
  'fakeinbox.com', 'spamgourmet.com', 'dispostable.com', 'tempr.email',
  '20minutemail.it', 'emailondeck.com', 'mytrashmail.com', 'anonymbox.com'
];

// Normalize email to prevent variations and duplicates
export function normalizeEmail(email: string): string {
  if (!email) return '';
  
  const [localPart, domain] = email.toLowerCase().trim().split('@');
  if (!localPart || !domain) return email.toLowerCase().trim();
  
  let normalizedLocal = localPart;
  
  // Handle Gmail-specific rules
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots and everything after +
    normalizedLocal = localPart.replace(/\./g, '').split('+')[0];
  }
  
  // Handle other providers that support + tags
  else if (['outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com'].includes(domain)) {
    // Remove everything after +
    normalizedLocal = localPart.split('+')[0];
  }
  
  return `${normalizedLocal}@${domain}`;
}

// Validate email format and check for suspicious patterns
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  const [localPart, domain] = email.toLowerCase().split('@');
  
  // Check for disposable email services
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { isValid: false, error: 'Temporary email addresses are not allowed. Please use a permanent email address.' };
  }
  
  // Check for suspicious patterns
  if (localPart.length < 2) {
    return { isValid: false, error: 'Email address appears to be invalid' };
  }
  
  // Check for too many consecutive numbers or special characters
  if (/\d{5,}/.test(localPart) || /[._%+-]{3,}/.test(localPart)) {
    return { isValid: false, error: 'Email address appears to be invalid' };
  }
  
  // Check for valid TLD
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
}

// Check if email domain exists (basic validation)
export function isValidDomain(email: string): boolean {
  const domain = email.split('@')[1];
  if (!domain) return false;
  
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// Rate limiting helper (in-memory store for demo, use Redis in production)
const signupAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(identifier: string, maxAttempts = 3, windowMs = 300000): { allowed: boolean; timeLeft?: number } {
  const now = Date.now();
  const attempts = signupAttempts.get(identifier);
  
  if (!attempts) {
    signupAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // Reset if window expired
  if (now - attempts.lastAttempt > windowMs) {
    signupAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // Check if exceeded limit
  if (attempts.count >= maxAttempts) {
    const timeLeft = Math.ceil((windowMs - (now - attempts.lastAttempt)) / 1000);
    return { allowed: false, timeLeft };
  }
  
  // Increment counter
  attempts.count++;
  attempts.lastAttempt = now;
  return { allowed: true };
}