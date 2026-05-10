import React, { useMemo } from 'react';
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
import { AppGradientHeader, Card } from '../components';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
} from '../theme';

type TutorialVideo = {
  id: string;
  title: string;
  description: string;
  duration: string;
  url: string;
  icon: string;
};

const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: 't1',
    title: 'Helping Children Build Daily Routines',
    description: 'Simple ways for parents to create calmer mornings and more predictable study habits.',
    duration: '08:24',
    url: 'https://www.youtube.com/watch?v=ZToicYcHIOU',
    icon: 'family-restroom',
  },
  {
    id: 't2',
    title: 'Positive Reinforcement at Home',
    description: 'Learn how praise, structure and consistency can improve behaviour without pressure.',
    duration: '06:40',
    url: 'https://www.youtube.com/watch?v=68bWJYBv4X8',
    icon: 'thumb-up-alt',
  },
  {
    id: 't3',
    title: 'Supporting Exam Readiness',
    description: 'A short guide to helping children manage revision, breaks, and confidence before tests.',
    duration: '10:12',
    url: 'https://www.youtube.com/watch?v=6M0kQ1m2f3U',
    icon: 'school',
  },
  {
    id: 't4',
    title: 'Healthy Screen-Time Boundaries',
    description: 'Practical ideas for balancing device use with homework, sleep, and offline play.',
    duration: '07:18',
    url: 'https://www.youtube.com/watch?v=QK4qBu4jWeQ',
    icon: 'devices',
  },
];

const TutorialsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

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
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.sectionWrap}>

          {TUTORIAL_VIDEOS.map((video, index) => (
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
          ))}
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
});

export default TutorialsScreen;
