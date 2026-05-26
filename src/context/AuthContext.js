import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../database/supabaseClient';
import { getProfile, upsertProfile, updateProfile } from '../database/queries';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Fetch + merge profile, creating a minimal row for new OAuth users ───
  const refreshProfile = async (authUser) => {
    let profile = await getProfile(authUser.id);

    // New Google user (no profile row) or existing user missing first_name
    if (!profile || !profile.first_name) {
      const meta = authUser.user_metadata || {};
      const fullName = meta.full_name || meta.name || '';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'משתמש';
      const lastName = nameParts.slice(1).join(' ') || '';

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

      profile = await getProfile(authUser.id);
      
      // If recreating the profile STILL fails, throw an error to trigger the zombie session cleanup
      if (!profile) {
        throw new Error('Profile creation failed, record is missing.');
      }
    }

    setUser({ ...authUser, ...profile });
  };

  // ─── Exposed so screens (e.g. CompleteProfileScreen) can re-fetch ─────────
  const refreshUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) {
        await refreshProfile(session.user);
      }
    } catch (error) {
      console.error('refreshUser Error:', error);
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          await refreshProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        // ZOMBIE SESSION DETECTED: Fetching profile failed or token is invalid.
        console.error('Auth Initialization Error (Zombie Session):', error);
        await supabase.auth.signOut();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // 1. Initial boot check
    initAuth();

    // 2. Listen for subsequent auth events
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          // CRITICAL WEB FIX: Supabase fires SIGNED_IN on every tab-focus via
          // its internal visibilitychange listener (a token refresh). We must
          // NOT show the global blocking loader in that case — only show it
          // when this is a genuine new login (user was null before this event).
          // We read the current user state via a functional-state read to avoid
          // stale closure issues.
          setUser(prevUser => {
            const isGenuineNewLogin = prevUser === null;
            if (isGenuineNewLogin) {
              // Kick off an async profile refresh + loading state.
              // setLoading must be called outside the functional updater.
              (async () => {
                try {
                  setLoading(true);
                  await refreshProfile(session.user);
                } catch (error) {
                  console.error('Auth State Change Error (Zombie Session):', error);
                  await supabase.auth.signOut();
                  setUser(null);
                } finally {
                  setLoading(false);
                }
              })();
              // Return prevUser unchanged while the async work runs —
              // refreshProfile will call setUser with the merged profile.
              return prevUser;
            }

            // User was already logged in — this is a silent background
            // token refresh triggered by tab focus (web visibilitychange).
            // Silently refresh the profile WITHOUT touching loading state
            // so the screen never flickers.
            refreshProfile(session.user).catch(err => {
              console.warn('Silent token refresh profile error:', err);
            });
            return prevUser; // Keep the existing user state intact
          });
        }
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
