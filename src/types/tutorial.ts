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
  /**
   * Poster image shown before the video is opened. Already resolved to an
   * absolute URL by the API (uploaded files go through StorageService.getUrl;
   * externally-entered URLs are returned as-is). Null when none is set.
   */
  thumbnail_url: string | null;
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
  /** Absolute poster URL, or null to fall back to the decorative placeholder. */
  thumbnailUrl: string | null;
  icon: string;
}
