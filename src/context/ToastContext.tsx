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
  Modal,
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

// How long to keep the Modal mounted after content hides so the exit animation finishes.
const EXIT_ANIMATION_MS = 250;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  /** Whether the toast banner is rendered inside the Modal (drives enter/exit animation). */
  const [visible, setVisible] = useState(false);
  /** Whether the Modal itself is mounted. Lags behind `visible` by EXIT_ANIMATION_MS on close. */
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const clearModalCloseTimer = useCallback(() => {
    if (modalCloseTimer.current) {
      clearTimeout(modalCloseTimer.current);
      modalCloseTimer.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearHideTimer();
    setVisible(false);
    // Delay closing the Modal so the exit animation has time to complete.
    modalCloseTimer.current = setTimeout(() => {
      setModalOpen(false);
      modalCloseTimer.current = null;
    }, EXIT_ANIMATION_MS);
  }, [clearHideTimer]);

  const showToast = useCallback(
    ({ message: msg, type: t = 'info', durationMs = DEFAULT_DURATION }: ShowToastOptions) => {
      clearHideTimer();
      clearModalCloseTimer(); // cancel any in-progress close so we can re-open immediately
      setMessage(msg);
      setType(t);
      setModalOpen(true);
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
      }, durationMs);
    },
    [clearHideTimer, clearModalCloseTimer, hideToast]
  );

  useEffect(() => () => {
    clearHideTimer();
    clearModalCloseTimer();
  }, [clearHideTimer, clearModalCloseTimer]);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        Render inside a transparent Modal so the toast always sits in its own
        native window layer — above any other Modal (e.g. AspectRatingSheet),
        regardless of React view z-order.
      */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={hideToast}
      >
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlay]}>
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
      </Modal>
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
