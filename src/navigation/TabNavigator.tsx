import React, { useMemo } from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from './FloatingTabBar';

import DashboardScreen from '../screens/DashboardScreen';
import MissionsStack from './MissionsStack';
import GoalsStack from './GoalsStack';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import ProfileStack from './ProfileStack';

const Tab = createBottomTabNavigator();

const staticTabOptions: Pick<
  BottomTabNavigationOptions,
  'headerShown' | 'tabBarShowLabel'
> = {
  // Main tab pages should be immersive; keep top bars for sub-pages only.
  headerShown: false,
  tabBarShowLabel: false,
};

const TabNavigator = () => {
  const screenOptions = useMemo(
    (): BottomTabNavigationOptions => ({
      ...staticTabOptions,
      tabBarStyle: {
        position: 'absolute',
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        elevation: 0,
        height: 0,
      },
    }),
    []
  );

  const renderTabBar = useMemo(
    () => (props: BottomTabBarProps) => <FloatingTabBar {...props} />,
    []
  );

  return (
    <Tab.Navigator screenOptions={screenOptions} tabBar={renderTabBar}>
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Kovariya',
        }}
      />
      <Tab.Screen
        name="Missions"
        component={MissionsStack}
        options={{
          title: 'Missions',
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsStack}
        options={{
          title: 'Goals',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
