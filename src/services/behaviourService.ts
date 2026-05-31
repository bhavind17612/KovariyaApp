import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type {
  ApiAspect,
  ApiAspectsResponse,
  AspectApiIdMaps,
  BehaviourEntryRequest,
  BehaviourEntryResponse,
} from '../types/behaviour';

class BehaviourService {
  /**
   * Fetches behaviour aspects from GET /behaviour/aspects.
   *
   * The response shape is `{ aspects: ApiAspect[], language_id: number }`.
   * Each aspect carries its string `id`, display `name`, icon, colour, and
   * live daily scores (`dailyRatingSum`, `dailyRatingsCount`, `progressPercent`).
   *
   * Returns:
   *  - `apiAspects` — parsed aspect list for the dashboard to merge with visual props
   *  - `maps`       — ID lookup tables for POST /behaviour/entries submission
   */
  async getAspects(language?: string): Promise<{
    apiAspects: ApiAspect[];
    maps: AspectApiIdMaps;
  }> {
    const params: Record<string, string> = {};
    if (language && language !== 'en') {
      params.lang = language;
    }

    const response = await api.get<ApiAspectsResponse>(ENDPOINTS.BEHAVIOUR.ASPECTS, {
      params: Object.keys(params).length ? params : undefined,
    });

    const apiAspects: ApiAspect[] = Array.isArray(response.data.data?.aspects)
      ? response.data.data.aspects
      : [];

    const maps: AspectApiIdMaps = {
      aspectIdMap: {},
      ratingIdByAspect: {},
      chipIdMap: {},
    };

    // The current API uses the string id (e.g. "respect") as the aspect identifier.
    // Ratings and chips are not included in this endpoint; those maps stay empty.
    for (const aspect of apiAspects) {
      maps.aspectIdMap[aspect.id] = aspect.id;
    }

    return { apiAspects, maps };
  }

  /** Submits a single behaviour log entry to POST /behaviour/entries. */
  async submitEntry(request: BehaviourEntryRequest): Promise<BehaviourEntryResponse> {
    const response = await api.post<BehaviourEntryResponse>(
      ENDPOINTS.BEHAVIOUR.ENTRIES,
      request,
    );
    return response.data.data;
  }
}

export const behaviourService = new BehaviourService();
