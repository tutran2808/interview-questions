'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user && session?.access_token) {
      fetchSubscriptionData();
    }
  }, [user, session, loading, router]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/usage', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data.usage);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDowngrade = async () => {
    const confirmed = confirm(
      'Are you sure you want to downgrade to the Free plan? You will lose access to unlimited questions and additional export formats.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/manual-downgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert('Successfully downgraded to Free plan.');
        router.push('/');
      } else {
        throw new Error(data.error || 'Failed to downgrade subscription');
      }
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      alert('Failed to downgrade subscription. Please try again.');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading subscription details...</h2>
        </div>
      </div>
    );
  }

  const isPro = subscriptionData?.limit === -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Subscription Management</h1>
          <p className="text-xl text-gray-600">Manage your Land It AI subscription</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isPro ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-gray-400 to-gray-500'
            }`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isPro ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                )}
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </h2>
            
            <p className="text-gray-600">
              {isPro ? 'You have unlimited access to all features' : 'Limited to 3 questions per month'}
            </p>
          </div>

          {/* Plan Details */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-700">Plan Status</span>
              <span className={`font-semibold ${isPro ? 'text-green-600' : 'text-gray-600'}`}>
                {isPro ? 'Active Pro' : 'Free'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-700">Monthly Questions</span>
              <span className="font-semibold text-gray-900">
                {isPro ? 'Unlimited' : `${subscriptionData?.current || 0}/3`}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-700">Export Formats</span>
              <span className="font-semibold text-gray-900">
                {isPro ? 'PDF, CSV, Word' : 'PDF only'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-700">Support Level</span>
              <span className="font-semibold text-gray-900">
                {isPro ? 'Priority' : 'Email'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {isPro ? (
              <button
                onClick={handleDowngrade}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Downgrade to Free Plan
              </button>
            ) : (
              <button
                onClick={() => router.push('/#pricing')}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl text-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Upgrade to Pro Plan
              </button>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Back to App
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">Need help with your subscription?</p>
          <a 
            href="mailto:support@landitai.com" 
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}