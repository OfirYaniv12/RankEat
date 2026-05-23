import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../database/supabaseClient';
import { getProfile, upsertProfile } from '../database/queries';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Fetch + merge profile, creating a minimal row for new OAuth users ───
  const refreshProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    try {
      let profile = await getProfile(authUser.id);

      // New Google user — no profile row yet. Create a minimal one.
      if (!profile) {
        const meta = authUser.user_metadata || {};
        const fullName = meta.full_name || meta.name || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await upsertProfile(authUser.id, {
          first_name: firstName,
          last_name: lastName,
          trust_score: 1.0,
        });

        profile = await getProfile(authUser.id);
      }

      setUser({ ...authUser, ...profile });
    } catch (e) {
      console.error('Profile fetch/create error:', e);
      // Fallback: set the raw auth user so the app doesn't break
      setUser(authUser);
    }
  };

  // ─── Exposed so screens (e.g. CompleteProfileScreen) can re-fetch ─────────
  const refreshUser = async (userId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await refreshProfile(session.user);
    }
  };

  useEffect(() => {
    console.log('AuthContext useEffect started');
    
    // Safety fallback: if something hangs indefinitely, force loading to false
    const fallbackTimer = setTimeout(() => {
      console.log('AuthContext fallback timer triggered! Forcing loading=false');
      setLoading(false);
    }, 5000);

    // 1. Initial session check — handles the OAuth redirect hash on web
    const initializeAuth = async () => {
      console.log('initializeAuth called');
      try {
        console.log('Calling supabase.auth.getSession()...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('getSession completed. user:', session?.user?.email);
        if (session?.user) {
          console.log('Calling refreshProfile from initializeAuth...');
          await refreshProfile(session.user);
          console.log('refreshProfile from initializeAuth completed.');
        }
      } catch (error) {
        console.error('Auth Init Error:', error);
      } finally {
        console.log('initializeAuth finally block. Setting loading=false');
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Auth state listener — fires for SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, etc.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event, session?.user?.email);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('Calling refreshProfile from onAuthStateChange...');
        await refreshProfile(session.user);
        console.log('refreshProfile from onAuthStateChange completed.');
      }

      console.log('onAuthStateChange setting loading=false');
      setLoading(false);
    });

    return () => {
      console.log('AuthContext cleanup running');
      clearTimeout(fallbackTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
