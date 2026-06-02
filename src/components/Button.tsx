import React, { useCallback, useEffect } from 'react';
import {
  Text,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, textStyles, shadows } from '../theme';

interface ButtonProps {
  androidRipple?: any;
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  btnStyle?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  hapticOnPress?: boolean;
}

export const Button = React.memo(function Button({
  androidRipple,
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  btnStyle,
  textStyle,
  icon,
  hapticOnPress = true,
}: ButtonProps) {
  const loadingProgress = useSharedValue(loading ? 1 : 0);
  const pressPulse = useSharedValue(1);

  useEffect(() => {
    loadingProgress.value = withTiming(loading ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    pressPulse.value = withTiming(loading ? 0.985 : 1, {
      duration: 240,
      easing: Easing.out(Easing.quad),
    });
  }, [loading, loadingProgress, pressPulse]);

  const handlePress = useCallback(() => {
    if (disabled || loading) {
      return;
    }
    if (hapticOnPress && (variant === 'primary' || variant === 'secondary')) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [disabled, loading, hapticOnPress, variant, onPress]);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.large,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      overflow: 'hidden',
    };

    const sizeStyle = getSizeStyle();
    const variantStyle = getVariantStyle();
    return { ...baseStyle, ...sizeStyle, ...variantStyle };
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: 40,
        };
      case 'large':
        return {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          minHeight: 56,
        };
      default:
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minHeight: 48,
        };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    // Build the base variant style first (so borders/etc are preserved)
    let variantStyle: ViewStyle;
    switch (variant) {
      case 'secondary':
        variantStyle = { backgroundColor: colors.mintSoft, borderWidth: 1.5 };
        break;
      case 'outline':
        variantStyle = {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.primary,
        };
        break;
      case 'ghost':
        variantStyle = { backgroundColor: 'transparent' };
        break;
      default:
        variantStyle = { backgroundColor: colors.primary };
        break;
    }

    // When disabled, overlay only the background; keep borders/radius intact
    if (disabled && !loading) {
      return {
        ...variantStyle,
        backgroundColor: colors.surfaceMuted,
        // For outline/ghost, also dim the border so it reads as disabled
        ...(variant === 'outline' || variant === 'ghost'
          ? { borderColor: colors.surfaceMuted }
          : {}),
      };
    }

    return variantStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = {
      ...textStyles.button,
      textAlign: 'center' as const,
    };

    if (disabled && !loading) {
      return {
        ...baseStyle,
        color: colors.textMuted
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyle,
          color: colors.growth,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          color: colors.primary,
        };
      default:
        return {
          ...baseStyle,
          color: colors.surface,
        };
    }
  };

  const spinnerColor = getTextStyle().color as string;

  const labelAnim = useAnimatedStyle(() => ({
    opacity: interpolate(loadingProgress.value, [0, 1], [1, 0]),
    transform: [
      {
        translateY: interpolate(loadingProgress.value, [0, 1], [0, -6]),
      },
      {
        scale: interpolate(loadingProgress.value, [0, 1], [1, 0.94]),
      },
    ],
  }));

  const spinnerAnim = useAnimatedStyle(() => ({
    opacity: interpolate(loadingProgress.value, [0, 0.35, 1], [0, 0.85, 1]),
    transform: [
      {
        scale: interpolate(loadingProgress.value, [0, 1], [0.65, 1]),
      },
    ],
  }));

  const shellAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pressPulse.value }],
  }));

  return (
    <Animated.View style={[styles.button, shellAnim, style]}>
      <Pressable
        android_ripple={androidRipple}
        style={({ pressed }) => [
          getButtonStyle(),
          btnStyle,
          !disabled && !loading && pressed ? styles.pressed : null,
        ]}
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityState={{ busy: loading }}
      >
        <View style={styles.slot}>
          <Animated.View
            style={[styles.labelRow, labelAnim]}
            pointerEvents={loading ? 'none' : 'auto'}
          >
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <Text numberOfLines={1} style={[getTextStyle(), textStyle]}>{title}</Text>
          </Animated.View>

          <Animated.View
            style={[styles.spinnerLayer, spinnerAnim]}
            pointerEvents="none"
          >
            <ActivityIndicator color={spinnerColor} size="small" />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    marginVertical: spacing.xs,
    borderRadius: borderRadius.large,
    // Shadow lives here (outside overflow:hidden) so it renders on Android
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  pressed: {
    opacity: 0.92,
  },
  slot: {
    width: '100%',
    alignSelf: 'stretch',
    position: 'relative',
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
});
