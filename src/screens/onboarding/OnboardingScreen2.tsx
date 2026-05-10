import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Dimensions,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	FadeInDown,
	FadeInUp,
	Easing,
	interpolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, shadows, textStyles } from '../../theme';
import { InputField } from '../../components/InputField';

const { width: SW } = Dimensions.get('window');

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

const ROLES = ['Mom', 'Dad', 'Guardian'];
const LANGUAGES = [
	{ code: 'en', flag: '🇬🇧', name: 'English' },
	{ code: 'hi', flag: '🇮🇳', name: 'Hindi' },
	{ code: 'gu', flag: '🇮🇳', name: 'Gujarati' },
	{ code: 'mr', flag: '🇮🇳', name: 'Marathi' },
	{ code: 'ta', flag: '🇮🇳', name: 'Tamil' },
];

interface Props { navigation: any; route: any; }

export function OnboardingScreen2({ navigation, route }: Props) {
	const onboardType = route?.params?.onboardType ?? 'school';
	const insets = useSafeAreaInsets();
	const [fullName, setFullName] = useState('');
	const [selectedRole, setSelectedRole] = useState<string | null>(null);
	const [email, setEmail] = useState('');
	const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
	const [showLangDrop, setShowLangDrop] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const screenX = useSharedValue(0);
	const screenStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: screenX.value }],
		opacity: interpolate(Math.abs(screenX.value), [0, SW], [1, 0]),
	}));

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const isFormValid = fullName.trim().length > 0 && selectedRole !== null && emailRegex.test(email.trim());

	const goNext = () => {
		if (!isFormValid || isLoading) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsLoading(true);

		setTimeout(() => {
			setIsLoading(false);
			screenX.value = withTiming(-SW * 0.15, { duration: 250, easing: Easing.out(Easing.cubic) }, () => {
				screenX.value = 0;
			});
			navigation.navigate('Onboarding3', { onboardType });
		}, 500);
	};

	const goBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		navigation.goBack();
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<Animated.View style={[{ flex: 1 }, screenStyle]}>

					<View style={styles.topNav}>
						<Pressable style={styles.backBtn} onPress={goBack} hitSlop={12}>
							<Icon name="arrow-back" size={24} color={colors.textPrimary} />
						</Pressable>
						<View style={styles.topNavCenter}>
							<StepProgress current={2} />
						</View>
						<View style={styles.spacer} />
					</View>

					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
							<Text style={styles.screenTitle}>Complete Your Profile</Text>
							<Text style={styles.screenSub}>Tell us a little about yourself</Text>
						</Animated.View>

						<View style={styles.formArea}>

							<Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.sectionMargin}>
								<Text style={styles.label}>I am a</Text>
								<View style={styles.roleRow}>
									{ROLES.map((role) => {
										const isActive = selectedRole === role;
										return (
											<Pressable
												android_ripple={{ color: 'rgba(124, 106, 232, 0.6)', foreground: true }}
												key={role}
												style={[styles.roleChip, isActive ? styles.roleChipActive : null]}
												onPress={() => {
													setSelectedRole(role);
													Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
												}}
											>
												<Text style={[styles.roleChipText, isActive ? styles.roleChipTextActive : null]}>
													{role}
												</Text>
											</Pressable>
										);
									})}
								</View>
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sectionMargin}>
								<InputField
									label="Full Name"
									value={fullName}
									onChangeText={setFullName}
									placeholder="e.g. Priya Sharma"
									autoCapitalize="words"
									autoCorrect={false}
									leftIcon={<Icon name="person-outline" size={20} color={colors.textMuted} />}
								/>
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.sectionMargin}>
								<InputField
									label={
										<Text style={styles.label}>
											Email
										</Text>
									}
									value={email}
									onChangeText={setEmail}
									placeholder="you@example.com"
									keyboardType="email-address"
									autoCapitalize="none"
									leftIcon={<Icon name="alternate-email" size={20} color={colors.textMuted} />}
								/>
							</Animated.View>

							{/* <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.sectionMargin}>
								<Text style={styles.label}>Language</Text>
								<Pressable
									style={styles.langSelector}
									onPress={() => setShowLangDrop(!showLangDrop)}
								>
									<Text style={styles.flagText}>{selectedLang.flag}</Text>
									<Text style={styles.langText}>{selectedLang.name}</Text>
									<Icon
										name={showLangDrop ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
										size={22}
										color={colors.textSecondary}
									/>
								</Pressable>

								{showLangDrop ? (
									<Animated.View entering={FadeInDown.duration(200)} style={styles.dropdown}>
										{LANGUAGES.map(lang => {
											const isSelected = selectedLang.code === lang.code;
											return (
												<Pressable
													key={lang.code}
													style={[
														styles.dropdownItem,
														isSelected ? styles.dropdownItemActive : null
													]}
													onPress={() => {
														setSelectedLang(lang);
														setShowLangDrop(false);
														Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
													}}
												>
													<Text style={styles.flagText}>{lang.flag}</Text>
													<Text style={[
														styles.dropdownText,
														isSelected ? styles.dropdownTextSelected : null
													]}>
														{lang.name}
													</Text>
													{isSelected ? (
														<Icon name="check" size={18} color={colors.primary} />
													) : null}
												</Pressable>
											);
										})}
									</Animated.View>
								) : null}
							</Animated.View> */}

						</View>
					</ScrollView>

					<Animated.View
						entering={FadeInUp.duration(400).delay(350)}
						style={[styles.stickyBottom, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
					>
						<Pressable
							android_ripple={{ color: 'rgba(255, 255, 255, 0.6)', foreground: true }}
							style={({ pressed }) => [
								styles.ctaBtn,
								!isFormValid && !isLoading ? styles.ctaBtnDisabled : null,
								(pressed && isFormValid && !isLoading) ? styles.ctaBtnPressed : null
							]}
							onPress={goNext}
							disabled={!isFormValid || isLoading}
						>
							{isLoading ? (
								<ActivityIndicator size="small" color={colors.surface} />
							) : (
								<>
									<Text style={[styles.ctaText, !isFormValid ? styles.ctaTextDisabled : null]}>Continue</Text>
									{isFormValid ? <Icon name="arrow-forward" size={20} color={colors.surface} /> : null}
								</>
							)}
						</Pressable>
					</Animated.View>

				</Animated.View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.surface },

	topNav: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.lg,
	},
	backBtn: {
		padding: spacing.xs,
		marginLeft: -spacing.xs,
	},
	topNavCenter: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	spacer: { width: 24 },

	scroll: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: 100 },

	header: { marginBottom: spacing.xxl },
	screenTitle: { ...textStyles.headingLarge, color: colors.primary, marginBottom: spacing.xs },
	screenSub: { ...textStyles.bodyMedium, color: colors.textSecondary },

	formArea: {
		flex: 1,
	},
	sectionMargin: {
		marginBottom: spacing.lg,
	},
	optionalText: { color: colors.textMuted, fontWeight: '400' },

	label: { ...textStyles.bodyMedium, color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.sm },
	roleRow: { flexDirection: 'row', gap: spacing.md },
	roleChip: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.md,
		borderRadius: 24,
		backgroundColor: colors.surfaceMuted,
		borderWidth: 2,
		borderColor: 'transparent',
		overflow: 'hidden',
		...shadows.small,
	},
	roleChipActive: {
		backgroundColor: colors.lavenderSoft,
		borderColor: colors.primary,
		...shadows.small,
	},
	roleChipText: { ...textStyles.bodyMedium, fontWeight: '500', color: colors.textSecondary },
	roleChipTextActive: { color: colors.primary, fontWeight: '600' },

	langSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: borderRadius.large,
		borderWidth: 1.5,
		borderColor: colors.border,
		paddingHorizontal: spacing.md,
		height: 56,
		gap: spacing.sm,
	},
	flagText: { fontSize: 18 },
	langText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
	dropdown: {
		backgroundColor: colors.surface,
		borderRadius: borderRadius.large,
		borderWidth: 1,
		borderColor: colors.border,
		marginTop: spacing.xs,
		overflow: 'hidden',
		...shadows.medium,
	},
	dropdownItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: spacing.md,
		gap: spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	dropdownItemActive: { backgroundColor: colors.lavenderSoft },
	dropdownText: { flex: 1, ...textStyles.bodyMedium, color: colors.textPrimary },
	dropdownTextSelected: { color: colors.primary, fontWeight: '600' },

	stickyBottom: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.md,
		backgroundColor: colors.surface,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	ctaBtn: {
		backgroundColor: colors.primary,
		borderRadius: borderRadius.large,
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
		...shadows.medium,
		overflow: 'hidden'
	},
	ctaBtnDisabled: {
		backgroundColor: colors.surfaceMuted,
		shadowOpacity: 0,
	},
	ctaBtnPressed: { opacity: 0.85 },
	ctaText: { ...textStyles.button, color: colors.surface, fontSize: 16 },
	ctaTextDisabled: { color: colors.textMuted },
});
