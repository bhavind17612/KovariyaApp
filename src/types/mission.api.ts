/**
 * Parent "today's mission" API contracts.
 * GET /api/v1/missions/parent/today  → { mission, today }
 * POST /api/v1/missions/parent/:uuid/log (multipart) → logs done/missed (+ optional proof photo)
 */

export type MissionDailyStatus = 'done' | 'missed';

export interface ApiMissionRewardBadge {
  key: string;
  name: string;
  image?: string | null;
}

export interface ApiTodayMission {
  id: string; // mission uuid — used as MISSION_UUID for the log endpoint
  title: string;
  /** Description shown on the card's detail line (backend to provide). */
  description?: string | null;
  missionType: string;
  difficultyLevel: string;
  rewardPoints: number;
  rewardBadge: ApiMissionRewardBadge | null;
  startDate: string;
  endDate: string;
  activeStatus: boolean;
}

export interface ApiMissionLog {
  id: string;
  status: MissionDailyStatus;
  note: string | null;
  proofUrl: string | null;
  createdAt: string;
}

export interface ApiTodayInfo {
  date: string; // today's date in Asia/Kolkata (YYYY-MM-DD) — use for the log POST
  status: MissionDailyStatus | null; // null = not logged yet (pending)
  completed: boolean;
  log: ApiMissionLog | null;
}

export interface TodayMissionData {
  mission: ApiTodayMission | null;
  today: ApiTodayInfo | null;
}

export interface LogMissionInput {
  studentUuid: string;
  /** YYYY-MM-DD (Asia/Kolkata). Prefer the `today.date` from the GET response. */
  date: string;
  status: MissionDailyStatus;
  note?: string;
  /** Local file URI of a captured/picked photo. Omit for no proof. */
  proofUri?: string;
}
