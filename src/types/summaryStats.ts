/**
 * Activity-snapshot counters for the Analytics "Summary Stats" card.
 * Served by GET /api/v1/students/{uuid}/summary-stats?period=weekly|monthly.
 */

import type { BsiPeriod } from './bsi';

/** Raw payload as returned under `data`. */
export interface ApiSummaryStats {
  period: BsiPeriod;
  period_start: string;
  period_end: string;
  totalLogs: number;
  activeDays: number;
  totalEntries: number;
  streak: number;
}

/** UI-ready counters consumed by the SummaryStats card. */
export interface SummaryStatsData {
  totalLogs: number;
  activeDays: number;
  totalEntries: number;
  streak: number;
}
