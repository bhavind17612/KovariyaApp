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
    REFRESH_TOKEN: '/api/v1/parents/auth/refresh',
    VERIFY_PIN: '/api/v1/parents/auth/verify-pin',
    FORGOT_PIN: {
      SEND_OTP: '/api/v1/parents/auth/forgot-pin/send-otp',
      VERIFY_OTP: '/api/v1/parents/auth/forgot-pin/verify-otp',
      RESEND_OTP: '/api/v1/parents/auth/forgot-pin/resend-otp',
    },
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
    LIST: '/api/v1/students',
    ONBOARDING: '/api/v1/students/onboarding',
    /** GET — full detail for a single student */
    DETAIL: (uuid: string) => `/api/v1/students/${uuid}`,
    /** PATCH — update a single student's details */
    UPDATE: (uuid: string) => `/api/v1/students/${uuid}`,
    /** GET ?period=weekly|monthly — Behaviour Score Index for a student */
    BSI: (studentUuid: string) => `/api/v1/students/${studentUuid}/bsi`,
    /** GET ?period=weekly|monthly — per-aspect scores + trend for a student */
    ASPECT_SCORES: (studentUuid: string) => `/api/v1/students/${studentUuid}/aspect-scores`,
    /** GET ?year=<YYYY>&month=<1-12> — daily behaviour score heatmap for a month */
    DBS_HEATMAP: (studentUuid: string) => `/api/v1/students/${studentUuid}/dbs-heatmap`,
    /** GET ?period=weekly|monthly — BSI vs Parent Consistency trend series */
    PROGRESS_TRENDS: (studentUuid: string) => `/api/v1/students/${studentUuid}/progress-trends`,
    /** GET ?period=weekly|monthly — activity snapshot counters */
    SUMMARY_STATS: (studentUuid: string) => `/api/v1/students/${studentUuid}/summary-stats`,
    /** GET — earnable badges + earned status for a student */
    BADGES: (studentUuid: string) => `/api/v1/students/${studentUuid}/badges`,
  },

  GOALS: {
    /** POST — create a new goal */
    CREATE: '/api/v1/goals',
    /** GET — all goals for a parent, by parent UUID */
    BY_PARENT: (parentUuid: string) => `/api/v1/goals/parent/${parentUuid}`,
    /** GET — a single goal by its UUID */
    DETAIL: (uuid: string) => `/api/v1/goals/${uuid}`,
  },

  MISSIONS: {
    LIST: '/api/v1/missions',
    DETAIL: (id: string) => `/api/v1/missions/${id}`,
    SUBMIT: '/api/v1/missions/submit',
    /** GET ?student_id=<uuid> — today's active mission + today's log status */
    TODAY: '/api/v1/missions/parent/today',
    /** POST (multipart) — log a mission for a child for a given day */
    LOG: (missionUuid: string) => `/api/v1/missions/parent/${missionUuid}/log`,
  },

  QUIZZES: {
    /** GET ?student_id=<uuid> — quizzes for a child */
    LIST: '/api/v1/quizzes/parent/list',
    /** GET ?student_id=<uuid> — quiz detail with questions (no answers) */
    DETAIL: (quizUuid: string) => `/api/v1/quizzes/parent/${quizUuid}`,
    /** POST ?student_id=<uuid> — start or resume an attempt */
    START: (quizUuid: string) => `/api/v1/quizzes/parent/${quizUuid}/start`,
    /** POST — save a single answer for an attempt */
    ANSWER: (attemptUuid: string) => `/api/v1/quizzes/parent/attempts/${attemptUuid}/answer`,
    /** POST — submit an attempt (auto-scores) */
    SUBMIT: (attemptUuid: string) => `/api/v1/quizzes/parent/attempts/${attemptUuid}/submit`,
    /** GET — result summary for a submitted attempt */
    RESULT: (attemptUuid: string) => `/api/v1/quizzes/parent/attempts/${attemptUuid}/result`,
    /** GET — full review with correct answers + explanations */
    REVIEW: (attemptUuid: string) => `/api/v1/quizzes/parent/attempts/${attemptUuid}/review`,
  },

  CHILDREN: {
    LIST: '/api/v1/children',
    DETAIL: (id: string) => `/api/v1/children/${id}`,
  },

  ANALYTICS: {
    OVERVIEW: '/api/v1/analytics/overview',
    ASPECT_SCORES: '/api/v1/analytics/aspects',
    DAY_LOGS: '/api/v1/analytics/day-logs',
    /** GET ?student_id=<uuid> — BSI score + week-over-week trend for a child */
    BSI: '/api/v1/analytics/parent/bsi',
    /** GET ?student_id=<uuid> — Family Score, Trust Meter & Parent Consistency cards */
    SCORE_CARDS: '/api/v1/analytics/parent/score-cards',
    /** GET ?language=<code> — AI guidance, strengths/weaknesses & badges for a child */
    INSIGHTS: (studentUuid: string) => `/api/v1/analytics/${studentUuid}/insights`,
  },

  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
    SETTINGS: '/api/v1/notifications/settings',
  },

  SCHOOLS: {
    LIST: '/api/v1/schools',
  },

  AI: {
    /** GET ?language=<code> — the latest published parent-weekly summary for a child */
    PARENT_WEEKLY: (studentUuid: string) =>
      `/api/v1/ai/summaries/parent-weekly/${studentUuid}`,
    /** POST — mark a summary as read by the parent */
    MARK_READ: (summaryUuid: string) => `/api/v1/ai/summaries/${summaryUuid}/read`,
  },

  REWARDS: {
    /** GET — active rewards/badges a child can earn */
    ACTIVE: '/api/v1/rewards/active',
  },

  TUTORIALS: {
    /** GET — parent-facing tutorial videos */
    PARENT: '/api/v1/tutorials/parent',
  },

  FEEDBACK: {
    /** POST — free-text feedback from a parent */
    PARENT: '/api/v1/feedback/parent',
  },

  BEHAVIOUR: {
    /** GET — returns aspects with their ratings and reason chips */
    ASPECTS: '/api/v1/behaviour/aspects',
    /** GET ?student_id=<uuid> — weekly Mon-Sun progress values per aspect */
    WEEKLY_ASPECT_PROGRESS: '/api/v1/analytics/student/weekly-progress',
    ASPECT_CHIPS: (slug: string) => `/api/v1/behaviour/aspects/${encodeURIComponent(slug)}/chips`,
    /** POST — submit a behaviour log entry */
    ENTRIES: '/api/v1/behaviour/entries',
  },

  LANGUAGE: {
    /** GET — list all available languages */
    LIST: '/api/v1/languages',
    /** GET — parent's saved language preference; POST — update it */
    PREFERENCE: '/api/v1/parents/preferences/language',
  },

  TRANSLATIONS: {
    /** GET ?language_id=<id> — Rating Sheet UI strings for the given language */
    RATING_SHEET: '/api/v1/translations/screens/rating-sheet',
  },
} as const;
