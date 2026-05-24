import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows, textStyles } from '../theme';

export type ToastType = 'error' | 'success' | 'info';

export type ShowToastOptions = {
  message: string;
  type?: ToastType;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  const showToast = useCallback(
    ({ message: msg, type: t = 'info', durationMs = DEFAULT_DURATION }: ShowToastOptions) => {
      clearTimer();
      setMessage(msg);
      setType(t);
      setVisible(true);

      if (t === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (t === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(msg);
      }

      hideTimer.current = setTimeout(() => {
        setVisible(false);
        hideTimer.current = null;
      }, durationMs);
    },
    [clearTimer]
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Animated.View
            entering={FadeInUp.springify().damping(18).stiffness(220)}
            exiting={FadeOutUp.duration(180)}
            style={[
              styles.banner,
              type === 'error' && styles.bannerError,
              type === 'success' && styles.bannerSuccess,
              type === 'info' && styles.bannerInfo,
              { marginTop: Math.max(insets.top, spacing.md) + spacing.sm },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            pointerEvents="auto"
          >
            <View style={styles.iconWrap}>
              <Icon
                name={
                  type === 'error'
                    ? 'error-outline'
                    : type === 'success'
                      ? 'check-circle'
                      : 'info-outline'
                }
                size={26}
                color={type === 'error' ? colors.error : type === 'success' ? colors.growth : colors.ink}
              />
            </View>
            <Text style={styles.message}>{message}</Text>
            <Pressable
              onPress={hideToast}
              hitSlop={12}
              style={styles.dismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
            >
              <Icon name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.large,
  },
  bannerError: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    backgroundColor: '#FFF8F8',
  },
  bannerSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: colors.growth,
    backgroundColor: colors.mintSoft,
  },
  bannerInfo: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.lavenderSoft,
  },
  iconWrap: {
    marginRight: spacing.sm,
  },
  message: {
    ...textStyles.bodyLarge,
    flex: 1,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  dismiss: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
