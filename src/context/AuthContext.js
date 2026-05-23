import React, { createContext, useState, useEffect, useContext } from 'react';
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
      console.error('AuthContext: Profile fetch/create error:', e);
      // Fallback: set the raw auth user so the app doesn't hard-block
      setUser(authUser);
    }
  };

  // ─── Exposed so screens (e.g. CompleteProfileScreen) can re-fetch ─────────
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await refreshProfile(session.user);
    }
  };

  useEffect(() => {
    // Single source of truth: onAuthStateChange fires INITIAL_SESSION on mount,
    // which handles both the "no session" and "existing session" cases.
    // We no longer need a separate initializeAuth() call, which was causing
    // a race condition where refreshProfile() could be called twice.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await refreshProfile(session.user);
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
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
