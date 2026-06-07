import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppGradientHeader, AppRefreshControl, Button, Card } from '../components';
import { borderRadius, colors, spacing, textStyles } from '../theme';
import { useChildren } from '../context/ChildrenContext';
import { useToast } from '../context/ToastContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { quizzesService } from '../services/quizzesService';
import {
  mapQuizListItem,
  mapQuizQuestion,
  type ApiQuizResult,
  type QuizListEntry,
  type QuizPlayQuestion,
  type SaveAnswerPayload,
} from '../types/quiz.api';
import { getDisplayMessage } from '../utils/errorParser';
import { formatAppDate } from '../utils/dateFormat';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SessionPhase = 'list' | 'quiz' | 'result';

const PASSING_SCORE = 60;

function statusMeta(entry: QuizListEntry) {
  if (entry.isExpired) {
    return {
      label: 'Expired',
      icon: 'event-busy',
      backgroundColor: colors.surfaceMuted,
      textColor: colors.textMuted,
    };
  }

  if (entry.completed) {
    return {
      label: 'Complete',
      icon: 'check-circle',
      backgroundColor: colors.mintSoft,
      textColor: colors.growth,
    };
  }

  if (entry.attemptStatus === 'in_progress') {
    return {
      label: 'In Progress',
      icon: 'autorenew',
      backgroundColor: colors.skySoft,
      textColor: colors.info,
    };
  }

  return {
    label: 'Pending',
    icon: 'schedule',
    backgroundColor: colors.peachSoft,
    textColor: colors.accent,
  };
}

function quizDueLabel(entry: Pick<QuizListEntry, 'isExpired' | 'dueDate'>): string {
  const label = formatAppDate(entry.dueDate);
  return entry.isExpired ? `Expired ${label}` : `Due ${label}`;
}

function listButton(entry: QuizListEntry): {
  title: string;
  variant: 'primary' | 'outline' | 'ghost';
  disabled: boolean;
} {
  if (entry.isExpired) {
    return { title: 'Expired', variant: 'ghost', disabled: true };
  }
  if (entry.attemptStatus === 'in_progress') {
    return { title: 'Resume', variant: 'primary', disabled: false };
  }
  if (entry.completed) {
    const canRetake = entry.attemptsUsed < entry.maxAttempts;
    return canRetake
      ? { title: 'Start Again', variant: 'outline', disabled: false }
      : { title: 'Completed', variant: 'outline', disabled: true };
  }
  return { title: 'Start Quiz', variant: 'primary', disabled: false };
}

function resultCopy(score: number) {
  if (score >= 85) {
    return {
      title: 'Congratulations!',
      body: 'Great job. You completed this quiz set with a strong score.',
    };
  }

  if (score >= PASSING_SCORE) {
    return {
      title: 'Nice effort!',
      body: 'You passed this quiz. A quick retake can help you push the score even higher.',
    };
  }

  return {
    title: 'Keep practicing',
    body: 'You are close. Review the questions once more and try the quiz again.',
  };
}

const QuizzesScreen: React.FC = () => {
  const { selectedChildId } = useChildren();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<QuizListEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);

  const [phase, setPhase] = useState<SessionPhase>('list');
  const [openingId, setOpeningId] = useState<string | null>(null);

  const [activeEntry, setActiveEntry] = useState<QuizListEntry | null>(null);
  const [questions, setQuestions] = useState<QuizPlayQuestion[]>([]);
  const [attemptUuid, setAttemptUuid] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Keyed by questionId. Option questions store the selected option index (number);
  // short-answer questions store the typed text (string).
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ApiQuizResult | null>(null);

  const loadList = useCallback(async () => {
    if (!selectedChildId) {
      setEntries([]);
      setListError(false);
      setListLoading(false);
      return;
    }
    setListError(false);
    try {
      const items = await quizzesService.list(selectedChildId);
      setEntries(items.map(mapQuizListItem));
    } catch (e) {
      setListError(true);
      showToast({ type: 'error', message: getDisplayMessage(e) });
    } finally {
      setListLoading(false);
    }
  }, [selectedChildId, showToast]);

  useEffect(() => {
    setListLoading(true);
    loadList();
  }, [loadList]);

  const { refreshing, onRefresh } = usePullToRefresh(loadList);

  const activeQuiz = activeEntry;
  const currentQuestion = questions[currentIndex] ?? null;

  const attendedCount = useMemo(() => {
    const ids = new Set<number>(savedIds);
    Object.entries(answers).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        ids.add(Number(key));
      }
    });
    return ids.size;
  }, [savedIds, answers]);

  const quizStats = useMemo(() => {
    const total = entries.length;
    const completed = entries.filter((entry) => entry.completed).length;
    return {
      total,
      completed,
      pending: total - completed,
    };
  }, [entries]);

  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }
    const value = answers[currentQuestion.questionId];
    if (currentQuestion.type === 'short_answer') {
      return typeof value === 'string' && value.trim().length > 0;
    }
    return typeof value === 'number';
  }, [answers, currentQuestion]);

  const goBackToList = useCallback(() => {
    setPhase('list');
    setActiveEntry(null);
    setQuestions([]);
    setAttemptUuid(null);
    setCurrentIndex(0);
    setAnswers({});
    setSavedIds(new Set());
    setResult(null);
    loadList();
  }, [loadList]);

  const openQuiz = useCallback(
    async (entry: QuizListEntry) => {
      if (entry.isExpired) {
        return;
      }
      if (!selectedChildId) {
        showToast({ type: 'error', message: 'Select a child before starting a quiz.' });
        return;
      }
      setOpeningId(entry.quizUuid);
      try {
        const detail = await quizzesService.detail(entry.quizUuid, selectedChildId);
        const start = await quizzesService.start(entry.quizUuid, selectedChildId);

        const sortedQuestions = [...(detail.questions ?? [])]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(mapQuizQuestion);
        const answered = new Set<number>(start.answeredQuestionIds ?? []);
        const firstUnanswered = sortedQuestions.findIndex((q) => !answered.has(q.questionId));

        setActiveEntry(entry);
        setQuestions(sortedQuestions);
        setAttemptUuid(start.attempt.uuid);
        setSavedIds(answered);
        setAnswers({});
        setCurrentIndex(firstUnanswered < 0 ? 0 : firstUnanswered);
        setResult(null);
        setPhase('quiz');
      } catch (e) {
        showToast({ type: 'error', message: getDisplayMessage(e) });
      } finally {
        setOpeningId(null);
      }
    },
    [selectedChildId, showToast]
  );

  const updateTextAnswer = useCallback((questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const updateOptionAnswer = useCallback((questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const handleNext = useCallback(async () => {
    if (!activeEntry || !attemptUuid || !currentQuestion || !isCurrentQuestionAnswered || saving) {
      return;
    }

    const answer = answers[currentQuestion.questionId];
    const payload: SaveAnswerPayload =
      currentQuestion.type === 'short_answer'
        ? { question_id: currentQuestion.questionId, text_answer: String(answer).trim() }
        : {
            question_id: currentQuestion.questionId,
            option_ids: [currentQuestion.options[answer as number].id],
          };

    setSaving(true);
    try {
      await quizzesService.saveAnswer(attemptUuid, payload);
      setSavedIds((prev) => new Set(prev).add(currentQuestion.questionId));

      const isLast = currentIndex === questions.length - 1;
      if (isLast) {
        const res = await quizzesService.submit(attemptUuid);
        setResult(res);
        setEntries((prev) =>
          prev.map((entry) =>
            entry.quizUuid === activeEntry.quizUuid
              ? {
                  ...entry,
                  attemptStatus: 'submitted',
                  completed: true,
                  scorePercent: res.scorePercent,
                  attemptsUsed: entry.attemptsUsed + 1,
                  currentAttemptUuid: null,
                }
              : entry
          )
        );
        setPhase('result');
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (e) {
      // due-date passed / time expired / already submitted — surface and bail to list
      showToast({ type: 'error', message: getDisplayMessage(e) });
      goBackToList();
    } finally {
      setSaving(false);
    }
  }, [
    activeEntry,
    attemptUuid,
    currentQuestion,
    isCurrentQuestionAnswered,
    saving,
    answers,
    currentIndex,
    questions.length,
    goBackToList,
    showToast,
  ]);

  /* ─── Quiz-taking phase ─── */
  if (phase === 'quiz' && activeQuiz && currentQuestion) {
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;
    const isLast = currentIndex === questions.length - 1;

    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <AppGradientHeader
          title={activeQuiz.title}
          subtitle={quizDueLabel(activeQuiz)}
          leadingMode="back"
          onBackPress={goBackToList}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.quizScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card variant="elevated" style={styles.progressCard}>
              <View style={styles.progressTopRow}>
                <View>
                  <Text style={styles.progressEyebrow}>Questions</Text>
                  <Text style={styles.progressNumbers}>
                    <Text style={styles.progressAttended}>{attendedCount}</Text>/
                    {questions.length}
                  </Text>
                </View>
                <View style={styles.progressBadge}>
                  <Icon name="event" size={16} color={colors.primaryDark} />
                  <Text style={styles.progressBadgeText}>{quizDueLabel(activeQuiz)}</Text>
                </View>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </Card>

            <View style={styles.questionWrap}>
              <Text style={styles.questionLabel}>Question {currentIndex + 1}</Text>
              <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
            </View>

            {currentQuestion.type === 'short_answer' ? (
              <Card variant="outlined" style={styles.inputCard}>
                <Text style={styles.inputLabel}>Your answer</Text>
                <TextInput
                  value={
                    typeof answers[currentQuestion.questionId] === 'string'
                      ? `${answers[currentQuestion.questionId]}`
                      : ''
                  }
                  onChangeText={(value) => updateTextAnswer(currentQuestion.questionId, value)}
                  placeholder="Type your answer"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                  multiline
                />
              </Card>
            ) : (
              <View style={styles.optionsWrap}>
                {currentQuestion.options.map((option, index) => {
                  const selected = answers[currentQuestion.questionId] === index;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => updateOptionAnswer(currentQuestion.questionId, index)}
                      style={({ pressed }) => [
                        styles.optionCard,
                        selected && styles.optionCardSelected,
                        pressed && styles.optionCardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <View style={[styles.optionPrefix, selected && styles.optionPrefixSelected]}>
                        <Text
                          style={[styles.optionPrefixText, selected && styles.optionPrefixTextSelected]}
                        >
                          {String.fromCharCode(97 + index)}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {option.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <View style={styles.quizFooter}>
            <Button
              title={isLast ? 'Submit Quiz' : 'Next'}
              onPress={handleNext}
              variant="primary"
              size="large"
              loading={saving}
              disabled={!isCurrentQuestionAnswered || saving}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ─── Result phase ─── */
  if (phase === 'result' && activeQuiz && result) {
    const isGraded = activeQuiz.quizType === 'graded' && result.scorePercent != null;
    const percent = isGraded ? Math.round(result.scorePercent as number) : 0;
    const passed = isGraded ? percent >= PASSING_SCORE : true;
    const details = isGraded
      ? resultCopy(percent)
      : {
          title: 'Submitted!',
          body: 'Thanks for sharing this about your child. Your responses have been recorded.',
        };
    const scoreLabel = `${result.score ?? 0}/${result.totalMarks ?? 0}`;

    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <AppGradientHeader
          title={activeQuiz.title}
          subtitle={isGraded ? (passed ? 'Quiz completed' : 'Try again when ready') : 'Submitted'}
          leadingMode="back"
          onBackPress={goBackToList}
        />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultAnimationWrap}>
            <LottieView
              source={
                passed
                  ? require('../../assets/lottie/quiz-success.json')
                  : require('../../assets/lottie/Success-2.json')
              }
              autoPlay
              loop={false}
              style={styles.resultAnimation}
            />
          </View>

          {isGraded ? (
            <>
              <Text style={styles.resultScoreCaption}>Your Score</Text>
              <Text style={styles.resultScoreValue}>
                {scoreLabel} <Text style={styles.resultScorePercent}>({percent}%)</Text>
              </Text>
            </>
          ) : null}
          <Text style={styles.resultTitle}>{details.title}</Text>
          <Text style={styles.resultBody}>{details.body}</Text>

          <Card variant="outlined" style={styles.resultMetaCard}>
            <View style={styles.resultMetaRow}>
              <Icon
                name={isGraded ? (passed ? 'emoji-events' : 'refresh') : 'check-circle'}
                size={18}
                color={isGraded ? (passed ? colors.accent : colors.error) : colors.growth}
              />
              <Text style={styles.resultMetaText}>
                {isGraded
                  ? passed
                    ? 'This quiz is now marked complete in your quizzes list.'
                    : 'You can retake this quiz from the list whenever you want.'
                  : 'Your responses have been recorded for this quiz.'}
              </Text>
            </View>
          </Card>

          <Button
            title="Back to Quizzes List"
            onPress={goBackToList}
            variant="primary"
            size="large"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ─── List phase ─── */
  const renderListBody = () => {
    if (listLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!selectedChildId) {
      return (
        <View style={styles.centerState}>
          <Icon name="child-care" size={36} color={colors.textMuted} />
          <Text style={styles.centerStateText}>Select a child to see their quizzes.</Text>
        </View>
      );
    }

    if (listError) {
      return (
        <View style={styles.centerState}>
          <Icon name="error-outline" size={36} color={colors.error} />
          <Text style={styles.centerStateText}>Could not load quizzes.</Text>
          <Button title="Retry" onPress={loadList} variant="outline" size="small" />
        </View>
      );
    }

    if (entries.length === 0) {
      return (
        <View style={styles.centerState}>
          <Icon name="quiz" size={36} color={colors.textMuted} />
          <Text style={styles.centerStateText}>No quizzes yet. Pull down to refresh.</Text>
        </View>
      );
    }

    return (
      <>
        <Animated.View
          entering={FadeInDown.delay(0 * 75)
            .springify()
            .damping(18)
            .stiffness(220)}
          style={styles.shadowWrapper}
        >
          <Card variant="elevated" style={styles.summaryCard}>
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryValue}>{quizStats.total}</Text>
              <Text style={styles.summaryLabel}>Quiz Sets</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryColumn}>
              <Text style={[styles.summaryValue, { color: colors.growth }]}>{quizStats.completed}</Text>
              <Text style={styles.summaryLabel}>Complete</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryColumn}>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>{quizStats.pending}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </Card>
        </Animated.View>

        {entries.map((quiz, quizIndex) => {
          const status = statusMeta(quiz);
          const isExpired = quiz.isExpired;
          const btn = listButton(quiz);

          return (
            <Animated.View
              key={quiz.quizUuid}
              entering={FadeInDown.delay(quizIndex * 75)
                .springify()
                .damping(18)
                .stiffness(220)}
              style={[styles.shadowWrapper, { marginBottom: spacing.md }]}
            >
              <Card
                variant="elevated"
                style={StyleSheet.flatten([styles.quizCard, isExpired && styles.quizCardExpired])}
              >
                <View style={styles.quizCardTop}>
                  <View style={styles.quizCardTitleWrap}>
                    <Text style={[styles.quizTitle, isExpired && styles.quizTitleExpired]}>{quiz.title}</Text>
                    <Text style={[styles.quizSummary, isExpired && styles.quizSummaryExpired]}>
                      {quiz.summary}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.backgroundColor }]}>
                    <Icon name={status.icon} size={14} color={status.textColor} />
                    <Text style={[styles.statusText, { color: status.textColor }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.metaWrap}>
                  <View style={[styles.metaChip, isExpired && styles.metaChipExpired]}>
                    <Icon
                      name="help-outline"
                      size={16}
                      color={isExpired ? colors.textMuted : colors.primary}
                    />
                    <Text style={[styles.metaChipText, isExpired && styles.metaChipTextExpired]}>
                      {quiz.questionCount} questions
                    </Text>
                  </View>
                  <View style={[styles.metaChip, isExpired && styles.metaChipExpired]}>
                    <Icon
                      name="event"
                      size={16}
                      color={isExpired ? colors.textMuted : colors.primary}
                    />
                    <Text style={[styles.metaChipText, isExpired && styles.metaChipTextExpired]}>
                      {quizDueLabel(quiz)}
                    </Text>
                  </View>
                </View>

                {quiz.completed ? (
                  <View style={styles.completedStrip}>
                    <Text style={styles.completedStripText}>
                      {quiz.quizType === 'graded' && quiz.scorePercent != null
                        ? `Score ${Math.round(quiz.scorePercent)}%`
                        : 'Completed'}
                    </Text>
                  </View>
                ) : null}

                <Button
                  title={btn.title}
                  onPress={() => openQuiz(quiz)}
                  variant={btn.variant}
                  size="large"
                  loading={openingId === quiz.quizUuid}
                  disabled={btn.disabled || openingId !== null}
                />
              </Card>
            </Animated.View>
          );
        })}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader title="Quizzes" subtitle="Track progress and start a new quiz set" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderListBody()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  centerState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  centerStateText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...textStyles.headingLarge,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  summaryLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 46,
    backgroundColor: colors.border,
  },
  quizCard: {
    marginBottom: spacing.md,
  },
  quizCardExpired: {
    opacity: 0.68,
  },
  quizCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quizCardTitleWrap: {
    flex: 1,
  },
  quizTitle: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
  },
  quizTitleExpired: {
    color: colors.textSecondary,
  },
  quizSummary: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  quizSummaryExpired: {
    color: colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusText: {
    ...textStyles.caption,
    fontWeight: '800',
  },
  metaWrap: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surfaceMuted,
  },
  metaChipExpired: {
    backgroundColor: '#E7E5EC',
  },
  metaChipText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  metaChipTextExpired: {
    color: colors.textMuted,
  },
  completedStrip: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.lavenderSoft,
  },
  completedStripText: {
    ...textStyles.caption,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  quizScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  progressCard: {
    marginBottom: spacing.lg,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressEyebrow: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressNumbers: {
    ...textStyles.headingLarge,
    color: colors.textMuted,
    fontWeight: '700',
  },
  progressAttended: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lavenderSoft,
  },
  progressBadgeText: {
    ...textStyles.caption,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  questionWrap: {
    marginBottom: spacing.md,
  },
  questionLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    ...textStyles.headingLarge,
    color: colors.ink,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
  },
  optionsWrap: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.lavenderSoft,
  },
  optionCardPressed: {
    opacity: 0.92,
  },
  optionPrefix: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.peachSoft,
  },
  optionPrefixSelected: {
    backgroundColor: colors.primary,
  },
  optionPrefixText: {
    ...textStyles.caption,
    color: colors.accent,
    fontWeight: '900',
  },
  optionPrefixTextSelected: {
    color: colors.surface,
  },
  optionText: {
    ...textStyles.bodyLarge,
    color: colors.ink,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  inputCard: {
    padding: spacing.lg,
  },
  inputLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  textInput: {
    ...textStyles.bodyLarge,
    minHeight: 120,
    color: colors.ink,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surfaceMuted,
  },
  quizFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  resultAnimationWrap: {
    width: 250,
    height: 250,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  resultAnimation: {
    width: 230,
    height: 230,
  },
  resultScoreCaption: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultScoreValue: {
    ...textStyles.hero,
    color: colors.primaryDark,
    fontSize: 34,
    marginTop: spacing.xs,
  },
  resultScorePercent: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  resultTitle: {
    ...textStyles.headingLarge,
    color: colors.primaryDark,
    fontWeight: '800',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  resultBody: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  resultMetaCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultMetaText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    flex: 1,
  },
  shadowWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    // padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
});

export default QuizzesScreen;
