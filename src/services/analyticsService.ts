import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { ApiStudentBsi, BsiPeriod, StudentBsi } from '../types/bsi';
import type { ApiScoreCards, ScoreCards } from '../types/scoreCards';
import type { ApiAspectScores, AspectScore } from '../types/aspectScore';
import type { ApiDbsHeatmap, HeatmapDay } from '../types/heatmap';
import type { ApiProgressTrends, TrendPoint } from '../types/progressTrends';
import type { ApiSummaryStats, SummaryStatsData } from '../types/summaryStats';

/** Derives the soft track / border tints from a single brand `color` hex. */
function mapAspectScore(raw: ApiAspectScores['aspects'][number]): AspectScore {
  const color = raw.color || '#7C6AE8';
  return {
    id: raw.slug,
    name: raw.name,
    iconName: raw.icon,
    accent: color,
    softBg: `${color}18`, // ~9% — gauge track
    borderColor: `${color}40`, // ~25%
    score: raw.score,
    change: raw.change,
    strength: raw.is_strength ?? raw.score >= 70,
  };
}

/** BSI score card data. `percent` 0–100; `trend` is the signed week-over-week delta. */
export interface BsiSnapshot {
  percent: number;
  trend: number;
}

function mapStudentBsi(raw: ApiStudentBsi): StudentBsi {
  return {
    period: raw.period,
    bsi: raw.bsi,
    previousBsi: raw.previous_bsi,
    change: raw.change,
    direction: raw.direction,
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    activeDays: raw.active_days,
    totalDays: raw.total_days,
    pcs: raw.pcs,
    avgDbs: raw.avg_dbs,
    weakArea: raw.weak_area
      ? {
          aspect: raw.weak_area.aspect,
          slug: raw.weak_area.slug,
          score: raw.weak_area.score,
          icon: raw.weak_area.icon,
          color: raw.weak_area.color,
          focus: raw.weak_area.focus,
        }
      : null,
    computedAt: raw.computed_at,
  };
}

class AnalyticsService {
  /** Today's BSI score + trend for a child. Returns null when none is available. */
  async getBsi(studentUuid: string): Promise<BsiSnapshot | null> {
    const res = await api.get<{ dbs: BsiSnapshot | null }>(ENDPOINTS.ANALYTICS.BSI, {
      params: { student_id: studentUuid },
    });
    return res.data.data?.dbs ?? null;
  }

  /** Behaviour Score Index for a student over a weekly/monthly window. */
  async getStudentBsi(studentUuid: string, period: BsiPeriod): Promise<StudentBsi | null> {
    const res = await api.get<ApiStudentBsi | null>(ENDPOINTS.STUDENTS.BSI(studentUuid), {
      params: { period },
    });
    const data = res.data.data;
    return data ? mapStudentBsi(data) : null;
  }

  /** Family Score, Trust Meter & Parent Consistency cards for a child. */
  async getScoreCards(studentUuid: string): Promise<ScoreCards | null> {
    const res = await api.get<ApiScoreCards | null>(ENDPOINTS.ANALYTICS.SCORE_CARDS, {
      params: { student_id: studentUuid },
    });
    return res.data.data ?? null;
  }

  /** Per-aspect behaviour scores + trend for a student, weekly or monthly. */
  async getAspectScores(studentUuid: string, period: BsiPeriod): Promise<AspectScore[]> {
    const res = await api.get<ApiAspectScores | null>(
      ENDPOINTS.STUDENTS.ASPECT_SCORES(studentUuid),
      { params: { period } },
    );
    const aspects = res.data.data?.aspects;
    return Array.isArray(aspects) ? aspects.map(mapAspectScore) : [];
  }

  /**
   * Daily Behaviour Score heatmap for a student over one month.
   * `month` is 1-based (1–12). Returns one entry per calendar day in date order.
   */
  async getDbsHeatmap(studentUuid: string, year: number, month: number): Promise<HeatmapDay[]> {
    const res = await api.get<ApiDbsHeatmap | null>(
      ENDPOINTS.STUDENTS.DBS_HEATMAP(studentUuid),
      { params: { year, month } },
    );
    const days = res.data.data?.days;
    return Array.isArray(days) ? days : [];
  }

  /** BSI vs Parent Consistency trend series for a student, weekly or monthly. */
  async getProgressTrends(studentUuid: string, period: BsiPeriod): Promise<TrendPoint[]> {
    const res = await api.get<ApiProgressTrends | null>(
      ENDPOINTS.STUDENTS.PROGRESS_TRENDS(studentUuid),
      { params: { period } },
    );
    const points = res.data.data?.points;
    return Array.isArray(points)
      ? points.map((p) => ({
          label: p.label,
          bsi: p.bsi,
          parentConsistency: p.parent_consistency,
        }))
      : [];
  }

  /** Activity-snapshot counters for a student, weekly or monthly. */
  async getSummaryStats(studentUuid: string, period: BsiPeriod): Promise<SummaryStatsData | null> {
    const res = await api.get<ApiSummaryStats | null>(
      ENDPOINTS.STUDENTS.SUMMARY_STATS(studentUuid),
      { params: { period } },
    );
    const data = res.data.data;
    if (!data) return null;
    return {
      totalLogs: data.totalLogs,
      activeDays: data.activeDays,
      totalEntries: data.totalEntries,
      streak: data.streak,
    };
  }
}

export const analyticsService = new AnalyticsService();
