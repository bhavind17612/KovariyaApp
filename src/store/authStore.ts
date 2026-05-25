import { create } from 'zustand';
import type { User, AuthTokens } from '../types/auth';

/**
 * Zustand auth store — the single source of truth for authentication state.
 *
 * This store is intentionally NOT persisted via Zustand middleware.
 * Tokens are owned by tokenManager (persisted in AsyncStorage/MMKV).
 * User data is rehydrated from storage on every cold start via AuthContext.bootstrap().
 *
 * Why no persist here?
 *  - Tokens live in storage anyway (tokenManager handles it).
 *  - Zustand persist would double-write and risk stale state across app upgrades.
 *  - The bootstrap() call on mount is fast (<100 ms from local storage).
 */

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  /** True only during cold-start session restore (show full-screen splash). */
  isBootstrapping: boolean;
  /** True while a login/register request is in flight (inline button spinner only). */
  isSigningIn: boolean;
  /** Last auth error message (cleared on next action). */
  error: string | null;
}

export interface AuthActions {
  /** Called after a successful login / register / PIN login. */
  setAuthenticated: (user: User, tokens: AuthTokens) => void;
  /** Set or clear the auth error string. */
  setError: (error: string | null) => void;
  /** Toggle the in-flight signing-in state. */
  setSigningIn: (value: boolean) => void;
  /** Called once bootstrap resolves — sets final state and clears isBootstrapping. */
  setBootstrapped: (user: User | null, tokens: AuthTokens | null) => void;
  /** Full reset — called on logout or token refresh failure. */
  resetAuth: () => void;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isBootstrapping: true,
  isSigningIn: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  setAuthenticated: (user, tokens) =>
    set({
      user,
      tokens,
      isAuthenticated: true,
      isSigningIn: false,
      error: null,
    }),

  setError: (error) =>
    set({ error, isSigningIn: false }),

  setSigningIn: (value) =>
    set({ isSigningIn: value, error: null }),

  setBootstrapped: (user, tokens) =>
    set({
      user,
      tokens,
      isAuthenticated: !!(user && tokens),
      isBootstrapping: false,
    }),

  resetAuth: () =>
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isBootstrapping: false,
      isSigningIn: false,
      error: null,
    }),
}));

// ── Fine-grained selectors ─────────────────────────────────────────────────────
// Use these in components to subscribe to only the slice you need,
// preventing renders when unrelated auth state changes.

export const selectUser = (s: AuthState & AuthActions) => s.user;
export const selectIsAuthenticated = (s: AuthState & AuthActions) => s.isAuthenticated;
export const selectIsBootstrapping = (s: AuthState & AuthActions) => s.isBootstrapping;
export const selectIsSigningIn = (s: AuthState & AuthActions) => s.isSigningIn;
export const selectAuthError = (s: AuthState & AuthActions) => s.error;
