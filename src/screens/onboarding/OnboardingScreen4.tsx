import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	Dimensions,
	Platform,
	TextInput,
	KeyboardAvoidingView,
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withSequence,
	withDelay,
	FadeInDown,
	FadeInUp,
	Easing,
	interpolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows, textStyles } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
	clearOnboardingTokens,
	getOnboardingAccessToken,
	getOnboardingRefreshToken,
} from '../../services/apiService';
import { getDisplayMessage, isOnboardingExpiredError } from '../../utils/errorParser';

const { width: SW } = Dimensions.get('window');

// ─── Step Progress (Dashed system perfectly aligned with Screen 1,2,3) ────────
const StepProgress = ({ current, total = 4 }: { current: number; total?: number }) => (
	<View style={spStyles.wrapper}>
		{Array.from({ length: total }).map((_, i) => (
			<View
				key={i}
				style={[
					spStyles.dash,
					(i + 1 <= current) ? spStyles.dashActive : null,
				]}
			/>
		))}
	</View>
);

const spStyles = StyleSheet.create({
	wrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
	dash: {
		width: 32,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.surfaceMuted,
	},
	dashActive: {
		backgroundColor: colors.primary,
	},
});


// ─── Confetti Particle ────────────────────────────────────────────────────────
const CONFETTI_COLORS = [colors.primary, colors.lavender, colors.peach, colors.mint, colors.growth, '#FFD700'];

const ConfettiParticle = ({
	x, delay, color,
}: { x: number; delay: number; color: string }) => {
	const ty = useSharedValue(0);
	const opacity = useSharedValue(0);
	const rot = useSharedValue(0);

	useEffect(() => {
		opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
		ty.value = withDelay(delay, withTiming(400, { duration: 1400, easing: Easing.in(Easing.cubic) }));
		rot.value = withDelay(delay, withTiming(360 * 3, { duration: 1400 }));
		const cleanup = setTimeout(() => {
			opacity.value = withTiming(0, { duration: 300 });
		}, delay + 1000);
		return () => clearTimeout(cleanup);
	}, [delay, opacity, rot, ty]);

	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }],
		opacity: opacity.value,
		position: 'absolute',
		top: -20,
		left: x,
	}));

	return (
		<Animated.View style={[style, { width: 8, height: 8, borderRadius: 2, backgroundColor: color }]} />
	);
};

// ─── PIN Square ───────────────────────────────────────────────────────────────
const PinSquare = ({ value, isActive, state }: { value: string; isActive: boolean; state: 'idle' | 'match' | 'error' }) => {
	// Matches InputField height/curvature
	let borderColor = colors.border;
	if (isActive) borderColor = colors.primary;
	if (state === 'match') borderColor = colors.growth;
	if (state === 'error') borderColor = colors.error;

	return (
		<View style={[styles.pinSquare, { borderColor }]}>
			{value ? (
				<View style={styles.pinDot} />
			) : null}
		</View>
	);
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
interface Props { navigation: any; route: any; }

export function OnboardingScreen4({ navigation, route }: Props) {
	const insets = useSafeAreaInsets();
	const { completeOnboardingAuthentication } = useAuth();
	const { showToast } = useToast();
	const accessToken: string | null = route?.params?.accessToken ?? null;
	// parentData forwarded from Screen1 → Screen2 → Screen3 → Screen4
	const parentData: any = route?.params?.parentData ?? null;
	const [step, setStep] = useState<'set' | 'confirm'>('set');
	const [pin, setPin] = useState('');
	const [confirmPin, setConfirmPin] = useState('');
	const [pinState, setPinState] = useState<'idle' | 'match' | 'error'>('idle');
	const [showConfetti, setShowConfetti] = useState(false);
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
	const hiddenInputRef = useRef<TextInput>(null);

	const screenX = useSharedValue(0);
	const screenStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: screenX.value }],
		opacity: interpolate(Math.abs(screenX.value), [0, SW], [1, 0]),
	}));

	const shakeX = useSharedValue(0);
	const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

	const confettiParticles = Array.from({ length: 24 }, (_, i) => ({
		x: Math.random() * SW,
		delay: i * 50,
		color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
	}));

	const currentPin = step === 'set' ? pin : confirmPin;
	const isPinConfirmed = step === 'confirm' && pinState === 'match' && confirmPin.length === 4;
	const isComplete = isPinConfirmed && hasAcceptedPrivacy;

	// Keep input focused seamlessly
	const focusInput = () => {
		if (hiddenInputRef.current?.isFocused()) {
			hiddenInputRef.current.blur();
			setTimeout(() => hiddenInputRef.current?.focus(), 50);
		} else {
			hiddenInputRef.current?.focus();
		}
	};

	useEffect(() => {
		const timer = setTimeout(focusInput, 400);
		return () => clearTimeout(timer);
	}, [step]);

	// Auto-advance to confirm step once 4-digit PIN is set
	useEffect(() => {
		if (step === 'set' && pin.length === 4) {
			const timer = setTimeout(() => {
				Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
				setStep('confirm');
				setPinState('idle');
			}, 400);
			return () => clearTimeout(timer);
		}
	}, [pin, step]);

	const handlePinChange = (text: string) => {
		const digits = text.replace(/[^0-9]/g, '').slice(0, 4);

		if (step === 'set') {
			setPin(digits);
		} else {
			setConfirmPin(digits);
			if (digits.length === 4) {
				if (pin === digits) {
					setPinState('match');
					Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
					setShowConfetti(true);
					// Blur to drop keyboard when matched perfectly
					hiddenInputRef.current?.blur();
				} else {
					setPinState('error');
					Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
					shakeX.value = withSequence(
						withTiming(-10, { duration: 60 }),
						withTiming(10, { duration: 60 }),
						withTiming(-10, { duration: 60 }),
						withTiming(10, { duration: 60 }),
						withTiming(0, { duration: 60 }),
					);
					setTimeout(() => {
						setConfirmPin('');
						setPinState('idle');
					}, 700);
				}
			} else {
				if (pinState !== 'idle') setPinState('idle');
			}
		}
	};

	const goNext = async () => {
		if (!isComplete || isLoggingIn) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsLoggingIn(true);

		try {
			const finalAccessToken = accessToken ?? (await getOnboardingAccessToken());
			const finalRefreshToken = await getOnboardingRefreshToken();

			if (!finalAccessToken || !finalRefreshToken) {
				showToast({ message: 'Your onboarding session expired. Please verify OTP again.', type: 'error' });
				return;
			}

			const onboardingSuccessMsg = await completeOnboardingAuthentication(
				pin,
				{
					accessToken: finalAccessToken,
					refreshToken: finalRefreshToken,
					expiresAt: Date.now() + 3_600_000,
				},
				parentData,
			);

			await clearOnboardingTokens();

			showToast({ message: onboardingSuccessMsg || 'PIN set! Welcome to Kovariya', type: 'success' });
		} catch (err: any) {
			if (isOnboardingExpiredError(err?.response?.data)) {
				showToast({ message: 'Your session has expired. Please start onboarding again.', type: 'error' });
				navigation.reset({ index: 1, routes: [{ name: 'LoginScreen' }, { name: 'Onboarding1' }] });
				return;
			}
			const msg = getDisplayMessage(err) || err?.message || 'Something went wrong. Please try again.';
			showToast({ message: msg, type: 'error' });
		} finally {
			setIsLoggingIn(false);
		}
	};


	const goBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		if (step === 'confirm') {
			setStep('set');
			setConfirmPin('');
			setPinState('idle');
		} else {
			navigation.goBack();
		}
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>


			{showConfetti ? (
				<View style={StyleSheet.absoluteFillObject} pointerEvents="none">
					{confettiParticles.map((p, i) => (
						<ConfettiParticle key={i} x={p.x} delay={p.delay} color={p.color} />
					))}
				</View>
			) : null}

			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<Animated.View style={[{ flex: 1 }, screenStyle]}>

					{/* Matched topNav with exactly same formatting as Screen 3 */}
					<View style={styles.topNav}>
						<Pressable style={styles.backBtn} onPress={goBack} hitSlop={12}>
							<Icon name="arrow-back" size={24} color={colors.textPrimary} />
						</Pressable>
						<View style={styles.topNavCenter}>
							<StepProgress current={4} />
						</View>
						<View style={styles.spacer} />
					</View>

					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
							<Text style={styles.screenTitle}>
								{step === 'set' ? 'Set Login PIN' : 'Confirm PIN'}
							</Text>
							<Text style={styles.screenSub}>
								{step === 'set' ? 'Secure your profile with a 4-digit PIN' : 'Enter your 4-digit PIN again to confirm'}
							</Text>
						</Animated.View>

						<View style={styles.formArea}>
							<Animated.View style={[styles.squaresWrap, shakeStyle]} entering={FadeInDown.duration(400).delay(100)}>
								<Pressable style={styles.squaresInnerRow} onPress={focusInput}>
									{Array.from({ length: 4 }).map((_, i) => (
										<PinSquare
											key={i}
											value={currentPin[i] || ''}
											isActive={currentPin.length === i}
											state={pinState}
										/>
									))}
								</Pressable>
								<TextInput
									ref={hiddenInputRef}
									style={styles.hiddenInput}
									keyboardType="number-pad"
									maxLength={4}
									caretHidden
									value={currentPin}
									onChangeText={handlePinChange}
									autoFocus
								/>
							</Animated.View>

							<Animated.View entering={FadeInDown.delay(200)}>
								{pinState === 'error' ? (
									<Text style={styles.errorHint}>PINs don't match. Try again.</Text>
								) : null}
								{pinState === 'match' ? (
									<Text style={styles.successHint}>✓ PINs match!</Text>
								) : null}
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.sectionMargin}>
								<View style={styles.infoBanner}>
									<View style={styles.infoBannerBar} />
									<View style={styles.infoBannerContent}>
										<Icon name="security" size={16} color={colors.primary} />
										<Text style={styles.infoBannerText}>
											This PIN allows you to quickly log in without needing your full password every time.
										</Text>
									</View>
								</View>
							</Animated.View>

							{step === 'confirm' && (
								<Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.sectionMargin}>
									<View style={styles.privacyCard}>
										<View style={styles.privacyHeader}>
											<View style={styles.privacyIconWrap}>
												<Icon name="policy" size={18} color={colors.primary} />
											</View>
											<View style={styles.privacyHeaderText}>
												<Text style={styles.privacyTitle}>Privacy policy and data usage</Text>
												<Text style={styles.privacySubtitle}>
													We only use your data to set up your account and personalize your child&apos;s dashboard.
												</Text>
											</View>
										</View>

										<View style={styles.privacyList}>
											<View style={styles.privacyRow}>
												<Icon name="check-circle" size={16} color={colors.growth} />
												<Text style={styles.privacyRowText}>Child profile details are used to tailor content, goals, and age-based insights.</Text>
											</View>
											<View style={styles.privacyRow}>
												<Icon name="check-circle" size={16} color={colors.growth} />
												<Text style={styles.privacyRowText}>Your login PIN secures quick access on this device and helps protect account access.</Text>
											</View>
											<View style={styles.privacyRow}>
												<Icon name="check-circle" size={16} color={colors.growth} />
												<Text style={styles.privacyRowText}>You can review or manage privacy settings later from the Profile section.</Text>
											</View>
										</View>

										<Pressable
											onPress={() => {
												setHasAcceptedPrivacy((prev) => !prev);
												Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											}}
											style={({ pressed }) => [
												styles.checkboxRow,
												hasAcceptedPrivacy ? styles.checkboxRowActive : null,
												pressed ? styles.checkboxRowPressed : null,
											]}
											accessibilityRole="checkbox"
											accessibilityState={{ checked: hasAcceptedPrivacy }}
										>
											<View style={[styles.checkboxBox, hasAcceptedPrivacy ? styles.checkboxBoxChecked : null]}>
												{hasAcceptedPrivacy ? (
													<Icon name="check" size={16} color={colors.surface} />
												) : null}
											</View>
											<Text style={styles.checkboxLabel}>
												I accept the Privacy Policy and agree to how my account and child profile data will be used.
											</Text>
										</Pressable>

										<Text style={styles.privacyFootnote}>
											Acceptance is required to finish setup and continue to your dashboard.
										</Text>
									</View>
								</Animated.View>
							)}
						</View>
					</ScrollView>

					{/* CTA only shown during confirm step – set step auto-advances */}
					{step === 'confirm' && (
						<View
							style={[styles.stickyBottom, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
							<Animated.View
								entering={FadeInUp.duration(400).delay(350)}
								style={styles.ctaAnimBtn}
							>
								<Pressable
									android_ripple={{ color: 'rgba(255, 255, 255, 0.6)', foreground: true }}
									style={[
										styles.ctaBtn,
										!isComplete ? styles.ctaBtnDisabled : null
									]}
									onPress={goNext}
									disabled={!isComplete || isLoggingIn}
								>
									{isLoggingIn ? (
										<ActivityIndicator size="small" color={colors.surface} />
									) : (
										<>
											<Text style={[styles.ctaText, !isComplete ? styles.ctaTextDisabled : null]}>
												Finish Setup
											</Text>
											{isComplete && (
												<Icon name="celebration" size={20} color={colors.surface} />
											)}
										</>
									)}
								</Pressable>
							</Animated.View>
						</View>
					)}

				</Animated.View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.surface },

	hiddenInput: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		opacity: 0,
		fontSize: 1,
	},

	topNav: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.lg,
	},
	backBtn: { padding: spacing.xs, marginLeft: -spacing.xs },
	topNavCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	spacer: { width: 24 },

	scroll: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: 120 },

	header: { marginBottom: spacing.xxl },
	screenTitle: { ...textStyles.headingLarge, color: colors.primary, marginBottom: spacing.xs },
	screenSub: { ...textStyles.bodyMedium, color: colors.textSecondary },

	formArea: { flex: 1 },
	sectionMargin: { marginBottom: spacing.lg, marginTop: spacing.xl },

	squaresWrap: {
		alignItems: 'center',
		marginBottom: spacing.xs,
	},
	squaresInnerRow: {
		flexDirection: 'row',
		gap: spacing.lg,
	},
	pinSquare: {
		width: 56,
		height: 56,
		borderRadius: borderRadius.large,
		backgroundColor: colors.surface,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pinDot: {
		width: 14,
		height: 14,
		borderRadius: 7,
		backgroundColor: colors.textPrimary,
	},

	errorHint: {
		textAlign: 'center', color: colors.error,
		...textStyles.bodyMedium, marginTop: spacing.md,
	},
	successHint: {
		textAlign: 'center', color: colors.growth,
		...textStyles.bodyMedium, fontWeight: '700', marginTop: spacing.md,
	},

	infoBanner: {
		flexDirection: 'row',
		backgroundColor: colors.lavenderSoft, // aligned with UI info patterns
		borderRadius: borderRadius.medium,
		overflow: 'hidden',
		minHeight: 52,
	},
	infoBannerBar: { width: 3, backgroundColor: colors.primary },
	infoBannerContent: {
		flex: 1, flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm,
	},
	infoBannerText: { flex: 1, ...textStyles.caption, color: colors.primary, fontWeight: '500', lineHeight: 18 },

	privacyCard: {
		backgroundColor: colors.surfaceMuted,
		borderRadius: borderRadius.large,
		padding: spacing.md,
		gap: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
	},
	privacyHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
	},
	privacyIconWrap: {
		width: 34,
		height: 34,
		borderRadius: borderRadius.full,
		backgroundColor: colors.lavenderSoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	privacyHeaderText: { flex: 1, gap: 2 },
	privacyTitle: {
		...textStyles.bodyLarge,
		color: colors.textPrimary,
		fontWeight: '700',
	},
	privacySubtitle: {
		...textStyles.caption,
		color: colors.textSecondary,
		lineHeight: 18,
	},
	privacyList: {
		gap: spacing.sm,
	},
	privacyRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
	},
	privacyRowText: {
		flex: 1,
		...textStyles.caption,
		color: colors.textSecondary,
		lineHeight: 18,
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
		padding: spacing.sm,
		borderRadius: borderRadius.medium,
	},
	checkboxRowActive: {
		backgroundColor: colors.lavenderSoft,
	},
	checkboxRowPressed: {
		opacity: 0.9,
	},
	checkboxBox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: colors.border,
		backgroundColor: colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 1,
	},
	checkboxBoxChecked: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	checkboxLabel: {
		flex: 1,
		...textStyles.bodyMedium,
		color: colors.textPrimary,
		lineHeight: 20,
	},
	privacyFootnote: {
		...textStyles.caption,
		color: colors.textSecondary,
		lineHeight: 18,
	},

	stickyBottom: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: spacing.md,
		paddingTop: spacing.md,
		backgroundColor: colors.surface,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	ctaAnimBtn: {
		...shadows.medium,
		borderRadius: borderRadius.large,
	},
	ctaBtn: {
		backgroundColor: colors.primary,
		borderRadius: borderRadius.large,
		height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
		gap: spacing.sm,
	},
	ctaBtnDisabled: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0 },
	ctaText: { ...textStyles.button, color: colors.surface, fontSize: 16 },
	ctaTextDisabled: { color: colors.textMuted },
});
