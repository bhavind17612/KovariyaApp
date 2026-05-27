/**
 * AuthContext.tsx
 *
 * Thin React context that:
 *  1. Reads auth state from the Zustand useAuthStore (single source of truth).
 *  2. Exposes the same `useAuth()` API as before — no screen changes required.
 *  3. Handles the async actions (login, logout, etc.) by calling authService
 *     then updating the store atomically.
 *  4. Runs the bootstrap effect on mount to restore session from storage.
 *  5. Registers the global logout handler with tokenManager so that a failed
 *     token refresh auto-logs the user out from the Axios interceptor layer.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type { AuthState, User, AuthTokens, LoginCredentials, RegisterData } from '../types/auth';
import { authService } from '../services/authService';
import { tokenManager } from '../api/tokenManager';
import { useAuthStore } from '../store/authStore';

// ─── Context shape ─────────────────────────────────────────────────────────

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginByEmail: (email: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  completeAuthentication: (tokens: AuthTokens, user?: User) => Promise<void>;
  completeOnboardingAuthentication: (pin: string, tokens: AuthTokens, parentData?: Record<string, unknown> | null) => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // All mutable auth state lives in Zustand — read the whole slice once here.
  const {
    user,
    tokens,
    isAuthenticated,
    isBootstrapping,
    isSigningIn,
    error,
    setAuthenticated,
    setError,
    setSigningIn,
    setBootstrapped,
    resetAuth,
  } = useAuthStore();

  // ── Bootstrap: restore session on cold start ─────────────────────────────
  useEffect(() => {
    // Give tokenManager a logout handler so an Axios-level refresh failure
    // automatically resets the auth state without the UI knowing.
    tokenManager.setLogoutHandler(resetAuth);

    authService.getInitialAuthState().then(({ user: u, tokens: t }) => {
      setBootstrapped(u, t);
    }).catch(() => {
      setBootstrapped(null, null);
    });
    // Only run on mount; resetAuth / setBootstrapped are stable Zustand actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setSigningIn(true);
    try {
      const response = await authService.login(credentials);
      setAuthenticated(response.parent, response.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    }
  }, [setAuthenticated, setError, setSigningIn]);

  const loginByEmail = useCallback(async (email: string): Promise<void> => {
    setSigningIn(true);
    try {
      const response = await authService.loginByEmail(email);
      setAuthenticated(response.parent, response.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    }
  }, [setAuthenticated, setError, setSigningIn]);

  const loginWithPin = useCallback(async (pin: string): Promise<void> => {
    setSigningIn(true);
    try {
      const response = await authService.loginWithPin(pin);
      setAuthenticated(response.parent, response.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN login failed');
      throw err;
    }
  }, [setAuthenticated, setError, setSigningIn]);

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    setSigningIn(true);
    try {
      const response = await authService.register(data);
      setAuthenticated(response.parent, response.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    }
  }, [setAuthenticated, setError, setSigningIn]);

  /**
   * Called by OnboardingScreen4 after the set-pin API succeeds.
   * Persists the session that was built up during the onboarding flow.
   */
  const completeAuthentication = useCallback(
    async (newTokens: AuthTokens, newUser?: User): Promise<void> => {
      setSigningIn(true);
      try {
        const finalUser: User = newUser ?? {
          id: String(Date.now()),
          email: '',
          name: 'Parent',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await authService.setSession(newTokens, finalUser);
        setAuthenticated(finalUser, newTokens);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        throw err;
      }
    },
    [setAuthenticated, setError, setSigningIn],
  );

  const completeOnboardingAuthentication = useCallback(
    async (pin: string, newTokens: AuthTokens, parentData?: Record<string, unknown> | null): Promise<string | undefined> => {
      setSigningIn(true);
      try {
        const response = await authService.completeOnboarding({
          pin,
          tokens: newTokens,
          parentData,
        });
        setAuthenticated(response.parent, response.tokens);
        return response.message;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        throw err;
      }
    },
    [setAuthenticated, setError, setSigningIn],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Always reset — even if the server call fails
    } finally {
      resetAuth();
    }
  }, [resetAuth]);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const { user: u, tokens: t } = await authService.getInitialAuthState();
      setBootstrapped(u, t);
    } catch {
      setBootstrapped(null, null);
    }
  }, [setBootstrapped]);

  // ── Context value ─────────────────────────────────────────────────────────
  // useMemo prevents a new object reference on every render so consumers that
  // use the full `useAuth()` value still benefit from reference equality checks.
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tokens,
      isAuthenticated,
      isBootstrapping,
      isSigningIn,
      error,
      login,
      loginByEmail,
      loginWithPin,
      register,
      logout,
      refreshAuth,
      completeAuthentication,
      completeOnboardingAuthentication,
    }),
    // State from Zustand: reference changes only when the value changes.
    // Actions: stable useCallback refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, tokens, isAuthenticated, isBootstrapping, isSigningIn, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
