import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { AppGradientHeader, Card } from '../components';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
  typography,
} from '../theme';
import {
  dailyFloatingPalette,
  floatingPillShadow,
  missionTypeChipStyle,
} from '../theme/missionPillStyles';
import {
  formatDailyStatusLabel,
  formatLifecycleStatusLabel,
  formatMissionTypeLabel,
  getDailyStatusForToday,
  resolveLifecycleStatus,
  type MentorMissionTimelineEntry,
  type MentorMission,
} from '../data/mentorMissions';
import { formatAppDate, formatAppDateTime } from '../utils/dateFormat';

type Props = {
  route: {
    params: {
      mission: MentorMission;
    };
  };
};

const BADGE_REWARD_IMAGES = {
  respect: require('../../assets/badges/respect.webp'),
  responsibility: require('../../assets/badges/responsibility.webp'),
};

/** Android's blur is noticeably stronger, so it needs a smaller radius to match iOS. */
const BADGE_BLUR_RADIUS = Platform.OS === 'ios' ? 18 : 12;

/** Native ratio of the badge artwork — keeps the frame crop-free. */
const BADGE_ART_RATIO = 1099 / 1431;

export default function MissionDetailScreen({ route }: Props) {
  const { mission } = route.params;
  const insets = useSafeAreaInsets();

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

  const lifecycle = useMemo(() => resolveLifecycleStatus(mission), [mission]);
  const dailyToday = useMemo(() => getDailyStatusForToday(mission), [mission]);
  const dailyPal = dailyFloatingPalette(dailyToday);
  const typeVisual = missionTypeChipStyle(mission.missionType);
  const isMissionComplete = mission.progressPercent >= 100;
  // Proof upload is only available when the mission explicitly allows it.
  const canUploadProof = mission.allowUploadProof === true;

  const rewardBadge = mission.rewardBadge;
  const rewardBadgeImage = rewardBadge ? BADGE_REWARD_IMAGES[rewardBadge.key] : undefined;

  const doneCount = useMemo(
    () => mission.completionHistory.filter((entry) => entry.status === 'done').length,
    [mission.completionHistory]
  );

  const sortedHistory = useMemo(
    () => [...mission.completionHistory].sort((a, b) => b.date.localeCompare(a.date)),
    [mission.completionHistory]
  );

  const timelineEntries = useMemo(
    () =>
      mission.timeline.map((item) => {
        if (typeof item === 'string') {
          return { label: item, dateTime: '' };
        }
        const entry = item as MentorMissionTimelineEntry;
        return {
          label: entry.label ?? '',
          dateTime: formatAppDateTime(entry.datetime ?? ''),
        };
      }),
    [mission.timeline]
  );

  const scrollBottom = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  // ── Upload Proof ──────────────────────────────────────────────
  const [proofUris, setProofUris] = useState<string[]>([]);
  const [pickerSheetVisible, setPickerSheetVisible] = useState(false);

  const requestAndLaunchCamera = useCallback(async () => {
    setPickerSheetVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setProofUris((prev) => [...prev, result.assets[0].uri]);
    }
  }, []);

  const requestAndLaunchLibrary = useCallback(async () => {
    setPickerSheetVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos access needed', 'Please allow photo library access in your device settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (!result.canceled && result.assets.length > 0) {
      setProofUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }, []);

  const removeProof = useCallback((uri: string) => {
    Alert.alert('Remove photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setProofUris((prev) => prev.filter((u) => u !== uri)) },
    ]);
  }, []);

  const headerSubtitle = `${formatMissionTypeLabel(mission.missionType)} · ${formatLifecycleStatusLabel(lifecycle)}`;

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <AppGradientHeader
        leadingMode="back"
        title={mission.title}
        subtitle={headerSubtitle}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="elevated" padding={0} style={styles.heroCard}>
          <View style={styles.heroBody}>
            <Text style={styles.heroDescription}>{mission.description}</Text>

            <View style={styles.chipRow}>
              <View style={[styles.typeChip, { backgroundColor: typeVisual.backgroundColor }]}>
                <Text style={[styles.typeChipText, { color: typeVisual.color }]}>
                  {formatMissionTypeLabel(mission.missionType)}
                </Text>
              </View>
              <View
                style={[
                  styles.floatingPill,
                  styles.floatingPillDaily,
                  floatingPillShadow(dailyPal.shadowColor),
                  { backgroundColor: dailyPal.bg },
                ]}
              >
                <Text style={[styles.floatingPillText, { color: dailyPal.text }]}>
                  Today · {formatDailyStatusLabel(dailyToday)}
                </Text>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>Overall progress</Text>
                <Text style={styles.progressPct}>{mission.progressPercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${mission.progressPercent}%` }]}
                />
              </View>
            </View>

            <View style={styles.dateStrip}>
              <View style={styles.dateStripItem}>
                <Text style={styles.dateStripLabel}>Starts</Text>
                <Text style={styles.dateStripValue}>{formatAppDate(mission.startDate)}</Text>
              </View>
              <View style={styles.dateStripDivider} />
              <View style={styles.dateStripItem}>
                <Text style={styles.dateStripLabel}>Ends</Text>
                <Text style={styles.dateStripValue}>{formatAppDate(mission.endDate)}</Text>
              </View>
            </View>

            {rewardBadge ? (
              <LinearGradient
                colors={
                  isMissionComplete
                    ? [colors.mintSoft, 'rgba(255,255,255,0.96)']
                    : [colors.peachSoft, 'rgba(255,255,255,0.96)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.rewardPanel,
                  isMissionComplete ? styles.rewardPanelEarned : styles.rewardPanelLocked,
                ]}
              >
                <Text
                  style={[
                    styles.rewardPanelKicker,
                    { color: isMissionComplete ? colors.growth : colors.accent },
                  ]}
                >
                  {isMissionComplete ? 'Badge earned' : 'Reward on completion'}
                </Text>

                {rewardBadgeImage ? (
                  <View style={styles.rewardBadgeFrame}>
                    <Image
                      source={rewardBadgeImage}
                      style={styles.rewardBadgeImage}
                      resizeMode="cover"
                      // Keep the artwork a mystery until the mission is finished.
                      blurRadius={isMissionComplete ? 0 : BADGE_BLUR_RADIUS}
                    />
                    {!isMissionComplete ? (
                      <View pointerEvents="none" style={styles.rewardBadgeLockLayer}>
                        <View style={styles.rewardBadgeScrim} />
                        <View style={styles.rewardLockCircle}>
                          <Icon name="lock" size={20} color={colors.surface} />
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Text style={styles.rewardPanelTitle}>{rewardBadge.name} Badge</Text>
                <Text style={styles.rewardPanelDesc}>{rewardBadge.description}</Text>

                <View
                  style={[
                    styles.rewardStatusPill,
                    {
                      backgroundColor: isMissionComplete
                        ? 'rgba(63, 169, 122, 0.14)'
                        : 'rgba(232, 160, 74, 0.16)',
                    },
                  ]}
                >
                  <Icon
                    name={isMissionComplete ? 'verified' : 'lock-outline'}
                    size={14}
                    color={isMissionComplete ? colors.growth : colors.accent}
                  />
                  <Text
                    style={[
                      styles.rewardStatusPillText,
                      { color: isMissionComplete ? colors.growth : colors.accent },
                    ]}
                  >
                    {isMissionComplete
                      ? 'Unlocked · added to the collection'
                      : `Unlocks at 100% · ${mission.progressPercent}% done`}
                  </Text>
                </View>
              </LinearGradient>
            ) : null}
          </View>
        </Card>

        <Card variant="elevated" style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIconOrb}>
              <Icon name="schedule" size={20} color={colors.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>
          <Text style={styles.sectionHint}>Key moments for this mission</Text>
          {timelineEntries.map((step, idx) => {
            const isLast = idx === timelineEntries.length - 1;
            return (
              <View key={`${mission.id}-timeline-${idx}`} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.timelineDot}
                  />
                  {!isLast ? (
                    <LinearGradient
                      colors={['rgba(124, 106, 232, 0.45)', 'rgba(184, 169, 249, 0.2)']}
                      style={[styles.timelineLine, { minHeight: 36 }]}
                    />
                  ) : null}
                </View>
                <View style={styles.timelineCard}>
                  <Text style={styles.timelineTitle}>{step.label}</Text>
                  {step.dateTime ? (
                    <View style={styles.timelineWhenRow}>
                      <Icon name="schedule" size={14} color={colors.textMuted} />
                      <Text style={styles.timelineWhen}>{step.dateTime}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>

        <Card variant="elevated" padding={0} style={styles.historyCard}>
          <LinearGradient
            colors={[colors.mintSoft, 'rgba(255,255,255,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.historyHero}
          >
            <View style={styles.historyHeroText}>
              <Text style={styles.historyHeroLabel}>Check-ins</Text>
              <Text style={styles.historyHeroSub}>
                {doneCount} successful · {mission.completionHistory.length} logged
              </Text>
            </View>
            <View style={styles.historyPctRing}>
              <Text style={styles.historyPctValue}>
                {mission.progressPercent}
                <Text style={styles.historyPctSuffix}>%</Text>
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.historyListHead}>
            <Icon name="calendar-month" size={20} color={colors.primaryDark} />
            <Text style={styles.historyListTitle}>Daily log</Text>
            <View style={styles.historyCountPill}>
              <Text style={styles.historyCountText}>{sortedHistory.length}</Text>
            </View>
          </View>

          <View style={styles.logList}>
            {sortedHistory.map((entry, idx) => {
              const isDone = entry.status === 'done';
              const isLast = idx === sortedHistory.length - 1;
              const dateObj = new Date(entry.date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dateObj.getDate();
              const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
              return (
                <View
                  key={`${mission.id}-history-${entry.date}-${idx}`}
                  style={[styles.logRow, !isLast && styles.logRowDivider]}
                >
                  {/* Left accent bar */}
                  <View
                    style={[
                      styles.logAccentBar,
                      { backgroundColor: isDone ? colors.growth : colors.error },
                    ]}
                  />

                  {/* Date badge */}
                  <View
                    style={[
                      styles.logDateBadge,
                      {
                        backgroundColor: isDone
                          ? 'rgba(63, 169, 122, 0.08)'
                          : 'rgba(235, 87, 87, 0.07)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.logDayName,
                        { color: isDone ? colors.growth : colors.error },
                      ]}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={[
                        styles.logDayNum,
                        { color: isDone ? colors.growth : colors.error },
                      ]}
                    >
                      {dayNum}
                    </Text>
                    <Text style={styles.logMonthName}>{monthName}</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.logContent}>
                    <View style={styles.logTopRow}>
                      <View
                        style={[
                          styles.logStatusChip,
                          {
                            backgroundColor: isDone
                              ? 'rgba(63, 169, 122, 0.12)'
                              : 'rgba(235, 87, 87, 0.09)',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.logStatusDot,
                            { backgroundColor: isDone ? colors.growth : colors.error },
                          ]}
                        />
                        <Text
                          style={[
                            styles.logStatusLabel,
                            { color: isDone ? colors.growth : colors.error },
                          ]}
                        >
                          {isDone ? 'Completed' : 'Missed'}
                        </Text>
                      </View>
                    </View>
                    {entry.note ? (
                      <Text style={styles.logNote} numberOfLines={2}>
                        {entry.note}
                      </Text>
                    ) : (
                      <Text style={styles.logNoNote}>
                        {isDone ? 'Check-in recorded' : 'No activity logged'}
                      </Text>
                    )}
                  </View>

                  {/* Right icon */}
                  <View
                    style={[
                      styles.logIconBadge,
                      {
                        backgroundColor: isDone
                          ? 'rgba(63, 169, 122, 0.12)'
                          : 'rgba(235, 87, 87, 0.09)',
                      },
                    ]}
                  >
                    <Icon
                      name={isDone ? 'check-circle' : 'cancel'}
                      size={20}
                      color={isDone ? colors.growth : colors.error}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
        {/* ── Upload Proof Card (only when the mission allows it) ── */}
        {canUploadProof ? (
        <Card variant="elevated" padding={0} style={styles.proofCard}>
          <View style={styles.proofHeader}>
            <View style={styles.sectionIconOrb}>
              <Icon name="photo-camera" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.proofHeaderText}>
              <Text style={styles.sectionTitle}>Upload Proof</Text>
              <Text style={styles.sectionHint} numberOfLines={1}>
                Attach photos to verify completion
              </Text>
            </View>
            <TouchableOpacity
              style={styles.proofAddBtn}
              activeOpacity={0.75}
              onPress={() => setPickerSheetVisible(true)}
            >
              <Icon name="add" size={20} color={colors.surface} />
              <Text style={styles.proofAddBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {proofUris.length > 0 ? (
            <View style={styles.proofGrid}>
              {proofUris.map((uri) => (
                <Pressable
                  key={uri}
                  style={styles.proofThumbWrap}
                  onLongPress={() => removeProof(uri)}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
                >
                  <Image source={{ uri }} style={styles.proofThumb} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.proofRemoveBtn}
                    onPress={() => removeProof(uri)}
                    hitSlop={8}
                  >
                    <Icon name="close" size={12} color={colors.surface} />
                  </TouchableOpacity>
                </Pressable>
              ))}
              {proofUris.length < 6 && (
                <TouchableOpacity
                  style={styles.proofAddTile}
                  activeOpacity={0.7}
                  onPress={() => setPickerSheetVisible(true)}
                >
                  <Icon name="add-photo-alternate" size={28} color={colors.primaryDark} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.proofEmptyState}
              activeOpacity={0.7}
              onPress={() => setPickerSheetVisible(true)}
            >
              <Icon name="add-photo-alternate" size={36} color={colors.primaryDark} />
              <Text style={styles.proofEmptyTitle}>No photos yet</Text>
              <Text style={styles.proofEmptyHint}>Tap to add proof of completion</Text>
            </TouchableOpacity>
          )}
        </Card>
        ) : null}

        {/* ── Picker Action Sheet ──────────────────────────────── */}
        <Modal
          visible={pickerSheetVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setPickerSheetVisible(false)}
        >
          <Pressable style={styles.sheetOverlay} onPress={() => setPickerSheetVisible(false)}>
            <Pressable style={[styles.sheetContainer, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Add Proof Photo</Text>
              <Text style={styles.sheetSubtitle}>Choose how you'd like to add your photo</Text>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.75} onPress={requestAndLaunchCamera}>
                <View style={[styles.sheetOptionIcon, { backgroundColor: colors.lavenderSoft }]}>
                  <Icon name="photo-camera" size={24} color={colors.primaryDark} />
                </View>
                <View style={styles.sheetOptionText}>
                  <Text style={styles.sheetOptionTitle}>Take a photo</Text>
                  <Text style={styles.sheetOptionHint}>Use your camera right now</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.sheetDivider} />

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.75} onPress={requestAndLaunchLibrary}>
                <View style={[styles.sheetOptionIcon, { backgroundColor: colors.mintSoft }]}>
                  <Icon name="photo-library" size={24} color={colors.growth} />
                </View>
                <View style={styles.sheetOptionText}>
                  <Text style={styles.sheetOptionTitle}>Choose from library</Text>
                  <Text style={styles.sheetOptionHint}>Select up to 6 photos</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetCancelBtn}
                activeOpacity={0.75}
                onPress={() => setPickerSheetVisible(false)}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroCard: {
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  heroBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  heroDescription: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  typeChip: {
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  typeChipText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  floatingPill: {
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  floatingPillDaily: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  floatingPillText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  progressBlock: {
    marginTop: spacing.lg,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressPct: {
    ...textStyles.bodyLarge,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dateStripItem: {
    flex: 1,
    alignItems: 'center',
  },
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
  rewardPanel: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rewardPanelLocked: {
    borderColor: 'rgba(232, 160, 74, 0.26)',
  },
  rewardPanelEarned: {
    borderColor: 'rgba(63, 169, 122, 0.28)',
  },
  rewardBadgeFrame: {
    width: 128,
    aspectRatio: BADGE_ART_RATIO,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  rewardBadgeImage: {
    width: '100%',
    height: '100%',
  },
  rewardBadgeLockLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadgeScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.28)',
  },
  rewardLockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 13, 13, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  rewardStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  rewardStatusPillText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
  rewardPanelKicker: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rewardPanelTitle: {
    ...textStyles.bodyLarge,
    color: colors.ink,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  rewardPanelDesc: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    marginVertical: spacing.xs,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionIconOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...textStyles.headingMedium,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionHint: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timelineRail: {
    width: 22,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  timelineLine: {
    width: 3,
    marginTop: 4,
    borderRadius: 2,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.12)',
  },
  timelineTitle: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    lineHeight: 22,
  },
  timelineWhenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  timelineWhen: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  historyCard: {
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  historyHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(63, 169, 122, 0.15)',
  },
  historyHeroText: {
    flex: 1,
    minWidth: 0,
  },
  historyHeroLabel: {
    ...textStyles.bodyLarge,
    fontWeight: '800',
    color: colors.growth,
  },
  historyHeroSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  historyPctRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: 'rgba(63, 169, 122, 0.35)',
  },
  historyPctValue: {
    ...textStyles.headingMedium,
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  historyPctSuffix: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  historyListHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  historyListTitle: {
    ...textStyles.bodyLarge,
    fontWeight: '800',
    color: colors.ink,
    flex: 1,
  },
  historyCountPill: {
    backgroundColor: colors.lavenderSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  historyCountText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  // ── Modern Daily Log ────────────────────────────────────────
  logList: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  logRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logAccentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    minHeight: 52,
  },
  logDateBadge: {
    width: 46,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginLeft: 2,
    flexShrink: 0,
  },
  logDayName: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  logDayNum: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  logMonthName: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  logContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  logTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  logStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logStatusLabel: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  logNote: {
    ...textStyles.caption,
    color: colors.textSecondary,
    lineHeight: 17,
    fontWeight: '500',
  },
  logNoNote: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  logIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetNote: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },

  // ── Upload Proof ────────────────────────────────────────────
  proofCard: {
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  proofHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  proofAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
  },
  proofAddBtnText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    color: colors.surface,
  },
  proofEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 106, 232, 0.2)',
    borderStyle: 'dashed',
    backgroundColor: colors.lavenderSoft,
  },
  proofEmptyTitle: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  proofEmptyHint: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  proofGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  proofThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
  },
  proofThumb: {
    width: '100%',
    height: '100%',
  },
  proofRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofAddTile: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.large,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 106, 232, 0.25)',
    borderStyle: 'dashed',
  },

  // ── Action Sheet ────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...textStyles.headingMedium,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  sheetSubtitle: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sheetOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    flex: 1,
    minWidth: 0,
  },
  sheetOptionTitle: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  sheetOptionHint: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  sheetCancelBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surfaceMuted,
  },
  sheetCancelText: {
    ...textStyles.bodyMedium,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
