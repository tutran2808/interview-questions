'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
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
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Don't block UI for auth errors
      }
    };

    getSession();
    
    return () => {
      isMounted = false;
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

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

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log('Signup response:', { data, error });

      // Supabase returns specific error messages for existing users
      if (error) {
        console.log('Signup error:', error);
        return { error };
      }

      // Check if user was created but needs verification
      if (data.user && !data.session) {
        return { 
          error: null,
          needsVerification: true 
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        // Clear local state immediately
        setUser(null);
        setSession(null);
        console.log('User signed out successfully');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://nextrounds.ai/auth/reset-password',
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};