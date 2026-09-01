/**
 * authService.ts — Authentication business logic.
 *
 * External API is identical to the original so every caller
 * (AuthContext, LoginScreen, OnboardingScreen4) continues to work unchanged.
 *
 * Internal changes:
 *  - Direct AsyncStorage calls replaced with tokenManager + typed storage service.
 *  - Base URL sourced from ENV (no more inline Platform.OS branch).
 *  - Timer-based proactive refresh removed — Axios interceptors handle 401 refresh.
 *  - getInitialAuthState() simplified: just validate expiry, no mockApi.validateToken().
 */
import { isAxiosError } from 'axios';
import { apiClient } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';
import { tokenManager } from '../api/tokenManager';
import { ENV } from '../config/env';
import type { AuthTokens, User, LoginCredentials, RegisterData, AuthResponse } from '../types/auth';
import type { Child } from '../types';

// ─── Response shape helpers ────────────────────────────────────────────────

type ApiErrorObject = { code?: string; message?: string };

// Inner payload — present either at the top level (flat) or under `data` (envelope)
type ApiPayload = {
  parent?: Record<string, unknown>;
  user?: Record<string, unknown>;
  tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: number };
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
  expiresAt?: number;
  expires_at?: number;
};

// Envelope:  { success, data: { parent, tokens }, error: { code, message }, meta }
// Flat:      { parent, tokens, message, error }
type ApiJson = ApiPayload & {
  success?: boolean;
  data?: ApiPayload | null;
  error?: ApiErrorObject | string | null;
  message?: string;
  meta?: unknown;
};

type OnboardingCompletionInput = {
  pin: string;
  parentData?: Record<string, unknown> | null;
  tokens: AuthTokens;
};

type AuthResponseWithMessage = AuthResponse & {
  message?: string;
};

function parseErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const d = data as ApiJson;
    // Envelope: error is an object { code, message }
    if (d.error && typeof d.error === 'object' && typeof d.error.message === 'string' && d.error.message.trim()) {
      return d.error.message.trim();
    }
    // Flat: error is a plain string
    if (typeof d.error === 'string' && d.error.trim()) return d.error.trim();
    // Flat: top-level message string
    if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
  }
  if (status === 401 || status === 403) return 'Invalid credentials';
  if (status === 422) return 'Check your email and password format';
  if (status >= 500) return 'Server is unavailable. Try again shortly';
  return 'Could not sign you in. Please try again';
}

function mapRawChild(c: Record<string, unknown>): Child {
  // Primary fields from the actual API response shape.
  // Fallbacks keep older / alternate endpoint shapes working.
  const name = (c.full_name ?? c.student_name ?? c.name) as string | undefined ?? 'Child';
  const age = typeof c.age === 'number' ? c.age : Number(c.age ?? 0);
  return {
    id: String(c.id ?? c.uuid ?? c.student_uid ?? Date.now()),
    name,
    age,
    avatar: (c.avatar_url ?? c.avatar) as string | undefined,
    dateOfBirth: (c.date_of_birth ?? c.dob) as string | undefined,
    gender: c.gender as 'male' | 'female' | undefined,
    grade: (c.class_name ?? c.grade ?? c.class) as string | undefined,
    section: c.section as string | undefined,
    schoolName: (c.school_name ?? c.schoolName) as string | undefined,
    admissionNumber: (c.student_uid ?? c.admission_number ?? c.roll_number) as string | undefined,
    status: c.status as 'active' | 'inactive' | undefined,
    // Gates child selection: the API refuses ratings/goals/missions for a
    // child that is not verified, so the UI must not let one be picked.
    verificationStatus: c.verification_status as 'pending_verification' | 'verified' | undefined,
    dailyScore: c.daily_score as number | undefined,
    trustMeter: c.trust_meter as number | undefined,
    confidenceIndicator: c.confidence_indicator as number | undefined,
  };
}

function mapParentToUser(u: Record<string, unknown>): User {
  const rawChildren = (u.students ?? u.children ?? u.child ?? []) as Record<string, unknown>[];
  return {
    id: String(u.uuid ?? u.id ?? Date.now()),
    parentId: u.parent_id as string | undefined,
    name: String(u.parent_name ?? u.name ?? (u.email as string)?.split('@')[0] ?? 'Parent'),
    mobileNumber: u.mobile_number as string | undefined,
    email: u.email as string | undefined,
    schoolId: u.school_id as string | undefined,
    schoolName: u.school_name as string | undefined,
    onboardingStage: u.onboarding_stage as number | undefined,
    hasPin: u.has_pin as boolean | undefined,
    children: Array.isArray(rawChildren) ? rawChildren.map(mapRawChild) : [],
    createdAt: String(u.createdAt ?? new Date().toISOString()),
    updatedAt: String(u.updatedAt ?? new Date().toISOString()),
  };
}

function extractAuthResponse(data: ApiJson): AuthResponse {
  // Prefer envelope payload (data.data) over flat top-level fields
  const payload: ApiPayload = (data.data && typeof data.data === 'object') ? data.data : data;

  const rawUser = payload.parent ?? payload.user;
  if (!rawUser || typeof rawUser !== 'object') {
    throw new Error('Unexpected response: missing user data');
  }

  const accessToken = payload.tokens?.accessToken ?? payload.accessToken ?? payload.access_token;
  const refreshToken = payload.tokens?.refreshToken ?? payload.refreshToken ?? payload.refresh_token;
  const expiresAt = payload.tokens?.expiresAt ?? payload.expiresAt ?? payload.expires_at;

  if (!accessToken || !refreshToken) {
    throw new Error('Unexpected response: missing tokens');
  }

  return {
    parent: mapParentToUser(rawUser as Record<string, unknown>),
    tokens: {
      accessToken,
      refreshToken,
      expiresAt: typeof expiresAt === 'number' ? expiresAt : Date.now() + 3_600_000,
    },
  };
}

function extractOptionalAuthResponse(data: ApiJson, fallbackParent: Record<string, unknown> | null | undefined, fallbackTokens: AuthTokens): AuthResponse {
  const payload: ApiPayload = (data.data && typeof data.data === 'object') ? data.data : data;
  const rawUser = payload.parent ?? payload.user ?? fallbackParent;

  if (!rawUser || typeof rawUser !== 'object') {
    throw new Error('Unexpected response: missing user data');
  }

  const accessToken = payload.tokens?.accessToken ?? payload.accessToken ?? payload.access_token ?? fallbackTokens.accessToken;
  const refreshToken = payload.tokens?.refreshToken ?? payload.refreshToken ?? payload.refresh_token ?? fallbackTokens.refreshToken;
  const expiresAt = payload.tokens?.expiresAt ?? payload.expiresAt ?? payload.expires_at ?? fallbackTokens.expiresAt;

  return {
    parent: mapParentToUser({
      ...rawUser,
      onboarding_stage: (rawUser as Record<string, unknown>).onboarding_stage ?? 4,
      has_pin: (rawUser as Record<string, unknown>).has_pin ?? true,
    } as Record<string, unknown>),
    tokens: {
      accessToken,
      refreshToken,
      expiresAt: typeof expiresAt === 'number' ? expiresAt : Date.now() + 3_600_000,
    },
  };
}

function extractSuccessMessage(data: ApiJson, fallback: string): string {
  const payload = (data.data && typeof data.data === 'object') ? data.data : data;
  const message = (payload as ApiJson).message ?? data.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

// ─── Real HTTP helpers ─────────────────────────────────────────────────────

async function loginViaHttp(credentials: LoginCredentials): Promise<AuthResponse> {
  let data: ApiJson;
  try {
    const res = await apiClient.post('/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }, { skipAuth: true });
    data = res.data as ApiJson;
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      throw new Error(parseErrorMessage(err.response.data as ApiJson, err.response.status));
    }
    throw err;
  }
  // success:false means the server explicitly rejected the request even on a 2xx status
  if (data.success === false || (!data.data?.parent && !data.data?.user && !data.parent && !data.user)) {
    throw new Error(parseErrorMessage(data, 200) || 'Could not sign you in. Please try again');
  }
  return extractAuthResponse(data);
}

async function loginWithPinHttp(pin: string): Promise<AuthResponse> {
  let data: ApiJson;
  try {
    const res = await apiClient.post('/api/v1/parents/auth/verify-pin', { pin }, { skipAuth: true });
    console.log('res ',res);
    data = res.data as ApiJson;
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      throw new Error(parseErrorMessage(err.response.data as ApiJson, err.response.status));
    }
    throw err;
  }
  // success:false means the server explicitly rejected the request even on a 2xx status
  if (data.success === false || (!data.data?.parent && !data.data?.user && !data.parent && !data.user)) {
    throw new Error(parseErrorMessage(data, 200) || 'Invalid PIN. Please try again');
  }
  return extractAuthResponse(data);
}

// ─── Mock API (used when no real backend URL is configured) ────────────────

const mockApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise<void>((r) => setTimeout(r, 800));
    if (credentials.email === 'user@kovariya.com' && credentials.password === 'password') {
      return {
        parent: {
          id: '1',
          email: credentials.email.trim().toLowerCase(),
          name: 'Sarah',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokens: {
          accessToken: `mock-access-${Date.now()}`,
          refreshToken: `mock-refresh-${Date.now()}`,
          expiresAt: Date.now() + 3_600_000,
        },
      };
    }
    throw new Error('Invalid email or password');
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    await new Promise<void>((r) => setTimeout(r, 800));
    return {
      parent: {
        id: String(Date.now()),
        email: data.email.trim().toLowerCase(),
        name: data.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: `mock-access-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
        expiresAt: Date.now() + 3_600_000,
      },
    };
  },

  async loginByEmail(email: string): Promise<AuthResponse> {
    await new Promise<void>((r) => setTimeout(r, 600));
    return {
      parent: {
        id: String(Date.now()),
        email: email.trim().toLowerCase(),
        name: email.split('@')[0] ?? 'Parent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: `mock-access-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
        expiresAt: Date.now() + 3_600_000,
      },
    };
  },
};

// ─── Determine if we are pointing at a real backend ────────────────────────

function isRealBackend(): boolean {
  return (
    !!ENV.API_BASE_URL &&
    !ENV.API_BASE_URL.includes('localhost') &&
    !ENV.API_BASE_URL.includes('10.0.2.2')
  );
}

// ─── AuthService ───────────────────────────────────────────────────────────

class AuthService {
  private static _instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService._instance) {
      AuthService._instance = new AuthService();
    }
    return AuthService._instance;
  }

  // ── Persists session data after every successful authentication ────────────

  private async _persistSession(response: AuthResponse): Promise<void> {
    await Promise.all([
      tokenManager.setTokens(response.tokens),
      storage.set(STORAGE_KEYS.USER_DATA, response.parent),
    ]);
    if (response.parent.parentId) {
      await storage.set(STORAGE_KEYS.REMEMBERED_PARENT_ID, response.parent.parentId);
    }
  }

  // ── Public auth methods (same signatures as before) ────────────────────────

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = isRealBackend()
      ? await loginViaHttp(credentials)
      : await mockApi.login(credentials);
    await this._persistSession(response);
    return response;
  }

  async loginWithPin(pin: string): Promise<AuthResponse> {
    const response = await loginWithPinHttp(pin);
    await this._persistSession(response);
    return response;
  }

  /**
   * Triggers a forgot-PIN OTP email to the given address.
   * Public endpoint — no auth token required.
   * Returns the server's success message to show as a toast.
   */
  async sendForgotPinOtp(email: string): Promise<string> {
    let data: ApiJson;
    try {
      const res = await apiClient.post(
        ENDPOINTS.AUTH.FORGOT_PIN.SEND_OTP,
        { email: email.trim().toLowerCase() },
        { skipAuth: true },
      );
      data = res.data as ApiJson;
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        throw new Error(parseErrorMessage(err.response.data as ApiJson, err.response.status));
      }
      throw err;
    }
    return extractSuccessMessage(data, 'OTP sent to your email');
  }

  /**
   * Re-sends the forgot-PIN OTP. Returns the server's success message.
   * Public endpoint — no auth token required.
   */
  async resendForgotPinOtp(email: string): Promise<string> {
    let data: ApiJson;
    try {
      const res = await apiClient.post(
        ENDPOINTS.AUTH.FORGOT_PIN.RESEND_OTP,
        { email: email.trim().toLowerCase() },
        { skipAuth: true },
      );
      data = res.data as ApiJson;
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        throw new Error(parseErrorMessage(err.response.data as ApiJson, err.response.status));
      }
      throw err;
    }
    return extractSuccessMessage(data, 'OTP resent to your email');
  }

  /**
   * Verifies the forgot-PIN OTP and completes authentication.
   * The verify-otp endpoint returns the exact same shape as verify-pin,
   * so we reuse extractAuthResponse and _persistSession unchanged.
   */
  async loginWithEmailOtp(email: string, otp: string): Promise<AuthResponse> {
    let data: ApiJson;
    try {
      const res = await apiClient.post(
        ENDPOINTS.AUTH.FORGOT_PIN.VERIFY_OTP,
        { email: email.trim().toLowerCase(), otp_code:otp },
        { skipAuth: true },
      );
      data = res.data as ApiJson;
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        throw new Error(parseErrorMessage(err.response.data as ApiJson, err.response.status));
      }
      throw err;
    }
    if (data.success === false || (!data.data?.parent && !data.data?.user && !data.parent && !data.user)) {
      throw new Error(parseErrorMessage(data, 200) || 'Invalid or expired OTP. Please try again.');
    }
    const response = extractAuthResponse(data);
    await this._persistSession(response);
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await mockApi.register(data);
    await this._persistSession(response);
    return response;
  }

  async loginByEmail(email: string): Promise<AuthResponse> {
    const response = await mockApi.loginByEmail(email);
    await this._persistSession(response);
    return response;
  }

  async completeOnboarding(input: OnboardingCompletionInput): Promise<AuthResponseWithMessage> {
    await tokenManager.setTokens(input.tokens);

    let data: ApiJson;
    try {
      const res = await apiClient.post(ENDPOINTS.ONBOARDING.SET_PIN, {
        parent_id: input.parentData?.parent_id,
        pin: input.pin,
      });
      data = res.data as ApiJson;
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        throw new Error(parseErrorMessage(err.response.data as ApiJson, err.response.status));
      }
      throw err;
    }

    if (data.success === false) {
      throw new Error(parseErrorMessage(data, 200) || 'Failed to set PIN. Please try again.');
    }

    const response = extractOptionalAuthResponse(data, input.parentData, input.tokens);
    await this._persistSession(response);

    return {
      ...response,
      message: extractSuccessMessage(data, 'PIN set! Welcome to Kovariya'),
    };
  }

  /**
   * Called by AuthContext.completeAuthentication() at the end of onboarding.
   * Stores the tokens and user that were established during the OTP/PIN flow.
   */
  async setSession(tokens: AuthTokens, user?: User | null): Promise<void> {
    await tokenManager.setTokens(tokens);
    if (user) {
      await storage.set(STORAGE_KEYS.USER_DATA, user);
      if (user.parentId) {
        await storage.set(STORAGE_KEYS.REMEMBERED_PARENT_ID, user.parentId);
      }
    }
  }

  /**
   * Clears the active session.
   * REMEMBERED_PARENT_ID is intentionally kept so PIN re-login still works.
   */
  async logout(): Promise<void> {
    await Promise.all([
      tokenManager.clearTokens(),
      storage.delete(STORAGE_KEYS.USER_DATA),
    ]);
  }

  /**
   * Called on cold start to restore session from storage.
   * Returns { user, tokens } if a valid, unexpired session exists, else nulls.
   */
  async getInitialAuthState(): Promise<{ user: User | null; tokens: AuthTokens | null }> {
    try {
      await tokenManager.initialize();

      const user = await storage.get<User>(STORAGE_KEYS.USER_DATA);
      const accessToken = tokenManager.getAccessToken();
      const expiresAt = tokenManager.getExpiresAt();

      if (!user || !accessToken || Date.now() >= expiresAt) {
        // Session absent or expired — clean up and return unauthenticated
        await tokenManager.clearTokens();
        return { user: null, tokens: null };
      }

      const tokens: AuthTokens = {
        accessToken,
        refreshToken: tokenManager.getRefreshToken() ?? '',
        expiresAt,
      };

      return { user, tokens };
    } catch {
      return { user: null, tokens: null };
    }
  }

  // ── Utility accessors used by LoginScreen ──────────────────────────────────

  async getRememberedParentId(): Promise<string | null> {
    return storage.get<string>(STORAGE_KEYS.REMEMBERED_PARENT_ID);
  }

  async getAccessToken(): Promise<string | null> {
    return tokenManager.getAccessToken();
  }

  async isAuthenticated(): Promise<boolean> {
    return tokenManager.isAuthenticated();
  }
}

export const authService = AuthService.getInstance();
