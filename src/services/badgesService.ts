import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { ApiStudentBadge, StudentBadge } from '../types/badge';

/** LAN host to reach the dev server from a physical device / emulator. */
const DEV_IMAGE_HOST = '192.168.1.6';

/**
 * Temporary workaround: the API returns image URLs pointing at `localhost`,
 * which a phone/emulator resolves to itself. Rewrite the host so the device can
 * reach the dev server. Remove once the backend returns a reachable host.
 */
function rewriteImageHost(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/(https?:\/\/)(localhost|127\.0\.0\.1)/i, `$1${DEV_IMAGE_HOST}`);
}

function mapBadge(raw: ApiStudentBadge): StudentBadge {
  return {
    id: raw.id,
    code: raw.code,
    label: raw.label,
    description: raw.description ?? '',
    imageUrl: rewriteImageHost(raw.image_url ?? null),
    earned: raw.earned,
  };
}

class BadgesService {
  /** Earnable badges + earned status for a single child. */
  async getStudentBadges(studentUuid: string): Promise<StudentBadge[]> {
    const res = await api.get<{ badges: ApiStudentBadge[] }>(
      ENDPOINTS.STUDENTS.BADGES(studentUuid),
    );
    const list = res.data.data?.badges;
    return Array.isArray(list) ? list.map(mapBadge) : [];
  }
}

export const badgesService = new BadgesService();
