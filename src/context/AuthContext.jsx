import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to load auth session:', error);
      }

      if (isMounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    };

    bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = (email, password) => {
    if (!supabase) {
      return Promise.resolve({
        data: { user: null },
        error: { message: supabaseConfigError || 'Supabase is not configured.' },
      });
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = () => {
    if (!supabase) {
      return Promise.resolve({ error: null });
    }
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isSupabaseConfigured, supabaseConfigError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
