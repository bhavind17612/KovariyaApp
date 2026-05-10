import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  AppGradientHeader,
  Card,
  Button,
  ProgressCircle,
  AspectRatingSheet,
  WeeklyAspectProgressChart,
  AIInsightsCard,
  LanguagePickerSheet,
} from '../components';
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  getFloatingTabBarBottomPadding,
} from '../theme';
import { Child } from '../types';
import { useToast } from '../context/ToastContext';
import { useChildren } from '../context/ChildrenContext';
import {
  DASHBOARD_RATING_ASPECTS,
  formatDailyRatingSum,
  type RatingAspectDefinition,
  type AspectRatingPayload,
} from '../data/aspectRating';
import { type SupportedLanguage } from '../data/aspectRatingI18n';
import { getWeeklyAspectProgressSeries } from '../data/weeklyAspectProgress';
import { getAIInsightsForChild } from '../data/aiInsights';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

type TodayMissionStatus = 'pending' | 'done' | 'missed';

const MISSION_FEEDBACK_DONE =
  'Great job — you showed up today. Small wins stack into big habits.';

const MISSION_FEEDBACK_MISSED =
  "That happens to everyone. Tomorrow's a fresh start — keep this mission in mind and try again.";

/** Soft, calm gradients — low saturation so the card feels gentle, not loud. */
const MISSION_GRADIENT_PENDING = ['#F7F6FB', '#F3F1F9', '#EFF2F8'] as const;
const MISSION_GRADIENT_DONE = ['#F6FAF8', '#F1F7F4', '#ECF4EF'] as const;
const MISSION_GRADIENT_MISSED = ['#FBF9F8', '#F9F5F3', '#F6F0ED'] as const;

/** Mock daily mission per child; replace with API. */
const MOCK_TODAY_MISSION_BY_CHILD: Record<string, { title: string; detail: string }> = {
  '1': {
    title: 'One gratitude moment',
    detail: 'Before bed, share one thing you appreciated about today together.',
  },
  '2': {
    title: '10-minute focused homework block',
    detail: 'Set a timer, one task only — celebrate when the timer ends.',
  },
  '3': {
    title: 'Kind words practice',
    detail: 'Give two specific compliments to someone at home today.',
  },
};

const MOCK_FAMILY_SCORE = 84; // 0-100 (percentage)

/**
 * Per-child SDS (0–100) and week-over-week trend %.
 * Negative trend = performance dip; replace with API payload later.
 */
const MOCK_SDS_BY_CHILD: Record<string, { percent: number; trend: number }> = {
  '1': { percent: 78, trend: 5 },
  '2': { percent: 61, trend: -4 },
  '3': { percent: 89, trend: 8 },
};

type SdsMoodKey = 'win' | 'lose' | 'flat';

function getSdsCardMood(trend: number): {
  mood: SdsMoodKey;
  gradient: readonly [string, string, ...string[]];
  titleColor: string;
  numberColor: string;
  hintColor: string;
  trendColor: string;
  barFill: string;
  barTrack: string;
  borderColor: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  badgeIcon: string;
  hint: (childName: string) => string;
} {
  if (trend > 0) {
    return {
      mood: 'win',
      gradient: ['#E8FFF4', '#A8E8C8', '#3FA97A'],
      titleColor: 'rgba(13, 61, 42, 0.72)',
      numberColor: '#0A3020',
      hintColor: 'rgba(13, 61, 42, 0.62)',
      trendColor: '#0F5C3D',
      barFill: '#1F7A55',
      barTrack: 'rgba(255, 255, 255, 0.72)',
      borderColor: 'rgba(63, 169, 122, 0.35)',
      badge: 'Winning week',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeText: '#145A3D',
      badgeIcon: 'emoji-events',
      hint: (name) => `${name} is building great momentum`,
    };
  }
  if (trend < 0) {
    return {
      mood: 'lose',
      gradient: [...colors.failureGradient],
      titleColor: 'rgba(74, 28, 28, 0.75)',
      numberColor: '#3D1818',
      hintColor: 'rgba(74, 28, 28, 0.65)',
      trendColor: '#8B2323',
      barFill: '#B54545',
      barTrack: 'rgba(255, 255, 255, 0.55)',
      borderColor: 'rgba(200, 92, 92, 0.4)',
      badge: 'Room to grow',
      badgeBg: 'rgba(255, 255, 255, 0.88)',
      badgeText: '#7A2828',
      badgeIcon: 'trending-down',
      hint: (name) => `vs last week · ${name} dipped a little — small resets help`,
    };
  }
  return {
    mood: 'flat',
    gradient: [...colors.neutralSdsGradient],
    titleColor: colors.textSecondary,
    numberColor: colors.ink,
    hintColor: colors.textSecondary,
    trendColor: colors.textSecondary,
    barFill: colors.primary,
    barTrack: 'rgba(255, 255, 255, 0.65)',
    borderColor: 'rgba(124, 106, 232, 0.2)',
    badge: 'Holding steady',
    badgeBg: 'rgba(255, 255, 255, 0.9)',
    badgeText: colors.textSecondary,
    badgeIcon: 'trending-flat',
    hint: (name) => `vs last week · ${name} is consistent — keep the rhythm`,
  };
}

const WEEK_STRIP = [
  { id: 'mon', label: 'Mon', short: 'M', score: 7.2 },
  { id: 'tue', label: 'Tue', short: 'Tu', score: 8.1 },
  { id: 'wed', label: 'Wed', short: 'W', score: 6.8 },
  { id: 'thu', label: 'Thu', short: 'Th', score: 8.5 },
  { id: 'fri', label: 'Fri', short: 'F', score: 7.9 },
  { id: 'sat', label: 'Sat', short: 'Sa', score: 8.2 },
  { id: 'sun', label: 'Sun', short: 'Su', score: 8.5 },
] as const;

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { showToast } = useToast();
  const { children, selectedChildId, setSelectedChildId, childPickerVisible, closeChildPicker } = useChildren();

  /**
   * Row 1: three equal columns; row 2: two equal columns.
   * Same gap G between all neighbours so spacing is even edge-to-edge.
   */
  const aspectTileMetrics = useMemo(() => {
    const horizontalPadding = spacing.lg * 2;
    const G = spacing.md;
    const inner = windowWidth - horizontalPadding;
    const width3 = Math.max(96, Math.floor((inner - 2 * G) / 3));
    const width2 = Math.max(140, Math.floor((inner - G) / 2));
    return { width3, width2, gap: G };
  }, [windowWidth]);

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );
  const [selectedDayId, setSelectedDayId] = useState<string>('thu');
  const [todayMissionByChildId, setTodayMissionByChildId] = useState<
    Record<string, TodayMissionStatus>
  >({});
  const [ratingSheetAspect, setRatingSheetAspect] = useState<RatingAspectDefinition | null>(null);
  const [pendingAspect, setPendingAspect] = useState<RatingAspectDefinition | null>(null);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [ratingLang, setRatingLang] = useState<SupportedLanguage>('en');
  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) ?? children[0],
    [children, selectedChildId]
  );

  const selectedDay = useMemo(() => WEEK_STRIP.find((d) => d.id === selectedDayId) ?? WEEK_STRIP[0], [
    selectedDayId,
  ]);

  const todayMission = useMemo(
    () => MOCK_TODAY_MISSION_BY_CHILD[selectedChild.id] ?? MOCK_TODAY_MISSION_BY_CHILD['1'],
    [selectedChild.id]
  );

  const weeklyAspectProgressSeries = useMemo(
    () => getWeeklyAspectProgressSeries(selectedChild.id),
    [selectedChild.id]
  );

  const aiInsightsPayload = useMemo(
    () => getAIInsightsForChild(selectedChild.id),
    [selectedChild.id]
  );

  const todayMissionStatus: TodayMissionStatus = todayMissionByChildId[selectedChild.id] ?? 'pending';

  const setTodayMissionForSelectedChild = useCallback((status: TodayMissionStatus) => {
    setTodayMissionByChildId((prev) => ({ ...prev, [selectedChild.id]: status }));
  }, [selectedChild.id]);

  const openAspectRating = useCallback((aspect: RatingAspectDefinition) => {
    setPendingAspect(aspect);
    setLangPickerVisible(true);
  }, []);

  const handleLanguageSelected = useCallback((lang: SupportedLanguage) => {
    setRatingLang(lang);
    setLangPickerVisible(false);
    if (pendingAspect) {
      setRatingSheetAspect(pendingAspect);
      setPendingAspect(null);
    }
  }, [pendingAspect]);

  const closeAspectRating = useCallback(() => setRatingSheetAspect(null), []);

  const handleAspectRatingSave = useCallback(
    (payload: AspectRatingPayload) => {
      const label =
        DASHBOARD_RATING_ASPECTS.find((a) => a.id === payload.aspectId)?.name ?? 'Aspect';
      showToast({
        type: 'success',
        message: `Saved · today's behaviour log for ${selectedChild.name}. You can add another log with Save entry.`,
      });
    },
    [selectedChild.name, showToast]
  );

  const handleAspectRatingSaveAndNext = useCallback(
    (payload: AspectRatingPayload) => {
      const label =
        DASHBOARD_RATING_ASPECTS.find((a) => a.id === payload.aspectId)?.name ?? 'Aspect';
      showToast({
        type: 'success',
        message: `Saved · ${label} for ${selectedChild.name}`,
      });
      const idx = DASHBOARD_RATING_ASPECTS.findIndex((a) => a.id === payload.aspectId);
      const next =
        idx >= 0 && idx < DASHBOARD_RATING_ASPECTS.length - 1
          ? DASHBOARD_RATING_ASPECTS[idx + 1]
          : null;
      if (next) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRatingSheetAspect(next);
      }
    },
    [selectedChild.name, showToast]
  );

  const handleVoiceNotePlaceholder = useCallback(() => {
    showToast({
      type: 'info',
      message: 'Voice notes will be available in a future update.',
      durationMs: 3500,
    });
  }, [showToast]);

  // Confidence Factor (CF) is provided as percent (0-100) on this screen.
  // Your scoring system: CF = max(0.4, min(1, N/3)).
  const confidencePercent = clamp(selectedChild.confidenceIndicator ?? 0, 0, 100);
  const confidenceCF = confidencePercent / 100;

  const sdsSnapshot = useMemo(() => {
    const row = MOCK_SDS_BY_CHILD[selectedChild.id];
    return row ?? { percent: 72, trend: 0 };
  }, [selectedChild.id]);

  const sdsMood = useMemo(() => getSdsCardMood(sdsSnapshot.trend), [sdsSnapshot.trend]);

  const missionCardGradient = useMemo((): readonly [string, string, ...string[]] => {
    if (todayMissionStatus === 'done') {
      return [...MISSION_GRADIENT_DONE];
    }
    if (todayMissionStatus === 'missed') {
      return [...MISSION_GRADIENT_MISSED];
    }
    return [...MISSION_GRADIENT_PENDING];
  }, [todayMissionStatus]);

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

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        title={`${selectedChild.name}'s Dashboard`}
        subtitle="Analytics & reports"
        rightAccessory={
          <TouchableOpacity
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon name="notifications-none" size={26} color="rgba(255, 255, 255, 0.88)" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollMain}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      >
        <View style={styles.ratingAspectsSection}>
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(220)}>
            <View style={styles.ratingAspectsHeader}>
              <Text style={styles.ratingAspectsTitle}>Today&apos;s behaviour</Text>
              <Text style={styles.ratingAspectsSubtitle}>
                Tap any of the 5 cards below to log behaviour and build points. You can update multiple times throughout the day.
              </Text>
            </View>
          </Animated.View>
          <View
            style={[
              styles.ratingAspectsGrid,
              { columnGap: aspectTileMetrics.gap, rowGap: aspectTileMetrics.gap },
            ]}
          >
            {DASHBOARD_RATING_ASPECTS.map((aspect, index) => {
              const tileW = index < 3 ? aspectTileMetrics.width3 : aspectTileMetrics.width2;
              const sumStr = formatDailyRatingSum(aspect.dailyRatingSum);
              const sumColor =
                aspect.dailyRatingSum > 0
                  ? colors.growth
                  : aspect.dailyRatingSum < 0
                    ? colors.error
                    : colors.textMuted;
              return (
                <Animated.View
                  key={aspect.id}
                  entering={FadeInDown.delay(index * 60).springify().damping(18).stiffness(220)}
                  style={[
                    styles.ratingAspectShadowWrapper,
                    { width: tileW, backgroundColor: aspect.softBg, borderColor: aspect.borderColor },
                  ]}
                >
                  <Pressable
                    onPress={() => openAspectRating(aspect)}
                    style={({ pressed }) => [
                      styles.ratingAspectCard,
                      pressed && styles.ratingAspectCardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${aspect.name}, ${sumStr} points today`}
                    accessibilityHint="Opens the rating sheet for this behaviour area"
                  >
                    <View style={[styles.ratingAspectTopAccent, { backgroundColor: aspect.accent }]} />
                    <View style={styles.ratingAspectTileBody}>
                      <View
                        style={[styles.ratingAspectIconWrap, { backgroundColor: `${aspect.accent}28` }]}
                      >
                        <Icon name={aspect.iconName} size={index < 3 ? 22 : 24} color={aspect.iconTint} />
                      </View>
                      <Text style={styles.ratingAspectName} numberOfLines={2}>
                        {aspect.name}
                      </Text>
                      <Text style={[styles.ratingAspectSum, { color: sumColor }]}>{sumStr}</Text>
                      <Text style={styles.ratingAspectSumHint}>pts</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(0).springify().damping(18).stiffness(220)}
          style={styles.shadowWrapper}
        >
          <View style={styles.missionCardOuter}>
            <LinearGradient
              colors={missionCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.missionGradient}
            >
              <View style={styles.missionOrbs} pointerEvents="none">
                <View style={styles.missionOrbA} />
                <View style={styles.missionOrbB} />
                <View style={styles.missionOrbC} />
              </View>

              <View style={styles.missionTopBar}>
                <View style={styles.missionBrandChip}>
                  <Icon name="rocket-launch" size={16} color={colors.primary} />
                </View>
                <View style={styles.missionTopBarText}>
                  <Text style={styles.missionKicker}>Today&apos;s Mission</Text>
                  <Text style={styles.missionKickerSub}>Small steps · big habits</Text>
                </View>
                {todayMissionStatus !== 'pending' ? (
                  <View
                    style={[
                      styles.missionStatusChip,
                      todayMissionStatus === 'done'
                        ? styles.missionStatusChipDone
                        : styles.missionStatusChipMissed,
                    ]}
                  >
                    <Icon
                      name={todayMissionStatus === 'done' ? 'check-circle' : 'event-busy'}
                      size={14}
                      color={todayMissionStatus === 'done' ? colors.growth : colors.warning}
                    />
                    <Text
                      style={[
                        styles.missionStatusChipText,
                        todayMissionStatus === 'done'
                          ? { color: colors.growth }
                          : { color: colors.warning },
                      ]}
                    >
                      {todayMissionStatus === 'done' ? 'Done' : 'Missed'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Animated.View
                entering={FadeInDown.delay(0).springify().damping(18).stiffness(220)}
                style={styles.shadowWrapper2}
              >
                <View style={styles.missionGlassPanel}>
                  <Text style={styles.missionTitle}>{todayMission.title}</Text>
                  <Text style={styles.missionDetail} numberOfLines={4}>
                    {todayMission.detail}
                  </Text>

                  {todayMissionStatus === 'pending' ? (
                    <View style={styles.missionButtonsRow}>
                      <View style={styles.missionButtonCol}>
                        <Button
                          title="Done"
                          variant="primary"
                          size="small"
                          icon={
                            <Icon name="check-circle" size={18} color={colors.surface} />
                          }
                          onPress={() => setTodayMissionForSelectedChild('done')}
                          btnStyle={StyleSheet.flatten([
                            styles.missionButtonDone,
                            {
                              backgroundColor: colors.growth,
                              minHeight: 38,
                              paddingVertical: 8,
                            },
                          ])}
                        />
                      </View>
                      <View style={styles.missionButtonCol}>
                        <Button
                          title="Missed"
                          variant="primary"
                          size="small"
                          icon={
                            <Icon name="highlight-off" size={18} color={colors.surface} />
                          }
                          onPress={() => setTodayMissionForSelectedChild('missed')}
                          btnStyle={StyleSheet.flatten([
                            styles.missionButtonMissed,
                            {
                              backgroundColor: colors.error,
                              minHeight: 38,
                              paddingVertical: 8,
                            },
                          ])}
                        />
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.missionFeedbackBox,
                        todayMissionStatus === 'done'
                          ? styles.missionFeedbackBoxDone
                          : styles.missionFeedbackBoxMissed,
                      ]}
                    >
                      <Icon
                        name={todayMissionStatus === 'done' ? 'verified' : 'sentiment-dissatisfied'}
                        size={20}
                        color={todayMissionStatus === 'done' ? colors.growth : colors.warning}
                      />
                      <Text style={styles.missionFeedbackText}>
                        {todayMissionStatus === 'done' ? MISSION_FEEDBACK_DONE : MISSION_FEEDBACK_MISSED}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(60).springify().damping(18).stiffness(220)}
          style={styles.shadowWrapper}
        >
          <View style={styles.heroSds}>
            <LinearGradient
              key={selectedChild.id}
              colors={sdsMood.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.sdsCard,
                {
                  borderColor: sdsMood.borderColor,
                },
              ]}
            >
              <View style={styles.sdsCardTopRow}>
                <Text style={[styles.sdsCardTitle, { color: sdsMood.titleColor }]}>BSI Score</Text>
                <View style={[styles.sdsMoodBadge, { backgroundColor: sdsMood.badgeBg }]}>
                  <Icon name={sdsMood.badgeIcon} size={15} color={sdsMood.badgeText} />
                  <Text style={[styles.sdsMoodBadgeText, { color: sdsMood.badgeText }]}>
                    {sdsMood.badge}
                  </Text>
                </View>
              </View>

              <View style={styles.sdsCardCenter}>
                <View
                  style={styles.sdsMainRow}
                  accessibilityLabel={
                    sdsSnapshot.trend === 0
                      ? 'No change versus last week, steady'
                      : sdsSnapshot.trend > 0
                        ? `Up ${sdsSnapshot.trend} percent versus last week, winning`
                        : `Down ${Math.abs(sdsSnapshot.trend)} percent versus last week, losing`
                  }
                >
                  <Text style={[styles.sdsBigNumber, { color: sdsMood.numberColor }]}>
                    {sdsSnapshot.percent}%
                  </Text>
                  <View style={styles.sdsTrendBlock}>
                    <View style={styles.sdsWeekCompareRow}>
                      <Icon
                        name={
                          sdsSnapshot.trend > 0
                            ? 'trending-up'
                            : sdsSnapshot.trend < 0
                              ? 'trending-down'
                              : 'trending-flat'
                        }
                        size={18}
                        color={sdsMood.trendColor}
                      />
                      <Text style={[styles.sdsWeekDeltaText, { color: sdsMood.trendColor }]}>
                        {sdsSnapshot.trend > 0
                          ? `+${sdsSnapshot.trend}%`
                          : sdsSnapshot.trend < 0
                            ? `${sdsSnapshot.trend}%`
                            : '0%'}
                        <Text style={[styles.sdsWeekVsText, { color: sdsMood.hintColor }]}>
                          {' '}
                          vs last week
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text
                style={[styles.sdsHintLine, { color: sdsMood.hintColor }]}
                numberOfLines={2}
              >
                {sdsMood.hint(selectedChild.name)}
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(18).stiffness(220)}
          style={[styles.shadowWrapper, styles.shadowWrapperHoriz]}
        >
          <View style={styles.sectionTight}>
            <WeeklyAspectProgressChart
              aspects={DASHBOARD_RATING_ASPECTS}
              series={weeklyAspectProgressSeries}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(140).springify().damping(18).stiffness(220)}
          style={[styles.shadowWrapper, styles.shadowWrapperHoriz]}
        >
          <View style={styles.sectionTight}>
            <AIInsightsCard payload={aiInsightsPayload} />
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={childPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeChildPicker}
      >
        <View style={styles.childPickerRoot}>
          <Pressable
            style={styles.childPickerBackdrop}
            onPress={closeChildPicker}
            accessibilityRole="button"
            accessibilityLabel="Dismiss child list"
          />
          <View style={styles.childPickerSheetWrap} pointerEvents="box-none">
            <SafeAreaView
              edges={['bottom']}
              style={[
                styles.childPickerSheetBottom,
                { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs },
              ]}
              accessibilityViewIsModal
            >
              <View style={styles.childPickerGrabber} />
              <Text style={styles.childPickerTitle}>Who are you viewing?</Text>
              <Text style={styles.childPickerSubtitle}>
                SDS, missions, and scores match the child you select.
              </Text>
              <ScrollView
                style={styles.childPickerList}
                contentContainerStyle={styles.childPickerListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {children.map((child) => {
                  const isSelected = child.id === selectedChildId;
                  return (
                    <Pressable
                      key={child.id}
                      style={[styles.childPickerRow, isSelected && styles.childPickerRowSelected]}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedChildId(child.id);
                        closeChildPicker();
                        showToast({
                          type: 'info',
                          message: 'Dashboard updated for selected child.',
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${child.name}, age ${child.age}${isSelected ? ', selected' : ''}`}
                      android_ripple={{ color: colors.primaryLight }}
                    >
                      <View style={styles.childPickerRowLeft}>
                        <View
                          style={[
                            styles.childPickerAvatar,
                            isSelected && styles.childPickerAvatarSelected,
                          ]}
                        >
                          <Text style={styles.childPickerAvatarText}>
                            {child.name.trim().slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.childPickerRowMain}>
                          <Text style={styles.childPickerRowName}>{child.name}</Text>
                          <Text style={styles.childPickerRowMeta}>Age {child.age} years</Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <Icon name="check-circle" size={26} color={colors.primary} />
                      ) : (
                        <Icon name="radio-button-unchecked" size={24} color={colors.textMuted} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable
                style={styles.childPickerCancelButton}
                onPress={closeChildPicker}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                android_ripple={{ color: colors.surfaceMuted }}
              >
                <Text style={styles.childPickerCancelText}>Cancel</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      <AspectRatingSheet
        visible={ratingSheetAspect !== null}
        aspect={ratingSheetAspect}
        orderedAspects={DASHBOARD_RATING_ASPECTS}
        onClose={closeAspectRating}
        onSave={handleAspectRatingSave}
        onSaveAndNext={handleAspectRatingSaveAndNext}
        onVoiceNotePress={handleVoiceNotePlaceholder}
        language={ratingLang}
      />

      <LanguagePickerSheet
        visible={langPickerVisible}
        selected={ratingLang}
        onSelect={handleLanguageSelected}
        onClose={() => {
          setLangPickerVisible(false);
          setPendingAspect(null);
        }}
      />


    </SafeAreaView>
  );
};

export default DashboardScreen;

function SdsAnimatedProgressBar({
  targetPercent,
  fillColor,
  trackColor,
}: {
  targetPercent: number;
  fillColor: string;
  trackColor: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(Math.min(100, Math.max(0, targetPercent)), { duration: 1100 });
  }, [targetPercent, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={[styles.sdsBarTrack, { backgroundColor: trackColor }]} accessibilityRole="progressbar">
      <Animated.View style={[styles.sdsBarFill, fillStyle, { backgroundColor: fillColor }]} />
    </View>
  );
}

function WeeklyDayBar({
  day,
  selectedDayId,
}: {
  day: (typeof WEEK_STRIP)[number];
  selectedDayId: string;
}) {
  const isSelected = day.id === selectedDayId;
  const barScale = useSharedValue(1);

  React.useEffect(() => {
    barScale.value = withTiming(isSelected ? 1.08 : 1, { duration: 220 });
  }, [isSelected, barScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: barScale.value }],
  }));

  return (
    <View style={styles.dayColumn}>
      <Animated.View
        style={[
          styles.dayBar,
          {
            height: `${(day.score / 10) * 100}%`,
            backgroundColor: day.score >= 8 ? colors.mint : colors.lavender,
            opacity: isSelected ? 1 : 0.84,
            borderWidth: isSelected ? 1.5 : 0,
            borderColor: isSelected ? colors.ink : 'transparent',
          },
          animatedStyle,
        ]}
      />
      <Text style={styles.dayLabel}>{day.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollMain: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  greetingLine: {
    width: '100%',
    textAlign: 'left',
    marginBottom: 4,
  },
  greetingWave: {
    fontSize: 18,
    lineHeight: 22,
  },
  greetingPlain: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '500',
  },
  greetingNameHighlight: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.3,
  },
  /** Single-line child switcher — replaces the tall two-line chip. */
  childSelectorCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 1,
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    paddingRight: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.26)',
  },
  childSelectorCompactPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.38)',
  },
  childNameCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  childAgeCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.62)',
    flexShrink: 0,
  },
  childPickerRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  childPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.5)',
  },
  childPickerSheetWrap: {
    width: '100%',
    maxHeight: '88%',
  },
  childPickerSheetBottom: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 18 },
      default: {},
    }),
  },
  childPickerGrabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  childPickerTitle: {
    ...textStyles.headingMedium,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  childPickerSubtitle: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  childPickerList: {
    maxHeight: 320,
  },
  childPickerListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  childPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  childPickerRowSelected: {
    backgroundColor: colors.lavenderSoft,
    borderColor: 'rgba(124, 106, 232, 0.45)',
  },
  childPickerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  childPickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  childPickerAvatarSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  childPickerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  childPickerRowMain: {
    flex: 1,
    minWidth: 0,
  },
  childPickerRowName: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  childPickerRowMeta: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  childPickerCancelButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.large,
    backgroundColor: colors.surfaceMuted,
  },
  childPickerCancelText: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 16, 28, 0.85)',
  },
  /** SDS card below mission — keep vertical rhythm tight so behaviour + mission stay above the fold. */
  heroSds: {
    // paddingHorizontal: spacing.lg,
    // marginBottom: spacing.md,
  },
  sdsCard: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sdsCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sdsCardTitle: {
    ...textStyles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
    paddingRight: spacing.sm,
  },
  sdsMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    maxWidth: '56%',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  sdsMoodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.15,
    flexShrink: 1,
  },
  sdsCardCenter: {
    width: '100%',
    marginBottom: spacing.xs,
  },
  sdsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.sm,
  },
  sdsBigNumber: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.1,
    lineHeight: 40,
    flexShrink: 0,
  },
  sdsTrendBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sdsWeekCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
  },
  sdsWeekDeltaText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.15,
    textAlign: 'right',
  },
  sdsWeekVsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sdsOutcomeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sdsHintLine: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 0,
  },
  sdsBarTrack: {
    width: '100%',
    height: 12,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  sdsBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  ringWrapSmall: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCenterSmall: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ringCenterValueSmall: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  shadowWrapper: {
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
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
  shadowWrapper2: {
    // borderRadius: borderRadius.xl,
    overflow: 'hidden',
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
  shadowWrapperHoriz: {
    // Extra horizontal inset variant — no extra margin needed beyond the default.
    marginHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTight: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekStrip: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dayPill: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dayPillSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  dayPillLabel: {
    fontWeight: '700',
    color: colors.ink,
    fontSize: 14,
  },
  dayPillLabelSelected: {
    color: colors.surface,
  },
  sectionTitle: {
    ...textStyles.headingMedium,
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  metricTile: {
    flex: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingBottom: spacing.lg,
  },
  metricLabel: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metricValue: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  chartCard: {
    marginHorizontal: spacing.lg,
  },
  weeklyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayBar: {
    width: 16,
    borderRadius: borderRadius.small,
    marginBottom: spacing.xs,
  },
  dayLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeaderRightText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  weeklySummary: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  weeklySummaryText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
  },
  weeklySummaryEm: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '700',
  },
  metricStackTile: {
    marginHorizontal: spacing.lg,
    flex: 0,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingBottom: spacing.lg,
  },
  missionCardOuter: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17, 17, 17, 0.06)'
  },
  missionGradient: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    position: 'relative',
  },
  missionOrbs: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  missionOrbA: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(124, 106, 232, 0.07)',
    top: -28,
    right: -20,
  },
  missionOrbB: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(63, 169, 122, 0.06)',
    bottom: 20,
    left: -12,
  },
  missionOrbC: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    top: 44,
    left: '28%',
  },
  missionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    zIndex: 1,
  },
  missionBrandChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 106, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.18)',
  },
  missionTopBarText: {
    flex: 1,
    minWidth: 0,
  },
  missionKicker: {
    ...textStyles.bodyMedium,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.25,
  },
  missionKickerSub: {
    ...textStyles.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  missionStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  missionStatusChipDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(63, 169, 122, 0.35)',
  },
  missionStatusChipMissed: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(232, 160, 74, 0.4)',
  },
  missionStatusChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  missionEncourageBanner: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    zIndex: 1,
  },
  missionGlassPanel: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 1
  },
  missionPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  missionPanelLabel: {
    ...textStyles.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  missionTitle: {
    ...textStyles.headingMedium,
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    width: '100%',
    letterSpacing: -0.35,
  },
  missionDetail: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.sm,
    width: '100%',
  },
  missionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
    marginTop: 2,
    alignItems: 'stretch',
  },
  missionButtonCol: {
    flex: 1,
    minWidth: 0,
  },
  missionButtonDone: {
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#1A6B4A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  missionButtonMissed: {
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#B83838',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  missionFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    width: '100%',
    marginTop: 2,
    padding: spacing.sm,
    borderRadius: borderRadius.large,
  },
  missionFeedbackBoxDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(63, 169, 122, 0.2)',
  },
  missionFeedbackBoxMissed: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 160, 74, 0.22)',
  },
  missionFeedbackText: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 19,
    fontWeight: '500',
  },
  metricSubtleText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  metricTitleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trustPillText: {
    ...textStyles.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  trustLevelText: {
    ...textStyles.caption,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 16,
  },
  ratingAspectsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  ratingAspectsHeader: {
    marginBottom: spacing.md,
  },
  ratingAspectsTitle: {
    ...textStyles.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  ratingAspectsSubtitle: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  ratingAspectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  ratingAspectShadowWrapper: {
    borderRadius: borderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
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
  ratingAspectCard: {
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    flex: 1,
  },
  ratingAspectCardPressed: {
    opacity: 0.94,
  },
  ratingAspectTopAccent: {
    height: 3,
    width: '100%',
  },
  ratingAspectTileBody: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  ratingAspectIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  ratingAspectName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.15,
    textAlign: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  ratingAspectSum: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  ratingAspectSumHint: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    textAlign: 'center',
  },
  familyCard: {
    marginHorizontal: spacing.lg,
  },
  familyRingRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  familyRingWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  familyCopy: {
    flex: 1,
  },
  familyHint: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  familyMiniLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  familyMiniValue: {
    ...textStyles.bodyLarge,
    color: colors.ink,
    fontWeight: '600',
    lineHeight: 22,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lavender,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  announcementText: {
    ...textStyles.bodyLarge,
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
