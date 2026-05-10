import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { AppGradientHeader, Button, Card } from '../components';
import { borderRadius, colors, spacing, textStyles } from '../theme';
import type { Quiz } from '../types';
import Animated, { FadeInDown } from 'react-native-reanimated';

type QuizQuestion =
  | {
    id: string;
    prompt: string;
    type: 'single';
    options: string[];
    correctAnswer: number;
  }
  | {
    id: string;
    prompt: string;
    type: 'text';
    placeholder: string;
    correctAnswer: string[];
  };

type QuizSet = Quiz & {
  dueDateLabel: string;
  isExpired?: boolean;
  summary: string;
  questionsList: QuizQuestion[];
};

type SessionPhase = 'list' | 'quiz' | 'result';

const QUIZ_SETS: QuizSet[] = [
  {
    id: 'math-logic',
    title: 'Math',
    summary: 'Quick number patterns and basic reasoning practice.',
    category: 'Logic',
    questions: 4,
    completed: false,
    estimatedMinutes: 8,
    dueDateLabel: 'Due Apr 12, 2026',
    questionsList: [
      {
        id: 'math-1',
        type: 'single',
        prompt: 'Which 3 numbers have the same answer whether they are added or multiplied together?',
        options: ['6, 3 and 4', '1, 2 and 3', '2, 4 and 6', '1, 2 and 4'],
        correctAnswer: 1,
      },
      {
        id: 'math-2',
        type: 'single',
        prompt: 'What number should come next in the series 3, 6, 12, 24?',
        options: ['30', '36', '48', '52'],
        correctAnswer: 2,
      },
      {
        id: 'math-3',
        type: 'text',
        prompt: 'Type the value of 9 x 7.',
        placeholder: 'Enter your answer',
        correctAnswer: ['63', 'sixty three', 'sixty-three'],
      },
      {
        id: 'math-4',
        type: 'single',
        prompt: 'If a square has 4 equal sides, how many corners does it have?',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
      },
    ],
  },
  {
    id: 'science-basics',
    title: 'Science Basics',
    summary: 'A short check-in on observation, weather, and living things.',
    category: 'STEM',
    questions: 5,
    completed: true,
    score: 80,
    time: '6m 12s',
    estimatedMinutes: 7,
    dueDateLabel: 'Due Apr 10, 2026',
    questionsList: [
      {
        id: 'science-1',
        type: 'single',
        prompt: 'Which planet is known as the Red Planet?',
        options: ['Mars', 'Venus', 'Mercury', 'Jupiter'],
        correctAnswer: 0,
      },
      {
        id: 'science-2',
        type: 'single',
        prompt: 'Plants make food using sunlight in a process called?',
        options: ['Evaporation', 'Photosynthesis', 'Respiration', 'Digestion'],
        correctAnswer: 1,
      },
      {
        id: 'science-3',
        type: 'text',
        prompt: 'Type the gas that humans breathe in to stay alive.',
        placeholder: 'Enter gas name',
        correctAnswer: ['oxygen'],
      },
      {
        id: 'science-4',
        type: 'single',
        prompt: 'What do we use to measure temperature?',
        options: ['Scale', 'Clock', 'Thermometer', 'Compass'],
        correctAnswer: 2,
      },
      {
        id: 'science-5',
        type: 'single',
        prompt: 'Which of these is a living thing?',
        options: ['Rock', 'Tree', 'Pencil', 'Bottle'],
        correctAnswer: 1,
      },
    ],
  },
  {
    id: 'english-words',
    title: 'English',
    summary: 'Vocabulary and sentence sense for everyday communication.',
    category: 'Language',
    questions: 3,
    completed: false,
    isExpired: true,
    estimatedMinutes: 5,
    dueDateLabel: 'Expired Apr 5, 2026',
    questionsList: [
      {
        id: 'english-1',
        type: 'single',
        prompt: 'Which word is the opposite of “bright”?',
        options: ['Shiny', 'Dark', 'Happy', 'Fast'],
        correctAnswer: 1,
      },
      {
        id: 'english-2',
        type: 'text',
        prompt: 'Type a punctuation mark used to end a question.',
        placeholder: 'Enter symbol or its name',
        correctAnswer: ['?', 'question mark'],
      },
      {
        id: 'english-3',
        type: 'single',
        prompt: 'Choose the correct sentence.',
        options: [
          'She are reading a book.',
          'She is reading a book.',
          'She reading a book.',
          'She am reading a book.',
        ],
        correctAnswer: 1,
      },
    ],
  },
];

const PASSING_SCORE = 60;

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function statusMeta(quiz: QuizSet) {
  if (quiz.isExpired) {
    return {
      label: 'Expired',
      icon: 'event-busy',
      backgroundColor: colors.surfaceMuted,
      textColor: colors.textMuted,
    };
  }

  if (quiz.completed) {
    return {
      label: 'Complete',
      icon: 'check-circle',
      backgroundColor: colors.mintSoft,
      textColor: colors.growth,
    };
  }

  return {
    label: 'Pending',
    icon: 'schedule',
    backgroundColor: colors.peachSoft,
    textColor: colors.accent,
  };
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
  const [quizzes, setQuizzes] = useState<QuizSet[]>(QUIZ_SETS);
  const [phase, setPhase] = useState<SessionPhase>('list');
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [resultScore, setResultScore] = useState<number | null>(null);

  const activeQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === activeQuizId) ?? null,
    [activeQuizId, quizzes]
  );

  const currentQuestion = activeQuiz?.questionsList[currentIndex] ?? null;
  const attendedCount = useMemo(
    () => Object.values(answers).filter((value) => value !== '' && value !== null).length,
    [answers]
  );

  const quizStats = useMemo(() => {
    const total = quizzes.length;
    const completed = quizzes.filter((quiz) => quiz.completed).length;
    return {
      total,
      completed,
      pending: total - completed,
    };
  }, [quizzes]);

  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }

    const value = answers[currentQuestion.id];
    if (currentQuestion.type === 'text') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    return typeof value === 'number';
  }, [answers, currentQuestion]);

  const openQuiz = useCallback((quizId: string) => {
    const selectedQuiz = quizzes.find((quiz) => quiz.id === quizId);
    if (selectedQuiz?.isExpired) {
      return;
    }
    setActiveQuizId(quizId);
    setCurrentIndex(0);
    setAnswers({});
    setResultScore(null);
    setPhase('quiz');
  }, [quizzes]);

  const goBackToList = useCallback(() => {
    setPhase('list');
    setCurrentIndex(0);
    setAnswers({});
    setResultScore(null);
    setActiveQuizId(null);
  }, []);

  const updateTextAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const updateOptionAnswer = useCallback((questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const finishQuiz = useCallback(() => {
    if (!activeQuiz) {
      return;
    }

    let correctCount = 0;

    activeQuiz.questionsList.forEach((question) => {
      const submitted = answers[question.id];
      if (question.type === 'single') {
        if (submitted === question.correctAnswer) {
          correctCount += 1;
        }
        return;
      }

      if (typeof submitted === 'string') {
        const normalized = normalizeAnswer(submitted);
        if (question.correctAnswer.some((answer) => normalizeAnswer(answer) === normalized)) {
          correctCount += 1;
        }
      }
    });

    const score = Math.round((correctCount / activeQuiz.questionsList.length) * 100);
    setResultScore(score);
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === activeQuiz.id
          ? {
            ...quiz,
            completed: true,
            score,
            time: `${activeQuiz.estimatedMinutes ?? activeQuiz.questionsList.length}m`,
          }
          : quiz
      )
    );
    setPhase('result');
  }, [activeQuiz, answers]);

  const handleNext = useCallback(() => {
    if (!activeQuiz || !currentQuestion || !isCurrentQuestionAnswered) {
      return;
    }

    if (currentIndex === activeQuiz.questionsList.length - 1) {
      finishQuiz();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  }, [activeQuiz, currentIndex, currentQuestion, finishQuiz, isCurrentQuestionAnswered]);

  const resultDetails = resultCopy(resultScore ?? 0);
  const scoreLabel =
    activeQuiz && resultScore != null
      ? `${Math.round((resultScore / 100) * activeQuiz.questionsList.length)}/${activeQuiz.questionsList.length}`
      : '0/0';

  if (phase === 'quiz' && activeQuiz && currentQuestion) {
    const progressPercent = ((currentIndex + 1) / activeQuiz.questionsList.length) * 100;

    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <AppGradientHeader
          title={activeQuiz.title}
          subtitle={activeQuiz.dueDateLabel}
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
                    {activeQuiz.questionsList.length}
                  </Text>
                </View>
                <View style={styles.progressBadge}>
                  <Icon name="event" size={16} color={colors.primaryDark} />
                  <Text style={styles.progressBadgeText}>{activeQuiz.dueDateLabel}</Text>
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

            {currentQuestion.type === 'single' ? (
              <View style={styles.optionsWrap}>
                {currentQuestion.options.map((option, index) => {
                  const selected = answers[currentQuestion.id] === index;

                  return (
                    <Pressable
                      key={`${currentQuestion.id}-${index}`}
                      onPress={() => updateOptionAnswer(currentQuestion.id, index)}
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
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Card variant="outlined" style={styles.inputCard}>
                <Text style={styles.inputLabel}>Your answer</Text>
                <TextInput
                  value={typeof answers[currentQuestion.id] === 'string' ? `${answers[currentQuestion.id]}` : ''}
                  onChangeText={(value) => updateTextAnswer(currentQuestion.id, value)}
                  placeholder={currentQuestion.placeholder}
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                  multiline
                />
              </Card>
            )}
          </ScrollView>

          <View style={styles.quizFooter}>
            <Button
              title={currentIndex === activeQuiz.questionsList.length - 1 ? 'Submit Quiz' : 'Next'}
              onPress={handleNext}
              variant="primary"
              size="large"
              disabled={!isCurrentQuestionAnswered}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (phase === 'result' && activeQuiz && resultScore != null) {
    const passed = resultScore >= PASSING_SCORE;

    return (
      <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
        <AppGradientHeader
          title={activeQuiz.title}
          subtitle={passed ? 'Quiz completed' : 'Try again when ready'}
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

          <Text style={styles.resultScoreCaption}>Your Score</Text>
          <Text style={styles.resultScoreValue}>
            {scoreLabel} <Text style={styles.resultScorePercent}>({resultScore}%)</Text>
          </Text>
          <Text style={styles.resultTitle}>{resultDetails.title}</Text>
          <Text style={styles.resultBody}>{resultDetails.body}</Text>

          <Card variant="outlined" style={styles.resultMetaCard}>
            <View style={styles.resultMetaRow}>
              <Icon
                name={passed ? 'emoji-events' : 'refresh'}
                size={18}
                color={passed ? colors.accent : colors.error}
              />
              <Text style={styles.resultMetaText}>
                {passed
                  ? 'This quiz is now marked complete in your quizzes list.'
                  : 'You can retake this quiz from the list whenever you want.'}
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

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader title="Quizzes" subtitle="Track progress and start a new quiz set" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listScrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {quizzes.map((quiz, quizIndex) => {
          const status = statusMeta(quiz);
          const isExpired = Boolean(quiz.isExpired);

          return (
            <Animated.View
              key={quiz.id}
              entering={FadeInDown.delay(quizIndex * 75)
                .springify()
                .damping(18)
                .stiffness(220)}
              style={[styles.shadowWrapper, { marginBottom: spacing.md }]}
            >
              <Card
                variant="elevated"
                style={[styles.quizCard, isExpired && styles.quizCardExpired]}
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
                      {quiz.questions} questions
                    </Text>
                  </View>
                  <View style={[styles.metaChip, isExpired && styles.metaChipExpired]}>
                    <Icon
                      name="event"
                      size={16}
                      color={isExpired ? colors.textMuted : colors.primary}
                    />
                    <Text style={[styles.metaChipText, isExpired && styles.metaChipTextExpired]}>
                      {quiz.dueDateLabel}
                    </Text>
                  </View>
                </View>

                {quiz.completed ? (
                  <View style={styles.completedStrip}>
                    <Text style={styles.completedStripText}>
                      Score {quiz.score ?? 0}%{quiz.time ? ` • ${quiz.time}` : ''}
                    </Text>
                  </View>
                ) : null}

                <Button
                  title={isExpired ? 'Expired' : quiz.completed ? 'Start Again' : 'Start Quiz'}
                  onPress={() => openQuiz(quiz.id)}
                  variant={isExpired ? 'ghost' : quiz.completed ? 'outline' : 'primary'}
                  size="large"
                  disabled={isExpired}
                />
              </Card>
            </Animated.View>
          );
        })}
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
