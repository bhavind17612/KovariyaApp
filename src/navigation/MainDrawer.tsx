import React, { useMemo } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import TabNavigator from './TabNavigator';
import { AppDrawerContent } from '../components/AppDrawerContent';
import { colors } from '../theme';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import QuizzesScreen from '../screens/QuizzesScreen';
import SessionsScreen from '../screens/SessionsScreen';
import TutorialsScreen from '../screens/TutorialsScreen';
import BadgesScreen from '../screens/BadgesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Drawer = createDrawerNavigator();

const MainDrawer = () => {
  const screenOptions = useMemo(
    () => ({
      headerShown: false as const,
      drawerType: 'front' as const,
      drawerStyle: {
        width: 300,
        backgroundColor: colors.primary,
      },
      overlayColor: 'rgba(13, 13, 13, 0.45)',
      sceneContainerStyle: {
        backgroundColor: colors.background,
      },
    }),
    []
  );

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={screenOptions}
    >
      <Drawer.Screen
        name="Tabs"
        component={TabNavigator}
        options={{
          title: 'Home',
        }}
      />
      <Drawer.Screen
        name="Sessions"
        component={SessionsScreen}
      />
      <Drawer.Screen
        name="Quizzes"
        component={QuizzesScreen}
      />
      <Drawer.Screen
        name="Announcements"
        component={AnnouncementsScreen}
      />
      <Drawer.Screen
        name="Tutorials"
        component={TutorialsScreen}
      />
      <Drawer.Screen
        name="Badges"
        component={BadgesScreen}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Drawer.Navigator>
  );
};

export default MainDrawer;
