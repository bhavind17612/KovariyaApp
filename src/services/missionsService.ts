import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { MentorMission } from '../data/mentorMissions';

class MissionsService {
  async getMissions(): Promise<MentorMission[]> {
    const response = await api.get<MentorMission[]>(ENDPOINTS.MISSIONS.LIST);
    return Array.isArray(response.data.data) ? response.data.data : [];
  }
}

export const missionsService = new MissionsService();