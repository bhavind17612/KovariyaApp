/**
 * Badges a child can earn, surfaced on the Badges screen.
 * Served by GET /api/v1/students/{studentUuid}/badges.
 */

/** Raw badge object exactly as returned under `data.badges[]`. */
export interface ApiStudentBadge {
  id: string;
  code: string;
  label: string;
  description: string | null;
  image_url: string | null;
  earned: boolean;
}

/** Camel-cased, UI-ready badge consumed by the Badges screen. */
export interface StudentBadge {
  id: string;
  code: string;
  label: string;
  description: string;
  imageUrl: string | null;
  earned: boolean;
}
