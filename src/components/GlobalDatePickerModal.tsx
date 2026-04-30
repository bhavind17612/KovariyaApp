import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker, {
  useDefaultStyles,
  type DateType,
} from 'react-native-ui-datepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  textStyles,
  typography,
} from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - spacing.lg * 2, 420);
const SWIPE_DISTANCE_THRESHOLD = 56;
const SWIPE_VELOCITY_THRESHOLD = 520;
const YEARS_PER_PAGE = 12;

type PickerMode = 'calendar' | 'year';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
};

function getInitialDate(date?: Date) {
  const value = dayjs(date ?? undefined);
  return value.isValid() ? value : dayjs();
}

function getYearPageStart(year: number) {
  return year - (year % YEARS_PER_PAGE);
}

export const GlobalDatePickerModal = React.memo(function GlobalDatePickerModal({
  visible,
  onClose,
  onConfirm,
  initialDate,
  minimumDate = new Date(1900, 0, 1),
  maximumDate = new Date(),
  title = 'Select date',
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateType>(initialDate ?? new Date());
  const [viewAnchor, setViewAnchor] = useState(() => getInitialDate(initialDate).startOf('month'));
  const [pickerMode, setPickerMode] = useState<PickerMode>('calendar');
  const [yearPageStart, setYearPageStart] = useState(() =>
    getYearPageStart(getInitialDate(initialDate).year()),
  );

  const progress = useSharedValue(0);
  const swipeOffset = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const anchor = getInitialDate(initialDate);
    setSelectedDate(anchor.toDate());
    setViewAnchor(anchor.startOf('month'));
    setPickerMode('calendar');
    setYearPageStart(getYearPageStart(anchor.year()));
    setModalVisible(true);

    requestAnimationFrame(() => {
      progress.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    });
  }, [initialDate, progress, visible]);

  const finishClose = useCallback(() => {
    setModalVisible(false);
    setPickerMode('calendar');
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    progress.value = withTiming(
      0,
      {
        duration: 180,
        easing: Easing.in(Easing.quad),
      },
      () => runOnJS(finishClose)(),
    );
  }, [finishClose, progress]);

  const shiftView = useCallback(
    (direction: 1 | -1) => {
      if (pickerMode === 'calendar') {
        setViewAnchor((prev) => prev.add(direction, 'month'));
      } else {
        setYearPageStart((prev) => prev + direction * YEARS_PER_PAGE);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [pickerMode],
  );

  const handleConfirm = useCallback(() => {
    if (selectedDate) {
      onConfirm(dayjs(selectedDate as string | number | Date).toDate());
    }
    animateClose();
  }, [animateClose, onConfirm, selectedDate]);

  const handleYearSelect = useCallback(
    (year: number) => {
      const current = dayjs(selectedDate as string | number | Date);
      const next = current.isValid()
        ? current.year(year).month(viewAnchor.month())
        : viewAnchor.year(year);

      setSelectedDate(next.toDate());
      setViewAnchor(next.startOf('month'));
      setPickerMode('calendar');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [selectedDate, viewAnchor],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          swipeOffset.value = event.translationX;
        })
        .onEnd((event) => {
          const shouldShift =
            Math.abs(event.translationX) > SWIPE_DISTANCE_THRESHOLD ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;

          if (shouldShift) {
            runOnJS(shiftView)(event.translationX < 0 ? 1 : -1);
          }

          swipeOffset.value = withTiming(0, {
            duration: 170,
            easing: Easing.out(Easing.cubic),
          });
        }),
    [shiftView, swipeOffset],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.92, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [22, 0]) },
    ],
  }));

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeOffset.value * 0.12 }],
    opacity: interpolate(Math.abs(swipeOffset.value), [0, 140], [1, 0.8]),
  }));

  const defaultStyles = useDefaultStyles('light');
  const pickerStyles = useMemo(
    () => ({
      ...defaultStyles,
      header: { marginBottom: spacing.sm },
      month_selector_label: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily.primary,
      },
      year_selector_label: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily.primary,
      },
      weekday_label: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textMuted,
        textTransform: 'uppercase' as const,
      },
      day: { borderRadius: borderRadius.full },
      day_cell: { padding: 2 },
      day_label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.regular,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily.primary,
      },
      selected: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
      },
      selected_label: {
        color: colors.surface,
        fontWeight: typography.fontWeight.semibold,
      },
      today: {
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: borderRadius.full,
        backgroundColor: 'transparent',
      },
      today_label: {
        color: colors.primary,
        fontWeight: typography.fontWeight.semibold,
      },
      outside_label: {
        color: colors.textMuted,
        opacity: 0.45,
      },
      disabled_label: {
        color: colors.textMuted,
        opacity: 0.3,
      },
      button_next_image: { tintColor: colors.primary },
      button_prev_image: { tintColor: colors.primary },
    }),
    [defaultStyles],
  );

  const yearItems = useMemo(
    () => Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearPageStart + index),
    [yearPageStart],
  );

  const selectedYear = dayjs(selectedDate as string | number | Date).year();
  const minYear = minimumDate.getFullYear();
  const maxYear = maximumDate.getFullYear();

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={animateClose}
    >
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.wrapper}>
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
          </Animated.View>

          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.header}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>
                  {pickerMode === 'calendar'
                    ? 'Swipe left or right to change month'
                    : 'Swipe to move through years'}
                </Text>
              </View>
              <Pressable onPress={animateClose} style={styles.closeBtn} hitSlop={10}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setPickerMode('calendar')}
                style={[
                  styles.modeChip,
                  pickerMode === 'calendar' ? styles.modeChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    pickerMode === 'calendar' ? styles.modeChipTextActive : null,
                  ]}
                >
                  Calendar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPickerMode('year')}
                style={[
                  styles.modeChip,
                  pickerMode === 'year' ? styles.modeChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    pickerMode === 'year' ? styles.modeChipTextActive : null,
                  ]}
                >
                  Year
                </Text>
              </Pressable>
            </View>

            <View style={styles.navigatorRow}>
              <Pressable onPress={() => shiftView(-1)} style={styles.navBtn} hitSlop={8}>
                <Icon name="chevron-left" size={22} color={colors.primary} />
              </Pressable>
              <Text style={styles.navigatorTitle}>
                {pickerMode === 'calendar'
                  ? viewAnchor.format('MMMM YYYY')
                  : `${yearPageStart} - ${yearPageStart + YEARS_PER_PAGE - 1}`}
              </Text>
              <Pressable onPress={() => shiftView(1)} style={styles.navBtn} hitSlop={8}>
                <Icon name="chevron-right" size={22} color={colors.primary} />
              </Pressable>
            </View>

            <GestureDetector gesture={panGesture}>
              <Animated.View style={swipeStyle}>
                {pickerMode === 'calendar' ? (
                  <DateTimePicker
                    key={`calendar-${viewAnchor.format('YYYY-MM')}`}
                    mode="single"
                    date={selectedDate}
                    onChange={({ date }) => setSelectedDate(date)}
                    minDate={minimumDate}
                    maxDate={maximumDate}
                    month={viewAnchor.month()}
                    year={viewAnchor.year()}
                    styles={pickerStyles}
                    showOutsideDays
                    firstDayOfWeek={0}
                    containerHeight={320}
                  />
                ) : (
                  <View style={styles.yearGrid}>
                    {yearItems.map((year) => {
                      const isDisabled = year < minYear || year > maxYear;
                      const isActive = year === selectedYear;

                      return (
                        <Pressable
                          key={year}
                          disabled={isDisabled}
                          onPress={() => handleYearSelect(year)}
                          style={[
                            styles.yearChip,
                            isActive ? styles.yearChipActive : null,
                            isDisabled ? styles.yearChipDisabled : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.yearChipText,
                              isActive ? styles.yearChipTextActive : null,
                              isDisabled ? styles.yearChipTextDisabled : null,
                            ]}
                          >
                            {year}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Animated.View>
            </GestureDetector>

            <View style={styles.footer}>
              <Pressable
                onPress={animateClose}
                style={({ pressed }) => [styles.footerBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.footerCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.footerPrimary,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.footerDone}>Confirm</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.inkOverlay,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    ...textStyles.headingMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
  },
  modeChipActive: {
    backgroundColor: colors.lavenderSoft,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  modeChipText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: colors.primary,
  },
  navigatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
  },
  navigatorTitle: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    minHeight: 320,
    alignContent: 'flex-start',
  },
  yearChip: {
    width: '31%',
    minWidth: 88,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearChipDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  yearChipText: {
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  yearChipTextActive: {
    color: colors.surface,
  },
  yearChipTextDisabled: {
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.large,
  },
  footerPrimary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    ...shadows.small,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
  },
  footerCancel: {
    ...textStyles.button,
    color: colors.textSecondary,
  },
  footerDone: {
    ...textStyles.button,
    color: colors.surface,
  },
  btnPressed: {
    opacity: 0.82,
  },
});
