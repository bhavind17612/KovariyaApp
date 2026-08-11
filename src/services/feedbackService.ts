import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';

class FeedbackService {
  /**
   * Submits free-text parent feedback.
   *
   * POST /api/v1/feedback/parent with `{ feedback }`. The Authorization header
   * is added by the request interceptor, so no token is passed here.
   */
  async sendParentFeedback(feedback: string): Promise<void> {
    await api.post<null>(ENDPOINTS.FEEDBACK.PARENT, { feedback: feedback.trim() });
  }
}

export const feedbackService = new FeedbackService();
