'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface HeaderProps {
  onAuthRequired?: () => void;
  usageInfo?: {current: number, limit: number, remaining: number} | null;
  onUsageUpdate?: (usage: {current: number, limit: number, remaining: number}) => void;
}

const Header: React.FC<HeaderProps> = ({ onAuthRequired, usageInfo: propUsageInfo, onUsageUpdate }) => {
  const { user, signOut, loading, session, forceSignOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [usageInfo, setUsageInfo] = useState<{current: number, limit: number, remaining: number} | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Emergency keyboard shortcut for corrupted sessions (Ctrl+Shift+L)
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        console.log('Emergency signout triggered');
        forceSignOut();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [forceSignOut]);

  const handleSignIn = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const handleStartFree = () => {
    if (user) {
      document.getElementById('tool-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      handleSignUp();
    }
  };

  const handleSignOut = async () => {
    try {
      setDropdownOpen(false);
      console.log('Header: Starting signOut process...');
      
      // Start the signOut process but don't wait forever
      const signOutTimeout = setTimeout(() => {
        console.warn('Header: SignOut taking too long, forcing refresh...');
        window.location.href = '/';
      }, 5000);
      
      await signOut();
      clearTimeout(signOutTimeout);
      
    } catch (error) {
      console.error('Error in handleSignOut:', error);
      // Force refresh immediately on any error
      setDropdownOpen(false);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const handleUpgrade = async () => {
    if (!session?.access_token) {
      alert('Please sign in to upgrade to Pro');
      return;
    }

    setDropdownOpen(false);

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
      alert('Failed to start checkout process. Please try again.');
    }
  };

  const handleManualDowngrade = async () => {
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
        alert('Successfully downgraded to Free plan. Please refresh the page to see changes.');
        // Force refresh to update the UI
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to downgrade subscription');
      }
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      alert('Failed to downgrade subscription. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    setDropdownOpen(false);
    
    try {
      console.log('Opening Stripe customer portal...');
      
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      
      // Parse the error to show a helpful message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('subscription') || errorMessage.includes('upgrade')) {
        alert('You need to upgrade to Pro first before you can manage your subscription.');
      } else {
        alert('Unable to open subscription management. Please try again.');
      }
    }
  };

  // Use prop usage info if available, otherwise fetch from API
  useEffect(() => {
    if (propUsageInfo) {
      setUsageInfo(propUsageInfo);
      return;
    }
    
    const fetchUsage = async () => {
      if (session?.access_token) {
        try {
          const response = await fetch('/api/usage', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.usage) {
              setUsageInfo(data.usage);
              onUsageUpdate?.(data.usage);
            }
          }
        } catch (error) {
          console.error('Error fetching usage in header:', error);
        }
      } else {
        setUsageInfo(null);
      }
    };

    fetchUsage();
  }, [session, propUsageInfo]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.relative')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center">
              <a href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
                {/* Logo */}
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Next Rounds AI
                  </h1>
                </div>
              </a>
            </div>
            
            {/* Auth buttons and Navigation */}
            <div className="flex items-center space-x-3 sm:space-x-8">
              {/* Navigation - hidden on mobile to reduce clutter */}
              <nav className="hidden lg:flex items-center space-x-6">
                <a 
                  href="/#how-it-works"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
                >
                  How It Works
                </a>
                <a 
                  href="/#pricing"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
                >
                  Pricing
                </a>
                <a 
                  href="/#faq"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm"
                >
                  FAQ
                </a>
              </nav>
              
              {/* Auth section */}
              <div className="flex items-center space-x-2 sm:space-x-4">
              {loading ? (
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className={`text-xs font-medium ${
                          usageInfo?.limit === -1 
                            ? 'text-green-600' 
                            : 'text-gray-500'
                        }`}>
                          {usageInfo?.limit === -1 ? 'Pro Plan' : 'Free Plan'}
                        </p>
                      </div>
                      
                      {usageInfo && usageInfo.limit !== -1 && (
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700">Monthly Usage</span>
                            <span className="text-sm font-medium text-gray-900">
                              {usageInfo.current}/{usageInfo.limit}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(usageInfo.current / usageInfo.limit) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {usageInfo.remaining} generations remaining
                          </p>
                        </div>
                      )}
                      
                      {usageInfo?.limit === -1 && (
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-center mb-2">
                            <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                            </svg>
                            <span className="text-sm font-medium text-green-600">Unlimited Questions</span>
                          </div>
                          {(usageInfo as any)?.subscriptionEndDate && (
                            <div className="text-center">
                              {(usageInfo as any)?.isSubscriptionCancelled ? (
                                <>
                                  <p className="text-xs text-orange-600 font-medium">
                                    Subscription ends on {new Date((usageInfo as any).subscriptionEndDate).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    You'll be moved to Free Plan after this date
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-blue-600 font-medium">
                                    Subscription renews on {new Date((usageInfo as any).subscriptionEndDate).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Cancel anytime via Manage Subscription
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="px-4 py-2">
                        {usageInfo?.limit !== -1 ? (
                          <button
                            onClick={handleUpgrade}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            Upgrade to Pro
                          </button>
                        ) : (
                          <button
                            onClick={handleManageSubscription}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {(usageInfo as any)?.isSubscriptionCancelled ? 'Reactivate Subscription' : 'Manage Subscription'}
                          </button>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button 
                    onClick={handleSignIn}
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={handleStartFree}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-xs sm:text-base whitespace-nowrap"
                  >
                    Start Free
                  </button>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
};

export default Header;