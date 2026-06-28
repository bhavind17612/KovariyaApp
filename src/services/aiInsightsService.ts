import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { ApiAiSummary, AiWeeklySummary } from '../types/aiSummary';

/** Maps the raw snake_case summary into the camelCase shape the UI consumes. */
function mapSummary(raw: ApiAiSummary): AiWeeklySummary {
  return {
    uuid: raw.uuid,
    type: raw.type,
    language: raw.language,
    title: raw.title,
    summaryText: raw.summary_text,
    actionText: raw.action_text,
    severity: raw.severity,
    readStatus: raw.read_status,
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    createdAt: raw.created_at,
  };
}

class AiInsightsService {
  /**
   * Latest published parent-weekly summary for a child in the parent's
   * preferred language. Returns null when no summary is available yet.
   */
  async getParentWeeklySummary(
    studentUuid: string,
    language: string,
  ): Promise<AiWeeklySummary | null> {
    const res = await api.get<{ summary: ApiAiSummary | null }>(
      ENDPOINTS.AI.PARENT_WEEKLY(studentUuid),
      { params: { language } },
    );
    const summary = res.data.data?.summary;
    return summary ? mapSummary(summary) : null;
  }

  /** Marks a summary as read by the parent. Fire-and-forget on the caller side. */
  async markRead(summaryUuid: string): Promise<void> {
    await api.post<void>(ENDPOINTS.AI.MARK_READ(summaryUuid));
  }
}

export const aiInsightsService = new AiInsightsService();
