/**
 * Kovariya - Smart Parenting. Better Children.
 * Parent Mobile App for Student Behaviour Development Platform
 *
 * @format
 */

import 'react-native-gesture-handler';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AppNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { ConfirmDialogProvider } from './src/context/ConfirmDialogContext';
import { ToastProvider } from './src/context/ToastContext';
import { ChildrenProvider } from './src/context/ChildrenContext';
import { AnnouncementsProvider } from './src/context/AnnouncementsContext';
import { queryClient } from './src/query/queryClient';

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ToastProvider>
              <ConfirmDialogProvider>
                <AuthProvider>
                  <ChildrenProvider>
                    <AnnouncementsProvider>
                      <ExpoStatusBar style="dark" />
                      <AppNavigator />
                    </AnnouncementsProvider>
                  </ChildrenProvider>
                </AuthProvider>
              </ConfirmDialogProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
