/**
 * Per-aspect behaviour scores for the Analytics "Aspect Scores" grid.
 * Served by GET /api/v1/students/{uuid}/aspect-scores?period=weekly|monthly.
 */

import type { BsiPeriod } from './bsi';

/** Raw aspect entry as returned under `data.aspects[]`. */
export interface ApiAspectScore {
  slug: string;
  name: string;
  icon: string;
  color: string;
  score: number;
  change: number;
  is_strength?: boolean;
}

/** Raw payload as returned under `data`. */
export interface ApiAspectScores {
  period: BsiPeriod;
  period_start: string;
  period_end: string;
  aspects: ApiAspectScore[];
}

/** UI-ready aspect row consumed by the AspectScoreGrid. */
export interface AspectScore {
  id: string;
  name: string;
  iconName: string;
  accent: string;
  softBg: string;
  borderColor: string;
  score: number;
  change: number;
  strength: boolean;
}
