
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string, username?: string) => Promise<{
    error: AuthError | null;
    data: { user: User | null; session: Session | null };
  }>;
  signIn: (email: string, password: string) => Promise<{
    error: AuthError | null;
    data: { user: User | null; session: Session | null };
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signUp: async () => ({ error: null, data: { user: null, session: null } }),
  signIn: async () => ({ error: null, data: { user: null, session: null } }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up the auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in');
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        }
        
        setIsLoading(false);
      }
    );
    // Then check for an existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string, fullName?: string, username?: string) => {
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username || email.split('@')[0],
          },
        },
      });

      if (result.error) {
        console.error("Sign up error:", result.error);
        toast.error(result.error.message);
      } else if (result.data.user) {
        toast.success("Account created successfully! Please verify your identity.");
        // Upsert display_name into profiles table
        if (fullName) {
          await supabase.from('profiles').upsert({
            id: result.data.user.id,
            display_name: fullName,
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Unexpected error during signup:", error);
      return {
        error: error as AuthError,
        data: { user: null, session: null }
      };
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.error) {
      toast.error(result.error.message);
      return { error: result.error, data: { user: null, session: null } };
    }

    return result;
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      // Ignore session_not_found error, but log others
      if (error?.code !== "session_not_found") {
        console.error("Error during sign out:", error);
        toast.error("Error during sign out");
      }
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password"
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("If an account with that email exists, a password reset link has been sent.");
    }
    return { error };
  };

  const contextValue = useMemo(
    () => ({ user, session, isLoading, signUp, signIn, signOut, resetPassword }),
    [user, session, isLoading, signUp, signIn, signOut, resetPassword]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
