import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { MentorMission } from '../data/mentorMissions';

/**
 * Ensures array fields the UI relies on are never undefined.
 * The API may omit `completionHistory` (it sends `timeline` instead),
 * which would crash callers like getDailyStatusForToday().
 */
function normalizeMission(m: MentorMission): MentorMission {
  return {
    ...m,
    timeline: Array.isArray(m.timeline) ? m.timeline : [],
    completionHistory: Array.isArray(m.completionHistory) ? m.completionHistory : [],
  };
}

class MissionsService {
  async getMissions(): Promise<MentorMission[]> {
    const response = await api.get<MentorMission[]>(ENDPOINTS.MISSIONS.LIST);
    const list = Array.isArray(response.data.data) ? response.data.data : [];
    return list.map(normalizeMission);
  }
}

export const missionsService = new MissionsService();