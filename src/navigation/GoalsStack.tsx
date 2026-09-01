import React, { useMemo } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GoalsScreen from '../screens/GoalsScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import { colors } from '../theme';

/** Route params for the Goals tab stack. */
export type GoalsStackParamList = {
  GoalsHome: undefined;
  GoalDetail: { goalId: string };
};

const Stack = createStackNavigator<GoalsStackParamList>();

export default function GoalsStack() {
  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.ink,
      headerTitleStyle: { fontWeight: '700' as const },
      headerShadowVisible: false,
      cardStyle: { backgroundColor: colors.background },
    }),
    []
  );

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="GoalsHome" component={GoalsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
