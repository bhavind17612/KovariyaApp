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
  ApiWeeklyAspectProgressResponse,
} from '../types/behaviour';
import type { WeeklyAspectSeriesRow } from '../data/weeklyAspectProgress';

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

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
  async getAspects(language?: string, selectedChild?: string): Promise<{
    apiAspects: ApiAspect[];
    maps: AspectApiIdMaps;
  }> {
    const params: Record<string, string> = {};
    if (language && language !== 'en') {
      params.lang = language;
    }
    console.log('child id, selectedChildId', selectedChild)
    if (selectedChild) {
      params.student_id = selectedChild;
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

  /**
   * Fetches weekly Mon-Sun progress values for the dashboard line chart.
   *
   * Expected payload:
   * {
   *   "student_id": "<uuid>",
   *   "week_start": "2026-06-08",
   *   "week_end": "2026-06-14",
   *   "days": [
   *     { "id": "mon", "label": "Mon" },
   *     { "id": "tue", "label": "Tue" },
   *     { "id": "wed", "label": "Wed" },
   *     { "id": "thu", "label": "Thu" },
   *     { "id": "fri", "label": "Fri" },
   *     { "id": "sat", "label": "Sat" },
   *     { "id": "sun", "label": "Sun" }
   *   ],
   *   "series": [
   *     { "aspectId": "respect", "values": [72, 76, 80, 78, 82, 85, 84] }
   *   ]
   * }
   */
  async getWeeklyAspectProgress(studentUuid: string): Promise<WeeklyAspectSeriesRow[]> {
    const response = await api.get<ApiWeeklyAspectProgressResponse>(
      ENDPOINTS.BEHAVIOUR.WEEKLY_ASPECT_PROGRESS,
      { params: { student_id: studentUuid } },
    );

    const series = response.data.data?.series;
    if (!Array.isArray(series)) {
      return [];
    }

    return series
      .filter((row): row is WeeklyAspectSeriesRow =>
        typeof row === 'object' &&
        row !== null &&
        typeof row.aspectId === 'string' &&
        Array.isArray(row.values) &&
        row.values.length === 7
      )
      .map((row) => ({
        aspectId: row.aspectId,
        values: row.values.map((value) =>
          typeof value === 'number' && Number.isFinite(value) ? clampPercent(value) : 0
        ),
      }));
  }

  /** Fetches reason chips for a single aspect from GET /aspects/:slug/chips. */
  async getAspectChips(slug: string, languageId?: number): Promise<AspectReasonChip[]> {
    const response = await api.get<AspectReasonChipsResponse>(
      ENDPOINTS.BEHAVIOUR.ASPECT_CHIPS(slug),
      { params: { language_id: languageId } },
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
    return chips
      .filter((chip): chip is AspectReasonChip =>
        typeof chip === 'object' &&
        chip !== null &&
        typeof chip.id === 'number' &&
        typeof chip.chip_text === 'string' &&
        (chip.sentiment === 'positive' || chip.sentiment === 'negative')
      )
      .map((chip) => ({
        ...chip,
        // Normalise to a non-empty string or null so the UI can render on truthiness.
        emoji: typeof chip.emoji === 'string' && chip.emoji.trim() ? chip.emoji.trim() : null,
      }))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  /**
   * Submits a single behaviour log entry to POST /behaviour/entries.
   *
   * When `voice_note_url` is a local `file://` URI (recorded on-device), the
   * request is sent as multipart/form-data so the server receives the actual
   * audio binary. For entries without a voice note, regular JSON is used.
   */
  async submitEntry(request: BehaviourEntryRequest): Promise<BehaviourEntryResponse> {
    const voiceUri = request.voice_note_url;
    const isLocalFile = typeof voiceUri === 'string' && voiceUri.startsWith('file://');

    if (isLocalFile) {
      // Build multipart/form-data so the server receives the actual file binary.
      const form = new FormData();
      form.append('student_id', String(request.student_id));
      form.append('aspect_id', String(request.aspect_id));
      form.append('rating_id', String(request.rating_id));
      // reason_chip_ids is an array — append each element individually.
      request.reason_chip_ids.forEach((id) => {
        form.append('reason_chip_ids[]', String(id));
      });
      if (request.text_note) {
        form.append('text_note', request.text_note);
      }
      // Derive the filename and MIME type from the URI.
      const fileName = voiceUri.split('/').pop() ?? 'voice_note.m4a';
      const ext = fileName.split('.').pop()?.toLowerCase() ?? 'm4a';
      const mimeMap: Record<string, string> = {
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        caf: 'audio/x-caf',
        ogg: 'audio/ogg',
        webm: 'audio/webm',
      };
      const mimeType = mimeMap[ext] ?? 'audio/mp4';
      // React Native's FormData accepts { uri, name, type } objects for files.
      form.append('voice_note', { uri: voiceUri, name: fileName, type: mimeType } as unknown as Blob);
      console.log('form ', form)
      const response = await api.post<BehaviourEntryResponse>(
        ENDPOINTS.BEHAVIOUR.ENTRIES,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data.data;
    }

    // No local file — send as regular JSON.
    const response = await api.post<BehaviourEntryResponse>(
      ENDPOINTS.BEHAVIOUR.ENTRIES,
      request,
    );
    return response.data.data;
  }
}

export const behaviourService = new BehaviourService();
