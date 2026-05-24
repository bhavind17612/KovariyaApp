export type MentorMissionType = 'daily-habit' | 'activity-based';

/** Overall mission state (date window + completion). */
export type MentorMissionLifecycleStatus = 'active' | 'completed' | 'expired';

/** Today’s check-in for daily missions (derived from completion history for local “today”). */
export type MentorDailyStatus = 'done' | 'missed' | 'pending';

export type MentorMissionHistoryEntry = {
  date: string;
  status: 'done' | 'missed';
  note?: string;
};

export type MentorMissionTimelineEntry = {
  label: string;
  dateTime: string;
};

export type MentorMissionBadgeReward = {
  key: 'respect' | 'responsibility';
  name: string;
  description: string;
};

export type MentorMission = {
  id: string;
  title: string;
  description: string;
  missionType: MentorMissionType;
  startDate: string;
  endDate: string;
  progressPercent: number;
  rewardBadge: MentorMissionBadgeReward;
  timeline: MentorMissionTimelineEntry[];
  completionHistory: MentorMissionHistoryEntry[];
};

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when calendar day is within [startDate, endDate] (inclusive). */
export function isMissionDateInRange(m: MentorMission, isoDate: string): boolean {
  return isoDate >= m.startDate && isoDate <= m.endDate;
}

/**
 * Active: within window and not finished.
 * Completed: progress reached 100%.
 * Expired: past end date and not completed.
 */
export function resolveLifecycleStatus(m: MentorMission): MentorMissionLifecycleStatus {
  if (m.progressPercent >= 100) {
    return 'completed';
  }
  const today = getTodayIsoDate();
  if (m.endDate < today) {
    return 'expired';
  }
  return 'active';
}

/**
 * Done / Missed / Pending for today, or null when today is outside the mission window
 * (no daily check-in expected).
 */
export function getDailyStatusForToday(m: MentorMission): MentorDailyStatus | null {
  const today = getTodayIsoDate();
  if (!isMissionDateInRange(m, today)) {
    return null;
  }
  const entry = m.completionHistory.find((h) => h.date === today);
  if (!entry) {
    return 'pending';
  }
  return entry.status === 'done' ? 'done' : 'missed';
}

export function upsertCompletionForDate(
  history: MentorMissionHistoryEntry[],
  date: string,
  status: 'done' | 'missed',
  note?: string
): MentorMissionHistoryEntry[] {
  const rest = history.filter((h) => h.date !== date);
  const next: MentorMissionHistoryEntry = note !== undefined ? { date, status, note } : { date, status };
  return [next, ...rest].sort((a, b) => b.date.localeCompare(a.date));
}

export const MENTOR_ASSIGNED_MISSIONS: MentorMission[] = [
  {
    id: 'm1',
    title: 'Respectful Morning Start',
    description: 'Start the day with one calm greeting and complete routine steps on time.',
    missionType: 'daily-habit',
    startDate: '2026-03-28',
    endDate: '2026-04-10',
    progressPercent: 64,
    rewardBadge: {
      key: 'respect',
      name: 'Respect',
      description: 'Complete this mission to earn the Respect badge.',
    },
    timeline: [
      { label: 'Mentor assigned mission', dateTime: '2026-03-28 08:30' },
      { label: 'Parent reviewed expectations', dateTime: '2026-03-28 19:10' },
      { label: 'Daily check-ins active this week', dateTime: '2026-03-30 07:45' },
      { label: 'Final review due on end date', dateTime: '2026-04-10 18:00' },
    ],
    completionHistory: [
      { date: getTodayIsoDate(), status: 'done' },
      { date: '2026-03-28', status: 'done' },
      { date: '2026-03-29', status: 'missed' },
      { date: '2026-03-30', status: 'done' },
      { date: '2026-03-31', status: 'done' },
    ],
  },
  {
    id: 'm2',
    title: 'Homework Focus Sprint',
    description: 'Complete a 20-minute focused study block and capture one work sample.',
    missionType: 'activity-based',
    startDate: '2026-03-27',
    endDate: '2026-04-07',
    progressPercent: 46,
    rewardBadge: {
      key: 'responsibility',
      name: 'Responsibility',
      description: 'Finish this mission to unlock the Responsibility badge.',
    },
    timeline: [
      { label: 'Mission started', dateTime: '2026-03-27 16:20' },
      { label: 'Tutor notes shared with parent', dateTime: '2026-03-28 20:05' },
      { label: 'Evidence upload required every two days', dateTime: '2026-03-29 18:30' },
    ],
    completionHistory: [
      { date: '2026-03-27', status: 'done', note: 'Worksheet uploaded' },
      { date: '2026-03-28', status: 'missed' },
      { date: '2026-03-29', status: 'done', note: 'Reading summary uploaded' },
      { date: '2026-03-30', status: 'missed' },
    ],
  },
  {
    id: 'm3',
    title: 'Kind Action Journal',
    description: 'Log one kind action daily and discuss reflection notes during dinner.',
    missionType: 'daily-habit',
    startDate: '2026-03-30',
    endDate: '2026-04-15',
    progressPercent: 22,
    rewardBadge: {
      key: 'respect',
      name: 'Respect',
      description: 'Keep showing kindness to earn the Respect badge.',
    },
    timeline: [
      { label: 'Mission assigned', dateTime: '2026-03-30 09:15' },
      { label: 'Parent orientation complete', dateTime: '2026-03-30 20:40' },
      { label: 'Journal phase in progress', dateTime: '2026-03-31 07:30' },
      { label: 'Mentor review in week 2', dateTime: '2026-04-08 18:15' },
    ],
    completionHistory: [
      { date: '2026-03-30', status: 'missed' },
      { date: '2026-03-31', status: 'done', note: 'Helped younger sibling with puzzle' },
    ],
  },
];

export function formatMissionTypeLabel(type: MentorMissionType): string {
  return type === 'daily-habit' ? 'Daily Habit' : 'Activity-Based';
}

export function formatLifecycleStatusLabel(status: MentorMissionLifecycleStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'expired':
      return 'Expired';
    default:
      return 'Active';
  }
}

export function formatDailyStatusLabel(status: MentorDailyStatus | null): string {
  if (status === null) {
    return '—';
  }
  switch (status) {
    case 'done':
      return 'Done';
    case 'missed':
      return 'Missed';
    default:
      return 'Pending';
  }
}
