import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import CategorySelectScreen from '../screens/CategorySelectScreen';
import RankingsScreen from '../screens/RankingsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0D0F14', flex: 1 },
          animationEnabled: true,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CategorySelect" component={CategorySelectScreen} />
        <Stack.Screen name="Rankings" component={RankingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
