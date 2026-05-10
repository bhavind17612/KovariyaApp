import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StatusBar as RNStatusBar,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import Animated, {
	FadeInDown,
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
	runOnJS,
	Easing,
	withSequence,
	withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { AppGradientHeader, Button, Card, InputField } from '../components';
import { useToast } from '../context/ToastContext';
import type { Goal, GoalStatus } from '../types';
import { formatAppDate } from '../utils/dateFormat';
import {
	FLOATING_TAB_BAR_VISUAL_HEIGHT,
	getFloatingTabBarBottomPadding,
	borderRadius,
	colors,
	spacing,
	textStyles,
	typography,
	shadows,
} from '../theme';
import { floatingPillShadow, goalStatusFloatingPalette } from '../theme/missionPillStyles';

const INITIAL_GOALS: Goal[] = [
	{
		id: 'g1',
		title: 'Morning routine streak',
		description: 'Complete the morning checklist before school each day.',
		currentRawPoints: 120,
		targetRawPoints: 200,
		startDate: '2026-03-01',
		endDate: '2026-04-30',
		rewardName: 'Movie night',
		rewardValue: '$25 voucher',
		status: 'active',
	},
	{
		id: 'g2',
		title: 'Homework before play',
		description: 'Finish homework before recreational screen time.',
		currentRawPoints: 80,
		targetRawPoints: 80,
		startDate: '2026-02-15',
		endDate: '2026-03-31',
		rewardName: 'New art supplies',
		status: 'completed',
	},
	{
		id: 'g3',
		title: 'Kind words challenge',
		description: 'Log kind actions toward family members.',
		currentRawPoints: 45,
		targetRawPoints: 150,
		startDate: '2026-03-10',
		endDate: '2026-05-01',
		rewardName: 'Choose weekend activity',
		status: 'paused',
	},
];

/* ─── helper fns ─── */

function formatGoalStatusLabel(status: GoalStatus): string {
	switch (status) {
		case 'active':
			return 'Active';
		case 'completed':
			return 'Completed';
		case 'paused':
			return 'Paused';
		default:
			return status;
	}
}

function goalStatusIcon(status: GoalStatus): string {
	switch (status) {
		case 'active':
			return 'play-circle-outline';
		case 'completed':
			return 'check-circle';
		case 'paused':
			return 'pause-circle-outline';
		default:
			return 'circle';
	}
}

function rawProgressPercent(goal: Goal): number {
	if (goal.targetRawPoints <= 0) return 0;
	return Math.min(100, Math.round((goal.currentRawPoints / goal.targetRawPoints) * 100));
}

function rewardDisplay(goal: Goal): string {
	const base = goal.rewardName.trim();
	if (goal.rewardValue?.trim()) {
		return `${base} (${goal.rewardValue.trim()})`;
	}
	return base;
}

function progressBarColor(pct: number, status: GoalStatus): string {
	if (status === 'completed') return colors.growth;
	if (status === 'paused') return colors.textMuted;
	if (pct >= 75) return colors.growth;
	if (pct >= 40) return colors.primary;
	return colors.accent;
}

/* ─── FabTooltip ─── */

function FabTooltip({ visible }: { visible: boolean }) {
	const opacity = useSharedValue(0);
	const translateX = useSharedValue(8);

	useEffect(() => {
		if (visible) {
			opacity.value = withDelay(
				400,
				withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) })
			);
			translateX.value = withDelay(
				400,
				withSpring(0, { damping: 14, stiffness: 160 })
			);
			// Fade out after 2.5 s
			opacity.value = withDelay(
				2900,
				withTiming(0, { duration: 450, easing: Easing.in(Easing.cubic) })
			);
			translateX.value = withDelay(
				2900,
				withTiming(8, { duration: 450 })
			);
		}
	}, [visible, opacity, translateX]);

	const animStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateX: translateX.value }],
	}));

	if (!visible) return null;

	return (
		<Animated.View style={[styles.tooltipBubble, animStyle]} pointerEvents="none">
			<View style={styles.tooltipArrow} />
			<Text style={styles.tooltipText}>Tap to add a new goal</Text>
		</Animated.View>
	);
}

/* ─── Summary strip ─── */

function SummaryStrip({
	total,
	active,
	completed,
}: {
	total: number;
	active: number;
	completed: number;
}) {
	return (
		<Animated.View
			entering={FadeInDown.springify().damping(18).stiffness(220)}
			style={styles.summaryStrip}>
			<SummaryStat icon="flag" label="Total" value={total} tint={colors.primary} />
			<View style={styles.summaryDivider} />
			<SummaryStat icon="play-arrow" label="Active" value={active} tint={colors.accent} />
			<View style={styles.summaryDivider} />
			<SummaryStat icon="check-circle" label="Done" value={completed} tint={colors.growth} />
		</Animated.View>
	);
}

function SummaryStat({
	icon,
	label,
	value,
	tint,
}: {
	icon: string;
	label: string;
	value: number;
	tint: string;
}) {
	return (
		<View style={styles.summaryStatCol}>
			<View style={[styles.summaryStatIconWrap, { backgroundColor: `${tint}18` }]}>
				<Icon name={icon} size={18} color={tint} />
			</View>
			<Text style={styles.summaryStatValue}>{value}</Text>
			<Text style={styles.summaryStatLabel}>{label}</Text>
		</View>
	);
}

/* ─── Main screen ─── */

const GoalsScreen: React.FC = () => {
	const { showToast } = useToast();
	const insets = useSafeAreaInsets();
	const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
	const [showTooltip, setShowTooltip] = useState(false);
	const tooltipShownRef = useRef(false);

	useFocusEffect(
		useCallback(() => {
			setStatusBarStyle('light');
			if (Platform.OS === 'android') {
				RNStatusBar.setTranslucent(true);
				RNStatusBar.setBackgroundColor('transparent');
			}

			// Show tooltip only on first visit
			if (!tooltipShownRef.current) {
				tooltipShownRef.current = true;
				setShowTooltip(true);
			}

			return () => {
				setStatusBarStyle('dark');
				if (Platform.OS === 'android') {
					RNStatusBar.setTranslucent(false);
					RNStatusBar.setBackgroundColor(colors.background);
				}
			};
		}, [])
	);

	const [modalOpen, setModalOpen] = useState(false);

	const [formTitle, setFormTitle] = useState('');
	const [formRewardName, setFormRewardName] = useState('');
	const [formRewardValue, setFormRewardValue] = useState('');
	const [formStart, setFormStart] = useState('');
	const [formEnd, setFormEnd] = useState('');
	const [formTargetRaw, setFormTargetRaw] = useState('');
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const bottomPad = useMemo(
		() => getFloatingTabBarBottomPadding(insets.bottom),
		[insets.bottom]
	);

	/* FAB sits above tab bar */
	const fabBottom = useMemo(
		() => FLOATING_TAB_BAR_VISUAL_HEIGHT + insets.bottom + 24,
		[insets.bottom]
	);

	const sortedGoals = useMemo(() => {
		return [...goals].sort((a, b) => {
			const pri = (g: Goal) => (g.status === 'active' ? 0 : g.status === 'paused' ? 1 : 2);
			const p = pri(a) - pri(b);
			if (p !== 0) return p;
			return a.title.localeCompare(b.title);
		});
	}, [goals]);

	const stats = useMemo(() => {
		const total = goals.length;
		const active = goals.filter((g) => g.status === 'active').length;
		const completed = goals.filter((g) => g.status === 'completed').length;
		return { total, active, completed };
	}, [goals]);

	const resetForm = useCallback(() => {
		setFormTitle('');
		setFormRewardName('');
		setFormRewardValue('');
		setFormStart('');
		setFormEnd('');
		setFormTargetRaw('');
		setFormError(null);
	}, []);

	const openModal = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		resetForm();
		setModalOpen(true);
	}, [resetForm]);

	const closeModal = useCallback(() => {
		setModalOpen(false);
		resetForm();
	}, [resetForm]);

	const submitGoal = useCallback(() => {
		const title = formTitle.trim();
		const rewardName = formRewardName.trim();
		const start = formStart.trim();
		const end = formEnd.trim();
		const targetStr = formTargetRaw.trim();

		if (!title || !rewardName || !start || !end || !targetStr) {
			setFormError('Please fill in all required fields.');
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}

		const target = Number.parseInt(targetStr, 10);
		if (!Number.isFinite(target) || target <= 0) {
			setFormError('Target raw points must be a positive number.');
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}

		const startT = Date.parse(start);
		const endT = Date.parse(end);
		if (Number.isNaN(startT) || Number.isNaN(endT)) {
			setFormError('Use valid dates (e.g. 2026-04-15).');
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}
		if (endT < startT) {
			setFormError('End date must be on or after start date.');
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
			return;
		}

		setFormError(null);
		setIsSubmitting(true);
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		// Simulate brief async save — swap with real API later
		setTimeout(() => {
			const newGoal: Goal = {
				id: `goal-${Date.now()}`,
				title,
				description: '',
				currentRawPoints: 0,
				targetRawPoints: target,
				startDate: start,
				endDate: end,
				rewardName,
				rewardValue: formRewardValue.trim() || undefined,
				status: 'active',
			};

			setGoals((prev) => [newGoal, ...prev]);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			showToast({
				type: 'success', message: 'Goal created — it\'s now at the top!'
			});
			setIsSubmitting(false);
			closeModal();
		}, 850);
	}, [
		formTitle,
		formRewardName,
		formRewardValue,
		formStart,
		formEnd,
		formTargetRaw,
		showToast,
		closeModal,
	]);

	return (
		<SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
			<AppGradientHeader
				title="Goals"
				subtitle="Reward-based behaviour goals"
			/>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Summary strip ── */}
				<SummaryStrip
					total={stats.total}
					active={stats.active}
					completed={stats.completed}
				/>

				{/* ── Goal cards ── */}
				{sortedGoals.map((goal, index) => {
					const pct = rawProgressPercent(goal);
					const statusPal = goalStatusFloatingPalette(goal.status);
					const isCompleted = goal.status === 'completed';
					const barColor = progressBarColor(pct, goal.status);
					return (
						<Animated.View
							key={goal.id}
							entering={FadeInDown.springify()
								.damping(18)
								.stiffness(220)
								.delay(index * 60)}
							style={styles.shadowWrapper}
						>
							<Card
								variant="elevated"
								style={StyleSheet.flatten([
									styles.card,
									isCompleted ? styles.cardCompleted : null,
								])}
							>
								<Pressable
									style={({ pressed }) => [pressed && styles.cardPressed]}
									accessibilityRole="button"
									accessibilityLabel={`${goal.title}. ${formatGoalStatusLabel(goal.status)}.`}
								>
									{/* Card header row */}
									<View style={styles.cardHeader}>
										<View style={styles.cardTitleRow}>
											<View
												style={[
													styles.statusIconOrb,
													{ backgroundColor: `${statusPal.text}18` },
												]}
											>
												<Icon
													name={goalStatusIcon(goal.status)}
													size={18}
													color={statusPal.text}
												/>
											</View>
											<View style={styles.cardTitleWrap}>
												<Text style={styles.cardTitle} numberOfLines={2}>
													{goal.title}
												</Text>
											</View>
										</View>
										<View
											style={[
												styles.floatingPill,
												floatingPillShadow(statusPal.shadowColor),
												{ backgroundColor: statusPal.bg },
											]}
										>
											<Text style={[styles.floatingPillText, { color: statusPal.text }]}>
												{formatGoalStatusLabel(goal.status)}
											</Text>
										</View>
									</View>

									{/* Description */}
									{goal.description ? (
										<Text style={styles.cardDesc}>{goal.description}</Text>
									) : null}

									{/* Reward strip */}
									<View style={styles.rewardStrip}>
										<View style={styles.rewardIconWrap}>
											<Icon name="emoji-events" size={16} color={colors.accent} />
										</View>
										<Text style={styles.rewardText} numberOfLines={1}>
											{rewardDisplay(goal)}
										</Text>
									</View>

									{/* Date + points row */}
									<View style={styles.metaGrid}>
										<View style={styles.metaItem}>
											<Icon name="date-range" size={14} color={colors.textMuted} />
											<Text style={styles.metaItemText}>
												{formatAppDate(goal.startDate)} — {formatAppDate(goal.endDate)}
											</Text>
										</View>
										<View style={styles.metaItem}>
											<Icon name="star-outline" size={14} color={colors.textMuted} />
											<Text style={styles.metaItemText}>
												{goal.currentRawPoints}/{goal.targetRawPoints} pts
											</Text>
										</View>
									</View>

									{/* Progress */}
									<View style={styles.progressWrap}>
										<View style={styles.progressHead}>
											<Text style={styles.progressLabel}>Progress</Text>
											<Text style={[styles.progressPct, { color: barColor }]}>{pct}%</Text>
										</View>
										<View style={styles.progressTrack}>
											<LinearGradient
												colors={
													isCompleted
														? [colors.growth, '#2C8F63']
														: [barColor, barColor]
												}
												start={{ x: 0, y: 0 }}
												end={{ x: 1, y: 0 }}
												style={[styles.progressFill, { width: `${pct}%` }]}
											/>
										</View>
									</View>
								</Pressable>
							</Card>
						</Animated.View>
					);
				})}
			</ScrollView>

			{/* ── FAB + Tooltip ── */}
			<View style={[styles.fabContainer, { bottom: fabBottom }]} pointerEvents="box-none">
				{/* <FabTooltip visible={showTooltip} /> */}
				<Pressable
					onPress={openModal}
					style={({ pressed }) => [
						styles.fab,
						pressed && styles.fabPressed,
					]}
					accessibilityRole="button"
					accessibilityLabel="Add new goal"
					android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true }}
				>
					<LinearGradient
						colors={[colors.primary, colors.primaryDark]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.fabGradient}
					>
						<Icon name="add" size={28} color={colors.surface} />
					</LinearGradient>
				</Pressable>
			</View>

			{/* ── Create goal modal ── */}
			<Modal
				visible={modalOpen}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={closeModal}
			>
				<KeyboardAvoidingView
					style={styles.modalRoot}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<SafeAreaView style={styles.modalSafe} edges={['left', 'right']}>
						{/* Modal header */}
						<AppGradientHeader
							title=" New goal"
							subtitle="Set a reward-based behaviour goal"
							leadingMode="none"
							style={{ marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
							rightAccessory={
								<Pressable
									onPress={closeModal}
									style={({ pressed }) => [
										{ padding: 8, marginRight: -8, borderRadius: 20 },
										pressed && { opacity: 0.88 },
									]}
									accessibilityRole="button"
									accessibilityLabel="Close"
									disabled={isSubmitting}
								>
									<Icon name="close" size={26} color="rgba(255, 255, 255, 0.92)" />
								</Pressable>
							}
						/>

						<ScrollView
							style={styles.modalScroll}
							contentContainerStyle={styles.modalScrollContent}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							{/* ── Section: Goal details ── */}
							<View style={styles.formSection}>
								<View style={styles.formSectionHeader}>
									<View style={[styles.formSectionIconOrb, { backgroundColor: colors.lavenderSoft }]}>
										<Icon name="edit" size={16} color={colors.primary} />
									</View>
									<Text style={styles.formSectionTitle}>Goal details</Text>
								</View>
								<View style={styles.formSectionBody}>
									<InputField
										label="Goal name"
										placeholder="e.g. Morning routine streak"
										value={formTitle}
										onChangeText={setFormTitle}
										leftIcon={<Icon name="flag" size={18} color={colors.textMuted} />}
									/>
								</View>
							</View>

							{/* ── Section: Reward ── */}
							<View style={styles.formSection}>
								<View style={styles.formSectionHeader}>
									<View style={[styles.formSectionIconOrb, { backgroundColor: colors.peachSoft }]}>
										<Icon name="emoji-events" size={16} color={colors.accent} />
									</View>
									<Text style={styles.formSectionTitle}>Reward</Text>
								</View>
								<View style={styles.formSectionBody}>
									<InputField
										label="Reward name"
										placeholder="e.g. Movie night"
										value={formRewardName}
										onChangeText={setFormRewardName}
										leftIcon={<Icon name="card-giftcard" size={18} color={colors.textMuted} />}
									/>
									<View style={styles.fieldGapTight} />
									<InputField
										label="Value (optional)"
										placeholder="e.g. $25 or extra 30 min"
										value={formRewardValue}
										onChangeText={setFormRewardValue}
										leftIcon={<Icon name="sell" size={18} color={colors.textMuted} />}
									/>
								</View>
							</View>

							{/* ── Section: Schedule ── */}
							<View style={styles.formSection}>
								<View style={styles.formSectionHeader}>
									<View style={[styles.formSectionIconOrb, { backgroundColor: colors.skySoft }]}>
										<Icon name="date-range" size={16} color={colors.info} />
									</View>
									<Text style={styles.formSectionTitle}>Schedule</Text>
								</View>
								<View style={styles.formSectionBody}>
									<View style={styles.dateFieldsRow}>
										<View style={styles.dateFieldCol}>
											<InputField
												label="Start"
												placeholder="YYYY-MM-DD"
												value={formStart}
												onChangeText={setFormStart}
												autoCapitalize="none"
											// leftIcon={<Icon name="play-arrow" size={16} color={colors.textMuted} />}
											/>
										</View>
										<View style={styles.dateFieldCol}>
											<InputField
												label="End"
												placeholder="YYYY-MM-DD"
												value={formEnd}
												onChangeText={setFormEnd}
												autoCapitalize="none"
											// leftIcon={<Icon name="stop" size={16} color={colors.textMuted} />}
											/>
										</View>
									</View>
								</View>
							</View>

							{/* ── Section: Target ── */}
							<View style={styles.formSection}>
								<View style={styles.formSectionHeader}>
									<View style={[styles.formSectionIconOrb, { backgroundColor: colors.mintSoft }]}>
										<Icon name="star" size={16} color={colors.growth} />
									</View>
									<Text style={styles.formSectionTitle}>Target</Text>
								</View>
								<View style={styles.formSectionBody}>
									<InputField
										label="Raw points to earn"
										placeholder="e.g. 200"
										value={formTargetRaw}
										onChangeText={setFormTargetRaw}
										keyboardType="number-pad"
										leftIcon={<Icon name="speed" size={18} color={colors.textMuted} />}
									/>
								</View>
							</View>

							{formError ? (
								<View style={styles.formErrorWrap}>
									<Icon name="error-outline" size={16} color={colors.error} />
									<Text style={styles.formError}>{formError}</Text>
								</View>
							) : null}

							<Button
								title="Create goal"
								variant="primary"
								size="large"
								loading={isSubmitting}
								disabled={isSubmitting}
								onPress={submitGoal}
								style={styles.submitBtn}
								icon={!isSubmitting ? <Icon name="check" size={20} color={colors.surface} /> : undefined}
							/>
						</ScrollView>
					</SafeAreaView>
				</KeyboardAvoidingView>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	/* ─── Root ─── */
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		padding: spacing.lg,
		paddingVertical: spacing.sm,
	},

	/* ─── Summary strip ─── */
	summaryStrip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		marginBottom: spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
		...shadows.soft,
	},
	summaryStatCol: {
		flex: 1,
		alignItems: 'center',
		gap: 4,
	},
	summaryStatIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 2,
	},
	summaryStatValue: {
		...textStyles.headingMedium,
		color: colors.ink,
		fontWeight: '800',
		fontSize: 20,
	},
	summaryStatLabel: {
		...textStyles.caption,
		color: colors.textMuted,
		fontWeight: '600',
	},
	summaryDivider: {
		width: StyleSheet.hairlineWidth,
		height: 40,
		backgroundColor: colors.border,
	},
	shadowWrapper: {
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
		overflow: 'hidden',
		marginVertical: spacing.sm,
		// padding: spacing.md,
		...Platform.select({
			ios: {
				shadowColor: colors.ink,
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 0.07,
				shadowRadius: 8,
			},
			android: { elevation: 2 },
			default: {},
		}),
	},

	/* ─── Cards ─── */
	card: {
		marginVertical: spacing.xs,
		overflow: 'visible',
	},
	cardCompleted: {
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(63, 169, 122, 0.35)',
		backgroundColor: colors.surface,
	},
	cardPressed: {
		opacity: 0.92,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: spacing.sm,
		minHeight: 40,
	},
	cardTitleRow: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	statusIconOrb: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	cardTitleWrap: {
		flex: 1,
		minWidth: 0,
	},
	cardTitle: {
		...textStyles.headingMedium,
		flex: 1,
		color: colors.ink,
		fontWeight: '800',
	},
	floatingPill: {
		borderRadius: borderRadius.full,
		paddingVertical: 6,
		paddingHorizontal: 10,
		flexShrink: 0,
	},
	floatingPillText: {
		fontFamily: typography.fontFamily.primary,
		fontSize: typography.fontSize.xs,
		fontWeight: '800',
		letterSpacing: 0.2,
	},
	cardDesc: {
		...textStyles.bodyMedium,
		color: colors.textSecondary,
		marginTop: spacing.sm,
		lineHeight: 20,
	},

	/* ─── Reward strip ─── */
	rewardStrip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginTop: spacing.md,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.sm,
		backgroundColor: colors.peachSoft,
		borderRadius: borderRadius.large,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(232, 160, 74, 0.18)',
	},
	rewardIconWrap: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#9A5D14',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.12,
				shadowRadius: 4,
			},
			android: { elevation: 2 },
			default: {},
		}),
	},
	rewardText: {
		...textStyles.bodyMedium,
		flex: 1,
		color: '#7A4E18',
		fontWeight: '700',
	},

	/* ─── Meta grid ─── */
	metaGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.md,
		marginTop: spacing.sm,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	metaItemText: {
		...textStyles.caption,
		color: colors.textMuted,
		fontWeight: '600',
	},

	/* ─── Progress ─── */
	progressWrap: {
		marginTop: spacing.md,
	},
	progressHead: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: spacing.xs,
	},
	progressLabel: {
		...textStyles.caption,
		color: colors.textSecondary,
		fontWeight: '700',
	},
	progressPct: {
		...textStyles.caption,
		fontWeight: '800',
	},
	progressTrack: {
		height: 8,
		borderRadius: borderRadius.full,
		backgroundColor: colors.surfaceMuted,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: borderRadius.full,
	},

	/* ─── FAB ─── */
	fabContainer: {
		position: 'absolute',
		right: spacing.lg,
		flexDirection: 'row',
		alignItems: 'center',
		zIndex: 50,
	},
	fab: {
		width: 58,
		height: 58,
		borderRadius: 29,
		overflow: 'hidden',
		...Platform.select({
			ios: {
				shadowColor: colors.primaryDark,
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.35,
				shadowRadius: 14,
			},
			android: {
				elevation: 10,
			},
			default: {},
		}),
	},
	fabGradient: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fabPressed: {
		opacity: 0.88,
		transform: [{ scale: 0.94 }],
	},

	/* ─── Tooltip ─── */
	tooltipBubble: {
		position: 'absolute',
		right: 68,
		backgroundColor: colors.ink,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: borderRadius.medium,
		...Platform.select({
			ios: {
				shadowColor: colors.ink,
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 8,
			},
			android: { elevation: 6 },
			default: {},
		}),
	},
	tooltipArrow: {
		position: 'absolute',
		right: -6,
		top: '50%',
		marginTop: -5,
		width: 0,
		height: 0,
		borderTopWidth: 6,
		borderTopColor: 'transparent',
		borderBottomWidth: 6,
		borderBottomColor: 'transparent',
		borderLeftWidth: 7,
		borderLeftColor: colors.ink,
	},
	tooltipText: {
		...textStyles.caption,
		color: colors.surface,
		fontWeight: '700',
		letterSpacing: 0.1,
	},

	/* ─── Modal ─── */
	modalRoot: {
		flex: 1,
		backgroundColor: colors.background,
	},
	modalSafe: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		backgroundColor: colors.surface,
	},
	modalHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		flex: 1,
		minWidth: 0,
	},
	modalIconOrb: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.lavenderSoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalTitle: {
		...textStyles.headingMedium,
		fontWeight: '800',
		color: colors.ink,
	},
	modalSubtitle: {
		...textStyles.caption,
		color: colors.textMuted,
		marginTop: 2,
	},
	modalClose: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: borderRadius.full,
	},
	modalClosePressed: {
		opacity: 0.7,
		backgroundColor: colors.surfaceMuted,
	},
	modalScroll: {
		flex: 1,
	},
	modalScrollContent: {
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xxl,
	},

	/* Form sections — card-style grouping */
	formSection: {
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		marginTop: spacing.sm,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	formSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs,
	},
	formSectionIconOrb: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	formSectionTitle: {
		...textStyles.caption,
		color: colors.textSecondary,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	formSectionBody: {
		paddingHorizontal: spacing.md,
		paddingBottom: spacing.md,
		paddingTop: spacing.xs,
	},
	dateFieldsRow: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	dateFieldCol: {
		flex: 1,
	},
	fieldGapTight: {
		height: spacing.xs,
	},
	formErrorWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginTop: spacing.sm,
		padding: spacing.sm,
		backgroundColor: 'rgba(232, 93, 93, 0.08)',
		borderRadius: borderRadius.medium,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(232, 93, 93, 0.2)',
	},
	formError: {
		...textStyles.caption,
		color: colors.error,
		fontWeight: '600',
		flex: 1,
	},
	submitBtn: {
		marginTop: spacing.md,
	},
});

export default GoalsScreen;
