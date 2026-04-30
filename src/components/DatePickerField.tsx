import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius, textStyles } from '../theme';
import { formatAppDate } from '../utils/dateFormat';
import { toIsoDate } from '../utils/age';
import { GlobalDatePickerModal } from './GlobalDatePickerModal';

type DatePickerFieldProps = {
  label?: string | React.ReactNode;
  valueIso: string | undefined;
  onChangeIso: (iso: string) => void;
  placeholder?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  minimumDate?: Date;
  maximumDate?: Date;
  children?: React.ReactNode;
};

function parseIsoToLocalDate(iso: string | undefined): Date {
  if (!iso || iso.length < 10) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 8);
    return d;
  }
  const t = Date.parse(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(t) ? new Date() : new Date(t);
}

export const DatePickerField = React.memo(function DatePickerField({
  label,
  valueIso,
  onChangeIso,
  placeholder = 'Select date',
  error,
  leftIcon,
  containerStyle,
  minimumDate,
  maximumDate,
  children,
}: DatePickerFieldProps) {
  const [showModal, setShowModal] = useState(false);

  const display = useMemo(() => {
    if (!valueIso || valueIso.length < 10) {
      return null;
    }
    return formatAppDate(valueIso.slice(0, 10));
  }, [valueIso]);

  const openPicker = useCallback(() => {
    setShowModal(true);
  }, []);

  const cancelDate = useCallback(() => {
    setShowModal(false);
  }, []);

  const onDateConfirm = useCallback((selectedDate: Date) => {
    onChangeIso(toIsoDate(selectedDate));
  }, [onChangeIso]);

  const maxD = maximumDate ?? new Date();
  const minD = minimumDate ?? new Date(1900, 0, 1);

  return (
    <View style={containerStyle}>
      {label && typeof label === 'string' ? (
        <Text style={[styles.labelAbove, error ? styles.labelAboveError : null]}>
          {label}
        </Text>
      ) : label}

      {children ? (
        <Pressable onPress={openPicker}>{children}</Pressable>
      ) : (
        <Pressable
          onPress={openPicker}
          style={[
            styles.fieldBox,
            error ? styles.fieldBoxError : null,
            showModal && !error ? styles.fieldBoxFocused : null,
          ]}
        >
          {leftIcon ? <View style={styles.leftIconWrap}>{leftIcon}</View> : null}
          <View style={styles.valueRow}>
            <Text
              style={[styles.valueText, !display ? styles.placeholder : null]}
              numberOfLines={1}
            >
              {display ?? placeholder}
            </Text>
            <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
          </View>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GlobalDatePickerModal
        visible={showModal}
        onClose={cancelDate}
        onConfirm={onDateConfirm}
        initialDate={parseIsoToLocalDate(valueIso)}
        minimumDate={minD}
        maximumDate={maxD}
        title={typeof label === 'string' ? label : 'Select Date'}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  labelAbove: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  labelAboveError: {
    color: colors.error,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  fieldBoxFocused: {
    borderColor: colors.primary,
  },
  fieldBoxError: {
    borderColor: colors.error,
  },
  leftIconWrap: {
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  valueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  valueText: {
    ...textStyles.bodyLarge,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  error: {
    ...textStyles.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
