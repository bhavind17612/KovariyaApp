import React, { useCallback, useMemo, useState } from 'react';
import {
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppGradientHeader } from '../components';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
  typography,
} from '../theme';

type NotificationKind = 'mission' | 'badge' | 'score' | 'mentor' | 'system';
type NotificationFilter = 'all' | 'unread';

type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  kind: NotificationKind;
  unread: boolean;
};

const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Mission completed',
    message: 'Aarav marked today\'s mission as done. Keep the streak warm.',
    time: '8 min ago',
    kind: 'mission',
    unread: true,
  },
  {
    id: 'n2',
    title: 'Badge progress',
    message: 'Respect badge is getting closer. Two more consistent check-ins to go.',
    time: '42 min ago',
    kind: 'badge',
    unread: true,
  },
  {
    id: 'n3',
    title: 'Behaviour score improved',
    message: 'Today\'s positive ratings added +4 points to the behaviour log.',
    time: '2 hr ago',
    kind: 'score',
    unread: false,
  },
  {
    id: 'n4',
    title: 'Mentor note',
    message: 'Your mentor suggested a short reflection after the homework sprint.',
    time: 'Yesterday',
    kind: 'mentor',
    unread: false,
  },
  {
    id: 'n5',
    title: 'Weekly report ready',
    message: 'A fresh summary is available with missions, SDS, and goal progress.',
    time: 'Mon',
    kind: 'system',
    unread: false,
  },
];

const KIND_META: Record<
  NotificationKind,
  { icon: string; color: string; backgroundColor: string }
> = {
  mission: {
    icon: 'rocket-launch',
    color: colors.primaryDark,
    backgroundColor: colors.lavenderSoft,
  },
  badge: {
    icon: 'emoji-events',
    color: colors.accent,
    backgroundColor: colors.peachSoft,
  },
  score: {
    icon: 'trending-up',
    color: colors.growth,
    backgroundColor: colors.mintSoft,
  },
  mentor: {
    icon: 'psychology',
    color: colors.info,
    backgroundColor: colors.skySoft,
  },
  system: {
    icon: 'notifications-active',
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
  },
};

const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<NotificationFilter>('all');

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

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  const unreadCount = useMemo(
    () => NOTIFICATIONS.filter((item) => item.unread).length,
    []
  );

  const visibleNotifications = useMemo(
    () => NOTIFICATIONS.filter((item) => filter === 'all' || item.unread),
    [filter]
  );

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        leadingMode="back"
        title="Notifications"
        subtitle={`${unreadCount} unread updates`}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.springify().damping(18).stiffness(220)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryIcon}>
            <Icon name="notifications-none" size={24} color={colors.primaryDark} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Stay in the loop</Text>
            <Text style={styles.summaryText}>
              Mission wins, badge progress, mentor notes, and behaviour updates appear here.
            </Text>
          </View>
        </Animated.View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter('all')}
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('unread')}
            style={[styles.filterPill, filter === 'unread' && styles.filterPillActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
              Unread
            </Text>
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{unreadCount}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.list}>
          {visibleNotifications.map((item, index) => {
            const meta = KIND_META[item.kind];
            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 45).springify().damping(18).stiffness(220)}
                style={[styles.notificationCard, item.unread && styles.notificationCardUnread]}
              >
                <View style={[styles.notificationIcon, { backgroundColor: meta.backgroundColor }]}>
                  <Icon name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={styles.notificationBody}>
                  <View style={styles.notificationTopRow}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.notificationTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>
                {item.unread ? <View style={styles.unreadDot} /> : null}
              </Animated.View>
            );
          })}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
  },
  summaryText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  filterPill: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.surface,
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 11,
    fontWeight: '800',
    color: colors.surface,
  },
  list: {
    gap: spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    position: 'relative',
  },
  notificationCardUnread: {
    borderColor: 'rgba(124, 106, 232, 0.28)',
    backgroundColor: '#FCFBFF',
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationBody: {
    flex: 1,
    minWidth: 0,
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notificationTitle: {
    ...textStyles.bodyLarge,
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontWeight: '800',
  },
  notificationTime: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  notificationMessage: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 3,
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

export default NotificationsScreen;
