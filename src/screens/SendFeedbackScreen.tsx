import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppGradientHeader, Card } from '../components';
import {
  colors,
  spacing,
  textStyles,
  getFloatingTabBarBottomPadding,
  borderRadius,
  typography,
} from '../theme';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useToast } from '../context/ToastContext';
import { feedbackService } from '../services/feedbackService';
import { getDisplayMessage } from '../utils/errorParser';

/** The API accepts free text only, so the message must carry some substance. */
const MIN_FEEDBACK_LENGTH = 10;

/*
  ─── Type / Experience / Topics — TEMPORARILY HIDDEN ──────────────────
  POST /api/v1/feedback/parent takes a single `feedback` string, so none of
  these selections have anywhere to go. The UI blocks are commented out further
  down; restore these types and constants alongside them.

type FeedbackType = {
  id: string;
  icon: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
};

type RatingLevel = 1 | 2 | 3 | 4 | 5;

const FEEDBACK_TYPES: FeedbackType[] = [
  { id: 'suggestion', icon: 'lightbulb', label: 'Suggestion', emoji: '💡', color: colors.accent, bg: colors.peachSoft },
  { id: 'bug', icon: 'bug-report', label: 'Bug Report', emoji: '🐛', color: '#E85D5D', bg: '#FFECEC' },
  { id: 'praise', icon: 'thumb-up', label: 'Praise', emoji: '🎉', color: colors.growth, bg: colors.mintSoft },
  { id: 'question', icon: 'help', label: 'Question', emoji: '❓', color: colors.info, bg: colors.skySoft },
];

const RATING_FACES: { level: RatingLevel; emoji: string; label: string; color: string }[] = [
  { level: 1, emoji: '😤', label: 'Terrible', color: '#E85D5D' },
  { level: 2, emoji: '😕', label: 'Poor', color: colors.accent },
  { level: 3, emoji: '😐', label: 'Okay', color: colors.textMuted },
  { level: 4, emoji: '😊', label: 'Good', color: colors.info },
  { level: 5, emoji: '🤩', label: 'Amazing', color: colors.growth },
];

const TOPIC_TAGS = [
  'Dashboard', 'Ratings', 'Goals', 'Analytics',
  'Missions', 'Profile', 'Performance', 'Design', 'Other',
];
*/

/* ─── Main Screen ────────────────────────────────────────────────────── */

const SendFeedbackScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const inputRef = useRef<TextInput>(null);
  const { showToast } = useToast();

  /* State */
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const scrollBottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  const canSubmit = feedbackText.trim().length >= MIN_FEEDBACK_LENGTH && !submitting;

  const handleSubmit = useCallback(async () => {
    const message = feedbackText.trim();
    // Re-checked here rather than trusting `canSubmit`, so a stale closure can
    // never post an empty body.
    if (message.length < MIN_FEEDBACK_LENGTH || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await feedbackService.sendParentFeedback(message);
      setSubmitted(true);
    } catch (err) {
      showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 4000 });
    } finally {
      setSubmitting(false);
    }
  }, [feedbackText, submitting, showToast]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      if (Platform.OS === 'android') {
        RNStatusBar.setTranslucent(true);
        RNStatusBar.setBackgroundColor('transparent');
      }
      return () => {
        setStatusBarStyle('dark');
        if (Platform.OS === 'android') {
          RNStatusBar.setTranslucent(false);
          RNStatusBar.setBackgroundColor(colors.background);
        }
      };
    }, [])
  );

  /* ── Success state ───────────────────────────────────────── */
  if (submitted) {
    return (
      <SafeAreaView style={s.root} edges={['left', 'right', 'bottom']}>
        <AppGradientHeader title="Feedback" subtitle="Thank you!" leadingMode="back" />
        <View style={s.successContainer}>
          <Animated.View entering={ZoomIn.springify().damping(14).stiffness(120)}>
            <View style={s.successOrb}>
              <Icon name="check" size={48} color={colors.surface} />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}>
            <Text style={s.successTitle}>Feedback Sent!</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
            <Text style={s.successSubtitle}>
              We truly appreciate your input. Our team will review it shortly and use it to make Kovariya even better.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(400).springify().damping(18)}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [s.successBtn, pressed && s.pressedOpacity]}
              accessibilityRole="button"
              accessibilityLabel="Go back to profile"
            >
              <Text style={s.successBtnText}>Back to Profile</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        title="Send Feedback"
        subtitle="Help us improve"
        leadingMode="back"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scrollContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
        >
          {/*
            ── Type / Experience / Topics — TEMPORARILY HIDDEN ──────────
            The feedback API takes only the free-text message, so these three
            sections collect nothing that can be submitted. Uncomment this block
            together with the types and constants near the top of the file.

          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(220)}>
            <Card variant="elevated" style={s.sectionCard}>
              <Text style={s.sectionEyebrow}>Type</Text>
              <Text style={[s.sectionTitle, { marginBottom: spacing.md }]}>
                What kind of feedback?
              </Text>
              <View style={s.typeGrid}>
                {FEEDBACK_TYPES.map((type, i) => (
                  <Animated.View
                    key={type.id}
                    entering={FadeInDown.delay(60 * i).springify().damping(18).stiffness(200)}
                    style={{ width: '48%' }}
                  >
                    <Pressable
                      onPress={() => setSelectedType(type.id)}
                      style={({ pressed }) => [
                        s.typeChip,
                        selectedType === type.id && s.typeChipActive,
                        pressed && s.pressedOpacity,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={type.label}
                    >
                      <View style={[s.typeChipIcon, { backgroundColor: type.bg }]}>
                        <Icon name={type.icon} size={24} color={type.color} />
                      </View>
                      <Text style={[s.typeChipLabel, selectedType === type.id && s.typeChipLabelActive]}>
                        {type.label}
                      </Text>
                      {selectedType === type.id && (
                        <View style={s.typeCheck}>
                          <Icon name="check-circle" size={18} color={colors.growth} />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </Card>
          </Animated.View>

          ── Rating ──────────────────────────────────────────
          <Animated.View
            entering={FadeInDown.delay(100).springify().damping(18).stiffness(220)}
          >
            <Card variant="elevated" style={s.sectionCard}>
              <Text style={s.sectionEyebrow}>Experience</Text>
              <Text style={[s.sectionTitle, { marginBottom: spacing.md }]}>
                How's your experience?
              </Text>
              <View style={s.ratingRow}>
                {RATING_FACES.map((face) => (
                  <Pressable
                    key={face.level}
                    onPress={() => setRating(face.level)}
                    style={({ pressed }) => [
                      s.ratingFace,
                      rating === face.level && s.ratingFaceActive,
                      pressed && s.pressedOpacity,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={face.label}
                  >
                    <Text style={s.ratingEmoji}>{face.emoji}</Text>
                    <Text
                      style={[
                        s.ratingLabel,
                        rating === face.level && { color: face.color, fontWeight: '700' },
                      ]}
                    >
                      {face.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </Animated.View>

          ── Topics ──────────────────────────────────────────
          <Animated.View
            entering={FadeInDown.delay(180).springify().damping(18).stiffness(220)}
          >
            <Card variant="elevated" style={s.sectionCard}>
              <Text style={s.sectionEyebrow}>Topics</Text>
              <Text style={[s.sectionTitle, { marginBottom: spacing.md }]}>
                Related areas (optional)
              </Text>
              <View style={s.tagsWrap}>
                {TOPIC_TAGS.map((tag) => {
                  const active = selectedTopics.has(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTopic(tag)}
                      style={[s.tag, active && s.tagActive]}
                      accessibilityRole="button"
                    >
                      <Text style={[s.tagText, active && s.tagTextActive]}>
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </Animated.View>
          */}

          {/* ── Message ───────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(260).springify().damping(18).stiffness(220)}
          >
            <Card variant="elevated" style={s.sectionCard}>
              <Text style={s.sectionEyebrow}>Message</Text>
              <Text style={[s.sectionTitle, { marginBottom: spacing.md }]}>
                Tell us more
              </Text>
              <View style={s.textAreaWrap}>
                <TextInput
                  ref={inputRef}
                  style={s.textArea}
                  placeholder="Describe your feedback in detail..."
                  placeholderTextColor={colors.textMuted}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
              </View>
              <View style={s.charCountRow}>
                <Text style={s.charCount}>{feedbackText.length}/1000</Text>
                {feedbackText.trim().length > 0 &&
                  feedbackText.trim().length < MIN_FEEDBACK_LENGTH && (
                    <Text style={s.charHint}>
                      Minimum {MIN_FEEDBACK_LENGTH} characters
                    </Text>
                  )}
              </View>
            </Card>
          </Animated.View>

          {/* ── Submit button ─────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(340).springify().damping(18).stiffness(220)}
          >
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                s.submitBtn,
                !canSubmit && s.submitBtnDisabled,
                pressed && canSubmit && s.pressedOpacity,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Submit feedback"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Icon name="send" size={20} color={canSubmit ? colors.surface : colors.textMuted} />
              )}
              <Text
                style={[s.submitBtnText, !canSubmit && s.submitBtnTextDisabled]}
              >
                {submitting ? 'Sending…' : 'Submit Feedback'}
              </Text>
            </Pressable>
          </Animated.View>

          {/* ── Footer ────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.delay(380).springify().damping(18).stiffness(220)}
          >
            <View style={s.footerNote}>
              <Icon name="info-outline" size={16} color={colors.textMuted} />
              <Text style={s.footerNoteText}>
                Your feedback is anonymous and helps us prioritize improvements. For urgent issues, please use Help & Support.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  /* Sections */
  sectionCard: { marginVertical: spacing.xs },
  sectionEyebrow: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.xs,
    fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase',
    color: colors.textMuted, marginBottom: spacing.sm,
  },
  sectionTitle: { ...textStyles.headingMedium, fontWeight: '800', color: colors.ink },

  /* Feedback type */
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large, backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5, borderColor: 'transparent', position: 'relative',
  },
  typeChipActive: {
    backgroundColor: colors.lavenderSoft, borderColor: colors.primary,
  },
  typeChipIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  typeChipLabel: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.sm,
    fontWeight: '700', color: colors.ink,
  },
  typeChipLabelActive: { color: colors.primaryDark },
  typeCheck: { position: 'absolute', top: 8, right: 8 },

  /* Rating */
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ratingFace: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium, marginHorizontal: 2,
  },
  ratingFaceActive: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  ratingEmoji: { fontSize: 28, marginBottom: spacing.xs },
  ratingLabel: {
    fontFamily: typography.fontFamily.primary, fontSize: 10,
    fontWeight: '600', color: colors.textMuted, textAlign: 'center',
  },

  /* Topics */
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.full, backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.lavenderSoft,
    borderColor: colors.primary, borderWidth: 1.5,
  },
  tagText: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.sm,
    fontWeight: '600', color: colors.textSecondary,
  },
  tagTextActive: { color: colors.primaryDark, fontWeight: '700' },

  /* Text area */
  textAreaWrap: {
    borderRadius: borderRadius.medium, backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    padding: spacing.md, minHeight: 140,
  },
  textArea: {
    flex: 1, fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.base, color: colors.ink,
    lineHeight: 22, minHeight: 120,
  },
  charCountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm,
  },
  charCount: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.xs,
    fontWeight: '600', color: colors.textMuted,
  },
  charHint: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.xs,
    fontWeight: '600', color: colors.accent,
  },

  /* Submit */
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginVertical: spacing.md,
    paddingVertical: spacing.md, borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  submitBtnDisabled: {
    backgroundColor: colors.surfaceMuted,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  submitBtnText: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.base,
    fontWeight: '700', color: colors.surface,
  },
  submitBtnTextDisabled: { color: colors.textMuted },

  /* Success */
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  successOrb: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.growth, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl,
    ...Platform.select({
      ios: { shadowColor: colors.growth, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  successTitle: {
    ...textStyles.headingLarge, fontWeight: '800', color: colors.ink,
    textAlign: 'center', marginBottom: spacing.md,
  },
  successSubtitle: {
    ...textStyles.bodyMedium, color: colors.textSecondary, fontWeight: '500',
    textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  successBtn: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: borderRadius.full, backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  successBtnText: {
    fontFamily: typography.fontFamily.primary, fontSize: typography.fontSize.base,
    fontWeight: '700', color: colors.surface,
  },

  /* Footer */
  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xs,
  },
  footerNoteText: { ...textStyles.caption, color: colors.textMuted, fontWeight: '500', flex: 1, lineHeight: 18 },

  pressedOpacity: { opacity: 0.88 },
});

export default SendFeedbackScreen;
