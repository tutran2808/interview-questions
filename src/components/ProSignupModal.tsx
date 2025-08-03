'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/utils/emailValidation';
import { analytics } from '@/lib/analytics';

interface ProSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProSignupModal: React.FC<ProSignupModalProps> = ({ isOpen, onClose }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'signup' | 'checkout'>('signup');

  if (!isOpen) return null;

  const handleSignupAndCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create account
      const { error: signUpError, needsVerification } = await signUp(email, password);
      
      if (signUpError) {
        if (signUpError.message.includes('already') || signUpError.message.includes('exists')) {
          setError('Account already exists. Please sign in instead.');
          setLoading(false);
          return;
        } else {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      }
      
      // For Pro signup, we'll proceed to checkout even if email verification is needed
      // The user will be asked to verify later, but payment can proceed
      if (needsVerification) {
        console.log('Account created successfully, email verification sent. Proceeding to checkout...');
      }

      // Track the Pro signup attempt
      analytics.trackSignup('email');
      analytics.trackFeatureClick('pro_signup', 'pricing_section');

      // Step 2: Create checkout session immediately
      // We'll simulate being logged in for checkout creation
      const checkoutResponse = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email, // Pass email directly for checkout
          mode: 'subscription_signup'
        }),
      });

      const checkoutData = await checkoutResponse.json();

      if (checkoutResponse.ok && checkoutData.url) {
        // Track conversion funnel
        analytics.trackUpgrade('Pro Plan', 3.99);
        
        // Redirect to Stripe Checkout
        window.location.href = checkoutData.url;
      } else {
        throw new Error(checkoutData.error || 'Failed to create checkout session');
      }

    } catch (error) {
      console.error('Error in Pro signup flow:', error);
      setError('Failed to start Pro signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Get Pro Access</h2>
              <p className="text-gray-600 mt-1">Create account and start your Pro plan</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Pro Plan Benefits */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Pro Plan - $3.99/month</h3>
                <p className="text-sm text-gray-600">Everything you need to ace interviews</p>
              </div>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Unlimited question generations</li>
              <li>✓ PDF & CSV export</li>
              <li>✓ Priority support</li>
              <li>✓ Cancel anytime</li>
            </ul>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignupAndCheckout} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Creating Account & Processing...
                </div>
              ) : (
                'Create Account & Subscribe'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              You'll be redirected to Stripe for secure payment processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProSignupModal;