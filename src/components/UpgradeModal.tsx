'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { stripePromise } from '@/lib/stripe';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: number;
  limit: number;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentUsage, limit }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!session?.access_token) {
      alert('Please sign in to upgrade to Pro');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout process. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const scrollToPricing = () => {
    onClose();
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

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
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You've reached your limit
          </h2>
          <p className="text-gray-600">
            You've used all {limit} of your free question generations this month.
          </p>
        </div>

        {/* Usage Display */}
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Monthly Usage</span>
            <span className="text-sm font-medium text-gray-900">
              {currentUsage}/{limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full"
              style={{ width: '100%' }}
            ></div>
          </div>
          <p className="text-xs text-red-600 mt-1">
            0 generations remaining
          </p>
        </div>

        {/* Upgrade Benefits */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upgrade to Pro for:
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-gray-700">Unlimited question generations</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-gray-700">Priority support</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-gray-700">Advanced export options</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="text-gray-700">No monthly limits</span>
            </li>
          </ul>
        </div>

        {/* Upgrade Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
              Processing...
            </div>
          ) : (
            'Upgrade to Pro - $3.99/month'
          )}
        </button>

        {/* Later Button */}
        <button
          onClick={onClose}
          className="w-full text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default UpgradeModal;