import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { ApiReward, Reward } from '../types/reward';

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

function mapReward(raw: ApiReward): Reward {
  return {
    uuid: raw.uuid,
    name: raw.name,
    imageUrl: rewriteImageHost(raw.image_url ?? null),
    sortOrder: raw.sort_order ?? 0,
    // Server has no earned flag yet — default to not-earned.
    earned: raw.earned ?? false,
    earnedDate: raw.earned_date ?? null,
  };
}

class RewardsService {
  /** Active rewards/badges a child can earn, ordered by sort_order. */
  async getActiveRewards(): Promise<Reward[]> {
    const res = await api.get<{ rewards: ApiReward[] }>(ENDPOINTS.REWARDS.ACTIVE);
    const list = Array.isArray(res.data.data?.rewards) ? res.data.data.rewards : [];
    return list
      .map(mapReward)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export const rewardsService = new RewardsService();
