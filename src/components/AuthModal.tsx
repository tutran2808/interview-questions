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

  const { signIn, signUp, resetPassword, user } = useAuth();

  // Auto-close modal when user successfully signs in
  useEffect(() => {
    if (user && isOpen) {
      console.log('User detected, auto-closing modal...');
      onClose();
    }
  }, [user, isOpen, onClose]);

  // Simplified email handling
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Clear errors when user types
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Basic field validation only
    if (!email || email.trim() === '') {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (mode !== 'forgot' && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) {
          setError('Unable to send password reset email. Please try again.');
        } else {
          setMessage('Password reset email sent! Check your inbox and follow the instructions.');
        }
      } else if (mode === 'signup') {
        const { error: signUpError, needsVerification, message: signUpMessage } = await signUp(email, password);
        if (signUpError) {
          if (signUpError.message.includes('already') || signUpError.message.includes('exists')) {
            setMessage('An account with this email already exists. Please sign in instead.');
            setTimeout(() => setMode('login'), 3000);
          } else {
            setError(signUpError.message);
          }
        } else if (needsVerification) {
          setMessage(signUpMessage || 'Please check your email for the confirmation link and click it to verify your account.');
        } else {
          setMessage('Account created successfully!');
          onClose();
        }
      } else {
        // Login mode
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError('Invalid email or password. Please try again.');
        } else {
          console.log('Sign-in successful, closing modal...');
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
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
              placeholder="Enter your email"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                  setMessage('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-500"
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
            disabled={loading || !email.trim() || (mode !== 'forgot' && password.length < 6)}
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