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
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppGradientHeader, AppRefreshControl, Card, SkeletonBox, SkeletonShimmer } from '../components';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useToast } from '../context/ToastContext';
import { useChildren } from '../context/ChildrenContext';
import { badgesService } from '../services/badgesService';
import { getDisplayMessage } from '../utils/errorParser';
import type { StudentBadge } from '../types/badge';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
} from '../theme';

/** Android's blur is noticeably stronger, so it needs a smaller radius to match iOS. */
const BADGE_BLUR_RADIUS = Platform.OS === 'ios' ? 20 : 14;

/* ─── Reward image (remote, with graceful fallback) ─── */

function RewardImage({ uri, earned }: { uri: string | null; earned: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={styles.imageFallback}>
        <Icon name="emoji-events" size={64} color={earned ? colors.accent : colors.primary} />
      </View>
    );
  }
  return (
    <Animated.Image
      entering={FadeIn.duration(450)}
      source={{ uri }}
      style={styles.badgeImage}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

/* ─── Reward tile ─── */

type RewardTileProps = {
  reward: StudentBadge;
  index: number;
};

const RewardTile: React.FC<RewardTileProps> = ({ reward, index }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(120 + index * 70)
        .springify()
        .damping(18)
        .stiffness(220)}
      style={styles.tileWrapper}
    >
      <Card variant="elevated" padding={0} style={styles.tileCard}>
        {/* Full-bleed reward image fills the whole card. Earned rewards show it
            as-is — nothing is drawn over the artwork. */}
        <RewardImage uri={reward.imageUrl} earned={reward.earned} />

        {reward.earned ? null : (
          /* Locked overlay: blurred badge art + scrim keeps the mission text readable */
          <View pointerEvents="none" style={styles.lockOverlay}>
            {reward.imageUrl ? (
              <Image
                source={{ uri: reward.imageUrl }}
                style={StyleSheet.absoluteFill}
                blurRadius={BADGE_BLUR_RADIUS}
                resizeMode="cover"
              />
            ) : null}
            <LinearGradient
              colors={['rgba(13,13,13,0.30)', 'rgba(13,13,13,0.68)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.lockContent}>
              <View style={styles.lockCircle}>
                <Icon name="lock" size={22} color={colors.surface} />
              </View>
              <Text style={styles.lockText} numberOfLines={2}>
                {reward.label}
              </Text>
              {reward.description ? (
                <Text style={styles.lockMissionText} numberOfLines={3}>
                  {reward.description}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
};

/* ─── Skeleton ─── */

function HeroSkeleton() {
  return (
    <View style={[styles.heroCard, styles.heroSkeleton]}>
      <SkeletonBox width={48} height={48} radius={24} />
      <View style={styles.heroSkeletonBody}>
        <SkeletonBox width="60%" height={16} />
        <SkeletonBox width="86%" height={11} style={styles.gap8} />
        <SkeletonBox width="100%" height={8} radius={borderRadius.full} style={styles.gap12} />
      </View>
      <SkeletonShimmer />
    </View>
  );
}

function RewardTileSkeleton() {
  return (
    <View style={styles.tileWrapper}>
      <View style={[styles.tileCard, styles.tileCardSkeleton]}>
        {/* Full-card fill matches the live image tile (no layout shift) */}
        <SkeletonBox width="100%" height="100%" radius={borderRadius.large} />
        <SkeletonShimmer />
      </View>
    </View>
  );
}

function BadgesGridSkeleton() {
  return (
    <View>
      <HeroSkeleton />
      <View style={styles.gridContainer}>
        {Array.from({ length: 6 }).map((_, i) => (
          <RewardTileSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

/* ─── Hero ─── */

function RewardsHero({ total, earned }: { total: number; earned: number }) {
  const remaining = Math.max(0, total - earned);
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
  return (
    <Animated.View entering={FadeInDown.springify().damping(18).stiffness(220)}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconOrb}>
            <Icon name="emoji-events" size={26} color={colors.accent} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>
              {earned > 0 ? 'Your reward collection' : 'Rewards to unlock'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {earned > 0
                ? `${earned} earned${remaining > 0 ? ` · ${remaining} more to go` : ' — collection complete!'}`
                : 'Show kindness, respect and responsibility to start earning these.'}
            </Text>
          </View>
        </View>

        <View style={styles.heroProgressRow}>
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.heroProgressLabel}>
            {earned}/{total}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

/* ─── Screen ─── */

const BadgesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { selectedChildId } = useChildren();

  const [rewards, setRewards] = useState<StudentBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  // Self-contained: updates state + toasts on failure (never rejects), so it's
  // safe to use directly for initial load, retry, and pull-to-refresh.
  const loadRewards = useCallback(() => {
    if (!selectedChildId) {
      setRewards([]);
      setError(false);
      return Promise.resolve();
    }
    return badgesService
      .getStudentBadges(selectedChildId)
      .then((list) => {
        setRewards(list);
        setError(false);
      })
      .catch((err) => {
        setError(true);
        showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
      });
  }, [selectedChildId, showToast]);

  // Initial load — keeps skeleton up until the first response resolves.
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadRewards().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadRewards]);

  const { refreshing, onRefresh } = usePullToRefresh(loadRewards);

  const retry = useCallback(() => {
    setLoading(true);
    loadRewards().finally(() => setLoading(false));
  }, [loadRewards]);

  const earnedCount = useMemo(() => rewards.filter((r) => r.earned).length, [rewards]);

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader title="Badges" subtitle="Achievements and behavioral milestones" />

      {loading ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <BadgesGridSkeleton />
        </ScrollView>
      ) : error && rewards.length === 0 ? (
        <View style={styles.centeredState}>
          <View style={styles.errorIconOrb}>
            <Icon name="cloud-off" size={30} color={colors.primary} />
          </View>
          <Text style={styles.errorTitle}>Couldn&apos;t load rewards</Text>
          <Text style={styles.errorSubtitle}>Please check your connection and try again.</Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <RewardsHero total={rewards.length} earned={earnedCount} />

          {rewards.length === 0 ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
              <View style={styles.emptyIconOrb}>
                <Icon name="emoji-events" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No rewards yet</Text>
              <Text style={styles.emptySubtitle}>
                New badges to earn will appear here. Pull down to refresh.
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.gridContainer}>
              {rewards.map((reward, index) => (
                <RewardTile key={reward.id} reward={reward} index={index} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  /* ─── Hero ─── */
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIconOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    ...textStyles.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: colors.surface,
  },
  heroSubtitle: {
    ...textStyles.caption,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 17,
    marginTop: 3,
    fontWeight: '500',
  },
  heroProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  heroProgressLabel: {
    ...textStyles.caption,
    color: colors.surface,
    fontWeight: '800',
    fontSize: 12,
  },

  /* ─── Grid ─── */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  tileWrapper: {
    width: '48%',
    borderRadius: borderRadius.large,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
    }),
  },
  tileCard: {
    marginVertical: 0,
    padding: 0,
    // Match the reward artwork's native ratio (1099 x 1431) so the whole image
    // shows with no cropping.
    aspectRatio: 1099 / 1431,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    position: 'relative',
  },
  tileCardSkeleton: {
    backgroundColor: colors.surface,
    justifyContent: 'flex-start',
  },
  badgeImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lockContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  lockCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,13,13,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  lockText: {
    ...textStyles.caption,
    color: colors.surface,
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  lockMissionText: {
    ...textStyles.caption,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* ─── Skeleton helpers ─── */
  heroSkeleton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  heroSkeletonBody: {
    flex: 1,
    minWidth: 0,
  },
  gap8: {
    marginTop: 8,
  },
  gap12: {
    marginTop: 12,
  },

  /* ─── Empty state ─── */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIconOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
  },
  emptySubtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  /* ─── Error state ─── */
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorIconOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorTitle: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
  },
  errorSubtitle: {
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
  retryBtnPressed: {
    opacity: 0.82,
  },
  retryBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.surface,
  },
});

export default BadgesScreen;
