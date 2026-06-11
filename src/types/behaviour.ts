/** API request / response types for the Behaviour Aspects and Entries endpoints. */

/**
 * One behaviour aspect as returned by GET /behaviour/aspects.
 * `id` is a string code (e.g. "respect") used for both identification and i18n lookup.
 */
export interface ApiAspect {
  id: string;
  name: string;
  iconName: string;
  /** Accent / icon tint colour (hex). Used for `iconTint` in the tile. */
  color: string;
  progressPercent: number;
  dailyRatingSum: number;
  dailyRatingsCount: number;
}

/** Full body returned by GET /behaviour/aspects (before the ApiResponse envelope). */
export interface ApiAspectsResponse {
  aspects: ApiAspect[];
  /** ID of the language the names are localised in. */
  language_id: number;
}

/** Day label metadata returned with the weekly aspect progress chart payload. */
export interface ApiWeeklyAspectProgressDay {
  id: string;
  label: string;
}

/** One chart line returned by GET /behaviour/aspects/weekly-progress. */
export interface ApiWeeklyAspectProgressSeriesRow {
  aspectId: string;
  /** Seven values (0-100), one per day in `days` order. */
  values: number[];
}

/** Full body returned by GET /behaviour/aspects/weekly-progress. */
export interface ApiWeeklyAspectProgressResponse {
  student_id: string;
  week_start: string;
  week_end: string;
  days: ApiWeeklyAspectProgressDay[];
  series: ApiWeeklyAspectProgressSeriesRow[];
}

/** One reason chip as returned by GET /aspects/:slug/chips. */
export interface AspectReasonChip {
  id: number;
  chip_text: string;
  sentiment: 'positive' | 'negative';
  sort_order?: number;
  [key: string]: unknown;
}

export type AspectReasonChipsResponse =
  | AspectReasonChip[]
  | {
      aspect_id?: number;
      chips?: AspectReasonChip[];
      reason_chips?: AspectReasonChip[];
      positive?: AspectReasonChip[];
      negative?: AspectReasonChip[];
    };

/** POST /behaviour/entries request body */
export interface BehaviourEntryRequest {
  student_id: string;
  /** String code (e.g. "respect") or numeric ID depending on backend contract. */
  aspect_id: string | number;
  rating_id: string | number;
  reason_chip_ids: Array<string | number>;
  text_note?: string;
  voice_note_url?: string;
}

/** POST /behaviour/entries response payload */
export interface BehaviourEntryResponse {
  id: number;
  message?: string;
}

/**
 * Lookup maps built from a successful GET /behaviour/aspects response.
 * Used to translate local string IDs into the IDs the POST endpoint expects.
 */
export interface AspectApiIdMaps {
  /** Aspect string code → API aspect id (string or numeric depending on backend) */
  aspectIdMap: Record<string, string>;
  /** Aspect string code → (scale value → API rating id) — populated when the API provides ratings */
  ratingIdByAspect: Record<string, Record<number, string | number>>;
  /** Reason chip string code → API chip id — populated when the API provides chips */
  chipIdMap: Record<string, string | number>;
}
