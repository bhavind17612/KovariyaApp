import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppGradientHeader, AppRefreshControl, Card, SkeletonBox, SkeletonShimmer } from '../components';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useChildren } from '../context/ChildrenContext';
import { useAnnouncementsBadge } from '../context/AnnouncementsContext';
import { announcementsService } from '../services/announcementsService';
import type { Announcement } from '../types/announcement.api';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
} from '../theme';

type AnnouncementSection = {
  id: string;
  label: string;
  items: Announcement[];
};

/** Monday-start of the calendar week containing `d`. */
function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - diffToMonday);
  return date;
}

function weekBucketLabel(publishedAt: string, now: Date): string {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return 'Earlier';
  const weeksDiff = Math.round(
    (startOfWeek(now).getTime() - startOfWeek(new Date(t)).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  if (weeksDiff <= 0) return 'This Week';
  if (weeksDiff === 1) return 'Last Week';
  return 'Earlier';
}

/** Buckets announcements into This Week / Last Week / Earlier, newest section first. */
function groupAnnouncementsByWeek(items: Announcement[]): AnnouncementSection[] {
  const now = new Date();
  const buckets = new Map<string, Announcement[]>();
  for (const item of items) {
    const label = weekBucketLabel(item.publishedAt, now);
    const list = buckets.get(label);
    if (list) list.push(item);
    else buckets.set(label, [item]);
  }
  return ['This Week', 'Last Week', 'Earlier']
    .filter((label) => buckets.has(label))
    .map((label) => ({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      items: buckets.get(label) as Announcement[],
    }));
}

/** Splits an ISO timestamp into the day/month/time parts the date pill shows. */
function formatAnnouncementDateParts(publishedAt: string): {
  day: string;
  month: string;
  time: string;
} {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) {
    return { day: '--', month: '', time: '' };
  }
  const d = new Date(t);
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
  const hours24 = d.getHours();
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const time = `${hours12}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
  return { day, month, time };
}

function AnnouncementsSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <SkeletonBox width="35%" height={12} radius={4} />
          <SkeletonBox width="100%" height={56} radius={borderRadius.large} style={styles.skeletonGapSm} />
          <SkeletonBox width="100%" height={56} radius={borderRadius.large} style={styles.skeletonGapSm} />
          <SkeletonShimmer />
        </View>
      ))}
    </View>
  );
}

const AnnouncementsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { selectedChildId } = useChildren();
  const { markAllRead } = useAnnouncementsBadge();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Self-contained: sets its own state and never rejects, so the same function
  // serves the initial load, the retry button and pull-to-refresh.
  const loadAnnouncements = useCallback(() => {
    if (!selectedChildId) {
      setItems([]);
      setHasMore(false);
      setError(false);
      return Promise.resolve();
    }
    return announcementsService
      .getAnnouncements(selectedChildId, 1)
      .then((result) => {
        setItems(result.announcements);
        setHasMore(result.hasMore);
        setPage(1);
        setError(false);
      })
      .catch(() => {
        setItems([]);
        setHasMore(false);
        setError(true);
      });
  }, [selectedChildId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAnnouncements().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadAnnouncements]);

  const { refreshing, onRefresh } = usePullToRefresh(loadAnnouncements);

  const retry = useCallback(() => {
    setLoading(true);
    loadAnnouncements().finally(() => setLoading(false));
  }, [loadAnnouncements]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !selectedChildId) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    announcementsService
      .getAnnouncements(selectedChildId, nextPage)
      .then((result) => {
        setItems((prev) => [...prev, ...result.announcements]);
        setHasMore(result.hasMore);
        setPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, selectedChildId, page]);

  // Clears the sidebar red dot every time the parent opens this screen.
  useFocusEffect(
    React.useCallback(() => {
      markAllRead();
    }, [markAllRead])
  );

  useFocusEffect(
    React.useCallback(() => {
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

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  const sections = useMemo(() => groupAnnouncementsByWeek(items), [items]);

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        title="Announcements"
        subtitle="School updates, events and parent notices"
        rightAccessory={
          <Pressable
            style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Announcement actions"
          >
            <Icon name="edit-note" size={24} color="rgba(255, 255, 255, 0.92)" />
          </Pressable>
        }
      />

      {loading && items.length === 0 ? (
        <AnnouncementsSkeleton />
      ) : error && items.length === 0 ? (
        <View style={styles.stateBlock}>
          <View style={styles.stateIconOrb}>
            <Icon name="cloud-off" size={30} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Couldn&apos;t load announcements</Text>
          <Text style={styles.stateSubtitle}>Please check your connection and try again.</Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressedOpacity]}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateBlock}>
          <View style={styles.stateIconOrb}>
            <Icon name="campaign" size={30} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>No announcements yet</Text>
          <Text style={styles.stateSubtitle}>
            School updates and notices for your child will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {sections.map((section, sectionIndex) => (
            <Animated.View
              key={section.id}
              entering={FadeInDown.delay(sectionIndex * 70).springify().damping(18).stiffness(220)}
            >
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <Animated.View
                  entering={FadeInDown.delay(sectionIndex * 70)
                    .springify()
                    .damping(18)
                    .stiffness(220)}
                  style={styles.shadowWrapper}
                >
                  <Card variant="elevated" style={styles.sectionCard}>
                    {section.items.map((item, index) => {
                      const { day, month, time } = formatAnnouncementDateParts(item.publishedAt);
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.announcementRow,
                            index < section.items.length - 1 ? styles.announcementRowBorder : null,
                          ]}
                        >
                          <View style={styles.dateRail}>
                            <LinearDatePill day={day} month={month} />
                            <Text style={styles.timeText}>{time}</Text>
                          </View>

                          <View style={styles.contentColumn}>
                            <Text style={styles.announcementTitle}>{item.title}</Text>
                            <Text style={styles.announcementSummary}>{item.summary}</Text>

                            {item.attachmentThumbnails.length ? (
                              <View style={styles.mediaStrip}>
                                {item.attachmentThumbnails.map((url, mediaIndex) => (
                                  <Image
                                    key={`${item.id}-media-${mediaIndex}`}
                                    source={{ uri: url }}
                                    style={[
                                      styles.mediaThumb,
                                      styles.mediaThumbStacked,
                                      mediaIndex === 0 ? styles.mediaThumbFirst : null,
                                    ]}
                                  />
                                ))}
                              </View>
                            ) : null}

                            {item.audience ? (
                              <View style={styles.audienceRow}>
                                <Icon name="person-outline" size={14} color={colors.textMuted} />
                                <Text style={styles.audienceText}>{item.audience}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                </Animated.View>
              </View>
            </Animated.View>
          ))}

          {hasMore ? (
            <Pressable
              onPress={loadMore}
              disabled={loadingMore}
              style={({ pressed }) => [styles.loadMoreBtn, pressed && styles.pressedOpacity]}
              accessibilityRole="button"
              accessibilityLabel="Load more announcements"
            >
              <Text style={styles.loadMoreBtnText}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function LinearDatePill({ day, month }: { day: string; month: string }) {
  return (
    <View style={styles.datePill}>
      <Text style={styles.dateDay}>{day}</Text>
      <Text style={styles.dateMonth}>{month}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  pressedOpacity: {
    opacity: 0.88,
  },
  headerAction: {
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
  headerActionPressed: {
    opacity: 0.88,
  },
  sectionWrap: {
    marginBottom: spacing.md,
  },
  shadowWrapper: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
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
  sectionLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sectionCard: {
    backgroundColor: 'transparent'
  },
  announcementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  announcementRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dateRail: {
    width: 58,
    alignItems: 'center',
    flexShrink: 0,
  },
  datePill: {
    width: 50,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
  },
  dateDay: {
    ...textStyles.headingMedium,
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  dateMonth: {
    ...textStyles.caption,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  contentColumn: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  announcementTitle: {
    ...textStyles.bodyLarge,
    color: colors.ink,
    fontWeight: '800',
    lineHeight: 22,
  },
  announcementSummary: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  mediaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingLeft: 4,
  },
  mediaThumb: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceMuted,
  },
  mediaThumbStacked: {
    marginLeft: -10,
  },
  mediaThumbFirst: {
    marginLeft: 0,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  audienceText: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  skeletonGapSm: { marginTop: spacing.sm },
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

export default AnnouncementsScreen;
