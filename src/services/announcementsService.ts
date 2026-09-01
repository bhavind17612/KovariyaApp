import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import { mapApiAnnouncement, type ApiAnnouncement, type Announcement } from '../types/announcement.api';

const PAGE_SIZE = 10;

class AnnouncementsService {
  /** Published announcements relevant to one child, newest first. */
  async getAnnouncements(
    studentUuid: string,
    page = 1
  ): Promise<{ announcements: Announcement[]; hasMore: boolean }> {
    const res = await api.get<{
      announcements: ApiAnnouncement[];
      has_more?: boolean;
    }>(ENDPOINTS.ANNOUNCEMENTS.PARENT_LIST, {
      params: { student_id: studentUuid, page, limit: PAGE_SIZE },
    });

    const payload = res.data.data;
    const rawList = Array.isArray(payload?.announcements) ? payload.announcements : [];
    return {
      announcements: rawList.map(mapApiAnnouncement),
      // Falls back to "we got a full page" when the API doesn't yet send has_more.
      hasMore: payload?.has_more ?? rawList.length >= PAGE_SIZE,
    };
  }

  /** Count of unread announcements for the sidebar red dot. Never rejects. */
  async getUnreadCount(studentUuid: string): Promise<number> {
    try {
      const res = await api.get<{ unread_count: number }>(ENDPOINTS.ANNOUNCEMENTS.UNREAD_COUNT, {
        params: { student_id: studentUuid },
      });
      const count = res.data.data?.unread_count;
      return typeof count === 'number' && Number.isFinite(count) ? count : 0;
    } catch {
      return 0;
    }
  }

  /** Marks every announcement currently visible to this child as read. */
  async markAllRead(studentUuid: string): Promise<void> {
    await api.post(ENDPOINTS.ANNOUNCEMENTS.MARK_ALL_READ, undefined, {
      params: { student_id: studentUuid },
    });
  }
}

export const announcementsService = new AnnouncementsService();
