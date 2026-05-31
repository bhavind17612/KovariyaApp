/** A scale label entry as returned by the API — may be a plain string or a structured object. */
export interface ScaleLabelEntry {
  id: number;
  score: number;
  title: string;
  sort_order: number;
}

/** A reason chip label entry as returned by the API — may be a plain string or a structured object. */
export interface ReasonChipLabelEntry {
  id: number;
  chip_text: string;
  sentiment: 'positive' | 'negative';
  sort_order?: number;
  [key: string]: unknown;
}

export interface RatingSheetTranslationsApiData {
  language_id: number;
  strings: {
    howWasBehaviour: string;
    sheetHint: string;
    sectionRating: string;
    ratingHint: string;
    sectionReasons: string;
    reasonHintPositive: string;
    reasonHintNeeds: string;
    sectionNote: string;
    notePlaceholder: string;
    voiceNoteAttached: string;
    voiceNoteRecord: string;
    saveEntry: string;
    save: string;
    saveAndNext: string;
    toastMaxReasons: string;
    /** Template string with `{current}` and `{total}` placeholders, e.g. "Step {current} of {total}" */
    stepLabel: string;
  }
  /** Scale value (as string key, e.g. "4", "-2") → translated label or label object */
  scale_labels: Record<string, string | ScaleLabelEntry>;
  /** Reason chip id (e.g. "p0", "n3") → translated label or label object */
  reason_chip_labels: Record<string, string | ReasonChipLabelEntry>;
}

export type RatingSheetTranslationsCache = Record<number, RatingSheetTranslationsApiData>;
