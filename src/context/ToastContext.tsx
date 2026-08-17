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
import { ToastPortalProvider } from './ToastPortal';

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

const DEFAULT_DURATION = 3000;

/**
 * Hard ceiling for how long a toast stays on screen. Applied to every call, so a
 * caller passing a longer `durationMs` is clamped rather than trusted — the 3s
 * rule holds even for call sites added later.
 */
const MAX_DURATION = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  /** Whether the toast banner is rendered (drives the enter/exit animation). */
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearHideTimer();
    // The overlay container stays mounted, so Reanimated plays the exiting
    // animation and removes the banner on its own — no unmount timer needed.
    setVisible(false);
  }, [clearHideTimer]);

  const showToast = useCallback(
    ({ message: msg, type: t = 'info', durationMs = DEFAULT_DURATION }: ShowToastOptions) => {
      clearHideTimer();
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
        hideToast();
        hideTimer.current = null;
      }, Math.min(durationMs, MAX_DURATION));
    },
    [clearHideTimer, hideToast]
  );

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  /*
    The banner is handed to the portal layer rather than rendered in place, so it
    draws above the app UI without a Modal owning the screen. The wrapper is
    `box-none` and always mounted: it never intercepts touches, and keeping it
    mounted lets Reanimated run the exit animation without flicker.
  */
  const overlayContent = (
    <View pointerEvents="box-none" style={styles.overlay}>
      {visible ? (
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
      ) : null}
    </View>
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPortalProvider content={overlayContent}>{children}</ToastPortalProvider>
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
    flex: 1,
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
