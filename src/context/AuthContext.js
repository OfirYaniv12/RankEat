import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../database/supabaseClient';
import { getProfile } from '../database/queries';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Check
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await refreshProfile(session.user.id, session.user);
        }
      } catch (error) {
        console.error('Auth Init Error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Auth State Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event);
      if (session?.user) {
        await refreshProfile(session.user.id, session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 3. Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async (userId, authUser) => {
    try {
      const profile = await getProfile(userId);
      setUser({ ...authUser, ...profile });
    } catch (e) {
      console.error('Profile fetch error:', e);
      setUser(authUser); // Fallback to basic auth user info
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
