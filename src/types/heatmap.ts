/**
 * Daily Behaviour Score (DBS) heatmap for a student over one month.
 * Served by GET /api/v1/students/{uuid}/dbs-heatmap?year=<YYYY>&month=<1-12>.
 */

/** A single calendar day. `score` is 0–100, or null for no data / future days. */
export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  score: number | null;
}

/** Raw payload as returned under `data`. */
export interface ApiDbsHeatmap {
  year: number;
  month: number; // 1-based
  days: HeatmapDay[];
}
