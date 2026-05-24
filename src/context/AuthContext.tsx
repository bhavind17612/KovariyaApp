import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, AuthTokens, LoginCredentials, RegisterData } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginByEmail: (email: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  completeAuthentication: (tokens: AuthTokens, user?: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_SIGNING_IN'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKENS'; payload: AuthTokens }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'SET_INITIAL_STATE'; payload: { user: User | null; tokens: AuthTokens | null } };

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isBootstrapping: true,
  isSigningIn: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_SIGNING_IN':
      return {
        ...state,
        isSigningIn: action.payload,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isSigningIn: false,
      };

    case 'SET_TOKENS':
      return {
        ...state,
        tokens: action.payload,
        isAuthenticated: !!action.payload,
        isSigningIn: false,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isSigningIn: false,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'LOGOUT':
      return {
        user: null,
        tokens: null,
        isAuthenticated: false,
        isBootstrapping: false,
        isSigningIn: false,
        error: null,
      };

    case 'SET_INITIAL_STATE': {
      const { user, tokens } = action.payload;
      return {
        ...state,
        user,
        tokens,
        isAuthenticated: !!(user && tokens),
        isBootstrapping: false,
        isSigningIn: false,
      };
    }

    default:
      return state;
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { user, tokens } = await authService.getInitialAuthState();
        dispatch({ type: 'SET_INITIAL_STATE', payload: { user, tokens } });
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: 'SET_INITIAL_STATE', payload: { user: null, tokens: null } });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'SET_SIGNING_IN', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authService.login(credentials);

      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_TOKENS', payload: response.tokens });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  /** OTP-based login — authenticate by email only (no password). */
  const loginByEmail = async (email: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_SIGNING_IN', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authService.loginByEmail(email);

      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_TOKENS', payload: response.tokens });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const loginWithPin = async (pin: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_SIGNING_IN', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authService.loginWithPin(pin);
      console.log('response ', response);
      dispatch({ type: 'SET_USER', payload: response.parent });
      dispatch({ type: 'SET_TOKENS', payload: response.tokens });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PIN Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'SET_SIGNING_IN', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await authService.register(data);

      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_TOKENS', payload: response.tokens });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const completeAuthentication = async (tokens: AuthTokens, user?: User): Promise<void> => {
    try {
      dispatch({ type: 'SET_SIGNING_IN', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Provide a minimal default user if missing from onboarding
      const finalUser: User = user || {
        id: String(Date.now()),
        email: '',
        name: 'Parent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await authService.setSession(tokens, finalUser);

      dispatch({ type: 'SET_USER', payload: finalUser });
      dispatch({ type: 'SET_TOKENS', payload: tokens });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      const { user, tokens } = await authService.getInitialAuthState();
      dispatch({ type: 'SET_INITIAL_STATE', payload: { user, tokens } });
    } catch (error) {
      console.error('Auth refresh error:', error);
      dispatch({ type: 'SET_INITIAL_STATE', payload: { user: null, tokens: null } });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginByEmail,
    loginWithPin,
    register,
    logout,
    refreshAuth,
    completeAuthentication,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
