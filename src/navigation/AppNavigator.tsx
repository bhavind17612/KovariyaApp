import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {View,ActivityIndicator} from 'react-native';

import {useAuth} from '../context/AuthContext';
import {LoginScreen} from '../screens/LoginScreen';
import MainDrawer from './MainDrawer';
import {colors} from '../theme';
import {OnboardingNavigator} from './OnboardingNavigator';

const Stack=createStackNavigator();

const AppNavigatorContent=() => {
	const {isAuthenticated,isBootstrapping,isSigningOut}=useAuth();

	// Show a full-screen loader during cold-start restore AND during logout.
	// The logout gate is critical: it ensures no authenticated screen (Dashboard,
	// Drawer, etc.) re-renders with null/undefined user data between the moment
	// resetAuth() fires and the moment React Navigation unmounts those screens.
	if(isBootstrapping || isSigningOut) {
		return (
			<View style={{
				flex: 1,
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: colors.background
			}}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}

	return (
		<Stack.Navigator screenOptions={{headerShown: false}}>
			{isAuthenticated? (
				<Stack.Screen name="Main" component={MainDrawer} />
			):(
				<Stack.Screen name="Login" component={OnboardingNavigator} />
			)}
		</Stack.Navigator>
	);
};

const AppNavigator=() => {
	return (
		<NavigationContainer>
			<AppNavigatorContent />
		</NavigationContainer>
	);
};

export default AppNavigator;
