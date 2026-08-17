import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppGradientHeader, Card, AddChildModal, LanguagePickerSheet } from '../components';
import { studentsService } from '../services/studentsService';
import { languageService } from '../services/languageService';
import type { ApiLanguage } from '../types/language';
import {
  colors,
  spacing,
  textStyles,
  getFloatingTabBarBottomPadding,
  borderRadius,
  typography,
} from '../theme';
import { GRADIENT_60_END } from '../theme/layout';
import { Child } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatAppMonthYear } from '../utils/dateFormat';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { runOnJS } from 'react-native-worklets';

type SettingId =
  | 'language'
  | 'notifications'
  | 'privacy'
  | 'help'
  | 'feedback'
  | 'about';

type SettingRow = {
  id: SettingId;
  icon: string;
  title: string;
  subtitle: string;
};

/** Skeleton placeholder rendered while children are loading from the API. */
function ChildSkeleton({ hasBorder }: { hasBorder: boolean }) {
  return (
    <View style={[styles.childRow, hasBorder && styles.childRowBorder]}>
      <View style={styles.childAvatar}>
        <View style={[styles.skeletonCircle, { width: 48, height: 48, borderRadius: 24 }]} />
      </View>
      <View style={styles.childInfo}>
        <View style={[styles.skeletonBar, { width: '65%', height: 14, marginBottom: 6 }]} />
        <View style={[styles.skeletonBar, { width: '35%', height: 12 }]} />
      </View>
    </View>
  );
}

const SETTINGS_ROWS: SettingRow[] = [
  {
    id: 'language',
    icon: 'language',
    title: 'Language',
    subtitle: 'Rating sheet language preference',
  },
  {
    id: 'notifications',
    icon: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage your notification preferences',
  },
  {
    id: 'privacy',
    icon: 'security',
    title: 'Privacy & Security',
    subtitle: 'Control your data and privacy settings',
  },
  {
    id: 'help',
    icon: 'help',
    title: 'Help & Support',
    subtitle: 'Get help and contact support',
  },
  {
    id: 'feedback',
    icon: 'feedback',
    title: 'Send Feedback',
    subtitle: 'Help us improve Kovariya',
  },
  {
    id: 'about',
    icon: 'info',
    title: 'About',
    subtitle: 'App version and legal information',
  },
];

const STAT_TILES: { value: string; label: string; tint: string }[] = [
  { value: '152', label: 'Total ratings', tint: colors.mintSoft },
  { value: '8', label: 'Goals done', tint: colors.skySoft },
  { value: '4.5', label: 'Avg. score', tint: colors.peachSoft },
];

const ICON_ORB_COLORS = [
  colors.lavenderSoft,
  colors.skySoft,
  colors.mintSoft,
  colors.peachSoft,
  colors.surfaceMuted,
] as const;

// Both accept a nullable name: a partial API payload should render the '?'
// placeholder these already fall back to, not throw and take down the screen.
function initialsFromFullName(name?: string | null): string {
  const safe = name ?? '';
  const parts = safe.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return safe.slice(0, 2).toUpperCase() || '?';
}

function firstNameInitial(name?: string | null): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() : '?';
}

function childProfileSubtitle(child: Child): string | null {
  const parts: string[] = [];
  if (child.grade?.startsWith('class')) {
    parts.push(`Class ${child.grade.replace(/^class/i, '')}`);
  }
  if (child.section) {
    parts.push(`Sec ${child.section}`);
  }
  if (child.schoolName) {
    parts.push(child.schoolName);
  }
  if (child.status === 'inactive') {
    parts.push('Inactive');
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function InitialAvatar({
  label,
  size,
  backgroundColor,
  style,
}: {
  label: string;
  size: number;
  backgroundColor: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: colors.ink } as TextStyle}>
        {label}
      </Text>
    </View>
  );
}

const ProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const hasFetchedChildren = useRef(false);
  const [addChildVisible, setAddChildVisible] = useState(false);
  // When set, the child modal opens in edit mode for this child.
  const [editChild, setEditChild] = useState<Child | null>(null);

  // ── Language preference ────────────────────────────────────────────────────
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [apiLanguages, setApiLanguages] = useState<ApiLanguage[]>([]);
  const [languageCodeToIdMap, setLanguageCodeToIdMap] = useState<Record<string, number>>({});

  useEffect(() => {
    languageService.getPreferredLanguage()
      .then((pref) => { if (pref?.code) setCurrentLang(pref.code); })
      .catch(() => {});
    languageService.getLanguages()
      .then((langs) => {
        setApiLanguages(langs);
        const map: Record<string, number> = {};
        for (const l of langs) map[l.language_code] = l.id;
        setLanguageCodeToIdMap(map);
      })
      .catch(() => {});
  }, []);

  const handleLanguageSelected = useCallback((lang: string) => {
    setCurrentLang(lang);
    setLangPickerVisible(false);
    const languageId = languageCodeToIdMap[lang];
    if (languageId) {
      languageService.savePreferredLanguage(languageId, lang).catch(() => {});
    }
  }, [languageCodeToIdMap]);

  const parentInfo = {
    name: user?.name || 'Wellness User',
    email: user?.email || 'user@kovariya.com',
    phone: user?.mobileNumber || '+1 (555) 123-4567',
    memberSince: user?.createdAt ? formatAppMonthYear(user.createdAt) || 'Jan 2024' : 'Jan 2024',
  };

  const scrollBottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  const navigation = useNavigation<any>();

  const handleSettingPress = useCallback(
    (id: SettingId) => {
      if (id === 'language') {
        setLangPickerVisible(true);
        return;
      }
      if (id === 'feedback') {
        navigation.navigate('SendFeedback');
        return;
      }
      Alert.alert('opened ', id);
    },
    [navigation]
  );

  // Handles both add (new child prepended) and edit (existing child replaced).
  const onChildSubmitted = useCallback((child: Child) => {
    setChildrenList((prev) =>
      prev.some((c) => c.id === child.id)
        ? prev.map((c) => (c.id === child.id ? child : c))
        : [child, ...prev]
    );
  }, []);

  const openAddChild = useCallback(() => {
    setEditChild(null);
    setAddChildVisible(true);
  }, []);

  const openEditChild = useCallback((child: Child) => {
    setEditChild(child);
    setAddChildVisible(true);
  }, []);

  const closeChildModal = useCallback(() => {
    setAddChildVisible(false);
    setEditChild(null);
  }, []);

  // ── Fetch children from API on focus ─────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const fetchChildren = async () => {
        // Show skeleton only on the very first load
        if (!hasFetchedChildren.current) {
          setChildrenLoading(true);
        }
        try {
          const data = await studentsService.getChildren();
          if (!cancelled) {
            setChildrenList(data);
            hasFetchedChildren.current = true;
          }
        } catch (err) {
          // Keep existing list on error (or empty on first load)
          if (!cancelled) {
            console.warn('[ProfileScreen] Failed to fetch children:', err);
          }
        } finally {
          if (!cancelled) setChildrenLoading(false);
        }
      };
      fetchChildren();
      return () => { cancelled = true; };
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

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader title="Profile" subtitle="Account & family" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
      >
        <Animated.View entering={FadeInDown
          .springify()
          .damping(18)
          .stiffness(220)}
          style={[styles.shadowWrapper]} // ← shadow lives HERE, animates together
        >
          <Card variant="default" style={styles.profileCard} padding={0}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={GRADIENT_60_END}
              style={styles.profileAccent}
            />
            <View style={styles.profileCardInner}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarRing}>
                    <InitialAvatar
                      label={initialsFromFullName(parentInfo.name)}
                      size={88}
                      backgroundColor={colors.surface}
                    />
                  </View>
                  {/* <Pressable
                    style={({ pressed }) => [styles.editFab, pressed && styles.pressedOpacity]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile photo"
                  >
                    <Icon name="edit" size={18} color={colors.primaryDark} />
                  </Pressable> */}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName} numberOfLines={2}>
                    {parentInfo.name}
                  </Text>
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {parentInfo.email}
                  </Text>
                  <Text style={styles.contactText}>
                    {parentInfo.phone}
                  </Text>
                  <View style={styles.memberPill}>
                    <Icon name="verified" size={14} color={colors.growth} />
                    <Text style={styles.memberPillText}>Member since {parentInfo.memberSince}</Text>
                  </View>
                </View>
              </View>
              {/* <View style={styles.contactRow}>
                <Icon name="phone" size={18} color={colors.textMuted} />
                
              </View> */}
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown
            .delay(100)
            .springify()
            .damping(18)
            .stiffness(220)}
          style={[styles.shadowWrapper]}  // ← shadow lives HERE, animates together
        >
          <Card variant="default" style={styles.childrenCard}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionEyebrow}>Family</Text>
                <Text style={styles.sectionTitle}>My children</Text>
              </View>
              <Pressable
                onPress={openAddChild}
                style={({ pressed }) => [styles.iconCircleBtn, pressed && styles.pressedOpacity]}
                accessibilityRole="button"
                accessibilityLabel="Add child"
              >
                <Icon name="add" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>
            {childrenLoading ? (
              <>
                <ChildSkeleton hasBorder />
                <ChildSkeleton hasBorder={false} />
              </>
            ) : childrenList.length === 0 ? (
              <View style={styles.emptyChildren}>
                <Icon name="child-care" size={36} color={colors.textMuted} />
                <Text style={styles.emptyChildrenText}>No children added yet</Text>
                <Text style={styles.emptyChildrenSubtext}>
                  Tap the + button to add your child
                </Text>
              </View>
            ) : (
              childrenList.map((child, index) => {
                const subtitle = childProfileSubtitle(child);
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => openEditChild(child)}
                    style={({ pressed }) => [
                      styles.childRow,
                      index < childrenList.length - 1 && styles.childRowBorder,
                      pressed && styles.pressedOpacity,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${child.name}, age ${child.age}`}
                  >
                    <View style={styles.childAvatar}>
                      <InitialAvatar
                        label={firstNameInitial(child.name)}
                        size={48}
                        backgroundColor={colors.skySoft}
                      />
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.name}</Text>
                      <Text style={styles.childAge}>Age {child.age}</Text>
                      {subtitle ? (
                        <Text style={styles.childMeta} numberOfLines={2}>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <Icon name="chevron-right" size={22} color={colors.textMuted} />
                  </Pressable>
                );
              })
            )}
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown
            .delay(140)
            .springify()
            .damping(18)
            .stiffness(220)}
          style={[styles.shadowWrapper]}  // ← shadow lives HERE, animates together
        >
          <Card variant="default" style={styles.settingsCard}>
            <Text style={styles.sectionEyebrow}>App</Text>
            <Text style={[styles.sectionTitle, styles.settingsTitleSpacing]}>Settings</Text>
            {SETTINGS_ROWS.map((option, index) => (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.settingRow,
                  index === SETTINGS_ROWS.length - 1 && styles.settingRowLast,
                  pressed && styles.pressedOpacity,
                ]}
                onPress={() => handleSettingPress(option.id)}
                accessibilityRole="button"
                accessibilityLabel={option.title}
              >
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.iconOrb,
                      { backgroundColor: ICON_ORB_COLORS[index % ICON_ORB_COLORS.length] },
                    ]}
                  >
                    <Icon name={option.icon} size={22} color={colors.primaryDark} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingSubtitle}>
                      {option.id === 'language'
                        ? (apiLanguages.find((l) => l.language_code === currentLang)?.name ?? currentLang.toUpperCase())
                        : option.subtitle}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={22} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify().damping(18).stiffness(220)}>
          <View style={styles.versionBlock}>
            <Text style={styles.versionText}>Kovariya v1.0.0</Text>
            <Text style={styles.versionSubtext}>Smart parenting. Better children.</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <AddChildModal
        visible={addChildVisible}
        onClose={closeChildModal}
        onSubmit={onChildSubmitted}
        child={editChild}
      />

      <LanguagePickerSheet
        visible={langPickerVisible}
        selected={currentLang as any}
        languages={apiLanguages}
        onSelect={(lang) => handleLanguageSelected(lang)}
        onClose={() => setLangPickerVisible(false)}
      />
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
  profileCard: {
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  profileAccent: {
    height: 4,
    width: '100%',
  },
  profileCardInner: {
    padding: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarRing: {
    borderRadius: 999,
    padding: 3,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  editFab: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    // paddingTop: spacing.xs,
  },
  profileName: {
    ...textStyles.headingMedium,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.mintSoft,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(63, 169, 122, 0.2)',
  },
  memberPillText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.growth,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  contactText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm
  },
  statsCard: {
    marginVertical: spacing.xs,
  },
  sectionEyebrow: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...textStyles.headingMedium,
    fontWeight: '800',
    color: colors.ink,
  },
  settingsTitleSpacing: {
    marginBottom: spacing.sm,
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  shadowWrapper: {
    borderRadius: borderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    marginVertical: spacing.xs,
  },
  childrenCard: {
    marginVertical: spacing.xs,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  childRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  childAvatar: {
    marginRight: spacing.md,
  },
  childInfo: {
    flex: 1,
    minWidth: 0,
  },
  // Neutral fill so the loading placeholders are actually visible.
  skeletonCircle: {
    backgroundColor: colors.surfaceMuted,
  },
  skeletonBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
  },
  emptyChildren: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyChildrenText: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyChildrenSubtext: {
    ...textStyles.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  childName: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  childAge: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  childMeta: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 16,
  },
  settingsCard: {
    marginVertical: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconOrb: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    marginLeft: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  settingSubtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  pressedOpacity: {
    opacity: 0.88,
  },
  versionBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.sm,
  },
  versionText: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  versionSubtext: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});

export default ProfileScreen;
