import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import RankingsScreen from '../screens/RankingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0D0F14', flex: 1 },
        animationEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CategorySelect" component={SearchScreen} />
      <Stack.Screen name="Rankings" component={RankingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
    </Stack.Navigator>
  );
}
