import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, textStyles } from '../theme';
import {
  type SupportedLanguage,
  LANGUAGE_META,
} from '../data/aspectRatingI18n';

const { height: SH } = Dimensions.get('window');
const SHEET_CFG = { duration: 300, easing: Easing.out(Easing.cubic) };

const ALL_LANGUAGES = Object.entries(LANGUAGE_META) as [SupportedLanguage, typeof LANGUAGE_META[SupportedLanguage]][];

type Props = {
  visible: boolean;
  selected: SupportedLanguage;
  onSelect: (lang: SupportedLanguage) => void;
  onClose: () => void;
};

export const LanguagePickerSheet = React.memo(function LanguagePickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(SH);

  useEffect(() => {
    y.value = withTiming(visible ? 0 : SH, SHEET_CFG);
  }, [visible, y]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <Animated.View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }, sheetStyle]}
      >
        {/* Grabber */}
        <View style={styles.grabber} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Select Language</Text>
            <Text style={styles.subtitle}>Aspect rating will be shown in the selected language</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Language list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          bounces={false}
        >
          {ALL_LANGUAGES.map(([key, meta], index) => {
            const isSelected = selected === key;
            return (
              <React.Fragment key={key}>
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    isSelected && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect(key);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${meta.label} — ${meta.nativeLabel}`}
                >
                  <Text style={styles.flag}>{meta.flag}</Text>
                  <View style={styles.rowText}>
                    <Text style={[styles.langLabel, isSelected && styles.langLabelSelected]}>
                      {meta.nativeLabel}
                    </Text>
                    <Text style={styles.langSub}>{meta.label}</Text>
                  </View>
                  {isSelected ? (
                    <Icon name="check-circle" size={22} color={colors.primary} />
                  ) : (
                    <Icon name="radio-button-unchecked" size={22} color={colors.textMuted} />
                  )}
                </Pressable>
                {index < ALL_LANGUAGES.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.headingMedium,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 18,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 3,
    maxWidth: 240,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  closeBtnPressed: { opacity: 0.75 },
  list: {
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    gap: spacing.md,
  },
  rowSelected: {
    backgroundColor: colors.lavenderSoft,
  },
  rowPressed: {
    opacity: 0.88,
  },
  flag: {
    fontSize: 28,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  langLabel: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  langLabelSelected: {
    color: colors.primary,
  },
  langSub: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});
