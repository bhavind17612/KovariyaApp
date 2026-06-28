/**
 * BSI vs Parent Consistency trend series for the Analytics "Progress Trends" chart.
 * Served by GET /api/v1/students/{uuid}/progress-trends?period=weekly|monthly.
 */

import type { BsiPeriod } from './bsi';

/** Raw point as returned under `data.points[]`. Values are null for no data. */
export interface ApiTrendPoint {
  label: string;
  bsi: number | null;
  parent_consistency: number | null;
}

/** Raw payload as returned under `data`. */
export interface ApiProgressTrends {
  period: BsiPeriod;
  period_start: string;
  period_end: string;
  points: ApiTrendPoint[];
}

/** UI-ready trend point. */
export interface TrendPoint {
  label: string;
  bsi: number | null;
  parentConsistency: number | null;
}
