import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../database/supabaseClient';
import { getProfile, upsertProfile, updateProfile } from '../database/queries';

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

      // New Google user (no profile row) or existing user missing first_name
      if (!profile || !profile.first_name) {
        const meta = authUser.user_metadata || {};
        const fullName = meta.full_name || meta.name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'משתמש';
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
          if (!profile) {
            await upsertProfile(authUser.id, {
              first_name: firstName,
              last_name: lastName,
              trust_score: 1.0,
            });
          } else {
            await updateProfile(authUser.id, {
              first_name: firstName,
              last_name: lastName,
            });
          }
        } catch (dbErr) {
          console.error('Failed to update profile row:', dbErr);
        }

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
    // ─── Hard timeout safety net ──────────────────────────────────────────────
    // If Supabase never fires onAuthStateChange (network error, init crash,
    // etc.) this ensures the app NEVER hangs forever on the loading spinner.
    // After 6 seconds, we force loading=false so the app opens unauthenticated.
    const hangGuard = setTimeout(() => {
      console.warn('AuthContext: onAuthStateChange did not fire within 6s. Forcing ready state.');
      setLoading(false);
    }, 6000);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Listener fired — cancel the hang guard immediately
        clearTimeout(hangGuard);

        try {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            return;
          }

          if (session?.user) {
            // Add a timeout to refreshProfile to ensure it never hangs the loading screen
            await Promise.race([
              refreshProfile(session.user),
              new Promise(resolve => setTimeout(resolve, 5000))
            ]);
          } else {
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(hangGuard);
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
