import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import RankingsScreen from '../screens/RankingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();

const SCREEN_OPTIONS = {
  headerShown: false,
  cardStyle: { backgroundColor: '#0D0F14', flex: 1 },
  animationEnabled: true,
  gestureEnabled: true,
};

// ─── Loading Splash ──────────────────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0F14', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 52, marginBottom: 12 }}>🍔</Text>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#F1F5F9', marginBottom: 24 }}>RankEat</Text>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}

// ─── Main App Stack ───────────────────────────────────────────────────────────
function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CategorySelect" component={SearchScreen} />
      <Stack.Screen name="Rankings" component={RankingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator (guards the app) ─────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  // 1. Still resolving the session — show splash
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // 2. User is logged in but hasn't set their location yet — gate with onboarding
  const needsOnboarding = user && (!user.city_id || !user.district_id);
  if (needsOnboarding) {
    return <CompleteProfileScreen />;
  }

  // 3. Fully authenticated + profile complete (or not logged in) — show main app
  return <MainNavigator />;
}
