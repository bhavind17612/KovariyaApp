/** One image attachment on an announcement, as returned by the API. */
export interface ApiAnnouncementAttachment {
  url: string;
  thumbnail_url?: string | null;
}

/** Raw row returned by GET /api/v1/announcements/parent. */
export interface ApiAnnouncement {
  uuid: string;
  title: string;
  summary: string;
  audience_label?: string | null;
  published_at: string;
  attachments?: ApiAnnouncementAttachment[] | null;
}

/** UI-ready announcement. */
export type Announcement = {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  audience: string | null;
  attachmentThumbnails: string[];
};

export function mapApiAnnouncement(api: ApiAnnouncement): Announcement {
  const attachments = Array.isArray(api.attachments) ? api.attachments : [];
  return {
    id: api.uuid,
    title: api.title ?? '',
    summary: api.summary ?? '',
    publishedAt: api.published_at ?? '',
    audience: api.audience_label ?? null,
    attachmentThumbnails: attachments
      .map((a) => a.thumbnail_url || a.url)
      .filter((url): url is string => Boolean(url)),
  };
}
