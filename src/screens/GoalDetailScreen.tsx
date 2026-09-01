import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { GoalsStackParamList } from '../navigation/GoalsStack';
import {
  AppGradientHeader,
  AppRefreshControl,
  Card,
  ProgressCircle,
  SkeletonBox,
  SkeletonShimmer,
} from '../components';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { goalsService } from '../services/goalsService';
import { formatAppDate } from '../utils/dateFormat';
import type { GoalStatus } from '../types';
import type { GoalDetail, GoalProgressEntry, GoalProgressSummary } from '../types/goal.api';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
  typography,
} from '../theme';
import { floatingPillShadow, goalStatusFloatingPalette } from '../theme/missionPillStyles';

/**
 * Edit / pause / delete are intentionally not shipped yet. The footer block is
 * kept so enabling them is a one-line change. Note the API rejects updates
 * unless the goal status is `active` or `upcoming`, so any buttons added here
 * must disable themselves for completed, expired and cancelled goals.
 */
const SHOW_GOAL_ACTIONS = false;

type Props = StackScreenProps<GoalsStackParamList, 'GoalDetail'>;

/* ─── helpers (mirror GoalsScreen so list and detail read the same) ─── */

function formatGoalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'active':
      return 'In Progress';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    case 'draft':
      return 'Draft';
    default:
      return status;
  }
}

function goalStatusIcon(status: GoalStatus): string {
  switch (status) {
    case 'active':
      return 'play-circle-outline';
    case 'upcoming':
      return 'schedule';
    case 'completed':
      return 'check-circle';
    case 'expired':
      return 'event-busy';
    case 'cancelled':
      return 'cancel';
    case 'draft':
      return 'edit-note';
    default:
      return 'circle';
  }
}

function progressColor(pct: number, status: GoalStatus): string {
  if (status === 'completed') return colors.growth;
  if (status === 'expired') return colors.error;
  if (status === 'cancelled' || status === 'draft') return colors.textMuted;
  if (pct >= 75) return colors.growth;
  if (pct >= 40) return colors.primary;
  return colors.accent;
}

function rawProgressPercent(goal: GoalDetail): number {
  if (goal.targetRawPoints <= 0) return 0;
  return Math.min(100, Math.round((goal.currentRawPoints / goal.targetRawPoints) * 100));
}

/** Local calendar-day key (YYYY-MM-DD) an entry's timestamp falls on. */
function dayKeyOf(recordedAt: string): string {
  const t = Date.parse(recordedAt.replace(' ', 'T'));
  if (Number.isNaN(t)) return recordedAt.slice(0, 10);
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Time-of-day only, e.g. "11:46 pm" — mirrors formatAppDateTime's clock formatting. */
function formatTimeOnly(recordedAt: string): string {
  const t = Date.parse(recordedAt.replace(' ', 'T'));
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const hours24 = d.getHours();
  const suffix = hours24 < 12 ? 'am' : 'pm';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

type DayGroup = {
  dateKey: string;
  displayDate: string;
  totalPoints: number;
  entries: GoalProgressEntry[];
};

type ChipCount = { label: string; count: number };

/**
 * Tallies the reason chips attached to this goal's contributing entries
 * (client-side — no separate API needed once entries carry `reasonChips`).
 */
function aggregateChips(entries: GoalProgressEntry[]): {
  positive: ChipCount[];
  negative: ChipCount[];
} {
  const positive = new Map<string, number>();
  const negative = new Map<string, number>();
  for (const entry of entries) {
    for (const chip of entry.reasonChips) {
      const bucket = chip.sentiment === 'positive' ? positive : negative;
      bucket.set(chip.text, (bucket.get(chip.text) ?? 0) + 1);
    }
  }
  const toSorted = (map: Map<string, number>): ChipCount[] =>
    Array.from(map, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return { positive: toSorted(positive), negative: toSorted(negative) };
}

/** Buckets entries by calendar day (newest day first, chronological within a day). */
function groupEntriesByDay(entries: GoalProgressEntry[]): DayGroup[] {
  const map = new Map<string, GoalProgressEntry[]>();
  for (const entry of entries) {
    const key = dayKeyOf(entry.recordedAt);
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateKey, dayEntries]) => ({
      dateKey,
      displayDate: formatAppDate(dateKey),
      totalPoints: dayEntries.reduce((sum, e) => sum + e.points, 0),
      entries: [...dayEntries].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1)),
    }));
}

/* ─── Skeleton ─── */

function GoalDetailSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonCard}>
        <SkeletonBox width={148} height={148} radius={74} />
        <SkeletonBox width="55%" height={16} radius={6} style={styles.skeletonGapLg} />
        <SkeletonBox width="40%" height={12} radius={4} style={styles.skeletonGapSm} />
        <SkeletonShimmer />
      </View>
      <View style={styles.skeletonCard}>
        <SkeletonBox width="100%" height={52} radius={borderRadius.large} />
        <SkeletonBox
          width="100%"
          height={56}
          radius={borderRadius.large}
          style={styles.skeletonGapSm}
        />
        <SkeletonShimmer />
      </View>
    </View>
  );
}

/* ─── Screen ─── */

export default function GoalDetailScreen({ route }: Props) {
  const { goalId } = route.params;
  const insets = useSafeAreaInsets();

  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [summary, setSummary] = useState<GoalProgressSummary | null>(null);
  const [entries, setEntries] = useState<GoalProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progressPage, setProgressPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Self-contained: sets its own state and never rejects, so the same function
  // serves the initial load, the retry button and pull-to-refresh.
  const loadGoal = useCallback(() => {
    return goalsService
      .getGoal(goalId)
      .then(async (detail) => {
        setGoal(detail);
        setError(false);
        // Best-effort: the service swallows its own failures and returns empties,
        // so a closed progress route hides the section instead of failing the page.
        const progress = await goalsService.getGoalProgress(goalId, 1);
        setSummary(progress.summary);
        setEntries(progress.entries);
        setProgressPage(1);
      })
      .catch(() => {
        setError(true);
      });
  }, [goalId]);

  // Fetches the next page of activity and appends it. `summary.hasMore` is a
  // best-effort flag today (see goalsService.getGoalProgress) — it's true
  // whenever the API returns a full page, so this stays correct even before
  // the backend adds real pagination metadata.
  const loadMoreEntries = useCallback(() => {
    if (loadingMore || !summary?.hasMore) return;
    setLoadingMore(true);
    const nextPage = progressPage + 1;
    goalsService
      .getGoalProgress(goalId, nextPage)
      .then((progress) => {
        setEntries((prev) => [...prev, ...progress.entries]);
        if (progress.summary) setSummary(progress.summary);
        setProgressPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  }, [goalId, loadingMore, progressPage, summary?.hasMore]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadGoal().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadGoal]);

  const { refreshing, onRefresh } = usePullToRefresh(loadGoal);

  const retry = useCallback(() => {
    setLoading(true);
    loadGoal().finally(() => setLoading(false));
  }, [loadGoal]);

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  const dayGroups = useMemo(() => groupEntriesByDay(entries), [entries]);
  const chipCounts = useMemo(() => aggregateChips(entries), [entries]);

  const pct = goal ? rawProgressPercent(goal) : 0;
  const gaugeColor = goal ? progressColor(pct, goal.status) : colors.primary;
  const statusPal = goal ? goalStatusFloatingPalette(goal.status) : null;
  const headerSubtitle = goal
    ? [
        goal.aspects.map((a) => a.name).join(', ') || null,
        formatGoalStatusLabel(goal.status),
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Goal details';

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        leadingMode="back"
        title={goal?.title ?? 'Goal'}
        subtitle={headerSubtitle}
      />

      {loading && !goal ? (
        <GoalDetailSkeleton />
      ) : error && !goal ? (
        <View style={styles.stateBlock}>
          <View style={styles.stateIconOrb}>
            <Icon name="cloud-off" size={30} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Couldn&apos;t load this goal</Text>
          <Text style={styles.stateSubtitle}>
            Please check your connection and try again.
          </Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressedOpacity]}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : goal ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* ── Progress hero ── */}
          <Animated.View
            entering={FadeInDown.springify().damping(18).stiffness(220)}
            style={styles.shadowWrapper}
          >
            <Card variant="elevated" style={styles.heroCard}>
              {goal.aspects.length > 0 ? (
                <View style={styles.aspectChipRow}>
                  {goal.aspects.map((aspect, i) => {
                    const tint = aspect.color || colors.primary;
                    return (
                      <View
                        key={`${aspect.name}-${i}`}
                        style={[
                          styles.aspectChip,
                          { backgroundColor: `${tint}14`, borderColor: `${tint}40` },
                        ]}
                      >
                        <Icon name={aspect.iconName || 'category'} size={13} color={tint} />
                        <Text style={[styles.aspectChipText, { color: tint }]} numberOfLines={1}>
                          {aspect.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.gaugeWrap}>
                <ProgressCircle
                  size={148}
                  strokeWidth={12}
                  progress={pct}
                  color={gaugeColor}
                  backgroundColor={colors.surfaceMuted}
                  percentageStyle={styles.gaugePercent}
                />
              </View>

              <Text style={styles.pointsLine}>
                {goal.currentRawPoints}
                <Text style={styles.pointsLineMuted}> / {goal.targetRawPoints} pts</Text>
              </Text>

              {summary ? (
                <Text style={styles.gaugeMeta}>
                  {goal.status === 'completed'
                    ? 'Goal reached'
                    : summary.daysRemaining > 0
                      ? `${summary.daysRemaining} ${summary.daysRemaining === 1 ? 'day' : 'days'} remaining`
                      : 'Past the end date'}
                </Text>
              ) : null}

              {statusPal ? (
                <View
                  style={[
                    styles.statusPill,
                    floatingPillShadow(statusPal.shadowColor),
                    { backgroundColor: statusPal.bg },
                  ]}
                >
                  <Icon name={goalStatusIcon(goal.status)} size={14} color={statusPal.text} />
                  <Text style={[styles.statusPillText, { color: statusPal.text }]}>
                    {formatGoalStatusLabel(goal.status)}
                  </Text>
                </View>
              ) : null}

              {goal.description ? (
                <Text style={styles.heroDescription}>{goal.description}</Text>
              ) : null}
            </Card>
          </Animated.View>

          {/* ── Reward + schedule ── */}
          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(18).stiffness(220)}
            style={styles.shadowWrapper}
          >
            <Card variant="elevated" style={styles.sectionCard}>
              <View style={styles.rewardStrip}>
                <View style={styles.rewardIconWrap}>
                  <Icon name="emoji-events" size={18} color={colors.accent} />
                </View>
                <View style={styles.rewardTextWrap}>
                  <Text style={styles.rewardLabel}>Reward</Text>
                  <Text style={styles.rewardText} numberOfLines={2}>
                    {goal.rewardName}
                    {goal.rewardValue?.trim() ? ` · ${goal.rewardValue.trim()}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.dateStrip}>
                <View style={styles.dateStripItem}>
                  <Text style={styles.dateStripLabel}>Starts</Text>
                  <Text style={styles.dateStripValue}>{formatAppDate(goal.startDate)}</Text>
                </View>
                <View style={styles.dateStripDivider} />
                <View style={styles.dateStripItem}>
                  <Text style={styles.dateStripLabel}>Ends</Text>
                  <Text style={styles.dateStripValue}>{formatAppDate(goal.endDate)}</Text>
                </View>
              </View>

              {summary?.projectedCompletion && goal.status !== 'completed' ? (
                <View style={styles.projectionRow}>
                  <Icon name="trending-up" size={15} color={colors.growth} />
                  <Text style={styles.projectionText}>
                    On track to finish by {formatAppDate(summary.projectedCompletion)}
                  </Text>
                </View>
              ) : null}
            </Card>
          </Animated.View>

          {/* ── Full activity log, grouped by day ── */}
          {dayGroups.length > 0 ? (
            <Animated.View
              entering={FadeInDown.delay(140).springify().damping(18).stiffness(220)}
              style={styles.shadowWrapper}
            >
              <Card variant="elevated" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionIconOrb}>
                    <Icon name="timeline" size={18} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.sectionTitle}>Full Activity Log</Text>
                  {summary ? (
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {summary.totalCount ?? summary.entriesCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.sectionHint}>Every logged rating and note, day by day</Text>

                <View style={styles.dayGroupStack}>
                  {dayGroups.map((day) => {
                    const dayPositive = day.totalPoints >= 0;
                    return (
                      <View key={day.dateKey} style={styles.dayGroupCard}>
                        <View style={styles.dayGroupHeader}>
                          <Text style={styles.dayGroupDate}>{day.displayDate}</Text>
                          <View
                            style={[
                              styles.dayGroupTotalPill,
                              {
                                backgroundColor: dayPositive
                                  ? 'rgba(63, 169, 122, 0.12)'
                                  : 'rgba(235, 87, 87, 0.09)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayGroupTotalText,
                                { color: dayPositive ? colors.growth : colors.error },
                              ]}
                            >
                              {dayPositive ? `+${day.totalPoints}` : day.totalPoints} pts
                            </Text>
                          </View>
                        </View>

                        {day.entries.map((entry) => {
                          const positive = entry.points >= 0;
                          const aspectTintEntry = entry.aspectColor || colors.primary;
                          return (
                            <View key={entry.id} style={styles.entryCard}>
                              <View style={styles.entryTopRow}>
                                <Text style={styles.entryWhen}>
                                  {formatTimeOnly(entry.recordedAt)}
                                </Text>
                                {entry.aspectName ? (
                                  <View
                                    style={[
                                      styles.entryAspectChip,
                                      {
                                        backgroundColor: `${aspectTintEntry}14`,
                                        borderColor: `${aspectTintEntry}40`,
                                      },
                                    ]}
                                  >
                                    <Icon
                                      name={entry.aspectIconName || 'category'}
                                      size={11}
                                      color={aspectTintEntry}
                                    />
                                    <Text
                                      style={[styles.entryAspectChipText, { color: aspectTintEntry }]}
                                      numberOfLines={1}
                                    >
                                      {entry.aspectName}
                                    </Text>
                                  </View>
                                ) : null}
                                <View style={{ flex: 1 }} />
                                <View
                                  style={[
                                    styles.entryPointsBadge,
                                    {
                                      backgroundColor: positive
                                        ? 'rgba(63, 169, 122, 0.12)'
                                        : 'rgba(235, 87, 87, 0.09)',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.entryPointsText,
                                      { color: positive ? colors.growth : colors.error },
                                    ]}
                                  >
                                    {positive ? `+${entry.points}` : entry.points}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.entryLabel} numberOfLines={1}>
                                {entry.ratingLabel || 'Rating logged'}
                              </Text>

                              {entry.reasonChips.length > 0 ? (
                                <View style={styles.entryChipsRow}>
                                  {entry.reasonChips.map((chip, ci) => (
                                    <View
                                      key={`${entry.id}-chip-${ci}`}
                                      style={[
                                        styles.entryChip,
                                        chip.sentiment === 'positive'
                                          ? styles.entryChipPos
                                          : styles.entryChipNeg,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.entryChipText,
                                          {
                                            color:
                                              chip.sentiment === 'positive' ? '#166534' : '#991B1B',
                                          },
                                        ]}
                                      >
                                        {chip.text}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}

                              {entry.note ? (
                                <View style={styles.entryNoteRow}>
                                  <Icon
                                    name="chat-bubble-outline"
                                    size={12}
                                    color={colors.textSecondary}
                                  />
                                  <Text style={styles.entryNote}>{entry.note}</Text>
                                </View>
                              ) : null}

                              {entry.voiceNoteUrl ? (
                                <View style={styles.entryVoiceRow}>
                                  <Icon name="mic" size={12} color={colors.primary} />
                                  <Text style={styles.entryVoiceText}>Voice note attached</Text>
                                </View>
                              ) : null}

                              <Text style={styles.entryTotal}>
                                Running total: {entry.runningTotal}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>

                {summary?.hasMore ? (
                  <Pressable
                    onPress={loadMoreEntries}
                    disabled={loadingMore}
                    style={({ pressed }) => [
                      styles.loadMoreBtn,
                      pressed && styles.pressedOpacity,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Load more activity"
                  >
                    <Text style={styles.loadMoreBtnText}>
                      {loadingMore ? 'Loading…' : 'Load more logs'}
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            </Animated.View>
          ) : null}

          {/* ── Behaviour chips during goal period ── */}
          {chipCounts.positive.length > 0 || chipCounts.negative.length > 0 ? (
            <Animated.View
              entering={FadeInDown.delay(180).springify().damping(18).stiffness(220)}
              style={styles.shadowWrapper}
            >
              <Card variant="elevated" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionIconOrb}>
                    <Icon name="sell" size={18} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.sectionTitle}>Behaviour Chips During Goal Period</Text>
                </View>
                <Text style={styles.sectionHint}>
                  Reason chips selected on entries that moved this goal
                </Text>

                {chipCounts.positive.length > 0 ? (
                  <>
                    <Text style={styles.chipBlockLabel}>Positive chips</Text>
                    <View style={styles.chipCountRow}>
                      {chipCounts.positive.map((chip) => (
                        <View key={chip.label} style={[styles.chipCount, styles.chipCountPos]}>
                          <Text style={[styles.chipCountText, { color: '#166534' }]}>
                            {chip.label} ×{chip.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                {chipCounts.negative.length > 0 ? (
                  <>
                    <Text style={[styles.chipBlockLabel, chipCounts.positive.length > 0 && styles.chipBlockLabelTight]}>
                      Negative chips
                    </Text>
                    <View style={styles.chipCountRow}>
                      {chipCounts.negative.map((chip) => (
                        <View key={chip.label} style={[styles.chipCount, styles.chipCountNeg]}>
                          <Text style={[styles.chipCountText, { color: '#991B1B' }]}>
                            {chip.label} ×{chip.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
              </Card>
            </Animated.View>
          ) : null}

          {/* ── Eligibility explanation ── */}
          {goal.eligibilityExplanation ? (
            <Animated.View
              entering={FadeInDown.delay(220).springify().damping(18).stiffness(220)}
              style={styles.shadowWrapper}
            >
              <Card variant="elevated" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionIconOrb}>
                    <Icon name="rule" size={18} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.sectionTitle}>Eligibility Explanation</Text>
                </View>
                <View
                  style={[
                    styles.eligibilityBadge,
                    goal.rewardAchieved ? styles.eligibilityBadgeAchieved : styles.eligibilityBadgeMissed,
                  ]}
                >
                  <Icon
                    name={goal.rewardAchieved ? 'check-circle' : 'cancel'}
                    size={14}
                    color={goal.rewardAchieved ? colors.growth : colors.error}
                  />
                  <Text
                    style={[
                      styles.eligibilityBadgeText,
                      { color: goal.rewardAchieved ? colors.growth : colors.error },
                    ]}
                  >
                    {goal.rewardAchieved ? 'Reward achieved' : 'Reward not achieved'}
                  </Text>
                </View>
                <Text style={styles.eligibilityText}>{goal.eligibilityExplanation}</Text>
              </Card>
            </Animated.View>
          ) : null}

          {/* ── Improvement note for next attempt ── */}
          {goal.improvementNote ? (
            <Animated.View
              entering={FadeInDown.delay(260).springify().damping(18).stiffness(220)}
              style={styles.shadowWrapper}
            >
              <Card variant="elevated" style={styles.sectionCard}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionIconOrb}>
                    <Icon name="edit-note" size={18} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.sectionTitle}>Improvement Note for Next Attempt</Text>
                </View>
                <View style={styles.improvementRow}>
                  <Icon name="arrow-right" size={14} color={colors.primary} />
                  <Text style={styles.improvementText}>{goal.improvementNote}</Text>
                </View>
              </Card>
            </Animated.View>
          ) : null}

          {SHOW_GOAL_ACTIONS ? <View style={styles.actionsRow} /> : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pressedOpacity: { opacity: 0.88 },

  /* Card wrapper — same treatment GoalsScreen gives its cards. */
  shadowWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginVertical: spacing.xs,
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

  /* ─── Hero ─── */
  heroCard: {
    marginVertical: 0,
    alignItems: 'center',
  },
  aspectChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
  },
  aspectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aspectChipText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  gaugeWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  gaugePercent: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
  },
  pointsLine: {
    ...textStyles.bodyLarge,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 17,
  },
  pointsLineMuted: {
    fontWeight: '700',
    color: colors.textSecondary,
    fontSize: 15,
  },
  gaugeMeta: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  statusPillText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroDescription: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.md,
  },

  /* ─── Section shell ─── */
  sectionCard: { marginVertical: 0 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIconOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: '800',
    color: colors.ink,
    flex: 1,
  },
  sectionHint: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  countPill: {
    backgroundColor: colors.lavenderSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  countPillText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  /* ─── Reward + schedule ─── */
  rewardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.peachSoft,
    borderRadius: borderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 160, 74, 0.18)',
  },
  rewardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTextWrap: { flex: 1, minWidth: 0 },
  rewardLabel: {
    ...textStyles.caption,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#9A5D14',
  },
  rewardText: {
    ...textStyles.bodyMedium,
    color: '#7A4E18',
    fontWeight: '700',
    marginTop: 1,
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dateStripItem: { flex: 1, alignItems: 'center' },
  dateStripLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateStripValue: {
    ...textStyles.bodyMedium,
    color: colors.ink,
    fontWeight: '700',
  },
  dateStripDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  projectionText: {
    ...textStyles.caption,
    color: colors.growth,
    fontWeight: '700',
    flex: 1,
  },

  /* ─── Activity log, grouped by day ─── */
  dayGroupStack: { gap: spacing.md },
  dayGroupCard: {
    borderRadius: borderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: '#FAFBFF',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayGroupDate: {
    ...textStyles.bodyMedium,
    fontWeight: '800',
    color: colors.ink,
  },
  dayGroupTotalPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  dayGroupTotalText: {
    fontSize: 12,
    fontWeight: '800',
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  entryAspectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
    paddingVertical: 3,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  entryAspectChipText: {
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },
  entryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  entryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  entryChipPos: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(22,163,74,0.25)',
  },
  entryChipNeg: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220,38,38,0.22)',
  },
  entryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  entryVoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  entryVoiceText: {
    ...textStyles.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lavenderSoft,
  },
  loadMoreBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ─── Behaviour chips summary ─── */
  chipBlockLabel: {
    ...textStyles.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipBlockLabelTight: { marginTop: spacing.md },
  chipCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipCount: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCountPos: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(22,163,74,0.25)',
  },
  chipCountNeg: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220,38,38,0.22)',
  },
  chipCountText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* ─── Eligibility explanation ─── */
  eligibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  eligibilityBadgeAchieved: { backgroundColor: 'rgba(63, 169, 122, 0.12)' },
  eligibilityBadgeMissed: { backgroundColor: 'rgba(235, 87, 87, 0.09)' },
  eligibilityBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  eligibilityText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  /* ─── Improvement note ─── */
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.lavenderSoft,
    borderRadius: borderRadius.large,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,106,232,0.14)',
  },
  improvementText: {
    ...textStyles.bodyMedium,
    color: colors.ink,
    lineHeight: 20,
    flex: 1,
  },

  entryPointsBadge: {
    minWidth: 44,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  entryPointsText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  entryLabel: {
    ...textStyles.bodyMedium,
    color: colors.ink,
    fontWeight: '700',
  },
  entryWhen: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  entryNote: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  entryTotal: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    flexShrink: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  /* ─── Skeleton ─── */
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginVertical: spacing.xs,
    overflow: 'hidden',
    alignItems: 'center',
  },
  skeletonGapLg: { marginTop: spacing.lg },
  skeletonGapSm: { marginTop: spacing.sm },

  /* ─── States ─── */
  stateBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateIconOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
  },
  stateSubtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.surface,
  },
});
