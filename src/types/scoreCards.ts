/**
 * Parent-facing support score cards on the Analytics screen:
 * Family Score (FS), Trust Meter, and Parent Consistency Score (PCS).
 *
 * Served by GET /api/v1/analytics/parent/score-cards?student_id=<uuid>.
 */

export interface FamilyScoreCard {
  score: number;
  subtitle: string;
  trend: number;
}

export interface TrustMeterCard {
  level: number;
  subtitle: string;
  trend: number;
}

export interface ParentConsistencyCard {
  score: number;
  subtitle: string;
  trend: number;
}

/** Raw payload exactly as returned under `data` (already camel-friendly). */
export interface ApiScoreCards {
  fs: FamilyScoreCard;
  trust: TrustMeterCard;
  pc: ParentConsistencyCard;
}

/** UI-ready score cards (same shape as the API). */
export type ScoreCards = ApiScoreCards;
