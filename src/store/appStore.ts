import { create } from 'zustand';
import type { AppStateStatus } from 'react-native';

export interface AppState {
  /** True when the device has a working internet connection. */
  isOnline: boolean;
  /** React Native AppState value. */
  appStateStatus: AppStateStatus;
}

export interface AppActions {
  setOnline: (value: boolean) => void;
  setAppStateStatus: (status: AppStateStatus) => void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  isOnline: true,
  appStateStatus: 'active',

  setOnline: (value) => set({ isOnline: value }),
  setAppStateStatus: (status) => set({ appStateStatus: status }),
}));

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectIsOnline = (s: AppState & AppActions) => s.isOnline;
export const selectAppStateStatus = (s: AppState & AppActions) => s.appStateStatus;
