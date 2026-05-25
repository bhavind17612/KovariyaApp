import type { Child } from './index';

export interface User {
  id: string; // The UUID of the user record
  parentId?: string; // The human-readable parent_id (e.g., PAR-1234-1)
  name: string; // Maps to parent_name
  mobileNumber?: string;
  email?: string;
  schoolId?: string; // The human-readable school_id
  schoolName?: string;
  onboardingStage?: number;
  hasPin?: boolean;
  avatar?: string;
  children?: Child[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  /** True only while restoring session from storage on cold start (full-screen splash OK). */
  isBootstrapping: boolean;
  /** True while login/register request is in flight (use inline button loading only). */
  isSigningIn: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  parent: User;
  tokens: AuthTokens;
}
