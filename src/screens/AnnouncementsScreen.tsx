import React, { useMemo } from 'react';
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

type AnnouncementItem = {
  id: string;
  title: string;
  summary: string;
  day: string;
  month: string;
  time: string;
  audience?: string;
  attachmentColors?: string[];
};

type AnnouncementSection = {
  id: string;
  label: string;
  items: AnnouncementItem[];
};

const ANNOUNCEMENT_SECTIONS: AnnouncementSection[] = [
  {
    id: 'last-week',
    label: 'Last Week',
    items: [
      {
        id: 'a1',
        title: 'New Student Added',
        summary: 'Alexander Richard R was added to the school roster and parent dashboard.',
        day: '10',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'School Office',
        attachmentColors: [colors.sky, colors.lavender, colors.peach],
      },
    ],
  },
  {
    id: 'this-week',
    label: 'This Week',
    items: [
      {
        id: 'a2',
        title: 'Annual Day Function Celebration',
        summary: 'Families are invited for stage performances, student awards, and photo moments.',
        day: '15',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'School Events Team',
        attachmentColors: [colors.peach, colors.sky, colors.mint],
      },
      {
        id: 'a3',
        title: 'Exam Results',
        summary: 'XI and XII exam results are announced and shared with parent login access.',
        day: '16',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'Academic Office',
      },
      {
        id: 'a4',
        title: 'Parents Meeting',
        summary: 'Talk about your child’s learning progress and behaviour goals with class mentors.',
        day: '17',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'Class Mentor',
      },
      {
        id: 'a5',
        title: 'New Staff Appointed',
        summary: 'Penelope Vanessa joins the faculty for VIII English and Maths Teacher.',
        day: '18',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'School Management',
      },
      {
        id: 'a6',
        title: 'School Leave',
        summary: 'Diwali festival holiday on Saturday, Sunday and Monday for all classes.',
        day: '21',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'Principal’s Office',
      },
      {
        id: 'a7',
        title: 'Annual Day Function Rehearsal',
        summary: 'Final costume rehearsal and stage timing update for participating students.',
        day: '28',
        month: 'Nov',
        time: '9:30 AM',
        audience: 'Performing Arts Team',
        attachmentColors: [colors.lavender, colors.peach, colors.sky, colors.mint],
      },
    ],
  },
];

const AnnouncementsScreen: React.FC = () => {
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

  const totalAnnouncements = ANNOUNCEMENT_SECTIONS.reduce(
    (sum, section) => sum + section.items.length,
    0
  );

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >

        {ANNOUNCEMENT_SECTIONS.map((section, sectionIndex) => (
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
                  {section.items.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.announcementRow,
                        index < section.items.length - 1 ? styles.announcementRowBorder : null,
                      ]}
                    >
                      <View style={styles.dateRail}>
                        <LinearDatePill day={item.day} month={item.month} />
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>

                      <View style={styles.contentColumn}>
                        <Text style={styles.announcementTitle}>{item.title}</Text>
                        <Text style={styles.announcementSummary}>{item.summary}</Text>

                        {item.attachmentColors?.length ? (
                          <View style={styles.mediaStrip}>
                            {item.attachmentColors.map((color, mediaIndex) => (
                              <View
                                key={`${item.id}-media-${mediaIndex}`}
                                style={[
                                  styles.mediaThumb,
                                  styles.mediaThumbStacked,
                                  mediaIndex === 0 ? styles.mediaThumbFirst : null,
                                  { backgroundColor: color },
                                ]}
                              >
                                <Icon name="image" size={14} color={colors.surface} />
                              </View>
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
                  ))}
                </Card>
              </Animated.View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
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
  shadowWrapper: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    // marginVertical: spacing.sm,
    backgroundColor: colors.surface,
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
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default AnnouncementsScreen;
