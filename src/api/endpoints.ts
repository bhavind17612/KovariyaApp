/**
 * All API endpoint paths in one place.
 * Combine with ENV.API_BASE_URL or let the Axios baseURL handle it.
 *
 * Naming convention: RESOURCE.ACTION
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/parents/auth/login',
    LOGOUT: '/api/v1/parents/auth/logout',
    REFRESH_TOKEN: '/api/v1/auth/refresh-token',
    VERIFY_PIN: '/api/v1/parents/auth/verify-pin',
  },

  ONBOARDING: {
    SEND_OTP: '/api/v1/parents/onboarding/send-otp',
    VERIFY_OTP: '/api/v1/parents/onboarding/verify-otp',
    UPDATE_PROFILE: '/api/v1/parents/onboarding/profile',
    ADD_STUDENT: '/api/v1/parents/onboarding/student',
    SET_PIN: '/api/v1/parents/onboarding/set-pin',
  },

  PARENT: {
    PROFILE: '/api/v1/parents/profile',
    UPDATE_PROFILE: '/api/v1/parents/profile',
    BY_UUID: (uuid: string) => `/api/v1/parents/${uuid}`,
  },

  STUDENTS: {
    ONBOARDING: '/api/v1/students/onboarding',
  },

  MISSIONS: {
    LIST: '/api/v1/missions',
    DETAIL: (id: string) => `/api/v1/missions/${id}`,
    SUBMIT: '/api/v1/missions/submit',
  },

  CHILDREN: {
    LIST: '/api/v1/children',
    DETAIL: (id: string) => `/api/v1/children/${id}`,
  },

  ANALYTICS: {
    OVERVIEW: '/api/v1/analytics/overview',
    ASPECT_SCORES: '/api/v1/analytics/aspects',
    DAY_LOGS: '/api/v1/analytics/day-logs',
  },

  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
    SETTINGS: '/api/v1/notifications/settings',
  },

  SCHOOLS: {
    LIST: '/api/v1/schools',
  },
} as const;
