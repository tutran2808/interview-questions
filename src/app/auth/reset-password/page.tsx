'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for both query parameters (default Supabase) and hash parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const token = urlParams.get('token') || hashParams.get('access_token');
    const type = urlParams.get('type') || hashParams.get('type');
    
    console.log('Password reset page loaded:', {
      hasToken: !!token,
      type: type,
      fromQuery: !!urlParams.get('token'),
      fromHash: !!hashParams.get('access_token'),
      fullUrl: window.location.href
    });
    
    if (!token || type !== 'recovery') {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate passwords
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting to update password...');
      
      // Check for recovery tokens in both query and hash parameters
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const token = urlParams.get('token') || hashParams.get('access_token');
      const type = urlParams.get('type') || hashParams.get('type');
      
      if (!token || type !== 'recovery') {
        setError('Reset link expired. Please request a new password reset.');
        setLoading(false);
        return;
      }
      
      console.log('Using recovery token from:', urlParams.get('token') ? 'query params' : 'hash params');

      // For query parameter tokens, we need to exchange them for a session first
      if (urlParams.get('token')) {
        console.log('Handling query parameter token (default Supabase format)...');
        
        // Use verifyOtp to exchange the token for a session
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data: verifyData, error: verifyError } = await supabaseClient.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        });
        
        if (verifyError) {
          console.error('Token verification error:', verifyError);
          setError('Invalid or expired reset link. Please request a new password reset.');
          setLoading(false);
          return;
        }
        
        console.log('Token verified, updating password...');
        
        const { data, error } = await supabaseClient.auth.updateUser({
          password: password
        });
        
        if (error) {
          console.error('Password update error:', error);
          setError('Failed to update password. Please try requesting a new reset link.');
        } else {
          console.log('Password updated successfully');
          setMessage('Password updated successfully! Redirecting to login...');
          
          setTimeout(() => {
            router.push('/?login=true');
          }, 2000);
        }
      } else {
        console.log('Handling hash parameter token...');
        
        // Create a fresh client that can handle recovery tokens from URL hash
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: true
          }
        });
        
        const { data, error } = await supabaseClient.auth.updateUser({
          password: password
        });
        
        if (error) {
          console.error('Password update error:', error);
          setError('Failed to update password. Please try requesting a new reset link.');
        } else {
          console.log('Password updated successfully');
          setMessage('Password updated successfully! Redirecting to login...');
          
          setTimeout(() => {
            router.push('/?login=true');
          }, 2000);
        }
      }

      console.log('Password update result:', { data, error });

      if (error) {
        console.error('Password update error:', error);
        setError('Failed to update password. Please try requesting a new reset link.');
      } else {
        console.log('Password updated successfully');
        setMessage('Password updated successfully! Redirecting to login...');
        
        // Clear URL hash to prevent reuse
        window.location.hash = '';
        
        setTimeout(() => {
          router.push('/?login=true');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Password update catch error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            {error.includes('Invalid reset link') && (
              <div className="mt-2">
                <button
                  onClick={() => router.push('/')}
                  className="text-red-800 hover:text-red-900 underline font-medium"
                >
                  Request a new password reset
                </button>
              </div>
            )}
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
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Enter your new password"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Confirm your new password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating Password...
              </span>
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    </div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}