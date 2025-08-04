'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsVerification?: boolean; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  forceSignOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false); // Start with false for better UX

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session quickly in background
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Check for corrupted session (common with reset password issues)
        if (error || (session && !session.user) || (session && session.user && !session.user.email)) {
          console.warn('Detected corrupted session, clearing...', { error, session });
          try {
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
          } catch (clearError) {
            console.log('Error clearing corrupted session, ignoring:', clearError);
          }
          if (isMounted) {
            setSession(null);
            setUser(null);
          }
          return;
        }
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Clear potentially corrupted session
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session);
        
        if (isMounted) {
          // Check for corrupted session specifically after payment flows
          if (session && session.user && (!session.user.email || !session.access_token)) {
            console.warn('Detected corrupted session after auth change, cleaning up...');
            try {
              await supabase.auth.signOut();
              localStorage.clear();
              sessionStorage.clear();
              setSession(null);
              setUser(null);
            } catch (error) {
              console.log('Error cleaning corrupted session:', error);
            }
            return;
          }
          
          setSession(session);
          setUser(session?.user ?? null);
        }

        // Handle email confirmation
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          
          // Check if user record exists, if not the trigger should have created it
          try {
            const { data: existingUser, error: checkError } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single();
              
            if (checkError && checkError.code === 'PGRST116') {
              // User doesn't exist, create manually (fallback if trigger failed)
              const { error: createError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email!,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
              if (createError) {
                console.error('Error creating user record:', createError);
              }
            }
          } catch (userError) {
            console.error('Error handling user record:', userError);
            // Don't block auth flow for user record issues
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : 'https://nextrounds.ai/auth/callback',
        },
      });

      console.log('Signup response:', { data, error });
      console.log('Signup email redirect URL:', typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : 'https://nextrounds.ai/auth/callback');

      // Supabase returns specific error messages for existing users
      if (error) {
        console.error('Signup error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        return { error };
      }

      // Check if user was created but needs verification
      if (data.user && !data.session) {
        return { 
          error: null,
          needsVerification: true,
          message: 'Please check your email for the confirmation link. If you don\'t see it, check your spam folder.'
        };
      }

      // If user was created and has session (auto-confirmed)
      if (data.user && data.session) {
        return { error: null };
      }

      return { error };
    } catch (error) {
      console.error('Signup catch error:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Attempting to sign out...');
      
      // Clear local state IMMEDIATELY to ensure UI updates
      setUser(null);
      setSession(null);
      
      // Clear all storage immediately
      localStorage.clear();
      sessionStorage.clear();
      
      // Try to sign out from Supabase with timeout
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout')), 3000)
      );
      
      try {
        const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
        if (error) {
          console.error('Error signing out from Supabase:', error);
        } else {
          console.log('Successfully signed out from Supabase');
        }
      } catch (timeoutError) {
        console.warn('SignOut timed out, proceeding with force logout:', timeoutError);
      }
      
      // Always force a page refresh regardless of Supabase signOut result
      console.log('Forcing page refresh for clean logout...');
      window.location.href = '/';
      
    } catch (error) {
      console.error('Unexpected error during signout:', error);
      // Force logout regardless of any errors
      setUser(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  // Emergency force sign out for corrupted sessions
  const forceSignOut = () => {
    console.log('Force signing out - clearing all local data...');
    
    // Clear all local storage and session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear React state
    setUser(null);
    setSession(null);
    setLoading(false);
    
    // Clear any Supabase cached data
    try {
      supabase.auth.signOut();
    } catch (error) {
      console.log('Error during force signout, ignoring:', error);
    }
    
    // Force hard refresh to completely reset the app
    window.location.href = '/';
  };

  // Check for session corruption on mount (especially after Stripe returns)
  useEffect(() => {
    const checkForCorruption = async () => {
      try {
        // If we're on success page or just returned from payment, do extra checks
        const isFromPayment = window.location.pathname === '/success' || 
                             window.location.search.includes('session_id');
        
        if (isFromPayment) {
          console.log('Detected return from payment, performing session health check...');
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && (!session.user || !session.user.email || !session.access_token)) {
            console.warn('Corrupted session detected after payment, forcing cleanup...');
            forceSignOut();
          }
        }
      } catch (error) {
        console.log('Error checking session corruption:', error);
      }
    };

    checkForCorruption();
  }, []);

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/reset-password`
          : 'https://nextrounds.ai/auth/reset-password',
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    forceSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};