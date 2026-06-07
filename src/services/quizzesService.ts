import { apiClient } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type {
  ApiQuizDetail,
  ApiQuizListItem,
  ApiQuizResult,
  ApiQuizStartData,
  QuizEnvelope,
  SaveAnswerData,
  SaveAnswerPayload,
} from '../types/quiz.api';

/**
 * Unwraps the quiz envelope. The quiz API signals business errors as
 * `status: false` even on HTTP 200 (e.g. "Time limit exceeded"), so treat
 * those as thrown errors carrying the server message.
 */
function unwrap<T>(body: QuizEnvelope<T>): T {
  if (!body || body.status === false) {
    throw new Error(body?.message || 'Something went wrong. Please try again.');
  }
  return body.data;
}

class QuizzesService {
  async list(studentUuid: string): Promise<ApiQuizListItem[]> {
    const res = await apiClient.get<QuizEnvelope<{ quizzes: ApiQuizListItem[] }>>(
      ENDPOINTS.QUIZZES.LIST,
      { params: { student_id: studentUuid } }
    );
    return unwrap(res.data).quizzes ?? [];
  }

  async detail(quizUuid: string, studentUuid: string): Promise<ApiQuizDetail> {
    const res = await apiClient.get<QuizEnvelope<{ quiz: ApiQuizDetail }>>(
      ENDPOINTS.QUIZZES.DETAIL(quizUuid),
      { params: { student_id: studentUuid } }
    );
    return unwrap(res.data).quiz;
  }

  async start(quizUuid: string, studentUuid: string): Promise<ApiQuizStartData> {
    const res = await apiClient.post<QuizEnvelope<ApiQuizStartData>>(
      ENDPOINTS.QUIZZES.START(quizUuid),
      undefined,
      { params: { student_id: studentUuid } }
    );
    return unwrap(res.data);
  }

  async saveAnswer(attemptUuid: string, payload: SaveAnswerPayload): Promise<SaveAnswerData> {
    const res = await apiClient.post<QuizEnvelope<SaveAnswerData>>(
      ENDPOINTS.QUIZZES.ANSWER(attemptUuid),
      payload
    );
    return unwrap(res.data);
  }

  async submit(attemptUuid: string): Promise<ApiQuizResult> {
    const res = await apiClient.post<QuizEnvelope<{ result: ApiQuizResult }>>(
      ENDPOINTS.QUIZZES.SUBMIT(attemptUuid)
    );
    return unwrap(res.data).result;
  }

  async result(attemptUuid: string): Promise<ApiQuizResult> {
    const res = await apiClient.get<QuizEnvelope<{ result: ApiQuizResult }>>(
      ENDPOINTS.QUIZZES.RESULT(attemptUuid)
    );
    return unwrap(res.data).result;
  }
}

export const quizzesService = new QuizzesService();
