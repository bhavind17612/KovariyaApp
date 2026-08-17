import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type {
  MentorMission,
  MentorMissionHistoryEntry,
  MentorMissionTimelineEntry,
} from '../data/mentorMissions';
import type { LogMissionInput, TodayMissionData } from '../types/mission.api';

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
};

/**
 * Rebuilds the daily log from the timeline.
 *
 * The API doesn't send `completionHistory`; it folds the same rows into
 * `timeline` tagged `source: 'completion'`, carrying the `date`, `status` and
 * `note` that MentorMissionHistoryEntry needs. Defaulting to `[]` instead of
 * converting is what left the Check-ins card and Daily log empty.
 */
function completionHistoryFromTimeline(
  timeline: MentorMissionTimelineEntry[]
): MentorMissionHistoryEntry[] {
  return timeline
    .filter((row) => row.source === 'completion' && typeof row.date === 'string')
    .map((row) => ({
      date: row.date as string,
      // Anything the backend doesn't explicitly mark done counts as missed.
      status: row.status === 'done' ? ('done' as const) : ('missed' as const),
      note: row.note ?? undefined,
    }));
}

/**
 * Ensures fields the UI relies on are never undefined.
 * The API may omit `completionHistory` (it sends `timeline` instead),
 * which would crash callers like getDailyStatusForToday().
 */
function normalizeMission(m: MentorMission): MentorMission {
  const timeline = Array.isArray(m.timeline) ? m.timeline : [];
  const history = Array.isArray(m.completionHistory) ? m.completionHistory : [];
  return {
    ...m,
    // The API does not send progressPercent yet. Keeping it numeric stops the
    // detail screen rendering "undefined%" and stops `undefined >= 100` from
    // silently reporting every mission as incomplete.
    progressPercent: typeof m.progressPercent === 'number' ? m.progressPercent : 0,
    rewardBadge: m.rewardBadge ?? null,
    timeline,
    completionHistory: history.length > 0 ? history : completionHistoryFromTimeline(timeline),
    allowUploadProof: m.allowUploadProof ?? false,
  };
}

class MissionsService {
  async getMissions(): Promise<MentorMission[]> {
    const response = await api.get<MentorMission[]>(ENDPOINTS.MISSIONS.LIST);
    const list = Array.isArray(response.data.data) ? response.data.data : [];
    return list.map(normalizeMission);
  }

  /** Today's active mission (+ today's log status) for a child. */
  async getTodayMission(studentUuid: string): Promise<TodayMissionData> {
    const response = await api.get<TodayMissionData>(ENDPOINTS.MISSIONS.TODAY, {
      params: { student_id: studentUuid },
    });
    const data = response.data.data;
    return { mission: data?.mission ?? null, today: data?.today ?? null };
  }

  /**
   * Logs a mission as done/missed for a child for a given day.
   * Sends multipart/form-data; attaches the photo binary when `proofUri` is set.
   */
  async logMission(missionUuid: string, input: LogMissionInput): Promise<void> {
    const form = new FormData();
    form.append('student_uuid', input.studentUuid);
    form.append('date', input.date);
    form.append('status', input.status);
    if (input.note) {
      form.append('note', input.note);
    }
    if (input.proofUri) {
      const ext = (input.proofUri.split('.').pop() ?? 'jpg').toLowerCase();
      const type = IMAGE_MIME_BY_EXT[ext] ?? 'image/jpeg';
      // React Native's FormData accepts { uri, name, type } objects for files.
      form.append('proof_file', {
        uri: input.proofUri,
        name: `proof.${ext}`,
        type,
      } as unknown as Blob);
    }
    await api.post(ENDPOINTS.MISSIONS.LOG(missionUuid), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}

export const missionsService = new MissionsService();