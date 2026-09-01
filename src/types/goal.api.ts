import type { Goal, GoalStatus } from './index';

/** Raw goal object as returned by GET /api/v1/goals/parent/{parent_uuid}. */
export interface ApiGoal {
  id: number;
  uuid: string;
  parent_id: number;
  student_id: number;
  class_id_snapshot: number | null;
  /**
   * @deprecated Old single-aspect goals report this. New goals return `aspect_ids`
   * instead — kept optional here so the mapper handles both response generations.
   */
  aspect_id?: number;
  /** Every behaviour_aspects.id this goal targets. */
  aspect_ids?: number[];
  goal_name: string;
  goal_description: string;
  reward_name: string;
  reward_type: string | null;
  reward_description: string | null;
  reward_value: string | null;
  start_date: string; // full ISO, e.g. "2026-05-22T18:30:00.000Z"
  end_date: string;
  target_raw_points: number;
  status: string; // narrowed on map
  current_raw_points: string; // numeric string, e.g. "0"
  progress_pct: string; // numeric string, e.g. "0"
  created_at?: string;
  updated_at?: string;
}

/**
 * Request body for POST /api/v1/goals.
 * Mirrors the server-side validation schema exactly.
 */
export interface CreateGoalPayload {
  student_uuid: string;
  /** Every behaviour_aspects.id this goal should track. At least one required. */
  aspect_ids: number[];
  goal_name: string;
  goal_description?: string | null;
  reward_name: string;
  reward_type?: string | null;
  reward_description?: string | null;
  reward_value?: number | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  target_raw_points: number;
}

const ALLOWED_STATUSES: readonly GoalStatus[] = [
  'draft',
  'upcoming',
  'active',
  'completed',
  'expired',
  'cancelled',
];

function toGoalStatus(raw: string): GoalStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(raw)
    ? (raw as GoalStatus)
    : 'active'; // safe fallback so the card always renders
}

/** Parse a possibly string/null numeric field into a finite number. */
function toNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Adapts one API goal into the existing UI `Goal` model. No UI changes needed. */
export function mapApiGoalToGoal(api: ApiGoal): Goal {
  return {
    id: api.uuid ?? String(api.id ?? ''),
    title: api.goal_name ?? '',
    description: api.goal_description ?? '',
    currentRawPoints: toNumber(api.current_raw_points),
    targetRawPoints: toNumber(api.target_raw_points),
    startDate: api.start_date ?? '', // formatAppDate handles full ISO
    endDate: api.end_date ?? '',
    rewardName: api.reward_name ?? '',
    rewardValue: api.reward_value ?? undefined, // null → undefined (optional field)
    status: toGoalStatus(api.status),
    aspectId: typeof api.aspect_id === 'number' ? api.aspect_id : undefined,
    aspectIds: toAspectIds(api),
    createdAt: api.created_at ?? undefined,
  };
}

/** Prefers the new `aspect_ids` array; falls back to wrapping the old singular `aspect_id`. */
function toAspectIds(api: Pick<ApiGoal, 'aspect_id' | 'aspect_ids'>): number[] {
  if (Array.isArray(api.aspect_ids) && api.aspect_ids.length > 0) {
    return api.aspect_ids;
  }
  return typeof api.aspect_id === 'number' ? [api.aspect_id] : [];
}

export function mapApiGoalsToGoals(list: ApiGoal[]): Goal[] {
  return list.map(mapApiGoalToGoal);
}

/* ─── Goal detail (GET /api/v1/goals/:uuid) ─────────────────────────────── */

/**
 * Detail row for a single goal. Superset of ApiGoal — the detail endpoint joins
 * the aspect, student, school and class, so the aspect name/icon/colour arrive
 * directly instead of needing the client-side lookup the list screen does.
 */
export interface ApiGoalDetail extends ApiGoal {
  /**
   * @deprecated Old single-aspect goals report these. New goals return the
   * `aspects` array instead.
   */
  aspect_name?: string | null;
  aspect_icon_name?: string | null;
  aspect_color_hex?: string | null;
  /** Every aspect this goal targets, joined server-side. */
  aspects?: Array<{
    id: number;
    name: string;
    icon_name: string | null;
    color_hex: string | null;
  }> | null;
  student_uuid: string;
  student_name: string;
  class_name: string | null;
  school_name: string | null;
  /**
   * Reward eligibility verdict + explanation, and a coaching note for next
   * time. NOT currently returned by GET /api/v1/goals/:uuid — see the
   * "Goal-wise report" prompt for the exact contract requested from the API.
   * Optional so the two sections simply don't render until the API ships them.
   */
  reward_achieved?: boolean | null;
  eligibility_explanation?: string | null;
  improvement_note?: string | null;
}

/** One reason chip attached to a behaviour entry. */
export interface ApiEntryReasonChip {
  text: string;
  sentiment: 'positive' | 'negative';
}

/**
 * One behaviour entry that contributed points toward a goal.
 *
 * NOTE: `aspect_*`, `rating_value`, `reason_chips` and `voice_note_url` are NOT
 * currently returned by GET /api/v1/goals/admin/:uuid/progress — every entry a
 * parent logs via POST /behaviour/entries carries these (see BehaviourEntryRequest
 * in types/behaviour.ts), but the goal-progress join only selects points/label/note.
 * They're declared optional here so the UI renders richer cards the moment the
 * API starts sending them, without another client change.
 */
export interface ApiGoalProgressEntry {
  behaviour_entry_uuid: string;
  points_snapshot: number;
  running_total: number;
  rating_label: string;
  text_note: string | null;
  recorded_at: string;
  /** Signed rating scale value (e.g. -4..+4). Missing from the API today. */
  rating_value?: number | null;
  /** The aspect this specific entry was logged against. Missing from the API today. */
  aspect_id?: number | null;
  aspect_name?: string | null;
  aspect_icon_name?: string | null;
  aspect_color_hex?: string | null;
  /** Reason chips selected on the entry. Missing from the API today. */
  reason_chips?: ApiEntryReasonChip[] | null;
  /** Voice note recording, if any. Missing from the API today. */
  voice_note_url?: string | null;
}

export interface ApiGoalProgressSummary {
  target_raw_points: number;
  current_raw_points: number;
  progress_pct: number;
  entries_count: number;
  days_remaining: number;
  projected_completion: string | null;
  /**
   * Pagination hints. Missing from the API today — the endpoint currently just
   * accepts `limit` with no offset/page and no total, so the client can only
   * ever see the newest N entries. See goalsService.getGoalProgress for the
   * `page` param this client now sends speculatively.
   */
  has_more?: boolean;
  total_count?: number;
}

/** One aspect chip's display fields. */
export type GoalDetailAspect = {
  name: string;
  iconName: string | null;
  color: string | null;
};

/** UI-ready goal detail: the base Goal plus the joined display fields. */
export type GoalDetail = Goal & {
  /** Every aspect this goal targets, in display order. */
  aspects: GoalDetailAspect[];
  /** @deprecated Use `aspects[0]` — kept so any remaining single-aspect callers still compile. */
  aspectName: string | null;
  /** @deprecated Use `aspects[0]`. */
  aspectIconName: string | null;
  /** @deprecated Use `aspects[0]`. */
  aspectColor: string | null;
  studentName: string | null;
  className: string | null;
  schoolName: string | null;
  rewardAchieved: boolean | null;
  eligibilityExplanation: string | null;
  improvementNote: string | null;
};

/** UI-ready reason chip. */
export type EntryReasonChip = ApiEntryReasonChip;

/** UI-ready progress entry. */
export type GoalProgressEntry = {
  id: string;
  points: number;
  ratingValue: number | null;
  runningTotal: number;
  ratingLabel: string;
  note: string | null;
  recordedAt: string;
  aspectId: number | null;
  aspectName: string | null;
  aspectIconName: string | null;
  aspectColor: string | null;
  reasonChips: EntryReasonChip[];
  voiceNoteUrl: string | null;
};

export type GoalProgressSummary = {
  targetRawPoints: number;
  currentRawPoints: number;
  progressPercent: number;
  entriesCount: number;
  daysRemaining: number;
  projectedCompletion: string | null;
  hasMore: boolean;
  totalCount: number | null;
};

/** Prefers the new `aspects` join; falls back to wrapping the old singular fields. */
function toGoalDetailAspects(api: ApiGoalDetail): GoalDetailAspect[] {
  if (Array.isArray(api.aspects) && api.aspects.length > 0) {
    return api.aspects.map((a) => ({
      name: a.name,
      iconName: a.icon_name ?? null,
      color: a.color_hex ?? null,
    }));
  }
  return api.aspect_name
    ? [
        {
          name: api.aspect_name,
          iconName: api.aspect_icon_name ?? null,
          color: api.aspect_color_hex ?? null,
        },
      ]
    : [];
}

export function mapApiGoalDetail(api: ApiGoalDetail): GoalDetail {
  const aspects = toGoalDetailAspects(api);
  return {
    ...mapApiGoalToGoal(api),
    aspects,
    aspectName: aspects[0]?.name ?? null,
    aspectIconName: aspects[0]?.iconName ?? null,
    aspectColor: aspects[0]?.color ?? null,
    studentName: api.student_name ?? null,
    className: api.class_name ?? null,
    schoolName: api.school_name ?? null,
    rewardAchieved: typeof api.reward_achieved === 'boolean' ? api.reward_achieved : null,
    eligibilityExplanation: api.eligibility_explanation ?? null,
    improvementNote: api.improvement_note ?? null,
  };
}

export function mapApiProgressEntry(api: ApiGoalProgressEntry): GoalProgressEntry {
  return {
    id: api.behaviour_entry_uuid,
    points: toNumber(api.points_snapshot),
    ratingValue: typeof api.rating_value === 'number' ? api.rating_value : null,
    runningTotal: toNumber(api.running_total),
    ratingLabel: api.rating_label ?? '',
    note: api.text_note ?? null,
    recordedAt: api.recorded_at ?? '',
    aspectId: typeof api.aspect_id === 'number' ? api.aspect_id : null,
    aspectName: api.aspect_name ?? null,
    aspectIconName: api.aspect_icon_name ?? null,
    aspectColor: api.aspect_color_hex ?? null,
    reasonChips: Array.isArray(api.reason_chips) ? api.reason_chips : [],
    voiceNoteUrl: api.voice_note_url ?? null,
  };
}

export function mapApiProgressSummary(api: ApiGoalProgressSummary): GoalProgressSummary {
  return {
    targetRawPoints: toNumber(api.target_raw_points),
    currentRawPoints: toNumber(api.current_raw_points),
    progressPercent: toNumber(api.progress_pct),
    entriesCount: toNumber(api.entries_count),
    daysRemaining: toNumber(api.days_remaining),
    projectedCompletion: api.projected_completion ?? null,
    hasMore: api.has_more ?? false,
    totalCount: typeof api.total_count === 'number' ? api.total_count : null,
  };
}
