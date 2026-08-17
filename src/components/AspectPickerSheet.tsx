import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
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
import type { ApiAspect } from '../types/behaviour';

const { height: SH } = Dimensions.get('window');
const SHEET_CFG = { duration: 300, easing: Easing.out(Easing.cubic) };

type Props = {
  visible: boolean;
  /** Slug of the currently chosen aspect, or null when none is picked yet. */
  selected: string | null;
  aspects: ApiAspect[];
  loading?: boolean;
  onSelect: (aspect: ApiAspect) => void;
  onClose: () => void;
};

/**
 * Radio-style picker for the behaviour aspect a goal targets.
 * Mirrors LanguagePickerSheet so both sheets read the same.
 */
export const AspectPickerSheet = React.memo(function AspectPickerSheet({
  visible,
  selected,
  aspects,
  loading = false,
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
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Select Aspect</Text>
            <Text style={styles.subtitle}>
              The goal will track progress for the behaviour aspect you choose
            </Text>
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

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading aspects…</Text>
          </View>
        ) : aspects.length === 0 ? (
          <View style={styles.stateWrap}>
            <Icon name="cloud-off" size={32} color={colors.textMuted} />
            <Text style={styles.stateText}>
              Couldn&apos;t load aspects. Check your connection and try again.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            bounces={false}
          >
            {aspects.map((aspect, index) => {
              const isSelected = selected === aspect.id;
              return (
                <React.Fragment key={aspect.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      isSelected && styles.rowSelected,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(aspect);
                      onClose();
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={aspect.name}
                  >
                    <View style={[styles.iconOrb, { backgroundColor: `${aspect.color}1F` }]}>
                      <Icon
                        name={aspect.iconName || 'category'}
                        size={20}
                        color={aspect.color || colors.primary}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.aspectLabel, isSelected && styles.aspectLabelSelected]}>
                        {aspect.name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Icon name="check-circle" size={22} color={colors.primary} />
                    ) : (
                      <Icon name="radio-button-unchecked" size={22} color={colors.textMuted} />
                    )}
                  </Pressable>
                  {index < aspects.length - 1 ? <View style={styles.divider} /> : null}
                </React.Fragment>
              );
            })}
          </ScrollView>
        )}
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
    maxHeight: SH * 0.75,
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
  iconOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  aspectLabel: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  aspectLabelSelected: {
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  stateText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
});

export default AspectPickerSheet;
