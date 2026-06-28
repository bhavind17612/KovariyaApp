/**
 * Parent-facing tutorial videos shown on the Tutorials screen.
 * Served by GET /api/v1/tutorials/parent.
 */

/** Raw tutorial entry as returned under `data[]`. */
export interface ApiTutorial {
  id: string;
  title: string;
  description: string;
  /** Pre-formatted "MM:SS" from duration_seconds. */
  duration: string;
  /** Video URL (e.g. YouTube). */
  url: string;
  /** MaterialIcons glyph name; may be null. */
  icon: string | null;
}

/** UI-ready tutorial video. */
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  url: string;
  icon: string;
}
