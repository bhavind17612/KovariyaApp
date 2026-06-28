/**
 * Analytics "Insights & Rewards" payload: AI guidance tips, strengths/weak
 * areas and earnable badges for a child.
 *
 * Served by GET /api/v1/analytics/{studentUuid}/insights?language=<code>.
 *
 * The API sends only semantic data (aspect ids, badge codes, guidance type).
 * Visual fields — icons, accent colours, soft backgrounds — are resolved on the
 * client (see insightsService) so styling stays in one place.
 */

import type {
  GuidanceItem,
  BadgeItem,
  StrengthWeakness,
} from '../data/analyticsData';

/* ─── Raw (snake_case) ─── */

/** Raw guidance tip as returned under `data.guidance[]`. */
export interface ApiGuidanceItem {
  id: string;
  type: 'tip' | 'warning' | 'suggestion';
  title: string;
  message: string;
}

/** Raw strength / weak-area aspect row. Carries no styling. */
export interface ApiInsightAspect {
  aspect_id: string;
  name: string;
  score: number;
  change: number;
}

/** Raw strengths/weaknesses block under `data.strengths_weaknesses`. */
export interface ApiStrengthsWeaknesses {
  strength_summary: string;
  weak_summary: string;
  strengths: ApiInsightAspect[];
  weak_areas: ApiInsightAspect[];
}

/** Raw badge under `data.badges[]`. `description` may be null. */
export interface ApiInsightBadge {
  id: string;
  code: string;
  label: string;
  description: string | null;
  earned: boolean;
}

/** Raw payload as returned under `data`. */
export interface ApiInsights {
  guidance: ApiGuidanceItem[];
  strengths_weaknesses: ApiStrengthsWeaknesses;
  badges: ApiInsightBadge[];
}

/* ─── UI-ready ─── */

/**
 * Camel-cased, UI-ready insights consumed by InsightsSection. Reuses the
 * existing component contract types so the component stays untouched.
 */
export interface InsightsData {
  guidance: GuidanceItem[];
  strengthsWeaknesses: StrengthWeakness;
  badges: BadgeItem[];
}
