/**
 * Quiz API contracts (parent flow) + adapters into the UI-facing models the
 * Quizzes screen renders. The screen stays close to its original shape; these
 * mappers absorb the API differences (server-side scoring, attempt lifecycle).
 */

export type QuizType = 'graded' | 'awareness';
export type QuizAttemptStatus = 'not_started' | 'in_progress' | 'submitted' | 'expired';
export type ApiQuestionType = 'mcq' | 'multi_select' | 'true_false' | 'short_answer';

/** Standard quiz API envelope: { status, message, data }. */
export interface QuizEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

// ── Raw API shapes ──────────────────────────────────────────────────────────

export interface ApiQuizListItem {
  id: string; // quiz uuid
  quizType: QuizType;
  title: string;
  description: string;
  instructions: string;
  startDate: string;
  dueDate: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  questionCount: number;
  attemptStatus: QuizAttemptStatus;
  attemptsUsed: number;
  currentAttemptUuid: string | null;
  score: number | null;
  totalMarks: number | null;
  scorePercent: number | null;
}

export interface ApiQuizOption {
  id: number;
  uuid: string;
  optionText: string;
  sortOrder: number;
}

export interface ApiQuizQuestion {
  id: number;
  uuid: string;
  questionText: string;
  questionType: ApiQuestionType;
  sortOrder: number;
  marks: number;
  imagePath: string | null;
  options: ApiQuizOption[];
}

export interface ApiQuizDetail {
  id: string;
  title: string;
  description: string;
  instructions: string;
  startDate: string;
  dueDate: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  questions: ApiQuizQuestion[];
}

export interface ApiQuizAttempt {
  uuid: string;
  quiz_id: number;
  student_id: number;
  attempt_number: number;
  status: string;
  started_at: string;
  expires_at: string | null;
  total_questions: number;
  answered_count: number;
}

export interface ApiQuizStartData {
  attempt: ApiQuizAttempt;
  answeredQuestionIds: number[];
  expiresAt: string | null;
}

export interface ApiQuizResult {
  attemptUuid: string;
  status: string;
  score: number | null;
  totalMarks: number | null;
  scorePercent: number | null;
  totalQuestions: number;
  answeredCount: number;
  submittedAt: string;
}

export interface SaveAnswerPayload {
  question_id: number;
  option_ids?: number[];
  text_answer?: string;
}

export interface SaveAnswerData {
  answeredCount: number;
  totalQuestions: number;
}

// ── UI-facing models ────────────────────────────────────────────────────────

/** One card in the quizzes list. */
export interface QuizListEntry {
  quizUuid: string;
  quizType: QuizType;
  title: string;
  summary: string;
  questionCount: number;
  startDate: string;
  dueDate: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  attemptsUsed: number;
  attemptStatus: QuizAttemptStatus;
  currentAttemptUuid: string | null;
  scorePercent: number | null;
  isExpired: boolean;
  completed: boolean;
}

/** One question while taking a quiz. */
export interface QuizPlayQuestion {
  questionId: number;
  uuid: string;
  prompt: string;
  type: ApiQuestionType;
  marks: number;
  options: { id: number; text: string }[];
}

// ── Mappers ─────────────────────────────────────────────────────────────────

export function mapQuizListItem(item: ApiQuizListItem): QuizListEntry {
  return {
    quizUuid: item.id,
    quizType: item.quizType,
    title: item.title,
    summary: item.description ?? '',
    questionCount: item.questionCount ?? 0,
    startDate: item.startDate,
    dueDate: item.dueDate,
    timeLimitMinutes: item.timeLimitMinutes ?? null,
    maxAttempts: item.maxAttempts ?? 1,
    attemptsUsed: item.attemptsUsed ?? 0,
    attemptStatus: item.attemptStatus,
    currentAttemptUuid: item.currentAttemptUuid ?? null,
    scorePercent: item.scorePercent ?? null,
    isExpired: item.attemptStatus === 'expired',
    completed: item.attemptStatus === 'submitted',
  };
}

export function mapQuizQuestion(q: ApiQuizQuestion): QuizPlayQuestion {
  return {
    questionId: q.id,
    uuid: q.uuid,
    prompt: q.questionText,
    type: q.questionType,
    marks: q.marks ?? 0,
    options: Array.isArray(q.options)
      ? [...q.options]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((o) => ({ id: o.id, text: o.optionText }))
      : [],
  };
}
