import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen1 } from '../screens/onboarding/OnboardingScreen1';
import { OnboardingScreen2 } from '../screens/onboarding/OnboardingScreen2';
import { OnboardingScreen3 } from '../screens/onboarding/OnboardingScreen3';
import { OnboardingScreen4 } from '../screens/onboarding/OnboardingScreen4';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export const OnboardingNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ gestureEnabled: false }} />
    <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
    <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
    <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
    <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
  </Stack.Navigator>
);
