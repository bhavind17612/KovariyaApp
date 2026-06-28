/**
 * Rewards (badges) a child can earn. Surfaced on the Badges screen.
 *
 * NOTE: the API does not yet return an "earned" flag — every reward is treated
 * as not-yet-earned for now. The `earned`/`earnedDate` fields exist so the UI is
 * ready to light up earned badges once the server provides that signal.
 */

/** Raw reward object exactly as returned under `data.rewards[]`. */
export interface ApiReward {
  uuid: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  /** Reserved for future use — server does not send this yet. */
  earned?: boolean;
  earned_date?: string | null;
}

/** Camel-cased, UI-ready reward. */
export interface Reward {
  uuid: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
  earned: boolean;
  earnedDate: string | null;
}
