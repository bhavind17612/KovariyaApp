import type { Goal, GoalStatus } from './index';

/** Raw goal object as returned by GET /api/v1/goals/parent/{parent_uuid}. */
export interface ApiGoal {
  id: number;
  uuid: string;
  parent_id: number;
  student_id: number;
  class_id_snapshot: number | null;
  aspect_id: number;
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
  aspect_id: number;
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

const ALLOWED_STATUSES: readonly GoalStatus[] = ['active', 'completed', 'paused'];

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
    createdAt: api.created_at ?? undefined,
  };
}

export function mapApiGoalsToGoals(list: ApiGoal[]): Goal[] {
  return list.map(mapApiGoalToGoal);
}
