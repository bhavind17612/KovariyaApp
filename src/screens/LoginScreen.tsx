import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';

import { colors, spacing, borderRadius, shadows, textStyles } from '../theme';
import { InputField } from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getDisplayMessage } from '../utils/errorParser';
import { authService } from '../services/authService';

const { width: SW } = Dimensions.get('window');

// Height of the illustration card section (height + marginBottom from styles).
// Used to compute how far to translateY the content when the PIN keyboard opens.
const ILLUS_SECTION_H = 200 + spacing.lg;
// Height of the back-button spacer that sits above the illustration.
const SPACER_H = 40 + spacing.sm + spacing.xs;
// Total upward shift so the PIN form sits flush against the safe-area top edge.
const PIN_KEYBOARD_SHIFT = ILLUS_SECTION_H + SPACER_H;

// ─── Animated PIN / OTP box ─────────────────────────────────────────────────
const DigitBox = ({
  value,
  focused,
  hasError,
}: {
  index: number;
  value: string;
  focused: boolean;
  hasError?: boolean;
}) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (value) {
      scale.value = withSequence(
        withSpring(1.12, { damping: 16 }),
        withSpring(1, { damping: 16 }),
      );
    }
  }, [value]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        styles.digitBox,
        focused && styles.digitBoxFocused,
        value && styles.digitBoxFilled,
        hasError && styles.digitBoxError,
        animStyle,
      ]}
    >
      {value ? (
        <View style={styles.digitDot} />
      ) : (
        <Text style={styles.digitPlaceholder}>•</Text>
      )}
    </Animated.View>
  );
};

// ─── Illustration (same as Onboarding) ──────────────────────────────────────
const IllustrationCard = () => (
  <View style={styles.illusCard}>
    <Image
      source={require('../../assets/images/onboarding-1.webp')}
      style={styles.illusImage}
    />
    <View style={styles.illusTextBox}>
      <Text style={styles.illusTitle}>Welcome Back</Text>
      <Text style={styles.illusSub}>Smart parenting, calmer days</Text>
    </View>
  </View>
);

// ─── Main Login Screen ──────────────────────────────────────────────────────
interface LoginProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginProps) {
  const { loginWithPin, loginWithEmailOtp } = useAuth();
  const { showToast } = useToast();

  const [rememberedParentId, setRememberedParentId] = useState<string | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState('');
  const [isPinFocused, setIsPinFocused] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  // Fetch remembered parent ID on mount
  useEffect(() => {
    require('../services/authService').authService.getRememberedParentId().then((id: string | null) => {
      setRememberedParentId(id);
      if (!id) {
        // If no remembered parent, force them to use email/OTP
        setMode('email');
      }
    });
  }, []);

  // Email OTP state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showOtpEntry, setShowOtpEntry] = useState(false);
  const [otp, setOtp] = useState('');
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  // ── Keyboard-lift animation (PIN mode only) ───────────────────────────────
  // Translates the entire content block upward by PIN_KEYBOARD_SHIFT when the
  // soft keyboard opens so the PIN boxes slide to the top of the visible area.
  const keyboardOffset = useSharedValue(0);

  const contentShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardOffset.value }],
  }));

  // Fade the illustration out as the form starts lifting (first 40 % of shift).
  const illusKbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      keyboardOffset.value,
      [-PIN_KEYBOARD_SHIFT * 0.4, 0],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const duration = Platform.OS === 'ios' ? 260 : 300;

    const showSub = Keyboard.addListener(showEvent, () => {
      if (mode === 'pin') {
        keyboardOffset.value = withTiming(-PIN_KEYBOARD_SHIFT, {
          duration,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [mode]);

  // Reset shift immediately when leaving PIN mode so the email form isn't offset.
  useEffect(() => {
    if (mode !== 'pin') {
      keyboardOffset.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [mode]);

  // ── Slide animation (PIN ↔ Email) ─────────────────────────────────────────
  const pinX = useSharedValue(0);
  const emailX = useSharedValue(SW);
  const emailOtpX = useSharedValue(SW);

  const pinSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pinX.value }],
    opacity: interpolate(pinX.value, [-SW, 0], [0, 1]),
  }));
  const emailSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: emailX.value }],
    opacity: interpolate(emailX.value, [0, SW], [1, 0]),
    position: 'absolute' as const,
    width: '100%' as const,
  }));
  const emailOtpSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: emailOtpX.value }],
    opacity: interpolate(emailOtpX.value, [0, SW], [1, 0]),
    position: 'absolute' as const,
    width: '100%' as const,
  }));

  // Timer countdown
  useEffect(() => {
    if (!timerActive) return;
    if (timer <= 0) {
      setTimerActive(false);
      return;
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, timerActive]);

  // ── Switch to Email OTP ───────────────────────────────────────────────────
  const switchToEmail = () => {
    setMode('email');
    pinX.value = withTiming(-SW, { duration: 360, easing: Easing.inOut(Easing.cubic) });
    emailX.value = withTiming(0, { duration: 360, easing: Easing.inOut(Easing.cubic) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Switch back to PIN ────────────────────────────────────────────────────
  const switchToPin = () => {
    if (showOtpEntry) {
      // Go from OTP back to email form
      emailX.value = withTiming(0, { duration: 340, easing: Easing.inOut(Easing.cubic) });
      emailOtpX.value = withTiming(SW, { duration: 340, easing: Easing.inOut(Easing.cubic) });
      setTimeout(() => setShowOtpEntry(false), 400);
    } else {
      // Go from email form back to PIN
      setMode('pin');
      pinX.value = withTiming(0, { duration: 360, easing: Easing.inOut(Easing.cubic) });
      emailX.value = withTiming(SW, { duration: 360, easing: Easing.inOut(Easing.cubic) });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Hardware back
  useEffect(() => {
    const onBackPress = () => {
      if (showOtpEntry || mode === 'email') {
        switchToPin();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [mode, showOtpEntry]);

  // ── PIN handling ──────────────────────────────────────────────────────────
  const handlePinChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(cleaned);
    setPinError(false);

    if (cleaned.length === 4) {
      verifyPin(cleaned);
    }
  };

  const verifyPin = async (enteredPin: string) => {
    setVerifyingPin(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await loginWithPin(enteredPin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (__DEV__) console.warn('[LoginScreen] verifyPin error:', err);
      setPinError(true);
      setPin('');
      const msg = getDisplayMessage(err) || 'Could not verify PIN';
      showToast({ message: msg, type: 'error', durationMs: 4000 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => pinInputRef.current?.focus(), 300);
    } finally {
      setVerifyingPin(false);
    }
  };

  // ── Email OTP handling ────────────────────────────────────────────────────
  const validateEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleSendOtp = async () => {
    if (sendingOtp) return;

    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Enter a valid email');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSendingOtp(true);

    try {
      const msg = await authService.sendForgotPinOtp(email);
      showToast({ message: msg, type: 'success', durationMs: 3000 });
      setShowOtpEntry(true);
      setTimer(60);
      setTimerActive(true);

      emailX.value = withTiming(-SW, { duration: 360, easing: Easing.inOut(Easing.cubic) });
      emailOtpX.value = withTiming(0, { duration: 360, easing: Easing.inOut(Easing.cubic) });
      setTimeout(() => otpInputRef.current?.focus(), 500);
    } catch (err) {
      showToast({ message: getDisplayMessage(err), type: 'error', durationMs: 4000 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (text: string) => {
    if (verifyingOtp) return;
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(cleaned);
    if (cleaned.length === 4) {
      verifyEmailOtp(cleaned);
    }
  };

  const verifyEmailOtp = async (enteredOtp: string) => {
    setVerifyingOtp(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await loginWithEmailOtp(email.trim().toLowerCase(), enteredOtp);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation handled automatically by AppNavigator (isAuthenticated → true)
    } catch (err) {
      setOtp('');
      showToast({ message: getDisplayMessage(err), type: 'error', durationMs: 4000 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const resendOtp = async () => {
    if (resendingOtp) return;
    setResendingOtp(true);

    try {
      const msg = await authService.resendForgotPinOtp(email);
      setTimer(60);
      setTimerActive(true);
      setOtp('');
      showToast({ message: msg, type: 'info', durationMs: 2500 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      otpInputRef.current?.focus();
    } catch (err) {
      showToast({ message: getDisplayMessage(err), type: 'error', durationMs: 4000 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResendingOtp(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const showBackButton = mode === 'email';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={mode !== 'pin'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* translateY block: slides the whole content up when PIN keyboard opens */}
          <Animated.View style={contentShiftStyle}>

          {/* Back button */}
          {showBackButton ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <Pressable style={styles.backBtn} onPress={switchToPin} hitSlop={12}>
                <Icon name="arrow-back" size={24} color={colors.textPrimary} />
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.backBtnSpacer} />
          )}

          {/* Illustration — only on PIN screen; fades out as form lifts */}
          {mode === 'pin' && (
            <Animated.View
              entering={FadeInDown.duration(500).delay(100)}
              style={illusKbStyle}
            >
              <IllustrationCard />
            </Animated.View>
          )}

          {/* Sliding container */}
          <View style={{ flex: 1 }}>
            {/* ─── PIN Entry ──────────────────────────────────────── */}
            <Animated.View style={[styles.formBlock, pinSlideStyle]}>
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <Text style={styles.sectionTitle}>Enter your PIN</Text>
                <Text style={styles.sectionSubtitle}>
                  Enter your 4-digit security PIN to continue
                </Text>
              </Animated.View>

              {/* 4 PIN boxes + hidden input */}
              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <Pressable
                  style={styles.digitRow}
                  onPress={() => {
                    if (pinInputRef.current?.isFocused()) {
                      pinInputRef.current.blur();
                      setTimeout(() => pinInputRef.current?.focus(), 50);
                    } else {
                      pinInputRef.current?.focus();
                    }
                  }}
                >
                  {[0, 1, 2, 3].map((i) => {
                    const digit = pin[i] || '';
                    const isFocused =
                      isPinFocused &&
                      (pin.length === i || (pin.length === 4 && i === 3));
                    return (
                      <DigitBox
                        key={i}
                        index={i}
                        value={digit}
                        focused={isFocused && mode === 'pin'}
                        hasError={pinError}
                      />
                    );
                  })}
                </Pressable>

                <TextInput
                  ref={pinInputRef}
                  style={styles.hiddenInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={pin}
                  onChangeText={handlePinChange}
                  onFocus={() => setIsPinFocused(true)}
                  onBlur={() => setIsPinFocused(false)}
                  caretHidden
                  autoFocus
                  autoComplete="off"
                />

                {verifyingPin && (
                  <View style={styles.verifyingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.verifyingText}>Verifying…</Text>
                  </View>
                )}
              </Animated.View>

              {/* Forgot PIN → switch to email */}
              <Animated.View
                entering={FadeInUp.duration(400).delay(500)}
                style={styles.forgotRow}
              >
                <Pressable onPress={switchToEmail} style={styles.forgotBtn}>
                  <Icon
                    name="mail-outline"
                    size={18}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.forgotText}>Forgot PIN? Use email instead</Text>
                </Pressable>
              </Animated.View>

              {__DEV__ && (
                <Animated.View
                  entering={FadeInUp.duration(400).delay(600)}
                  style={styles.devHint}
                >
                  <Icon name="science" size={18} color={colors.textSecondary} />
                  <Text style={styles.devHintText}>Dev: any 4-digit PIN works</Text>
                </Animated.View>
              )}

              {/* New user registration link */}
              <Animated.View
                entering={FadeInUp.duration(400).delay(700)}
                style={styles.registerRow}
              >
                <Text style={styles.registerLabel}>New here? </Text>
                <Pressable onPress={() => navigation.navigate('Onboarding1')}>
                  <Text style={styles.registerLink}>Register your account</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* ─── Email Form ─────────────────────────────────────── */}
            <Animated.View style={[styles.formBlock, emailSlideStyle]}>
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.sectionTitle}>Sign in with Email</Text>
                <Text style={styles.sectionSubtitle}>
                  We'll send a one-time code to your registered email address
                </Text>
              </Animated.View>

              <View style={styles.fields}>
                <InputField
                  label="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  error={emailError}
                  leftIcon={
                    <Icon
                      name="alternate-email"
                      size={22}
                      color={colors.textMuted}
                    />
                  }
                />
              </View>

              {/* Send OTP CTA */}
              <View style={styles.ctaAnimBtn}>
                <Pressable
                  android_ripple={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    foreground: true,
                  }}
                  style={styles.ctaBtn}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Send OTP</Text>
                      <Icon
                        name="arrow-forward"
                        size={20}
                        color={colors.surface}
                      />
                    </>
                  )}
                </Pressable>
              </View>

              {/* Back to PIN link */}
              <Pressable
                onPress={switchToPin}
                style={styles.switchBackRow}
              >
                <Icon
                  name="dialpad"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.switchBackText}>
                  Back to PIN login
                </Text>
              </Pressable>
            </Animated.View>

            {/* ─── Email OTP Entry ────────────────────────────────── */}
            <Animated.View style={[styles.formBlock, emailOtpSlideStyle]}>
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.sectionTitle}>Enter OTP</Text>
                <Text style={styles.sectionSubtitle}>
                  Sent to {email}
                </Text>
              </Animated.View>

              {/* 4 OTP boxes + hidden input */}
              <Pressable
                style={styles.digitRow}
                onPress={() => {
                  if (otpInputRef.current?.isFocused()) {
                    otpInputRef.current.blur();
                    setTimeout(() => otpInputRef.current?.focus(), 50);
                  } else {
                    otpInputRef.current?.focus();
                  }
                }}
              >
                {[0, 1, 2, 3].map((i) => {
                  const digit = otp[i] || '';
                  const isFocused =
                    isOtpFocused &&
                    (otp.length === i || (otp.length === 4 && i === 3));
                  return (
                    <DigitBox
                      key={i}
                      index={i}
                      value={digit}
                      focused={isFocused && showOtpEntry}
                    />
                  );
                })}
              </Pressable>

              <TextInput
                ref={otpInputRef}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={4}
                value={otp}
                onChangeText={handleOtpChange}
                onFocus={() => setIsOtpFocused(true)}
                onBlur={() => setIsOtpFocused(false)}
                caretHidden
                autoFocus={false}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
              />

              {/* Loading indicator while verifying */}
              {verifyingOtp && (
                <View style={styles.verifyingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.verifyingText}>Verifying…</Text>
                </View>
              )}

              {/* Timer + Resend */}
              <View style={styles.timerRow}>
                {resendingOtp ? (
                  <View style={styles.resendingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.timerText}>Resending…</Text>
                  </View>
                ) : timer > 0 ? (
                  <Text style={styles.timerText}>
                    Resend in{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {timer}s
                    </Text>
                  </Text>
                ) : (
                  <Pressable onPress={resendOtp}>
                    <Text style={styles.resendBtn}>Resend OTP</Text>
                  </Pressable>
                )}
              </View>

              {/* Verify CTA */}
              <View style={styles.ctaAnimBtn}>
                <Pressable
                  android_ripple={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    foreground: true,
                  }}
                  style={[
                    styles.ctaBtn,
                    (otp.length < 4 || verifyingOtp) && styles.ctaBtnDisabled,
                  ]}
                  onPress={() => otp.length === 4 && !verifyingOtp && verifyEmailOtp(otp)}
                  disabled={otp.length < 4 || verifyingOtp}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Verify & Sign In</Text>
                      <Icon name="arrow-forward" size={20} color={colors.surface} />
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </View>

          </Animated.View>{/* end contentShiftStyle */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },

  backBtn: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  backBtnSpacer: {
    height: 40 + spacing.sm + spacing.xs,
    marginBottom: 0,
  },

  // Illustration (matching onboarding)
  illusCard: {
    marginHorizontal: spacing.md,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  illusImage: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
    marginBottom: spacing.xs,
  },
  illusTextBox: { alignItems: 'center' },
  illusTitle: { ...textStyles.headingLarge, color: colors.primary },
  illusSub: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Form block
  formBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  sectionTitle: {
    ...textStyles.headingLarge,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },

  // Digit boxes (PIN + OTP)
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  digitBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  digitBoxFocused: {
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  digitBoxFilled: {
    backgroundColor: colors.lavenderSoft,
    borderColor: colors.primary,
  },
  digitBoxError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(232, 93, 93, 0.06)',
  },
  digitDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  digitPlaceholder: {
    fontSize: 24,
    color: colors.textMuted,
    fontWeight: '300',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },

  // Verifying state
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  verifyingText: {
    ...textStyles.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },

  // Forgot PIN row
  forgotRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  forgotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lavenderSoft,
  },
  forgotText: {
    ...textStyles.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },

  // Switch back link
  switchBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  switchBackText: {
    ...textStyles.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
  },

  // Fields
  fields: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  // CTA (matching onboarding)
  ctaAnimBtn: {
    ...shadows.medium,
    borderRadius: borderRadius.large,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.large,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  ctaBtnDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  ctaText: {
    ...textStyles.button,
    color: colors.surface,
    fontSize: 16,
  },

  // Timer (matching onboarding)
  timerRow: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timerText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
  },
  resendBtn: {
    ...textStyles.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Dev hint
  devHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
  },
  devHintText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },

  // Register link
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  registerLabel: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
  },
  registerLink: {
    ...textStyles.bodyMedium,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
