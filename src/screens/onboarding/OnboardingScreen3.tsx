import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Dimensions,
	Modal,
	ActivityIndicator,
	TextInput,
	Keyboard,
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
import { DatePickerField } from '../../components/DatePickerField';
import { formatAppDate } from '../../utils/dateFormat';
import { ageFromIsoDate, toIsoDate } from '../../utils/age';
import { api, ENDPOINTS } from '../../api';
import { parseApiError, isOnboardingExpiredError } from '../../utils/errorParser';
import { useToast } from '../../context/ToastContext';

const { width: SW, height: SH } = Dimensions.get('window');

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

const GRADES = ['Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const currentYear = new Date().getFullYear();

const SHEET_ANIM_CFG = { duration: 320, easing: Easing.out(Easing.cubic) };

const GradeSheet = ({
	visible,
	selected,
	onSelect,
	onClose,
}: {
	visible: boolean;
	selected: string;
	onSelect: (g: string) => void;
	onClose: () => void;
}) => {
	const sheetY = useSharedValue(SH);

	useEffect(() => {
		sheetY.value = withTiming(visible ? 0 : SH, SHEET_ANIM_CFG);
	}, [visible]);

	const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

	if (!visible) return null;

	return (
		<Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
			<Pressable style={styles.modalOverlay} onPress={onClose} />
			<Animated.View style={[styles.gradeSheet, sheetStyle]}>
				{/* <View style={styles.pickerHandle} /> */}
				<View style={styles.gradeSheetHeader}>
					<Text style={styles.gradeSheetTitle}>Select Standard</Text>
					<Pressable onPress={onClose} style={styles.gradeSheetClose}>
						<Icon name="close" size={22} color={colors.textSecondary} />
					</Pressable>
				</View>
				<ScrollView showsVerticalScrollIndicator={false} style={styles.maxHeightSheet}>
					{GRADES.map((g, i) => {
						const isSelected = selected === g;
						return (
							<React.Fragment key={g}>
								<Pressable
									style={[styles.gradeItem, isSelected ? styles.gradeItemActive : null]}
									onPress={() => { onSelect(g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
								>
									<Text style={[styles.gradeText, isSelected ? styles.gradeTextActive : null]}>{g}</Text>
									{isSelected ? <Icon name="check" size={18} color={colors.primary} /> : null}
								</Pressable>
								{(i < GRADES.length - 1) ? <View style={styles.gradeDivider} /> : null}
							</React.Fragment>
						);
					})}
				</ScrollView>
			</Animated.View>
		</Modal>
	);
};

const SchoolSheet = ({
	visible,
	selected,
	onSelect,
	onClose,
	schools,
	onAddSchool,
	loading = false,
	title = 'School',
}: {
	visible: boolean;
	selected: string;
	onSelect: (s: string) => void;
	onClose: () => void;
	schools: string[];
	onAddSchool: (s: string) => void;
	loading?: boolean;
	title?: string;
}) => {
	const sheetY = useSharedValue(SH);
	const [searchQuery, setSearchQuery] = useState('');

	useEffect(() => {
		sheetY.value = withTiming(visible ? 0 : SH, SHEET_ANIM_CFG);
		if (visible) setSearchQuery('');
	}, [visible, sheetY]);

	const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));

	if (!visible) return null;

	const filtered = schools.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
	const showAdd = searchQuery.trim().length > 0 && !schools.some(s => s.toLowerCase() === searchQuery.trim().toLowerCase());

	return (
		<Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
			<Pressable style={styles.modalOverlay} onPress={onClose} />
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
				<Animated.View style={[styles.gradeSheet, sheetStyle]}>
					<View style={styles.gradeSheetHeader}>
						<Text style={styles.gradeSheetTitle}>Select {title}</Text>
						<Pressable onPress={onClose} style={styles.gradeSheetClose}>
							<Icon name="close" size={22} color={colors.textSecondary} />
						</Pressable>
					</View>

					<View style={styles.searchContainer}>
						<Icon name="search" size={20} color={colors.textMuted} />
						<TextInput
							style={styles.searchInput}
							placeholder={`Search or add ${title.toLowerCase()}...`}
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholderTextColor={colors.textMuted}
						/>
					</View>

					{loading ? (
						<ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xxl }} />
					) : (
						<ScrollView showsVerticalScrollIndicator={false} style={styles.maxHeightSheet} keyboardShouldPersistTaps="handled">
							{showAdd && (
								<Pressable
									style={styles.gradeItem}
									onPress={() => {
										onAddSchool(searchQuery.trim());
										onSelect(searchQuery.trim());
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										onClose();
									}}
								>
									<Icon name="add-circle-outline" size={20} color={colors.primary} />
									<Text style={[styles.gradeText, { color: colors.primary, marginLeft: spacing.sm, fontWeight: '600' }]}>
										Add "{searchQuery.trim()}"
									</Text>
								</Pressable>
							)}
							{filtered.map((s, i) => {
								const isSelected = selected === s;
								return (
									<React.Fragment key={s}>
										<Pressable
											style={[styles.gradeItem, isSelected ? styles.gradeItemActive : null]}
											onPress={() => { onSelect(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
										>
											<Text style={[styles.gradeText, isSelected ? styles.gradeTextActive : null]}>{s}</Text>
											{isSelected ? <Icon name="check" size={18} color={colors.primary} /> : null}
										</Pressable>
										{(i < filtered.length - 1 || showAdd) ? <View style={styles.gradeDivider} /> : null}
									</React.Fragment>
								);
							})}
						</ScrollView>
					)}
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

const GENDERS = [
	{ key: 'male', label: 'Male', emoji: '👦' },
	{ key: 'female', label: 'Female', emoji: '👧' },
];

interface Props { navigation: any; route: any; }

export function OnboardingScreen3({ navigation, route }: Props) {
	console.log("rotue", route.params)
	const { showToast } = useToast();
	const onboardType: 'school' | 'institute' = route?.params?.onboardType ?? 'school';
	const isSchool = onboardType === 'school';
	const accessToken: string | null = route?.params?.accessToken ?? null;
	// schoolId passed from OnboardingScreen1 (human-readable, e.g. "SCH-GJ-AHM-SPA")
	const schoolId: string = route?.params?.schoolId ?? '';
	// parentData passed from OnboardingScreen1 via verify-otp response
	const parentData: any = route?.params?.parentData ?? null;
	const insets = useSafeAreaInsets();
	const [childName, setChildName] = useState('');
	const [dobIso, setDobIso] = useState(() => toIsoDate(new Date(currentYear - 8, 0, 1)));
	const [grade, setGrade] = useState('');
	const [showGradeSheet, setShowGradeSheet] = useState(false);
	const [school, setSchool] = useState('');
	const [showSchoolSheet, setShowSchoolSheet] = useState(false);
	const [schools, setSchools] = useState<string[]>([]);
	const [schoolsLoading, setSchoolsLoading] = useState(false);
	const [gender, setGender] = useState<string | null>(null);
	const [classSec, setClassSec] = useState('');
	const [batchDetails, setBatchDetails] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const fetchSchools = async () => {
			setSchoolsLoading(true);
			try {
				const response = await api.get<Array<{ id: string; name: string }>>(ENDPOINTS.SCHOOLS.LIST,{skipAuth: false});
				if (!cancelled) {
					const names = (response.data.data ?? []).map((s) => s.name).filter(Boolean);
					setSchools(names);
				}
			} catch (err) {
				if (!cancelled) {
					const responseData = (err as any)?.response?.data;
					if (isOnboardingExpiredError(responseData)) {
						showToast({ message: 'Your session has expired. Please start onboarding again.', type: 'error' });
						navigation.reset({ index: 1, routes: [{ name: 'LoginScreen' }, { name: 'Onboarding1' }] });
						return;
					}
					showToast({ message: parseApiError(err).message, type: 'error' });
				}
			} finally {
				if (!cancelled) setSchoolsLoading(false);
			}
		};
		fetchSchools();
		return () => { cancelled = true; };
	}, []);

	const ageYears = ageFromIsoDate(dobIso);
	const formattedDob = formatAppDate(dobIso);

	const screenX = useSharedValue(0);
	const screenStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: screenX.value }],
		opacity: interpolate(Math.abs(screenX.value), [0, SW], [1, 0]),
	}));

	const isFormValid = childName.trim().length > 0
		&& grade !== ''
		&& school !== ''
		&& gender !== null
		&& (isSchool ? classSec.trim().length > 0 : batchDetails.trim().length > 0);

	const goNext = async () => {
		if (!isFormValid || isLoading) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsLoading(true);

		try {
			console.log('parentData', parentData)
			// Build payload — school_id / institution_id are human-readable strings
			const payload: Record<string, any> = {
				parent_id: parentData?.parent_id,
				full_name: childName.trim(),
				date_of_birth: dobIso,
				gender: gender || undefined,
				grade: grade || undefined,
			};

			if (isSchool) {
				payload.school_id = schoolId;
				payload.section = classSec.trim() || undefined;
			} else {
				payload.institution_id = schoolId;
				payload.batch = batchDetails.trim() || undefined;
			}
			console.log('payload', payload);
			const response = await api.post<{ message?: string }>(
				ENDPOINTS.STUDENTS.ONBOARDING,
				payload,
			);

			const successMsg = response.data.data?.message || response.data.message || 'Child added successfully!';
			showToast({ message: successMsg, type: 'success' });

			screenX.value = withTiming(-SW * 0.15, { duration: 250, easing: Easing.out(Easing.cubic) }, () => {
				screenX.value = 0;
			});
			navigation.navigate('Onboarding4', { accessToken, parentData });
		} catch (err: any) {
			if (isOnboardingExpiredError((err as any)?.response?.data)) {
				showToast({ message: 'Your session has expired. Please start onboarding again.', type: 'error' });
				navigation.reset({ index: 1, routes: [{ name: 'LoginScreen' }, { name: 'Onboarding1' }] });
				return;
			}
			showToast({ message: parseApiError(err).message || 'Failed to add child. Please try again.', type: 'error' });
		} finally {
			setIsLoading(false);
		}
	};

	const goBack = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		navigation.goBack();
	};

	const openSchoolModal = () => {
		Keyboard.dismiss();
		setTimeout(() => {
			setShowSchoolSheet(true);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}, 250);
	};

	// ── Open date picker ────────────────────────────────────────────────────────
	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<Animated.View style={[{ flex: 1 }, screenStyle]}>

					<View style={styles.topNav}>
						<Pressable style={styles.backBtn} onPress={goBack} hitSlop={12}>
							<Icon name="arrow-back" size={24} color={colors.textPrimary} />
						</Pressable>
						<View style={styles.topNavCenter}>
							<StepProgress current={3} />
						</View>
						<View style={styles.spacer} />
					</View>

					<ScrollView
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
							<Text style={styles.screenTitle}>Add Your Child</Text>
							<Text style={styles.screenSub}>We'll personalize the experience for your little one</Text>
						</Animated.View>

						<View style={styles.formArea}>

							<Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.sectionMargin}>
								<InputField
									label="Child's Full Name"
									value={childName}
									onChangeText={setChildName}
									placeholder="e.g. Arya Sharma"
									autoCapitalize="words"
									autoCorrect={false}
									leftIcon={<Icon name="child-care" size={20} color={colors.textMuted} />}
								/>
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.sectionMargin}>
								<Text style={styles.label}>Date of Birth</Text>
								<DatePickerField
									valueIso={dobIso}
									onChangeIso={(nextDob) => {
										setDobIso(nextDob);
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									}}
									maximumDate={new Date()}
									label={null}
								>
									<View style={styles.inputWrap}>
										<Icon name="cake" size={20} color={colors.textMuted} />
										<Text style={styles.inputText}>{formattedDob}</Text>
										<View style={styles.ageBadge}>
											<Text style={styles.ageBadgeText}>Age {ageYears}</Text>
										</View>
										<Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
									</View>
								</DatePickerField>
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sectionMargin}>
								<Text style={styles.label}>Standard</Text>
								<Pressable style={styles.inputWrap} onPress={() => { setShowGradeSheet(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
									<Icon name="school" size={20} color={colors.textMuted} />
									<Text style={[styles.inputText, !grade ? styles.inputTextMuted : null]}>
										{grade || 'Select standard…'}
									</Text>
									<Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
								</Pressable>
							</Animated.View>

							{/* Conditional: Class/Section for school, Batch for institute */}
							<Animated.View entering={FadeInDown.duration(400).delay(225)} style={styles.sectionMargin}>
								{isSchool ? (
									<InputField
										label="Class / Section"
										value={classSec}
										onChangeText={setClassSec}
										placeholder="e.g. 5-A or Section B"
										autoCapitalize="characters"
										autoCorrect={false}
										leftIcon={<Icon name="class" size={20} color={colors.textMuted} />}
									/>
								) : (
									<InputField
										label="Batch Details"
										value={batchDetails}
										onChangeText={setBatchDetails}
										placeholder="e.g. Morning Batch 2025"
										autoCapitalize="words"
										autoCorrect={false}
										leftIcon={<Icon name="groups" size={20} color={colors.textMuted} />}
									/>
								)}
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(275)} style={styles.sectionMargin}>
								<Text style={styles.label}>{isSchool ? 'School' : 'Institute'}</Text>
								<Pressable style={styles.inputWrap} onPress={() => { openSchoolModal(); }}>
									<Icon name={isSchool ? 'account-balance' : 'apartment'} size={20} color={colors.textMuted} />
									<Text style={[styles.inputText, !school ? styles.inputTextMuted : null]} numberOfLines={1}>
										{school || (isSchool ? 'Select your school…' : 'Select your institute…')}
									</Text>
									<Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
								</Pressable>
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.sectionMargin}>
								<Text style={styles.label}>Gender</Text>
								<View style={styles.genderRow}>
									{GENDERS.map(g => {
										const isActive = gender === g.key;
										return (
											<Pressable
												android_ripple={{ color: '#7C6AE8', borderless: false, foreground: true }}
												key={g.key}
												style={[styles.genderChip, isActive ? styles.genderChipActive : null]}
												onPress={() => { setGender(g.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
											>
												<Text style={styles.genderEmoji}>{g.emoji}</Text>
												<Text style={[styles.genderLabel, isActive ? styles.genderLabelActive : null]}>{g.label}</Text>
											</Pressable>
										);
									})}
								</View>
							</Animated.View>

							<Animated.View entering={FadeInDown.duration(400).delay(350)} style={styles.sectionMargin}>
								<View style={styles.infoBanner}>
									<View style={styles.infoBannerBar} />
									<View style={styles.infoBannerContent}>
										<Icon name="info-outline" size={16} color={colors.growth} />
										<Text style={styles.infoBannerText}>
											More children can be added from your Profile page
										</Text>
									</View>
								</View>
							</Animated.View>

						</View>
					</ScrollView>

					<Animated.View
						entering={FadeInUp.duration(400).delay(400)}
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
									<Text style={[styles.ctaText, !isFormValid ? styles.ctaTextDisabled : null]}>Add Child & Continue</Text>
									{isFormValid ? <Icon name="arrow-forward" size={20} color={colors.surface} /> : null}
								</>
							)}
						</Pressable>
					</Animated.View>

				</Animated.View>
			</KeyboardAvoidingView>

			<GradeSheet
				visible={showGradeSheet}
				selected={grade}
				onSelect={setGrade}
				onClose={() => setShowGradeSheet(false)}
			/>
			<SchoolSheet
				visible={showSchoolSheet}
				selected={school}
				onSelect={setSchool}
				onClose={() => setShowSchoolSheet(false)}
				schools={schools}
				onAddSchool={(s) => setSchools(prev => [s, ...prev])}
				loading={schoolsLoading}
				title={isSchool ? 'School' : 'Institute'}
			/>
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
	backBtn: { padding: spacing.xs, marginLeft: -spacing.xs },
	topNavCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	spacer: { width: 24 },

	scroll: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: 120 },

	header: { marginBottom: spacing.xxl },
	screenTitle: { ...textStyles.headingLarge, color: colors.primary, marginBottom: spacing.xs },
	screenSub: { ...textStyles.bodyMedium, color: colors.textSecondary },

	formArea: { flex: 1 },
	sectionMargin: { marginBottom: spacing.lg },

	label: { ...textStyles.bodyMedium, color: colors.textSecondary, fontWeight: '500', marginBottom: spacing.sm },

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
	},
	inputText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
	inputTextMuted: { color: colors.textMuted },

	ageBadge: {
		backgroundColor: colors.lavenderSoft,
		borderRadius: borderRadius.full,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
		marginRight: spacing.xs,
	},
	ageBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },

	genderRow: { flexDirection: 'row', gap: spacing.md },
	genderChip: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.md,
		borderRadius: 24,
		backgroundColor: colors.surfaceMuted,
		borderWidth: 2,
		borderColor: 'transparent',
		gap: spacing.xs,
		overflow: 'hidden',
	},
	genderChipActive: { backgroundColor: colors.lavenderSoft, borderColor: colors.primary, ...shadows.small },
	genderEmoji: { fontSize: 24 },
	genderLabel: { ...textStyles.bodyMedium, fontWeight: '500', color: colors.textSecondary },
	genderLabelActive: { color: colors.primary, fontWeight: '600' },

	infoBanner: {
		flexDirection: 'row',
		backgroundColor: colors.mintSoft,
		borderRadius: borderRadius.medium,
		overflow: 'hidden',
		minHeight: 52,
	},
	infoBannerBar: { width: 3, backgroundColor: colors.growth },
	infoBannerContent: {
		flex: 1, flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm,
	},
	infoBannerText: { flex: 1, ...textStyles.caption, color: colors.growth, fontWeight: '500', lineHeight: 18 },

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
	ctaBtn: {
		backgroundColor: colors.primary, borderRadius: borderRadius.large,
		height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
		gap: spacing.sm, ...shadows.medium,
	},
	ctaBtnDisabled: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0 },
	ctaBtnPressed: { opacity: 0.85 },
	ctaText: { ...textStyles.button, color: colors.surface, fontSize: 16 },
	ctaTextDisabled: { color: colors.textMuted },

	modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

	gradeSheet: {
		position: 'absolute', bottom: 0, left: 0, right: 0,
		backgroundColor: colors.surface,
		borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl,
		paddingBottom: spacing.xxl + 20, paddingTop: spacing.sm,
	},
	gradeSheetHeader: {
		flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
		borderBottomWidth: 1, borderBottomColor: colors.border,
	},
	gradeSheetTitle: { ...textStyles.headingMedium, flex: 1 },
	gradeSheetClose: { padding: 4 },

	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surfaceMuted,
		borderRadius: borderRadius.large,
		paddingHorizontal: spacing.md,
		height: 48,
		marginHorizontal: spacing.xl,
		marginBottom: spacing.md,
		gap: spacing.sm,
	},
	searchInput: {
		flex: 1,
		...textStyles.bodyMedium,
		color: colors.textPrimary,
		height: '100%',
		minHeight: 48,
	},

	maxHeightSheet: { maxHeight: SH * 0.55 },
	gradeItem: {
		flexDirection: 'row', alignItems: 'center',
		paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2, gap: spacing.sm,
	},
	gradeItemActive: { backgroundColor: colors.lavenderSoft },
	gradeText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
	gradeTextActive: { color: colors.primary, fontWeight: '600' },
	gradeDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
});
