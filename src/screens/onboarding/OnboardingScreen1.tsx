import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  BackHandler,
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
  Easing,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows, textStyles } from '../../theme';
import { InputField } from '../../components/InputField';
import { useToast } from '../../context/ToastContext';
import { getApiBase, storeOnboardingTokens, extractApiError } from '../../services/apiService';


const { width: SW } = Dimensions.get('window');

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'SG' },
];

// ─── Illustration Card ────────────────────────────────────────────────────────
const IllustrationCard = () => (
  <View style={styles.illusCard}>
    <Image source={require('../../../assets/images/onboarding-1.webp')} style={styles.illusImage} />
    <View style={styles.illusTextBox}>
      <Text style={styles.illusTitle}>Welcome to Kovariya</Text>
      <Text style={styles.illusSub}>Smart parenting, calmer days</Text>
    </View>
  </View>
);

// ─── OTP Input Row ────────────────────────────────────────────────────────────
const OtpBox = ({ index, value, focused }: { index: number; value: string; focused: boolean }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (value) {
      scale.value = withSequence(withSpring(1.1, { damping: 18 }), withSpring(1, { damping: 18 }));
    }
  }, [value]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        styles.otpBox,
        focused && styles.otpBoxFocused,
        value && styles.otpBoxFilled,
        style,
      ]}
    >
      <Text style={styles.otpDigit}>{value || ''}</Text>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
}

export function OnboardingScreen1({ navigation }: Props) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'school' | 'institute'>('school');
  const pillX = useSharedValue(0);
  const pillStyle = useAnimatedStyle(() => ({ left: pillX.value }));
  const [schoolId, setSchoolId] = useState('');
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [mobile, setMobile] = useState('');
  const [showCCPicker, setShowCCPicker] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  // accessToken received from verify-otp; forwarded to downstream screens
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  const mainX = useSharedValue(0);
  const otpX = useSharedValue(SW);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: mainX.value }],
    opacity: interpolate(mainX.value, [-SW, 0], [0, 1]),
  }));
  const otpStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: otpX.value }],
    opacity: interpolate(otpX.value, [0, SW], [1, 0]),
    position: 'absolute',
    width: '100%',
  }));

  // Timer countdown
  useEffect(() => {
    if (!timerActive) return;
    if (timer <= 0) { setTimerActive(false); return; }
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, timerActive]);

  const switchTab = (t: 'school' | 'institute') => {
    setTab(t);
    pillX.value = withTiming(t === 'school' ? 4 : SW / 2 - spacing.md - 2, { duration: 280 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const transitionToOtp = () => {
    mainX.value = withTiming(-SW, { duration: 360, easing: Easing.inOut(Easing.cubic) });
    otpX.value = withTiming(0, { duration: 360, easing: Easing.inOut(Easing.cubic) });
    setShowOtp(true);
    setTimer(60);
    setTimerActive(true);
    setTimeout(() => otpInputRef.current?.focus(), 500);
  };

  const performSendOtp = async (isResend: boolean = false) => {
    if (sendingOtp) return;

    // Validate inputs
    if (!schoolId.trim()) {
      showToast({ message: 'Please enter your School or Institute ID', type: 'error' });
      return;
    }

    const trimmedMobile = mobile.trim();
    if (!trimmedMobile) {
      showToast({ message: 'Please enter your Mobile Number', type: 'error' });
      return;
    }

    if (trimmedMobile.length !== 10 || !/^\d+$/.test(trimmedMobile)) {
      showToast({ message: 'Please enter a valid 10-digit mobile number', type: 'error' });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSendingOtp(true);

    try {
      const apiBase = getApiBase();
      // const fullMobileNumber = `${countryCode.code}${trimmedMobile}`;
      const fullMobileNumber = `${trimmedMobile}`;

      const res = await fetch(`${apiBase}/api/v1/parents/onboarding/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          school_id: schoolId.trim().toUpperCase(),
          mobile_number: fullMobileNumber,
        }),
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        let errMsg = 'Something went wrong. Please try again.';
        if (responseData && typeof responseData === 'object') {
          if (typeof responseData.message === 'string' && responseData.message.trim()) {
            errMsg = responseData.message;
          } else if (typeof responseData.error === 'string' && responseData.error.trim()) {
            errMsg = responseData.error;
          } else if (responseData.data && typeof responseData.data.message === 'string') {
            errMsg = responseData.data.message;
          }
        }
        throw new Error(errMsg);
      }

      // Successful OTP send
      const successMessage = responseData.data?.message || `OTP sent successfully to ${fullMobileNumber}`;
      showToast({ message: successMessage, type: 'success' });

      if (isResend) {
        setTimer(60);
        setTimerActive(true);
        setOtp('');
        otpInputRef.current?.focus();
      } else {
        transitionToOtp();
      }
    } catch (err: any) {
      showToast({ message: err.message || 'Failed to send OTP. Please try again.', type: 'error' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSendOtp = () => performSendOtp(false);

  const handleBack = () => {
    if (showOtp) {
      mainX.value = withTiming(0, { duration: 340, easing: Easing.inOut(Easing.cubic) });
      otpX.value = withTiming(SW, { duration: 340, easing: Easing.inOut(Easing.cubic) });
      setTimeout(() => setShowOtp(false), 400);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // No back on the root screen when not in OTP view
  };

  useEffect(() => {
    const onBackPress = () => {
      if (showOtp) {
        handleBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showOtp]);

  /**
   * Navigate to the correct onboarding screen based on the parent's
   * last-completed onboarding_stage returned by the verify-otp API.
   *
   * Stage values (see migration 20260524000024):
   *   1 = OTP verified  → still needs Profile (Screen 2)
   *   2 = Profile saved → still needs Student (Screen 3)
   *   3 = Student added → still needs PIN    (Screen 4)
   *   4 = PIN set       → onboarding complete (should not normally land here)
   */
  const proceedToNext = (parentData: any, token: string | null) => {
    console.log('proceedToNext – parentData:', parentData);

    const stage: number = parentData?.onboarding_stage ?? 1;

    const commonParams = {
      onboardType: tab,
      schoolId: schoolId.trim().toUpperCase(),
      mobile: mobile.trim(),
      accessToken: token,
    };

    let targetScreen: string;
    let extraParams: Record<string, any> = {};

    if (stage >= 3) {
      // Stage 3 completed → go straight to PIN setup
      targetScreen = 'Onboarding4';
    } else if (stage >= 2) {
      // Stage 2 completed → go straight to Add Child
      targetScreen = 'Onboarding3';
    } else {
      // Stage 1 (default) → go to Profile Details, pass parentData for PATCH
      targetScreen = 'Onboarding2';
    }
    extraParams = { parentData };
    navigation.navigate(targetScreen, { ...commonParams, ...extraParams });

    setTimeout(() => {
      mainX.value = 0;
      otpX.value = SW;
      setShowOtp(false);
      setOtp('');
    }, 300);
  };

  const handleVerifyOtp = async (enteredOtp?: string) => {
    const otpToVerify = enteredOtp || otp;
    if (otpToVerify.length !== 4) {
      showToast({ message: 'Please enter a valid 4-digit OTP', type: 'error' });
      return;
    }

    if (verifyingOtp) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVerifyingOtp(true);

    try {
      const apiBase = getApiBase();
      const trimmedMobile = mobile.trim();

      const res = await fetch(`${apiBase}/api/v1/parents/onboarding/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          school_id: schoolId.trim().toUpperCase(),
          mobile_number: trimmedMobile,
          otp_code: otpToVerify,
        }),
      });

      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(extractApiError(responseData, 'OTP verification failed. Please try again.'));
      }

      // Successful OTP Verification — extract and persist tokens
      const data = responseData.data ?? responseData;
      const newAccessToken: string | undefined = data?.accessToken || data?.access_token;
      const newRefreshToken: string | undefined = data?.refreshToken || data?.refresh_token;

      let resolvedToken: string | null = accessToken;
      if (newAccessToken && newRefreshToken) {
        await storeOnboardingTokens(newAccessToken, newRefreshToken);
        setAccessToken(newAccessToken);
        resolvedToken = newAccessToken;
      }

      const successMessage = data?.message || 'OTP verified successfully!';
      showToast({ message: successMessage, type: 'success' });

      // Pass the parent object AND the resolved token so proceedToNext
      // can determine which onboarding screen to resume from.
      proceedToNext(data?.parent, resolvedToken);
    } catch (err: any) {
      showToast({ message: err.message || 'OTP verification failed. Please try again.', type: 'error' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(cleaned);
    if (cleaned.length === 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => handleVerifyOtp(cleaned), 350);
    }
  };

  const resendOtp = () => {
    performSendOtp(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button — only visible when in OTP sub-screen */}
          {showOtp && (
            <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
              <Icon name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
          )}
          {/* Spacer when not showing back button to keep layout consistent */}
          {!showOtp && <View style={styles.backBtnSpacer} />}

          {/* Illustration */}
          {!showOtp && (
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
              <IllustrationCard />
            </Animated.View>
          )}

          {/* Relative container for slide transitions */}
          <View style={{ flex: 1 }}>
            {/* Main Form */}
            <Animated.View style={[styles.formBlock, mainStyle]}>
              {/* Tab Toggle */}
              <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.tabContainer}>
                <View style={styles.tabTrack}>
                  <Animated.View style={[styles.tabPill, pillStyle]} />
                  <Pressable style={styles.tabBtn} onPress={() => switchTab('school')}>
                    <Icon name="school" size={16} color={tab === 'school' ? colors.surface : colors.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={[styles.tabText, tab === 'school' && styles.tabTextActive]}>School</Text>
                  </Pressable>
                  <Pressable style={styles.tabBtn} onPress={() => switchTab('institute')}>
                    <Icon name="apartment" size={16} color={tab === 'institute' ? colors.surface : colors.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={[styles.tabText, tab === 'institute' && styles.tabTextActive]}>Institute</Text>
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.fields}>
                {/* School / Institute ID */}
                <InputField
                  label={tab === 'school' ? 'School ID' : 'Institute ID'}
                  placeholder={tab === 'school' ? 'e.g. SCH-20045' : 'e.g. INST-30078'}
                  value={schoolId}
                  onChangeText={setSchoolId}
                  autoCapitalize="characters"
                  leftIcon={<Icon name={tab === 'school' ? 'business' : 'apartment'} size={20} color={colors.textMuted} />}
                />

                {/* Mobile Number */}
                <View style={{ zIndex: 10 }}>
                  <InputField
                    label="Mobile Number"
                    placeholder="9876543210"
                    keyboardType="phone-pad"
                    value={mobile}
                    onChangeText={setMobile}
                    maxLength={10}
                    leftIcon={<Icon name="phone" size={20} color={colors.textMuted} />}
                  />
                  {showCCPicker && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.ccDropdown}>
                      {COUNTRY_CODES.map(cc => (
                        <Pressable
                          key={cc.code}
                          style={styles.ccOption}
                          onPress={() => { setCountryCode(cc); setShowCCPicker(false); }}
                        >
                          <Text style={styles.ccFlag}>{cc.flag}</Text>
                          <Text style={styles.ccOptionText}>{cc.name}</Text>
                          <Text style={styles.ccOptionCode}>{cc.code}</Text>
                        </Pressable>
                      ))}
                    </Animated.View>
                  )}
                </View>
              </Animated.View>

              {/* Send OTP CTA */}
              <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.ctaAnimBtn}>
                <Pressable
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.6)', foreground: true }}
                  style={styles.ctaBtn}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Send OTP</Text>
                      <Icon name="arrow-forward" size={20} color={colors.surface} />
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* OTP Sub-screen */}
            <Animated.View style={[styles.formBlock, otpStyle]}>
              <Animated.View entering={FadeInDown.duration(400)}>
                <Text style={styles.otpTitle}>Enter OTP</Text>
                <Text style={styles.otpSubtitle}>
                  Sent to {countryCode.code} {mobile}
                </Text>
              </Animated.View>

              {/* 4 OTP boxes + hidden input */}
              <Pressable style={styles.otpRow} onPress={() => {
                if (otpInputRef.current?.isFocused()) {
                  otpInputRef.current.blur();
                  setTimeout(() => otpInputRef.current?.focus(), 50);
                } else {
                  otpInputRef.current?.focus();
                }
              }}>
                {[0, 1, 2, 3].map((i) => {
                  const digit = otp[i] || '';
                  const isFocused = isOtpFocused && (otp.length === i || (otp.length === 4 && i === 3));
                  return <OtpBox key={i} index={i} value={digit} focused={isFocused && showOtp} />;
                })}
              </Pressable>

              {/* Single Hidden Input */}
              <TextInput
                ref={otpInputRef}
                style={styles.singleHiddenInput}
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

              {/* Timer + Resend */}
              <View style={styles.timerRow}>
                {timer > 0 ? (
                  <Text style={styles.timerText}>Resend in <Text style={{ color: colors.primary, fontWeight: '700' }}>{timer}s</Text></Text>
                ) : (
                  <Pressable onPress={resendOtp}>
                    <Text style={styles.resendBtn}>Resend OTP</Text>
                  </Pressable>
                )}
              </View>

              {/* Verify CTA */}
              <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.ctaAnimBtn}>
                <Pressable
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.6)', foreground: true }}
                  style={styles.ctaBtn}
                  onPress={() => handleVerifyOtp()}
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator color={colors.surface} size="small" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Verify & Continue</Text>
                      <Icon name="arrow-forward" size={20} color={colors.surface} />
                    </>
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },

  backBtn: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, marginBottom: spacing.xs },
  backBtnSpacer: { height: 40 + spacing.sm + spacing.xs, marginBottom: 0 },

  // Illustration
  illusCard: {
    marginHorizontal: spacing.md,
    // borderRadius: borderRadius.xxl,
    // backgroundColor: colors.lavenderSoft,
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
    marginBottom: spacing.xs
  },
  childEmoji: { fontSize: 64, marginBottom: spacing.xs },
  illusTextBox: { alignItems: 'center' },
  illusTitle: { ...textStyles.headingLarge, color: colors.primary },
  illusSub: { ...textStyles.bodyMedium, color: colors.textSecondary, marginTop: 2 },

  // Form
  formBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  // Tab toggle
  tabContainer: { marginBottom: spacing.lg },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.full,
    padding: 4,
    position: 'relative',
    height: 48,
  },
  tabPill: {
    position: 'absolute',
    top: 4, bottom: 4,
    width: '50%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    ...shadows.small,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: { ...textStyles.bodyMedium, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.surface },

  // Inputs
  fields: { gap: spacing.lg, marginBottom: spacing.lg },
  label: { ...textStyles.bodyMedium, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 56,
    gap: spacing.sm,
    ...shadows.small,
  },
  input: {
    flex: 1,
    ...textStyles.bodyLarge,
    color: colors.textPrimary,
    height: '100%',
  },

  // Country code chip
  ccChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ccFlag: { fontSize: 18 },
  ccCode: { ...textStyles.bodyMedium, fontWeight: '600', color: colors.textPrimary },
  divider: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 4 },
  ccDropdown: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 100,
    ...shadows.medium,
    overflow: 'hidden',
  },
  ccOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ccOptionText: { ...textStyles.bodyMedium, flex: 1, color: colors.textPrimary, fontWeight: '500' },
  ccOptionCode: { ...textStyles.bodyMedium, color: colors.textSecondary },

  // CTA
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
  ctaText: { ...textStyles.button, color: colors.surface, fontSize: 16 },

  // OTP
  otpTitle: { ...textStyles.headingLarge, marginBottom: spacing.xs },
  otpSubtitle: { ...textStyles.bodyMedium, color: colors.textSecondary, marginBottom: spacing.xl },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  otpBox: {
    width: 56, height: 56,
    borderRadius: borderRadius.medium,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.small,
  },
  otpBoxFocused: { borderColor: colors.primary, borderWidth: 2.5 },
  otpBoxFilled: { backgroundColor: colors.lavenderSoft, borderColor: colors.primary },
  otpDigit: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  singleHiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  timerRow: { alignItems: 'center', marginBottom: spacing.xl },
  timerText: { ...textStyles.bodyMedium, color: colors.textSecondary },
  resendBtn: { ...textStyles.bodyMedium, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
