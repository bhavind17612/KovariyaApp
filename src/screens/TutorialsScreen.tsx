import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
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
import {
  AppGradientHeader,
  AppRefreshControl,
  Card,
  SkeletonBox,
  SkeletonShimmer,
} from '../components';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useToast } from '../context/ToastContext';
import { tutorialsService } from '../services/tutorialsService';
import { getDisplayMessage } from '../utils/errorParser';
import type { Tutorial } from '../types/tutorial';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
} from '../theme';

/* ─── Loading skeleton ─── */
function TutorialCardSkeleton() {
  return (
    <View style={styles.videoCard}>
      <View style={styles.skeletonCardBody}>
        <SkeletonBox width="100%" height={190} radius={borderRadius.xl} />
        <SkeletonBox width="80%" height={18} radius={6} style={styles.skeletonGap16} />
        <SkeletonBox width="100%" height={12} radius={4} style={styles.skeletonGap10} />
        <SkeletonBox width="60%" height={12} radius={4} style={styles.skeletonGap8} />
      </View>
      <SkeletonShimmer />
    </View>
  );
}

const TutorialsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
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

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  // Self-contained: updates state + toasts on failure (never rejects), so it's
  // safe for initial load, retry, and pull-to-refresh.
  const loadTutorials = useCallback(() => {
    return tutorialsService
      .getParentTutorials()
      .then((list) => {
        setTutorials(list);
        setError(false);
      })
      .catch((err) => {
        setError(true);
        showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 4000 });
      });
  }, [showToast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadTutorials().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadTutorials]);

  const { refreshing, onRefresh } = usePullToRefresh(loadTutorials);

  const retry = useCallback(() => {
    setLoading(true);
    loadTutorials().finally(() => setLoading(false));
  }, [loadTutorials]);

  const openTutorial = React.useCallback(async (url: string) => {
    await Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        title="Tutorials"
        subtitle="Video guides for parents and learning support"
        rightAccessory={
          <Pressable
            style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}
            accessibilityRole="button"
            accessibilityLabel="Tutorial library"
          >
            <Icon name="ondemand-video" size={23} color="rgba(255, 255, 255, 0.92)" />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        <View style={styles.sectionWrap}>
          {loading && tutorials.length === 0 ? (
            <>
              <TutorialCardSkeleton />
              <TutorialCardSkeleton />
              <TutorialCardSkeleton />
            </>
          ) : error && tutorials.length === 0 ? (
            <View style={styles.stateBlock}>
              <View style={styles.stateIconOrb}>
                <Icon name="cloud-off" size={30} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>Couldn&apos;t load tutorials</Text>
              <Text style={styles.stateSubtitle}>
                Please check your connection and try again.
              </Text>
              <Pressable
                onPress={retry}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : tutorials.length === 0 ? (
            <View style={styles.stateBlock}>
              <View style={styles.stateIconOrb}>
                <Icon name="ondemand-video" size={30} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>No tutorials yet</Text>
              <Text style={styles.stateSubtitle}>
                New video guides for parents will appear here. Pull down to refresh.
              </Text>
            </View>
          ) : (
          tutorials.map((video, index) => (
            <Animated.View
              key={video.id}
              entering={FadeInDown.delay(index * 70).springify().damping(18).stiffness(220)}
              style={styles.videoCard}
            >
              <Card variant="elevated">
                <Pressable
                  onPress={() => {
                    openTutorial(video.url).catch((error) => {
                      console.error('Failed to open tutorial URL:', error);
                    });
                  }}
                  style={({ pressed }) => [
                    styles.videoStage,
                    pressed && styles.videoStagePressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${video.title} on YouTube`}
                >
                  <View style={[styles.thumbnailShell, { backgroundColor: colors.lavenderSoft }]}>
                    <View
                      style={[
                        styles.thumbnailOrbLarge,
                        { backgroundColor: `${colors.primary}22` },
                      ]}
                    />
                    <View
                      style={[
                        styles.thumbnailOrbSmall,
                        { backgroundColor: `${colors.primary}18` },
                      ]}
                    />
                    <View style={[styles.thumbnailIconOrb, { backgroundColor: colors.primary }]}>
                      <Icon name={video.icon} size={24} color={colors.surface} />
                    </View>
                    <View style={styles.thumbnailMetaChip}>
                      <Icon name="smart-display" size={13} color={colors.primary} />
                      <Text style={[styles.thumbnailMetaText, { color: colors.primary }]}>
                        {video.duration}
                      </Text>
                    </View>
                    <View style={styles.playButtonWrap}>
                      <View style={styles.playButton}>
                        <View style={styles.playButtonIcon}>
                          <Icon name="play-arrow" size={24} color={colors.surface} />
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>

                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDescription}>{video.description}</Text>
                </View>
              </Card>
            </Animated.View>
          ))
          )}
        </View>
      </ScrollView>
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
    paddingTop: spacing.sm,
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
  heroCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroIconOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.22)',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    ...textStyles.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  heroBody: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    ...textStyles.headingMedium,
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  heroStatLabel: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: colors.border,
  },
  sectionWrap: {
    marginBottom: spacing.md,
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
  videoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    // marginVertical: spacing.sm,
    // backgroundColor: colors.surface,
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
  videoStage: {
    marginBottom: spacing.md,
  },
  videoStagePressed: {
    opacity: 0.93,
  },
  thumbnailShell: {
    width: '100%',
    height: 190,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  thumbnailOrbLarge: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -42,
    right: -28,
  },
  thumbnailOrbSmall: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    bottom: 16,
    left: 14,
  },
  thumbnailIconOrb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  thumbnailMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  thumbnailMetaText: {
    ...textStyles.caption,
    fontWeight: '800',
  },
  playButtonWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    width: '100%',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  categoryChipText: {
    ...textStyles.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  videoTitle: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
    lineHeight: 24,
  },
  videoDescription: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  videoMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  videoMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
  },
  videoMetaText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  playButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ─── Skeleton ─── */
  skeletonCardBody: {
    padding: spacing.md,
  },
  skeletonGap16: {
    marginTop: spacing.md,
  },
  skeletonGap10: {
    marginTop: 10,
  },
  skeletonGap8: {
    marginTop: 8,
  },
  /* ─── Empty / error states ─── */
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
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
  retryBtnPressed: {
    opacity: 0.82,
  },
  retryBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.surface,
  },
});

export default TutorialsScreen;
