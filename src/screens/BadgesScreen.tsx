import React, { useEffect, useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AppGradientHeader, Card } from '../components';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
} from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

type BadgeData = {
  id: string;
  name: string;
  image: any;
  earned: boolean;
  earnedDate?: string;
  description: string;
};

// We mock some data using the two available images.
const BADGES: BadgeData[] = [
  {
    id: 'b1',
    name: 'Respect',
    image: require('../../assets/badges/respect.webp'),
    earned: true,
    earnedDate: 'Nov 12, 2023',
    description: 'Awarded for showing outstanding respect towards peers and teachers.',
  },
  {
    id: 'b2',
    name: 'Responsibility',
    image: require('../../assets/badges/responsibility.webp'),
    earned: true,
    earnedDate: 'Oct 05, 2023',
    description: 'Consistently completes tasks and takes ownership of actions.',
  },
  {
    id: 'b3',
    name: 'Teamwork',
    image: require('../../assets/badges/respect.webp'), // reusing image for demo
    earned: false,
    description: 'Collaborates well with others to achieve common goals.',
  },
  {
    id: 'b4',
    name: 'Leadership',
    image: require('../../assets/badges/responsibility.webp'), // reusing image for demo
    earned: false,
    description: 'Demonstrates ability to guide and inspire peers positively.',
  },
];

type BadgeTileProps = {
  badge: BadgeData;
  index: number;
};

const BadgeTile: React.FC<BadgeTileProps> = ({ badge, index }) => {
  const shineProgress = useSharedValue(0);

  useEffect(() => {
    if (!badge.earned) {
      return;
    }

    shineProgress.value = withDelay(
      600 + index * 180,
      withRepeat(
        withTiming(1, {
          duration: 1600,
          easing: Easing.inOut(Easing.cubic),
        }),
        -1,
        false
      )
    );
  }, [badge.earned, index, shineProgress]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -90 + shineProgress.value * 180 },
      { rotate: '22deg' },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(150 + index * 50)
        .springify()
        .damping(18)
        .stiffness(220)}
      style={[styles.badgeWrapper, !badge.earned && styles.lockedBadgeWrapper]}
    >
      <Card
        variant="elevated"
        padding={0}
        style={badge.earned ? styles.badgeCard : styles.lockedBadgeCard}
      >
        <View style={[styles.imageFrame, badge.earned ? styles.earnedImageFrame : styles.lockedImageFrame]}>
          <Animated.Image
            entering={FadeIn.duration(800).delay(250 + index * 80)}
            source={badge.image}
            style={[styles.badgeImage, !badge.earned && styles.lockedImage]}
            resizeMode="contain"
          />

          {badge.earned && (
            <Animated.View pointerEvents="none" style={[styles.shineSweep, shineStyle]} />
          )}

          {!badge.earned && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockIconCircle}>
                <Icon name="lock" size={18} color={colors.surface} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.badgeInfo}>
          <Text style={[styles.badgeTitle, !badge.earned && styles.lockedTitle]} numberOfLines={2}>
            {badge.name}
          </Text>

          {badge.earned ? (
            <View style={styles.earnedBadge}>
              <Icon name="verified" size={14} color={colors.growth} />
              <Text style={styles.earnedText} numberOfLines={1}>
                {badge.earnedDate}
              </Text>
            </View>
          ) : (
            <View style={styles.lockedBadge}>
              <Icon name="lock-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.lockedText}>Locked</Text>
            </View>
          )}

          <Text style={styles.badgeDescription} numberOfLines={3}>
            {badge.description}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
};

const BadgesScreen: React.FC = () => {
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

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        title="Badges"
        subtitle="Achievements and behavioral milestones"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(18).stiffness(220)}
          style={styles.gridContainer}
        >
          {BADGES.map((badge, index) => (
            <BadgeTile key={badge.id} badge={badge} index={index} />
          ))}
        </Animated.View>
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
    paddingTop: spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  badgeWrapper: {
    width: '48%',
    borderRadius: borderRadius.large,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  lockedBadgeWrapper: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  badgeCard: {
    minHeight: 238,
    marginVertical: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  lockedBadgeCard: {
    minHeight: 238,
    marginVertical: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.large,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#F7F6FA',
    borderColor: colors.borderStrong,
  },
  imageFrame: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  earnedImageFrame: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 74, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  lockedImageFrame: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeImage: {
    width: 88,
    height: 88,
  },
  lockedImage: {
    opacity: 0.28,
    tintColor: colors.textMuted,
  },
  shineSweep: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    width: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 13, 13, 0.08)',
  },
  lockIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 13, 13, 0.58)',
  },
  badgeInfo: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  badgeTitle: {
    ...textStyles.headingMedium,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 20,
    minHeight: 40,
    marginBottom: spacing.xs,
  },
  lockedTitle: {
    color: colors.textSecondary,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mintSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    maxWidth: '100%',
  },
  earnedText: {
    ...textStyles.caption,
    color: colors.growth,
    fontWeight: '700',
    marginLeft: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  lockedText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  badgeDescription: {
    ...textStyles.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.xs,
  },
});

export default BadgesScreen;
