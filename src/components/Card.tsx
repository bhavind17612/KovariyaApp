import React, { useMemo } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { spacing, borderRadius, shadows, colors } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: number;
}

export const Card = React.memo(function Card({
  children,
  style,
  variant = 'default',
  padding = spacing.md,
}: CardProps) {
  const variantStyle = useMemo((): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding,
    };

    switch (variant) {
      case 'elevated':
        // Shadow intentionally omitted — must live on the outer Animated.View (shadowWrapper pattern).
        return baseStyle;
      case 'outlined':
        return { ...baseStyle, borderWidth: 1, borderColor: colors.border };
      default:
        return baseStyle;
    }
  }, [variant, padding]);

  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
});

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
  },
});
