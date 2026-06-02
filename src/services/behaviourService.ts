import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type {
  ApiAspect,
  ApiAspectsResponse,
  AspectReasonChip,
  AspectReasonChipsResponse,
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

  /** Fetches reason chips for a single aspect from GET /aspects/:slug/chips. */
  async getAspectChips(slug: string): Promise<AspectReasonChip[]> {
    const response = await api.get<AspectReasonChipsResponse>(
      ENDPOINTS.BEHAVIOUR.ASPECT_CHIPS(slug),
    );
    const payload = response.data.data;
    const chips = Array.isArray(payload)
      ? payload
      : [
          ...(Array.isArray(payload?.chips) ? payload.chips : []),
          ...(Array.isArray(payload?.reason_chips) ? payload.reason_chips : []),
          ...(Array.isArray(payload?.positive)
            ? payload.positive.map((chip) => ({ ...chip, sentiment: 'positive' as const }))
            : []),
          ...(Array.isArray(payload?.negative)
            ? payload.negative.map((chip) => ({ ...chip, sentiment: 'negative' as const }))
            : []),
        ];
        console.log('chips =', chips);
    return chips
      .filter((chip): chip is AspectReasonChip =>
        typeof chip === 'object' &&
        chip !== null &&
        typeof chip.id === 'number' &&
        typeof chip.chip_text === 'string' &&
        (chip.sentiment === 'positive' || chip.sentiment === 'negative')
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
