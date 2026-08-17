import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Alert,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon2 from 'react-native-vector-icons/Octicons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  AppGradientHeader,
  AppRefreshControl,
  Card,
  Button,
  ProgressCircle,
  AspectRatingSheet,
  WeeklyAspectProgressChart,
  AIInsightsCard,
  SkeletonBox,
  SkeletonShimmer,
} from '../components';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { MissionProofModal } from '../components/missions/MissionProofModal';
import { missionsService } from '../services/missionsService';
import { analyticsService, type BsiSnapshot } from '../services/analyticsService';
import type { ApiTodayMission, MissionDailyStatus } from '../types/mission.api';
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

import {
  getWeeklyAspectProgressSeries,
  type WeeklyAspectSeriesRow,
} from '../data/weeklyAspectProgress';
import { behaviourService } from '../services/behaviourService';
import { languageService } from '../services/languageService';
import { aiInsightsService } from '../services/aiInsightsService';
import { getDisplayMessage } from '../utils/errorParser';
import type { AspectApiIdMaps } from '../types/behaviour';
import type { AiWeeklySummary } from '../types/aiSummary';

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

const MOCK_FAMILY_SCORE = 84; // 0-100 (percentage)


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

/** Shimmer placeholder tile shown while GET /behaviour/aspects is in flight. */
const AspectSkeletonTile = React.memo(function AspectSkeletonTile({ width }: { width: number }) {
  return (
    <View style={[styles.ratingAspectShadowWrapper, styles.skeletonTile, { width }]}>
      <View style={styles.ratingAspectCard}>
        <View style={styles.skeletonTopAccent} />
        <View style={styles.ratingAspectTileBody}>
          <View style={styles.skeletonIconCircle} />
          <View style={styles.skeletonNameLine} />
          <View style={styles.skeletonSumLine} />
          <View style={styles.skeletonPtsLine} />
        </View>
      </View>
      <SkeletonShimmer />
    </View>
  );
});

/* ─── Section skeletons (match each card's layout/spacing) ─── */

const CHART_SKELETON_BAR_HEIGHTS = [58, 92, 48, 116, 78, 104, 70];

function MissionCardSkeleton() {
  return (
    <View style={[styles.shadowWrapper, styles.skCardPadMd]}>
      <View style={styles.skRow}>
        <SkeletonBox width={28} height={28} radius={8} />
        <View style={styles.skFlex1}>
          <SkeletonBox width="42%" height={10} />
          <SkeletonBox width="58%" height={9} style={styles.skGap6} />
        </View>
      </View>
      <View style={styles.skBlockMd}>
        <SkeletonBox width="70%" height={16} />
        <SkeletonBox width="100%" height={10} style={styles.skGapSm} />
        <SkeletonBox width="94%" height={10} style={styles.skGap8} />
        <SkeletonBox width="60%" height={10} style={styles.skGap8} />
      </View>
      <View style={styles.skButtonsRow}>
        <SkeletonBox style={styles.skFlex1} height={38} radius={borderRadius.large} />
        <SkeletonBox style={styles.skFlex1} height={38} radius={borderRadius.large} />
      </View>
      <SkeletonShimmer />
    </View>
  );
}

function BsiCardSkeleton() {
  return (
    <View style={[styles.shadowWrapper, styles.skCardPadMd]}>
      <View style={styles.skRowBetween}>
        <SkeletonBox width="34%" height={10} />
        <SkeletonBox width={104} height={22} radius={borderRadius.full} />
      </View>
      <View style={[styles.skRowBetween, styles.skBlockMd]}>
        <SkeletonBox width={104} height={34} radius={borderRadius.medium} />
        <SkeletonBox width={84} height={14} />
      </View>
      <SkeletonBox width="66%" height={10} style={styles.skHintCentered} />
      <SkeletonShimmer />
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View style={[styles.shadowWrapper, styles.skCardPadLg]}>
      <View style={[styles.skRowBetween, styles.skBlockMd0]}>
        <SkeletonBox width="44%" height={14} />
        <SkeletonBox width={64} height={10} />
      </View>
      <View style={styles.skBarsRow}>
        {CHART_SKELETON_BAR_HEIGHTS.map((h, i) => (
          <View key={i} style={styles.skBarCol}>
            <SkeletonBox width={16} height={h} radius={borderRadius.small} />
            <SkeletonBox width={18} height={8} />
          </View>
        ))}
      </View>
      <SkeletonShimmer />
    </View>
  );
}

function AiInsightsSkeleton() {
  return (
    <View style={[styles.shadowWrapper, styles.skCardPadLg]}>
      <View style={[styles.skRow, styles.skBlockMd0]}>
        <SkeletonBox width={36} height={36} radius={18} />
        <SkeletonBox width="52%" height={14} />
      </View>
      <SkeletonBox width="100%" height={10} />
      <SkeletonBox width="92%" height={10} style={styles.skGap8} />
      <SkeletonBox width="76%" height={10} style={styles.skGap8} />
      <View style={styles.skChipsRow}>
        <SkeletonBox width={92} height={26} radius={borderRadius.full} />
        <SkeletonBox width={108} height={26} radius={borderRadius.full} />
      </View>
      <SkeletonShimmer />
    </View>
  );
}

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
  const [todayMission, setTodayMission] = useState<ApiTodayMission | null>(null);
  const [todayMissionStatus, setTodayMissionStatus] = useState<TodayMissionStatus>('pending');
  const [todayMissionDate, setTodayMissionDate] = useState<string>('');
  const [missionLogging, setMissionLogging] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [ratingSheetAspect, setRatingSheetAspect] = useState<RatingAspectDefinition | null>(null);
  const [ratingLang, setRatingLang] = useState<string>('en');
  const [ratingLanguageId, setRatingLanguageId] = useState<number | undefined>(undefined);
  const [aspectApiMaps, setAspectApiMaps] = useState<AspectApiIdMaps | null>(null);
  const [ratingAspects, setRatingAspects] = useState<RatingAspectDefinition[]>([]);
  const [weeklyAspectProgressSeries, setWeeklyAspectProgressSeries] = useState<WeeklyAspectSeriesRow[]>([]);
  const [aspectsLoading, setAspectsLoading] = useState(true);
  const [bsiSnapshot, setBsiSnapshot] = useState<BsiSnapshot | null>(null);
  // Initial-load skeleton flags (set false after first fetch; stay false on
  // pull-to-refresh so refreshing never flashes skeletons over existing content).
  const [missionLoading, setMissionLoading] = useState(true);
  const [bsiLoading, setBsiLoading] = useState(true);
  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) ?? children[0],
    [children, selectedChildId]
  );

  const selectedDay = useMemo(() => WEEK_STRIP.find((d) => d.id === selectedDayId) ?? WEEK_STRIP[0], [
    selectedDayId,
  ]);

  const [aiSummary, setAiSummary] = useState<AiWeeklySummary | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(true);

  // ── Today's mission ──────────────────────────────────────────────────────
  const fetchTodayMission = useCallback(async () => {
    const studentUuid = selectedChild?.id;
    if (!studentUuid) {
      setTodayMission(null);
      setMissionLoading(false);
      return;
    }
    try {
      const { mission, today } = await missionsService.getTodayMission(studentUuid);
      setTodayMission(mission);
      setTodayMissionStatus(today?.status == null ? 'pending' : today.status);
      setTodayMissionDate(today?.date ?? '');
    } catch (err) {
      setTodayMission(null);
      showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
    } finally {
      setMissionLoading(false);
    }
  }, [selectedChild?.id, showToast]);

  useEffect(() => {
    fetchTodayMission();
  }, [fetchTodayMission]);

  // ── BSI score ────────────────────────────────────────────────────────────
  const fetchBsi = useCallback(async () => {
    const studentUuid = selectedChild?.id;
    if (!studentUuid) {
      setBsiSnapshot(null);
      setBsiLoading(false);
      return;
    }
    try {
      setBsiSnapshot(await analyticsService.getBsi(studentUuid));
    } catch (err) {
      setBsiSnapshot(null);
      showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
    } finally {
      setBsiLoading(false);
    }
  }, [selectedChild?.id, showToast]);

  useEffect(() => {
    fetchBsi();
  }, [fetchBsi]);

  const submitMissionLog = useCallback(
    async (status: MissionDailyStatus, proofUri?: string, note?: string) => {
      const studentUuid = selectedChild?.id;
      if (!todayMission || !studentUuid || !todayMissionDate) {
        return;
      }
      setMissionLogging(true);
      try {
        await missionsService.logMission(todayMission.id, {
          studentUuid,
          date: todayMissionDate,
          status,
          note,
          proofUri,
        });
        setTodayMissionStatus(status);
        setProofModalOpen(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({
          type: 'success',
          message: status === 'done' ? 'Mission marked done!' : 'Mission marked as missed.',
        });
      } catch (err) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
      } finally {
        setMissionLogging(false);
      }
    },
    [todayMission, todayMissionDate, selectedChild?.id, showToast]
  );

  const handleMarkDone = useCallback(() => {
    Alert.alert(
      'Add a photo proof?',
      'Attach a photo as proof for this mission, or mark it done without one.',
      [
        { text: 'Skip', onPress: () => submitMissionLog('done') },
        { text: 'Add Photo', onPress: () => setProofModalOpen(true) },
      ]
    );
  }, [submitMissionLog]);

  const handleMarkMissed = useCallback(() => {
    submitMissionLog('missed');
  }, [submitMissionLog]);

  // ── Behaviour aspects ────────────────────────────────────────────────────
  // Fetches the aspect list from the API and merges it with the local visual
  // property table (colours, icons). Static data is the fallback when offline.
  //
  // Extracted as a stable callback so it can be called both on mount/language
  // change AND imperatively after a rating is saved.
  const fetchAspects = useCallback(() => {
    return behaviourService.getAspects(ratingLang, selectedChild?.id)
      .then(({ apiAspects, maps }) => {
        setAspectApiMaps(maps);
        if (apiAspects.length > 0) {
          // Static data owns visual chrome (softBg, borderColor, accent).
          // API owns everything else: live scores, name, iconName, iconTint (color).
          const staticByCode = new Map(
            DASHBOARD_RATING_ASPECTS.map((a) => [a.id, a]),
          );
          const merged: RatingAspectDefinition[] = apiAspects.map((a) => {
            const s = staticByCode.get(a.id);
            if (s) {
              return {
                ...s,
                name: a.name || s.name,
                iconName: a.iconName || s.iconName,
                iconTint: a.color || s.iconTint,
                accent: a.color || s.accent,
                progressPercent: a.progressPercent,
                dailyRatingSum: a.dailyRatingSum,
                dailyRatingsCount: a.dailyRatingsCount,
              };
            }
            // API aspect has no local visual mapping — derive colours from API color
            return {
              id: a.id,
              name: a.name,
              iconName: a.iconName,
              softBg: `${a.color}18`,
              borderColor: `${a.color}40`,
              accent: a.color,
              iconTint: a.color,
              progressPercent: a.progressPercent,
              dailyRatingSum: a.dailyRatingSum,
              dailyRatingsCount: a.dailyRatingsCount,
            };
          });
          console.log('merged', merged);
          setRatingAspects(merged);
        }
        setAspectsLoading(false);
      })
      .catch(() => {
        // API unavailable — show static aspects so the UI is never empty
        setRatingAspects(DASHBOARD_RATING_ASPECTS);
        setAspectsLoading(false);
      });
  }, [ratingLang, selectedChild?.id]);

  // Initial load + re-fetch whenever the language preference changes.
  useEffect(() => {
    fetchAspects();
  }, [fetchAspects]);

  const fetchWeeklyAspectProgress = useCallback(() => {
    const studentUuid = selectedChild?.id;
    if (!studentUuid) {
      setWeeklyAspectProgressSeries([]);
      return Promise.resolve();
    }

    return behaviourService.getWeeklyAspectProgress(studentUuid)
      .then((series) => {
        setWeeklyAspectProgressSeries(
          series.length > 0 ? series : getWeeklyAspectProgressSeries(studentUuid)
        );
      })
      .catch(() => {
        setWeeklyAspectProgressSeries(getWeeklyAspectProgressSeries(studentUuid));
      });
  }, [selectedChild?.id]);

  useEffect(() => {
    fetchWeeklyAspectProgress();
  }, [fetchWeeklyAspectProgress]);

  // ── AI weekly insights ───────────────────────────────────────────────────
  const fetchAiSummary = useCallback(() => {
    const studentUuid = selectedChild?.id;
    if (!studentUuid) {
      setAiSummary(null);
      setAiSummaryLoading(false);
      return Promise.resolve();
    }
    return aiInsightsService.getParentWeeklySummary(studentUuid, ratingLang)
      .then((summary) => {
        setAiSummary(summary);
      })
      .catch(() => {
        setAiSummary(null);
      })
      .finally(() => {
        setAiSummaryLoading(false);
      });
  }, [selectedChild?.id, ratingLang]);

  useEffect(() => {
    fetchAiSummary();
  }, [fetchAiSummary]);

  // Marks the displayed summary as read once the parent has seen it. Optimistic:
  // flip local state immediately so a refresh doesn't re-show the "NEW" badge.
  const handleAiSummaryRead = useCallback((summaryUuid: string) => {
    setAiSummary((prev) =>
      prev && prev.uuid === summaryUuid ? { ...prev, readStatus: true } : prev
    );
    aiInsightsService.markRead(summaryUuid).catch(() => {
      // Non-critical — silently ignore; it'll be retried on the next view.
    });
  }, []);

  const refreshDashboard = useCallback(
    () => Promise.all([
      fetchAspects(),
      fetchWeeklyAspectProgress(),
      fetchTodayMission(),
      fetchBsi(),
      fetchAiSummary(),
    ]),
    [fetchAspects, fetchWeeklyAspectProgress, fetchTodayMission, fetchBsi, fetchAiSummary]
  );

  const { refreshing, onRefresh } = usePullToRefresh(refreshDashboard);

  const openAspectRating = useCallback((aspect: RatingAspectDefinition) => {
    setRatingSheetAspect(aspect);
  }, []);

  const closeAspectRating = useCallback(() => setRatingSheetAspect(null), []);

  const handleAspectRatingSave = useCallback(
    (payload: AspectRatingPayload) => {
      // Submit to the API in the background; surface errors via toast
      // (success toast is shown inside AspectRatingSheet while the modal is still visible)
      console.log('selectedChild', selectedChild);
      if (selectedChild) {
        const aspectId = aspectApiMaps?.aspectIdMap[payload.aspectId] ?? payload.aspectId;
        console.log('entry of respsect', {
          student_id: selectedChild.id,
          aspect_id: aspectId,
          rating_id: payload.scale,
          reason_chip_ids: payload.reasonIds,
          text_note: payload.note || undefined,
          voice_note_url: payload.voiceNoteUrl,
        });
        behaviourService.submitEntry({
          student_id: selectedChild.id,
          aspect_id: aspectId,
          rating_id: payload.scale,
          reason_chip_ids: payload.reasonIds,
          text_note: payload.note || undefined,
          voice_note_url: payload.voiceNoteUrl,
        })
          .then(() => {
            // Call directly here — the modal may already be closed (last aspect),
            // so a ref+effect approach would miss it due to the timing race.
            fetchAspects();
          })
          .catch((err) => {
            showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
          });
      }
    },
    [selectedChild, aspectApiMaps, fetchAspects, showToast]
  );

  const handleAspectRatingSaveAndNext = useCallback(
    (payload: AspectRatingPayload) => {
      // (success toast is shown inside AspectRatingSheet while the modal is still visible)
      const idx = ratingAspects.findIndex((a) => a.id === payload.aspectId);
      const next =
        idx >= 0 && idx < ratingAspects.length - 1
          ? ratingAspects[idx + 1]
          : null;
      if (next) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRatingSheetAspect(next);
      }
      // Submit to the API in the background; surface errors via toast
      if (selectedChild) {
        const aspectId = aspectApiMaps?.aspectIdMap[payload.aspectId] ?? payload.aspectId;
        behaviourService.submitEntry({
          student_id: selectedChild.id,
          aspect_id: aspectId,
          rating_id: payload.scale,
          reason_chip_ids: payload.reasonIds,
          text_note: payload.note || undefined,
          voice_note_url: payload.voiceNoteUrl,
        })
          .then(() => {
            // Call directly here — works whether the modal has already moved to
            // the next aspect or has been closed (last-aspect race condition).
            fetchAspects();
          })
          .catch((err) => {
            showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedChild, aspectApiMaps, fetchAspects, ratingAspects, showToast]
  );

  const handleVoiceNotePlaceholder = useCallback(() => {
    showToast({
      type: 'info',
      message: 'Voice notes will be available in a future update.',
      durationMs: 3000,
    });
  }, [showToast]);

  const openNotifications = useCallback(() => {
    navigation.navigate('Notifications' as never);
  }, [navigation]);

  // Confidence Factor (CF) is provided as percent (0-100) on this screen.
  // Your scoring system: CF = max(0.4, min(1, N/3)).
  const confidencePercent = clamp(selectedChild?.confidenceIndicator ?? 0, 0, 100);
  const confidenceCF = confidencePercent / 100;

  // Neutral fallback keeps sdsMood/derived styling valid while loading; the card
  // itself only renders once bsiSnapshot is present (see render below).
  const sdsSnapshot = bsiSnapshot ?? { percent: 0, trend: 0 };

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

  // ── Language preference ──────────────────────────────────────────────────
  // Reads the cached language preference on mount and whenever this screen
  // comes back into focus (e.g. after a language change in Profile settings).
  // Falls back to 'en' silently when no preference is saved.
  useFocusEffect(
    useCallback(() => {
      // Resolves the saved behaviour language, or English when none is set,
      // so the rating sheet always has a languageId to fetch translations with.
      languageService.getBehaviourLanguage()
        .then((pref) => {
          if (pref?.code) {
            setRatingLang(pref.code);
            setRatingLanguageId(pref.languageId);
          }
        })
        .catch(() => { });
    }, [])
  );


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

  if (!selectedChild) return null;

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
            onPress={openNotifications}
            activeOpacity={0.78}
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
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            {aspectsLoading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <AspectSkeletonTile
                  key={i}
                  width={i < 3 ? aspectTileMetrics.width3 : aspectTileMetrics.width2}
                />
              ))
            ) : ratingAspects.map((aspect, index) => {
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

        {missionLoading ? (
          <MissionCardSkeleton />
        ) : todayMission ? (
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
              <View style={styles.missionGoalWatermark} pointerEvents="none">
                <Icon2 name="goal" size={100} color={colors.primaryLight} />
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
                    {todayMission.description ?? ''}
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
                          onPress={handleMarkDone}
                          loading={missionLogging}
                          disabled={missionLogging}
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
                          onPress={handleMarkMissed}
                          disabled={missionLogging}
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
        ) : null}

        {bsiLoading ? (
          <BsiCardSkeleton />
        ) : bsiSnapshot ? (
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
                <Text style={[styles.sdsCardTitle, { color: sdsMood.titleColor }]}>DBS Score</Text>
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
        ) : null}

        {aspectsLoading ? (
          <ChartSkeleton />
        ) : (
          <Animated.View
            entering={FadeInDown.delay(100).springify().damping(18).stiffness(220)}
            style={[styles.shadowWrapper, styles.shadowWrapperHoriz]}
          >
            <View style={styles.sectionTight}>
              <WeeklyAspectProgressChart
                aspects={ratingAspects}
                series={weeklyAspectProgressSeries}
              />
            </View>
          </Animated.View>
        )}

        {aiSummaryLoading ? (
          <AiInsightsSkeleton />
        ) : aiSummary ? (
          <Animated.View
            entering={FadeInDown.delay(140).springify().damping(18).stiffness(220)}
            style={[styles.shadowWrapper, styles.shadowWrapperHoriz]}
          >
            <View style={styles.sectionTight}>
              <AIInsightsCard summary={aiSummary} onRead={handleAiSummaryRead} />
            </View>
          </Animated.View>
        ) : null}
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
        orderedAspects={ratingAspects}
        onClose={closeAspectRating}
        onSave={handleAspectRatingSave}
        onSaveAndNext={handleAspectRatingSaveAndNext}
        languageId={ratingLanguageId}
        childName={selectedChild?.name}
      />

      <MissionProofModal
        visible={proofModalOpen}
        submitting={missionLogging}
        onClose={() => setProofModalOpen(false)}
        onSubmit={(proofUri, note) => submitMissionLog('done', proofUri, note)}
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
  missionGoalWatermark: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 136,
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
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
  skeletonTile: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  /* ─── Section skeleton layout atoms ─── */
  skCardPadMd: {
    padding: spacing.md,
  },
  skCardPadLg: {
    padding: spacing.lg,
  },
  skRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  skFlex1: {
    flex: 1,
    minWidth: 0,
  },
  skBlockMd: {
    marginTop: spacing.md,
  },
  skBlockMd0: {
    marginBottom: spacing.md,
  },
  skGap6: {
    marginTop: 6,
  },
  skGap8: {
    marginTop: 8,
  },
  skGapSm: {
    marginTop: spacing.sm,
  },
  skButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  skHintCentered: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  skBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
  },
  skBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  skChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  skeletonTopAccent: {
    height: 3,
    width: '100%',
    backgroundColor: colors.border,
  },
  skeletonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  skeletonNameLine: {
    width: '72%',
    height: 13,
    borderRadius: borderRadius.small,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  skeletonSumLine: {
    width: '40%',
    height: 20,
    borderRadius: borderRadius.small,
    backgroundColor: colors.border,
  },
  skeletonPtsLine: {
    width: '24%',
    height: 8,
    borderRadius: borderRadius.small,
    backgroundColor: colors.border,
    marginTop: 2,
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
