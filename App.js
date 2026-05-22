import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { initDatabase } from './src/database/schema';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

import GlobalLayout from './src/components/GlobalLayout';

import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';

// GestureHandlerRootView is native-only; skip it on web
let GestureHandlerRootView;
if (Platform.OS !== 'web') {
  GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
} else {
  GestureHandlerRootView = ({ children, style }) => (
    <View style={style}>{children}</View>
  );
  
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => {
        console.error('Init error:', e);
        setError(e.message);
      });
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>שגיאה: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>🍔</Text>
        <Text style={styles.appName}>RankEat</Text>
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>מתחבר לשרת...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          <GlobalLayout>
            <AppNavigator />
          </GlobalLayout>
        </NavigationContainer>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0D0F14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F1F5F9',
    letterSpacing: -1,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
