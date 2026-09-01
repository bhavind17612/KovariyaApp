import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import {
  mapApiGoalDetail,
  mapApiProgressEntry,
  mapApiProgressSummary,
  type ApiGoalDetail,
  type ApiGoalProgressEntry,
  type ApiGoalProgressSummary,
  type GoalDetail,
  type GoalProgressEntry,
  type GoalProgressSummary,
} from '../types/goal.api';

/** Newest-first, and only as many rows as the detail screen shows. */
const PROGRESS_PAGE_SIZE = 20;

class GoalsService {
  /** Full detail for one goal, including the joined aspect / student / class. */
  async getGoal(uuid: string): Promise<GoalDetail> {
    const res = await api.get<{ goal: ApiGoalDetail } | ApiGoalDetail>(
      ENDPOINTS.GOALS.DETAIL(uuid)
    );
    // The controller responds with `{ goal }`; accept a bare row too so a shape
    // change on the server degrades instead of crashing the screen.
    const data = res.data.data as { goal?: ApiGoalDetail } & ApiGoalDetail;
    return mapApiGoalDetail((data?.goal ?? data) as ApiGoalDetail);
  }

  /**
   * Behaviour entries that moved this goal's total, plus a summary.
   *
   * Never rejects: the route is admin-namespaced on the server, so if it is
   * closed to parents later the detail screen simply hides its activity section
   * rather than failing the whole page.
   *
   * `page` is sent speculatively (1-based) so "load more" works the moment the
   * API adds offset/page support — today the endpoint ignores unknown params
   * and always returns the newest `limit` rows, so page > 1 currently repeats
   * page 1. `hasMore` falls back to "we got a full page" when the API doesn't
   * yet send `has_more`.
   */
  async getGoalProgress(
    uuid: string,
    page = 1
  ): Promise<{
    summary: GoalProgressSummary | null;
    entries: GoalProgressEntry[];
  }> {
    try {
      const res = await api.get<{
        summary: ApiGoalProgressSummary;
        entries: ApiGoalProgressEntry[];
      }>(ENDPOINTS.GOALS.PROGRESS(uuid), {
        params: { limit: PROGRESS_PAGE_SIZE, page },
      });

      const payload = res.data.data;
      const rawEntries = Array.isArray(payload?.entries) ? payload.entries : [];
      const summary = payload?.summary ? mapApiProgressSummary(payload.summary) : null;
      return {
        summary:
          summary && payload?.summary?.has_more === undefined
            ? { ...summary, hasMore: rawEntries.length >= PROGRESS_PAGE_SIZE }
            : summary,
        entries: rawEntries.map(mapApiProgressEntry),
      };
    } catch {
      return { summary: null, entries: [] };
    }
  }
}

export const goalsService = new GoalsService();
