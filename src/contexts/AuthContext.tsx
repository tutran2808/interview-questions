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
  const [loading, setLoading] = useState(true); // Start with true to check existing session

  useEffect(() => {
    let isMounted = true;
    
    // Get initial session and ensure proper loading state
    const getSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        console.log('Initial session found:', !!session?.user, session?.user?.email);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false); // Always set loading to false after getting session
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Clear loading state on successful auth state changes
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            setLoading(false);
          }
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
      // Check if user already exists using our API endpoint
      console.log('Checking if user exists via API...');
      const checkResponse = await fetch('/api/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (checkResponse.ok) {
        const { exists } = await checkResponse.json();
        if (exists) {
          console.log('User already exists in database');
          return {
            error: {
              message: 'An account with this email already exists. Please sign in instead.',
              name: 'UserAlreadyExists',
              status: 400
            } as any
          };
        }
      } else {
        console.log('Error checking user existence, proceeding with signup...');
      }
      
      // Proceed with signup
      console.log('User not found, proceeding with signup...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : 'https://nextrounds.ai/auth/callback',
        },
      });

      console.log('Signup response:', { 
        data: data ? {
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at,
            email_confirmed_at: data.user.email_confirmed_at,
            user_metadata: data.user.user_metadata
          } : null,
          session: !!data.session
        } : null,
        error: error ? {
          message: error.message,
          status: error.status,
          name: error.name
        } : null
      });
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
        
        // Check for existing user errors
        if (error.message?.toLowerCase().includes('user already registered') ||
            error.message?.toLowerCase().includes('already') ||
            error.message?.toLowerCase().includes('exists')) {
          console.log('Detected duplicate email signup attempt');
        }
        
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
      console.log('Attempting to sign in...');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in result:', { error: error?.message });
      
      if (error) {
        console.error('Sign in error:', error);
        setLoading(false);
        return { error };
      }
      
      // Successful login - loading will be cleared by auth state change listener
      console.log('Sign in successful, waiting for auth state change...');
      return { error: null };
    } catch (error) {
      console.error('Sign in catch error:', error);
      setLoading(false);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Attempting to sign out...');
      
      // Clear local state IMMEDIATELY to ensure UI updates
      setUser(null);
      setSession(null);
      
      // Clear only auth-related storage, not everything
      localStorage.removeItem('supabase.auth.token');
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
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  // Emergency force sign out for corrupted sessions
  const forceSignOut = () => {
    console.log('Force signing out - clearing auth data...');
    
    // Clear only auth-related storage
    localStorage.removeItem('supabase.auth.token');
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

  // Disable session corruption checking temporarily to fix persistence issues
  // useEffect(() => {
  //   const checkForCorruption = async () => {
  //     try {
  //       const hasPaymentParams = window.location.search.includes('session_id');
        
  //       if (hasPaymentParams) {
  //         console.log('Detected return from payment, performing gentle session check...');
          
  //         const { data: { session }, error } = await supabase.auth.getSession();
          
  //         if (session && !session.user) {
  //           console.warn('Severely corrupted session detected, forcing cleanup...');
  //           forceSignOut();
  //         } else if (session && session.user) {
  //           console.log('Session appears healthy after payment');
  //         }
  //       }
  //     } catch (error) {
  //       console.log('Error checking session corruption:', error);
  //     }
  //   };

  //   checkForCorruption();
  // }, []);

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