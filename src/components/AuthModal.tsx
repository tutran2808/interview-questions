'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { normalizeEmail, validateEmail, checkRateLimit } from '@/utils/emailValidation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  
  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailValid, setEmailValid] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  // Real-time email validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear previous states
    setEmailError('');
    setEmailValid(false);
    setError('');
    
    // Immediate validation for better UX
    if (newEmail.length > 0) {
      const validation = validateEmail(newEmail);
      console.log('Email validation result:', { email: newEmail, validation }); // Debug log
      
      if (validation.isValid) {
        setEmailValid(true);
        setEmailError('');
        // Clear any form-level errors when email becomes valid
        setError('');
      } else {
        setEmailError(validation.error || 'Invalid email');
        setEmailValid(false);
      }
    } else {
      // Also clear errors when email field is empty
      setEmailValid(false);
      setEmailError('');
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Basic field validation
    if (!email || (mode !== 'forgot' && !password)) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Debug logging to see the validation state
    console.log('Submit validation check:', { 
      email, 
      emailValid, 
      emailError,
      mode 
    });

    // Run validation one more time to be sure
    const finalValidation = validateEmail(email);
    if (!finalValidation.isValid) {
      setError(finalValidation.error || 'Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Password validation for signup/login
    if (mode !== 'forgot' && password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'forgot') {
        // Check rate limiting
        const normalizedEmail = normalizeEmail(email);
        const rateCheck = checkRateLimit(`forgot_${normalizedEmail}`, 3, 300000); // 3 attempts per 5 minutes
        
        if (!rateCheck.allowed) {
          setError(`Too many reset attempts. Please wait ${Math.ceil(rateCheck.timeLeft! / 60)} minutes before trying again.`);
          setLoading(false);
          return;
        }
        
        const { error: resetError } = await resetPassword(email);
        if (resetError) {
          setError(resetError.message);
        } else {
          setMessage('Password reset email sent! Check your inbox and follow the instructions.');
          setTimeout(() => {
            setMode('login');
            setError('');
            setMessage('');
          }, 3000);
        }
      } else if (mode === 'signup') {
        // Check rate limiting for signup attempts
        const clientIP = 'unknown'; // In production, get real IP
        const rateCheck = checkRateLimit(`signup_${clientIP}`, 5, 600000); // 5 attempts per 10 minutes
        
        if (!rateCheck.allowed) {
          setError(`Too many signup attempts. Please wait ${Math.ceil(rateCheck.timeLeft! / 60)} minutes before trying again.`);
          setLoading(false);
          return;
        }

        // Normalize email to check for existing accounts
        const normalizedEmail = normalizeEmail(email);
        
        // Try to sign up and detect existing user from the error response
        // This is the most reliable way since Supabase will tell us if the user exists
        const { error: signUpError, needsVerification } = await signUp(email, password);
        console.log('AuthModal signup result:', { signUpError, needsVerification });
        
        if (signUpError) {
          // Check if error indicates user already exists
          if (signUpError.message.includes('already') || 
              signUpError.message.includes('exists') ||
              signUpError.message.includes('registered')) {
            setError('');
            setMessage('An account with this email already exists. Please sign in instead, or use "Forgot Password" if you don\'t remember your password.');
            // Auto-switch to login mode after 5 seconds
            setTimeout(() => {
              setMode('login');
              setError('');
              setMessage('Switched to sign in mode. Use "Forgot Password" if needed.');
            }, 5000);
          } else {
            setError(signUpError.message);
          }
        } else if (needsVerification) {
          setMessage('Check your email for the confirmation link!');
        } else {
          setMessage('Account created successfully! Check your email for the confirmation link.');
        }
      } else {
        // Login mode
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before signing in.');
          } else {
            setError(signInError.message);
          }
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p className="text-gray-600">
            {mode === 'login' 
              ? 'Sign in to generate your interview questions' 
              : mode === 'signup'
              ? 'You\'ll need to create a free account to generate questions'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full px-4 py-3 pr-10 border rounded-xl focus:ring-2 transition-colors ${
                  emailError 
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-500' 
                    : emailValid
                    ? 'border-green-300 focus:ring-green-100 focus:border-green-500'
                    : 'border-gray-300 focus:ring-indigo-100 focus:border-indigo-500'
                }`}
                placeholder="Enter your email"
                required
              />
              {emailValid && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                </div>
              )}
              {emailError && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                </div>
              )}
            </div>
            {emailError && (
              <p className="text-red-600 text-xs mt-1">{emailError}</p>
            )}
            {emailValid && !emailError && (
              <p className="text-green-600 text-xs mt-1">✓ Valid email address</p>
            )}
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              {mode === 'signup' && (
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || emailError !== '' || (mode !== 'forgot' && !password)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'login' ? 'Signing In...' : mode === 'signup' ? 'Creating Account...' : 'Sending Reset Email...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'
            )}
          </button>
        </form>

        {/* Toggle mode and forgot password */}
        <div className="mt-6 text-center">
          {mode === 'forgot' ? (
            <p className="text-gray-600">
              Remember your password?
              <button
                onClick={() => {setMode('login'); setError(''); setMessage('');}}
                className="ml-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          ) : (
            <>
              <p className="text-gray-600">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={toggleMode}
                  className="ml-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                >
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
              {mode === 'login' && (
                <p className="text-gray-600 mt-2">
                  <button
                    onClick={() => {setMode('forgot'); setError(''); setMessage('');}}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                  >
                    Forgot Password?
                  </button>
                </p>
              )}
            </>
          )}
        </div>

        {/* Free tier info */}
        {mode === 'signup' && (
          <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
            <h4 className="font-semibold text-indigo-900 mb-2">Free Account Includes:</h4>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• 3 question generations per month</li>
              <li>• AI-powered personalized questions</li>
              <li>• Export to PDF, CSV, and Word</li>
              <li>• All question categories</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;