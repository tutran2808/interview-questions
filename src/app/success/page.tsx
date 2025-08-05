'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      router.push('/');
      return;
    }

    // Sync subscription status in background without blocking UI
    const syncSubscription = async () => {
      try {
        console.log('Syncing subscription status after payment...');
        
        // Get current session for auth token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // Call sync endpoint with timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            const response = await fetch('/api/sync-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ sessionId }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              console.log('Subscription synced successfully');
            } else {
              console.error('Failed to sync subscription, but continuing...');
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error('Sync request failed or timed out, continuing anyway:', fetchError);
          }
        } else {
          console.log('No auth session available, skipping sync');
        }
        
      } catch (error) {
        console.error('Error during subscription sync, continuing anyway:', error);
      }
    };

    // Start sync in background but don't wait for it
    syncSubscription();
    
    // Set loading to false after a reasonable delay regardless of sync status
    setTimeout(() => {
      setLoading(false);
    }, 3000); // Reduced to 3 seconds
  }, [searchParams, router]);

  const handleContinue = () => {
    router.push('/?from=success#tool-section');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing your upgrade...</h2>
          <p className="text-gray-600">Please wait while we set up your Pro account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Pro! 🎉
        </h1>
        
        <p className="text-gray-600 mb-8">
          Your subscription has been activated successfully. You now have unlimited access to interview questions and all export formats.
        </p>

        {/* Pro Features */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Pro Benefits:</h3>
          <ul className="space-y-2 text-left">
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Unlimited question generations
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              All export formats (PDF, CSV, Word)
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Priority support
            </li>
            <li className="flex items-center text-gray-700">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Advanced categorization
            </li>
          </ul>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl text-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Start Generating Questions
        </button>
        
        {/* Debug Buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                  const response = await fetch('/api/debug-subscription', {
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                  });
                  const data = await response.json();
                  console.log('🔍 Debug subscription data:', data);
                  alert('Check console for debug info');
                }
              } catch (error) {
                console.error('Debug error:', error);
              }
            }}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-xl text-sm transition-colors"
          >
            Debug Status
          </button>
          
          <button
            onClick={async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                  const response = await fetch('/api/sync-subscription', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ sessionId: searchParams.get('session_id') }),
                  });
                  const data = await response.json();
                  console.log('🔄 Force sync result:', data);
                  alert('Sync completed - check console');
                }
              } catch (error) {
                console.error('Force sync error:', error);
              }
            }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl text-sm transition-colors"
          >
            Force Sync
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          You can manage your subscription anytime from your account settings.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}