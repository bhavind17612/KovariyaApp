import { colors } from '../theme';
import { DASHBOARD_RATING_ASPECTS } from './aspectRating';
import {
  REASON_CHIPS_NEGATIVE,
  REASON_CHIPS_POSITIVE,
  type ReasonChipDef,
} from './aspectRating';
import type { Goal } from '../types';

/* ─── Helper ─── */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ─── BSI (Behaviour Score Index) — renamed from SDS ─── */
export type SdsAnalytics = {
  percent: number;
  trend: number;
  weekHistory: number[]; // 4 weeks rolling (oldest → newest)
  label: string; // Needs Effort / Average / Consistent / Excellent
};

function bsiLabel(pct: number): string {
  if (pct >= 85) return 'Excellent';
  if (pct >= 70) return 'Consistent';
  if (pct >= 50) return 'Average';
  return 'Needs Effort';
}

const SDS_BY_CHILD: Record<string, SdsAnalytics> = {
  '1': { percent: 78, trend: 5, weekHistory: [68, 71, 73, 78], label: bsiLabel(78) },
  '2': { percent: 61, trend: -4, weekHistory: [72, 68, 65, 61], label: bsiLabel(61) },
  '3': { percent: 89, trend: 8, weekHistory: [74, 79, 81, 89], label: bsiLabel(89) },
};

export function getSdsAnalytics(childId: string): SdsAnalytics {
  return SDS_BY_CHILD[childId] ?? SDS_BY_CHILD['1'];
}

/* ─── Family Score (FS) ─── */
export type FamilyScoreData = {
  score: number;
  trend: number;
  subtitle: string;
};

const FS_BY_CHILD: Record<string, FamilyScoreData> = {
  '1': { score: 84, trend: 4, subtitle: 'Family Score' },
  '2': { score: 72, trend: -2, subtitle: 'Family Score' },
  '3': { score: 91, trend: 6, subtitle: 'Family Score' },
};

export function getFamilyScore(childId: string): FamilyScoreData {
  return FS_BY_CHILD[childId] ?? FS_BY_CHILD['1'];
}

/* ─── Trust Meter ─── */
export type TrustMeterData = {
  level: number; // 0-100
  label: string;
  trend: number;
  subtitle: string;
};

const TRUST_BY_CHILD: Record<string, TrustMeterData> = {
  '1': { level: 72, label: 'Reliable', trend: 0, subtitle: 'Behaviour Reliability' },
  '2': { level: 54, label: 'Building', trend: -3, subtitle: 'Behaviour Reliability' },
  '3': { level: 88, label: 'Trusted', trend: 7, subtitle: 'Behaviour Reliability' },
};

export function getTrustMeter(childId: string): TrustMeterData {
  return TRUST_BY_CHILD[childId] ?? TRUST_BY_CHILD['1'];
}

/* ─── Parent Consistency Score ─── */
export type ParentConsistencyData = {
  score: number;
  trend: number;
  subtitle: string;
};

const PC_BY_CHILD: Record<string, ParentConsistencyData> = {
  '1': { score: 85, trend: 3, subtitle: 'Parent consistency score' },
  '2': { score: 68, trend: -5, subtitle: 'Parent consistency score' },
  '3': { score: 92, trend: 4, subtitle: 'Parent consistency score' },
};

export function getParentConsistency(childId: string): ParentConsistencyData {
  return PC_BY_CHILD[childId] ?? PC_BY_CHILD['1'];
}

/* ─── Aspect Scores ─── */
export type AspectScoreRow = {
  id: string;
  name: string;
  iconName: string;
  accent: string;
  softBg: string;
  borderColor: string;
  score: number; // 0-100
  change: number; // week-over-week
  strength: boolean; // true => strength, false => weak area
};

export function getAspectScores(childId: string): AspectScoreRow[] {
  return DASHBOARD_RATING_ASPECTS.map((a) => {
    const h = hash(`${childId}:${a.id}`);
    const base = a.progressPercent;
    const jitter = (h % 15) - 7;
    const score = clamp(base + jitter, 20, 98);
    const change = ((h % 21) - 10);
    return {
      id: a.id,
      name: a.name,
      iconName: a.iconName,
      accent: a.accent,
      softBg: a.softBg,
      borderColor: a.borderColor,
      score: Math.round(score),
      change,
      strength: score >= 70,
    };
  });
}

/* ─── Weekly graph data ─── */
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type WeeklyGraphRow = {
  day: string;
  positive: number; // 0-10
  needsWork: number; // 0-10
};

export function getWeeklyGraph(childId: string): WeeklyGraphRow[] {
  return WEEK_DAYS.map((day, i) => {
    const h = hash(`${childId}:week:${i}`);
    const pos = clamp(5 + ((h % 11) - 5) * 0.5, 3, 9.5);
    const neg = clamp(10 - pos + ((h % 7) - 3) * 0.3, 0.5, 4);
    return {
      day,
      positive: Math.round(pos * 10) / 10,
      needsWork: Math.round(neg * 10) / 10,
    };
  });
}

/* ─── Monthly graph data ─── */
export const MONTH_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'] as const;

export type MonthlyGraphRow = {
  week: string;
  sds: number;
  fs: number;
  trust: number;
};

export function getMonthlyGraph(childId: string): MonthlyGraphRow[] {
  const sds = getSdsAnalytics(childId);
  const fs = getFamilyScore(childId);
  const trust = getTrustMeter(childId);
  return MONTH_WEEKS.map((week, i) => {
    const h = hash(`${childId}:month:${i}`);
    const jitter = (h % 9) - 4;
    return {
      week,
      sds: clamp(sds.weekHistory[i] ?? sds.percent + jitter, 20, 100),
      fs: clamp(fs.score + jitter - (3 - i) * 2, 20, 100),
      trust: clamp(trust.level + jitter - (3 - i) * 3, 20, 100),
    };
  });
}

/* ─── Dual Trend Data (BSI + Parent Consistency lines) ─── */
export type DualTrendRow = {
  label: string;
  bsi: number;
  parentConsistency: number;
};

export function getDualTrendData(childId: string): DualTrendRow[] {
  const bsi = getSdsAnalytics(childId);
  const pc = getParentConsistency(childId);
  return WEEK_DAYS.map((day, i) => {
    const h = hash(`${childId}:dual:${i}`);
    const jitter = (h % 9) - 4;
    return {
      label: day,
      bsi: clamp(bsi.percent + jitter - (6 - i) * 1.5, 30, 100),
      parentConsistency: clamp(pc.score + jitter - (6 - i) * 1.2, 30, 100),
    };
  });
}

/* ─── Daily Behaviour Score (DBS) heatmap data ─── */
export type DailyBehaviourScore = {
  date: string; // YYYY-MM-DD
  score: number | null; // null = no data
};

export function getDailyBehaviourScores(childId: string, year: number, month: number): DailyBehaviourScore[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const result: DailyBehaviourScore[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // Future dates have no data
    if (dateObj > today) {
      result.push({ date: dateStr, score: null });
      continue;
    }

    const h = hash(`${childId}:dbs:${dateStr}`);
    // ~15% chance of no data
    if (h % 7 === 0) {
      result.push({ date: dateStr, score: null });
    } else {
      const score = clamp(40 + (h % 61), 20, 100);
      result.push({ date: dateStr, score });
    }
  }
  return result;
}

/* ─── Summary Counters ─── */
export type SummaryCounters = {
  totalLogs: number;
  activeDays: number;
  totalEntries: number;
  streak: number;
};

export type SummaryPeriod = 'weekly' | 'monthly';

const COUNTERS_BY_CHILD: Record<string, Record<SummaryPeriod, SummaryCounters>> = {
  '1': {
    weekly: { totalLogs: 22, activeDays: 6, totalEntries: 9, streak: 8 },
    monthly: { totalLogs: 88, activeDays: 14, totalEntries: 30, streak: 8 },
  },
  '2': {
    weekly: { totalLogs: 11, activeDays: 4, totalEntries: 5, streak: 3 },
    monthly: { totalLogs: 42, activeDays: 8, totalEntries: 18, streak: 3 },
  },
  '3': {
    weekly: { totalLogs: 31, activeDays: 7, totalEntries: 12, streak: 14 },
    monthly: { totalLogs: 124, activeDays: 21, totalEntries: 45, streak: 14 },
  },
};

export function getSummaryCounters(
  childId: string,
  period: SummaryPeriod = 'weekly'
): SummaryCounters {
  const childCounters = COUNTERS_BY_CHILD[childId] ?? COUNTERS_BY_CHILD['1'];
  return childCounters[period];
}

export type MonthlyReportChip = {
  label: string;
  count: number;
  kind: 'positive' | 'negative';
};

export type MonthlyReportAspect = {
  id: string;
  name: string;
  score: number;
  trend: number;
  iconName: string;
  accent: string;
};

export type MonthlyPdfReport = {
  monthLabel: string;
  childLabel: string;
  metrics: {
    bsi: number;
    familyScore: number;
    trust: number;
    parentConsistency: number;
  };
  aspects: MonthlyReportAspect[];
  positiveChips: MonthlyReportChip[];
  negativeChips: MonthlyReportChip[];
  dbsSummary: {
    activeDays: number;
    averageScore: number;
    bestDay: string;
    needsAttentionDay: string;
  };
  totals: {
    loggedData: number;
    parentEntries: number;
  };
  goalProgress: {
    title: string;
    reward: string;
    target: number;
    current: number;
    eligibilityText: string;
    explanation: string;
  };
  guidance: string[];
  nextMonthFocus: string[];
};

export type GoalDailyLog = {
  date: string;
  positiveChip?: string;
  negativeChip?: string;
  pointsDelta: number;
  note: string;
};

export type GoalWiseReport = {
  goalName: string;
  target: number;
  reward: string;
  duration: string;
  dailyLogs: GoalDailyLog[];
  positiveChips: MonthlyReportChip[];
  negativeChips: MonthlyReportChip[];
  achievedScore: number;
  rewardAchieved: boolean;
  finalResult: string;
  reasonExplanation: string;
  improvementNote: string;
};

const GOALS_BY_CHILD: Record<string, Goal[]> = {
  '1': [
    {
      id: 'g1',
      title: 'Morning routine streak',
      description: 'Complete the morning checklist before school each day.',
      currentRawPoints: 172,
      targetRawPoints: 200,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      rewardName: 'Movie night',
      rewardValue: '$25 voucher',
      status: 'active',
      aspectIds: [],
    },
  ],
  '2': [
    {
      id: 'g2',
      title: 'Homework before play',
      description: 'Finish homework before recreational screen time.',
      currentRawPoints: 68,
      targetRawPoints: 100,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      rewardName: 'New art supplies',
      status: 'active',
      aspectIds: [],
    },
  ],
  '3': [
    {
      id: 'g3',
      title: 'Kind words challenge',
      description: 'Log kind actions toward family members.',
      currentRawPoints: 158,
      targetRawPoints: 150,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      rewardName: 'Choose weekend activity',
      status: 'completed',
      aspectIds: [],
    },
  ],
};

function formatReward(goal: Goal): string {
  if (goal.rewardValue?.trim()) {
    return `${goal.rewardName} (${goal.rewardValue.trim()})`;
  }
  return goal.rewardName;
}

function buildChipCounts(
  childId: string,
  chips: ReasonChipDef[],
  kind: 'positive' | 'negative'
): MonthlyReportChip[] {
  return chips
    .map((chip, index) => ({
      label: chip.label,
      count: 1 + (hash(`${childId}:${kind}:${index}`) % 6),
      kind,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function getGoalsForChild(childId: string): Goal[] {
  return GOALS_BY_CHILD[childId] ?? GOALS_BY_CHILD['1'];
}

export function getMonthlyPdfReport(childId: string, year: number, month: number): MonthlyPdfReport {
  const monthLabel = new Date(year, month, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const bsi = getSdsAnalytics(childId);
  const family = getFamilyScore(childId);
  const trust = getTrustMeter(childId);
  const parentConsistency = getParentConsistency(childId);
  const aspects = getAspectScores(childId).map((aspect) => ({
    id: aspect.id,
    name: aspect.name,
    score: aspect.score,
    trend: aspect.change,
    iconName: aspect.iconName,
    accent: aspect.accent,
  }));
  const positiveChips = buildChipCounts(childId, REASON_CHIPS_POSITIVE, 'positive');
  const negativeChips = buildChipCounts(childId, REASON_CHIPS_NEGATIVE, 'negative');
  const dbs = getDailyBehaviourScores(childId, year, month).filter((item) => item.score !== null);
  const activeDays = dbs.length;
  const averageScore = activeDays
    ? Math.round(dbs.reduce((sum, item) => sum + (item.score ?? 0), 0) / activeDays)
    : 0;
  const bestEntry = [...dbs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const lowEntry = [...dbs].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const counters = getSummaryCounters(childId, 'monthly');
  const goal = getGoalsForChild(childId)[0];
  const eligible = goal.currentRawPoints >= goal.targetRawPoints && negativeChips[0].count < 5;
  const strengthsWeaknesses = getStrengthsWeaknesses(childId);
  const guidance = getGuidance(childId).map((item) => `${item.title}: ${item.message}`).slice(0, 3);

  return {
    monthLabel,
    childLabel: `Child ID ${childId}`,
    metrics: {
      bsi: bsi.percent,
      familyScore: family.score,
      trust: trust.level,
      parentConsistency: parentConsistency.score,
    },
    aspects,
    positiveChips,
    negativeChips,
    dbsSummary: {
      activeDays,
      averageScore,
      bestDay: bestEntry?.date ?? 'No data',
      needsAttentionDay: lowEntry?.date ?? 'No data',
    },
    totals: {
      loggedData: counters.totalLogs,
      parentEntries: counters.totalEntries,
    },
    goalProgress: {
      title: goal.title,
      reward: formatReward(goal),
      target: goal.targetRawPoints,
      current: goal.currentRawPoints,
      eligibilityText: eligible ? 'Reward likely achieved' : 'Reward not yet achieved',
      explanation: eligible
        ? 'Target raw points were met and negative behaviour frequency stayed within the acceptable range.'
        : 'Reward eligibility dropped because raw points stayed below target or repeated negative chips reduced consistency this month.',
    },
    guidance,
    nextMonthFocus: [
      `Keep building ${strengthsWeaknesses.strengths[0]?.name ?? 'consistent routines'} through daily praise.`,
      `Reduce ${strengthsWeaknesses.weakAreas[0]?.name ?? 'low-score behaviours'} with one clear home routine.`,
      'Review reward criteria weekly so the child knows what keeps eligibility on track.',
    ],
  };
}

export function getGoalWiseReport(childId: string): GoalWiseReport {
  const goal = getGoalsForChild(childId)[0];
  const negativePool = buildChipCounts(childId, REASON_CHIPS_NEGATIVE, 'negative');
  const positivePool = buildChipCounts(childId, REASON_CHIPS_POSITIVE, 'positive');
  const dailyLogs: GoalDailyLog[] = Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const negative = index === 2 || index === 5 ? negativePool[index % negativePool.length]?.label : undefined;
    const positive = negative ? undefined : positivePool[index % positivePool.length]?.label;
    return {
      date: `2026-04-${String(day + 7).padStart(2, '0')}`,
      positiveChip: positive,
      negativeChip: negative,
      pointsDelta: negative ? -4 + (index % 2) : 8 + (index % 3),
      note: negative
        ? 'Negative behaviour affected reward eligibility on this day.'
        : 'Positive behaviour supported progress toward the reward.',
    };
  });
  const achievedScore = goal.currentRawPoints;
  const rewardAchieved = achievedScore >= goal.targetRawPoints;
  const negativeDates = dailyLogs
    .filter((log) => log.negativeChip)
    .map((log) => `${log.negativeChip} on ${log.date}`);

  return {
    goalName: goal.title,
    target: goal.targetRawPoints,
    reward: formatReward(goal),
    duration: `${goal.startDate} to ${goal.endDate}`,
    dailyLogs,
    positiveChips: positivePool.slice(0, 4),
    negativeChips: negativePool.slice(0, 4),
    achievedScore,
    rewardAchieved,
    finalResult: rewardAchieved ? 'Reward achieved' : 'Reward not achieved',
    reasonExplanation: rewardAchieved
      ? 'The child stayed on target across the goal period and positive chips outweighed negative incidents.'
      : `Reward not achieved because these negative behaviours were logged during the goal period: ${negativeDates.join(', ')}.`,
    improvementNote: rewardAchieved
      ? 'For the next goal, raise the target slightly and keep reinforcing the strongest positive habits.'
      : 'Next attempt: set one daily check-in, reward early positive momentum, and intervene quickly on repeated negative chips.',
  };
}

/* ─── AI Guidance ─── */
export type GuidanceItem = {
  id: string;
  type: 'tip' | 'warning' | 'suggestion';
  title: string;
  message: string;
};

const GUIDANCE_BY_CHILD: Record<string, GuidanceItem[]> = {
  '1': [
    {
      id: 'g1',
      type: 'tip',
      title: 'Strong in Kindness',
      message: 'Keep praising empathetic behaviour — consistency builds lasting values.',
    },
    {
      id: 'g2',
      type: 'warning',
      title: 'Discipline dip',
      message: 'Two low days this week. Try a 10-minute focused homework block before play.',
    },
    {
      id: 'g3',
      type: 'suggestion',
      title: 'Try gratitude journaling',
      message: 'A bedtime gratitude moment can boost Respect and Kindness scores.',
    },
  ],
  '2': [
    {
      id: 'g1',
      type: 'suggestion',
      title: 'Responsibility building',
      message: 'Pair chores with a clear checklist and celebrate completion.',
    },
    {
      id: 'g2',
      type: 'warning',
      title: 'Screen time pattern',
      message: 'Screen time before homework correlates with lower Discipline ratings.',
    },
  ],
  '3': [
    {
      id: 'g1',
      type: 'tip',
      title: 'Excellent trajectory',
      message: 'SDS is up 8% this week — celebrate this momentum together.',
    },
    {
      id: 'g2',
      type: 'suggestion',
      title: 'Community engagement',
      message: 'Civic Sense had one dip — a family community project could help.',
    },
  ],
};

export function getGuidance(childId: string): GuidanceItem[] {
  return GUIDANCE_BY_CHILD[childId] ?? GUIDANCE_BY_CHILD['1'];
}

/* ─── Badges ─── */
export type BadgeItem = {
  id: string;
  iconName: string;
  label: string;
  description: string;
  earned: boolean;
  color: string;
};

const BADGES_BY_CHILD: Record<string, BadgeItem[]> = {
  '1': [
    { id: 'b1', iconName: 'emoji-events', label: '7-Day Streak', description: 'Logged behaviour 7 days in a row', earned: true, color: colors.peach },
    { id: 'b2', iconName: 'star', label: 'Kindness Star', description: 'Kindness score above 80% for a week', earned: true, color: colors.lavender },
    { id: 'b3', iconName: 'military-tech', label: 'Top Performer', description: 'SDS above 90% for a week', earned: false, color: colors.mint },
    { id: 'b4', iconName: 'workspace-premium', label: 'Trust Builder', description: 'Trust meter reached Reliable level', earned: true, color: colors.sky },
  ],
  '2': [
    { id: 'b1', iconName: 'emoji-events', label: '3-Day Streak', description: 'Logged behaviour 3 days in a row', earned: true, color: colors.peach },
    { id: 'b2', iconName: 'star', label: 'Kindness Star', description: 'Kindness score above 80% for a week', earned: false, color: colors.lavender },
    { id: 'b3', iconName: 'trending-up', label: 'Improver', description: 'Any aspect improved 15%+ in a week', earned: true, color: colors.mint },
  ],
  '3': [
    { id: 'b1', iconName: 'emoji-events', label: '14-Day Streak', description: 'Logged behaviour 14 days in a row', earned: true, color: colors.peach },
    { id: 'b2', iconName: 'star', label: 'Kindness Star', description: 'Kindness score above 80% for a week', earned: true, color: colors.lavender },
    { id: 'b3', iconName: 'military-tech', label: 'Top Performer', description: 'SDS above 90% for a week', earned: true, color: colors.mint },
    { id: 'b4', iconName: 'workspace-premium', label: 'Trust Builder', description: 'Trust meter reached Trusted level', earned: true, color: colors.sky },
    { id: 'b5', iconName: 'verified', label: 'All-Rounder', description: 'All aspects above 70%', earned: true, color: '#F0C6E8' },
  ],
};

export function getBadges(childId: string): BadgeItem[] {
  return BADGES_BY_CHILD[childId] ?? BADGES_BY_CHILD['1'];
}

/* ─── Strengths / Weak areas helper ─── */
export type StrengthWeakness = {
  strengths: AspectScoreRow[];
  weakAreas: AspectScoreRow[];
  strengthSummary: string;
  weakSummary: string;
};

export function getStrengthsWeaknesses(childId: string): StrengthWeakness {
  const scores = getAspectScores(childId);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter(s => s.strength);
  const weakAreas = sorted.filter(s => !s.strength);

  const topNames = strengths.slice(0, 2).map(s => s.name).join(' and ');
  const weakNames = weakAreas.slice(0, 2).map(s => s.name).join(' and ');

  return {
    strengths,
    weakAreas,
    strengthSummary: strengths.length > 0
      ? `Showing consistent growth in ${topNames}. These scores have been solid all week.`
      : 'All areas need attention — small daily improvements can make a big difference.',
    weakSummary: weakAreas.length > 0
      ? `${weakNames} ${weakAreas.length === 1 ? 'needs' : 'need'} more focus. Small resets and structured time will help.`
      : 'No weak areas — every aspect is in the green zone!',
  };
}
