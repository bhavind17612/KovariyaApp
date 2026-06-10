import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';

/** BSI score card data. `percent` 0–100; `trend` is the signed week-over-week delta. */
export interface BsiSnapshot {
  percent: number;
  trend: number;
}

class AnalyticsService {
  /** Today's BSI score + trend for a child. Returns null when none is available. */
  async getBsi(studentUuid: string): Promise<BsiSnapshot | null> {
    const res = await api.get<{ bsi: BsiSnapshot | null }>(ENDPOINTS.ANALYTICS.BSI, {
      params: { student_id: studentUuid },
    });
    return res.data.data?.bsi ?? null;
  }
}

export const analyticsService = new AnalyticsService();
