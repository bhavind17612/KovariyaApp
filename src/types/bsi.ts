/**
 * Behaviour Score Index (BSI) for a student over a weekly/monthly window.
 * Powers the BSI gauge card on the Analytics screen.
 */

export type BsiPeriod = 'weekly' | 'monthly';

export type BsiDirection = 'improved' | 'declined' | 'steady' | string;

/** Raw weak-area block as returned under `data.weak_area`. */
export interface ApiBsiWeakArea {
  aspect: string;
  slug: string;
  score: number;
  icon: string;
  color: string;
  focus: string;
}

/** Raw BSI payload exactly as returned under `data`. */
export interface ApiStudentBsi {
  student_uuid: string;
  period: BsiPeriod;
  bsi: number;
  previous_bsi: number;
  change: number;
  direction: BsiDirection;
  period_start: string;
  period_end: string;
  active_days: number;
  total_days: number;
  pcs: number;
  avg_dbs: number;
  weak_area: ApiBsiWeakArea | null;
  computed_at: string;
}

/** Camel-cased, UI-ready weak area. */
export interface BsiWeakArea {
  aspect: string;
  slug: string;
  score: number;
  icon: string;
  color: string;
  focus: string;
}

/** Camel-cased, UI-ready BSI. */
export interface StudentBsi {
  period: BsiPeriod;
  bsi: number;
  previousBsi: number;
  change: number;
  direction: BsiDirection;
  periodStart: string;
  periodEnd: string;
  activeDays: number;
  totalDays: number;
  pcs: number;
  avgDbs: number;
  weakArea: BsiWeakArea | null;
  computedAt: string;
}
