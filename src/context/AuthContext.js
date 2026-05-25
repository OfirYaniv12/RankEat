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
