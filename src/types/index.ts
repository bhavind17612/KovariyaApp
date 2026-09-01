export type ChildGender = 'male' | 'female';

export type ChildSchoolStatus = 'active' | 'inactive';

export interface Child {
  id: string;
  /** Display name for lists (usually "First Last"). */
  name: string;
  firstName?: string;
  lastName?: string;
  age: number;
  avatar?: string;
  /** ISO calendar date YYYY-MM-DD */
  dateOfBirth?: string;
  gender?: ChildGender;
  /** e.g. class1 … class10 */
  grade?: string;
  /** Section letter e.g. A, B, C */
  section?: string;
  schoolName?: string;
  /** Backend school lookup id (detail endpoint returns this instead of the name). */
  schoolId?: string;
  /** School-issued admission / roll number */
  admissionNumber?: string;
  /**
   * Backend verification state. A child added by a parent starts as
   * `pending_verification`; the API rejects ratings, goals and mission logs
   * against them until an admin verifies the profile. Optional because not
   * every payload carries it.
   */
  verificationStatus?: 'pending_verification' | 'verified';
  status?: ChildSchoolStatus;
  notes?: string;
  dailyScore?: number;
  trustMeter?: number;
  confidenceIndicator?: number;
}

export interface BehaviourAspect {
  id: string;
  name: string;
  description: string;
  rating: number;
  reasons?: string[];
  note?: string;
}

/**
 * Mirrors the server enum exactly (goals.repository.ts). The app previously knew
 * only active/completed/paused, so expired, upcoming and cancelled goals were all
 * coerced to "Active". Note there is no 'paused' server-side.
 */
export type GoalStatus =
  | 'draft'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'expired'
  | 'cancelled';

/** Statuses the server treats as final — no further transitions. */
export const TERMINAL_GOAL_STATUSES: readonly GoalStatus[] = [
  'completed',
  'expired',
  'cancelled',
];

/**
 * Parent-defined reward goals. Progress is tracked in raw points only;
 * analytics elsewhere use Quality + Confidence separately.
 */
export interface Goal {
  id: string;
  title: string;
  description: string;
  /** Current raw points earned toward this goal */
  currentRawPoints: number;
  /** Target raw points to complete */
  targetRawPoints: number;
  /** ISO date (YYYY-MM-DD) */
  startDate: string;
  /** ISO date (YYYY-MM-DD) */
  endDate: string;
  rewardName: string;
  /** Optional display (e.g. currency or “extra screen time”) */
  rewardValue?: string;
  status: GoalStatus;
  /**
   * Numeric behaviour_aspects.id this goal targets. The list endpoint selects
   * `goals.*` with no join, so the aspect's name/icon/colour must be resolved
   * against GET /behaviour/aspects on the client.
   * @deprecated Kept for goals created before multi-aspect support shipped —
   * new goals populate `aspectIds` instead. Equal to `aspectIds[0]`.
   */
  aspectId?: number;
  /** Every behaviour_aspects.id this goal targets (a goal can target several). */
  aspectIds: number[];
  /** ISO timestamp the goal was created (used for sorting newest-first) */
  createdAt?: string;
}

export type MissionSubmissionStatus = 'pending' | 'submitted' | 'approved';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'voice' | 'text';
  points: number;
  /** Workflow status shown on cards and drives mentor review. */
  submissionStatus: MissionSubmissionStatus;
  evidenceTypes: Array<'photo' | 'voice' | 'text'>;
  assignedBy: 'Mentor' | 'School';
  submission?: {
    media?: string;
    text?: string;
    timestamp: string;
  };
}

export interface Quiz {
  id: string;
  title: string;
  questions: number;
  completed: boolean;
  score?: number;
  time?: string;
  /** Shown on quiz cards (e.g. "~8 min"). */
  estimatedMinutes?: number;
  category?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface AnalyticsData {
  weeklyTrends: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color: string;
    }[];
  };
  behaviourBreakdown: {
    aspect: string;
    score: number;
    change: number;
  }[];
  scoreComparison: {
    current: number;
    previous: number;
    average: number;
  };
  goalProgress: {
    completed: number;
    total: number;
    onTrack: boolean;
  };
}

export interface AIGuidance {
  id: string;
  title: string;
  message: string;
  type: 'tip' | 'warning' | 'suggestion';
  priority: 'low' | 'medium' | 'high';
}

/** Summaries derived from parent daily ratings + generated reports (dashboard AI Insights). */
export interface AIInsightLine {
  id: string;
  text: string;
}

export interface AIInsightsHighlight {
  heading: string;
  subheading: string;
  /** MaterialIcons glyph name */
  iconName: string;
  lines: AIInsightLine[];
}

export interface AIInsightsPayload {
  title: string;
  subtitle: string;
  sourceLabel: string;
  positive: AIInsightsHighlight;
  attention: AIInsightsHighlight;
}
