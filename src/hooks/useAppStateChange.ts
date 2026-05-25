import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppStore } from '../store/appStore';

type ChangeCallback = (current: AppStateStatus, previous: AppStateStatus) => void;

/**
 * Subscribes to React Native's AppState changes and:
 *  1. Keeps the global AppStore in sync (appStateStatus).
 *  2. Optionally calls an imperative `onChange` callback for per-screen logic.
 *
 * Use this in App.tsx (or a provider) to power:
 *  - App-lock on background
 *  - Token re-validation on foreground
 *  - Analytics session tracking
 *
 * @example
 * useAppStateChange((current, prev) => {
 *   if (current === 'active' && prev !== 'active') {
 *     queryClient.invalidateQueries();
 *   }
 * });
 */
export function useAppStateChange(onChange?: ChangeCallback): AppStateStatus {
  const previous = useRef<AppStateStatus>(AppState.currentState);
  const setAppStateStatus = useAppStore((s) => s.setAppStateStatus);

  const handleChange = useCallback(
    (nextState: AppStateStatus) => {
      const prev = previous.current;
      previous.current = nextState;
      setAppStateStatus(nextState);
      onChange?.(nextState, prev);
    },
    [onChange, setAppStateStatus],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [handleChange]);

  return previous.current;
}
