import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppGradientHeader, AppRefreshControl, Button } from '../components';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useToast } from '../context/ToastContext';
import {
	getFloatingTabBarBottomPadding,
	borderRadius,
	colors,
	spacing,
	textStyles,
	typography,
} from '../theme';
import {
	dailyFloatingPalette,
	floatingPillShadow,
	lifecycleFloatingPalette,
	missionTypeChipStyle,
} from '../theme/missionPillStyles';
import {
	formatDailyStatusLabel,
	formatLifecycleStatusLabel,
	formatMissionTypeLabel,
	getDailyStatusForToday,
	getTodayIsoDate,
	resolveLifecycleStatus,
	upsertCompletionForDate,
	type MentorMission,
} from '../data/mentorMissions';
import { formatAppDate } from '../utils/dateFormat';
import { missionsService } from '../services/missionsService';

type Props = {
	navigation: {
		navigate: (screen: string, params?: unknown) => void;
	};
};

export default function MissionsScreen({ navigation }: Props) {
	const { showToast } = useToast();

	useFocusEffect(
		useCallback(() => {
			setStatusBarStyle('light');
			if (Platform.OS === 'android') {
				RNStatusBar.setTranslucent(true);
				RNStatusBar.setBackgroundColor('transparent');
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
	const insets = useSafeAreaInsets();
	const [missionState, setMissionState] = useState<Record<string, MentorMission>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const loadMissions = useCallback(async () => {
		try {
			const missions = await missionsService.getMissions();
			setMissionState(Object.fromEntries(missions.map((m) => [m.id, m])));
			setError(false);
		} catch {
			setError(true);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadMissions();
	}, [loadMissions]);

	const { refreshing, onRefresh } = usePullToRefresh(loadMissions);

	const missions = useMemo(() => {
		const list = Object.values(missionState);
		return [...list].sort((a, b) => {
			const doneA = getDailyStatusForToday(a) === 'done' ? 0 : 1;
			const doneB = getDailyStatusForToday(b) === 'done' ? 0 : 1;
			if (doneA !== doneB) {
				return doneA - doneB;
			}
			return a.title.localeCompare(b.title);
		});
	}, [missionState]);
	const bottomPad = useMemo(
		() => getFloatingTabBarBottomPadding(insets.bottom),
		[insets.bottom]
	);

	const markDone = useCallback(
		(mission: MentorMission) => {
			const today = getTodayIsoDate();
			setMissionState((prev) => {
				const current = prev[mission.id];
				if (!current) {
					return prev;
				}
				const nextProgress = Math.min(100, current.progressPercent + 7);
				return {
					...prev,
					[mission.id]: {
						...current,
						progressPercent: nextProgress,
						completionHistory: upsertCompletionForDate(current.completionHistory, today, 'done'),
					},
				};
			});
			showToast({
				type: 'success',
				message: `${mission.title}: marked Done Today`,
			});
		},
		[showToast]
	);

	const markMissed = useCallback(
		(mission: MentorMission) => {
			const today = getTodayIsoDate();
			setMissionState((prev) => {
				const current = prev[mission.id];
				if (!current) {
					return prev;
				}
				const nextProgress = Math.max(0, current.progressPercent - 5);
				return {
					...prev,
					[mission.id]: {
						...current,
						progressPercent: nextProgress,
						completionHistory: upsertCompletionForDate(current.completionHistory, today, 'missed'),
					},
				};
			});
			showToast({
				type: 'info',
				message: `${mission.title}: marked Missed Today`,
			});
		},
		[showToast]
	);

	const openDetails = useCallback(
		(mission: MentorMission) => {
			navigation.navigate('MissionDetail', { mission });
		},
		[navigation]
	);

	return (
		<SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
			<AppGradientHeader title="Missions" subtitle="Assigned by your mentor" />

			{loading ? (
				<View style={styles.centeredState}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : error ? (
				<View style={styles.centeredState}>
					<Text style={styles.errorText}>Could not load missions. Please check your connection.</Text>
					<Pressable
						onPress={() => {
							setLoading(true);
							setError(false);
							missionsService.getMissions()
								.then((m) => {
									setMissionState(Object.fromEntries(m.map((x) => [x.id, x])));
									setError(false);
								})
								.catch(() => setError(true))
								.finally(() => setLoading(false));
						}}
						style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
					>
						<Text style={styles.retryBtnText}>Retry</Text>
					</Pressable>
				</View>
			) : (
				<ScrollView
				style={styles.scroll}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
				showsVerticalScrollIndicator={false}
				refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			>
				{missions.map((mission, index) => {
					const typeVisual = missionTypeChipStyle(mission.missionType);
					const lifecycle = resolveLifecycleStatus(mission);
					const daily = getDailyStatusForToday(mission);
					const lifecyclePal = lifecycleFloatingPalette(lifecycle);
					const dailyPal = dailyFloatingPalette(daily);
					const canMarkDaily = lifecycle === 'active' && daily !== null;
					const isDailyDone = daily === 'done';
					return (
						<Animated.View
							key={mission.id}
							entering={FadeInDown.delay(index * 50).springify().damping(18).stiffness(220)}
							style={[styles.shadowWrapper, isDailyDone && styles.shadowWrapperWon]}
						>

							<Pressable
								onPress={() => openDetails(mission)}
								style={({ pressed }) => [pressed && styles.cardPressed]}
								accessibilityRole="button"
								accessibilityLabel={`${mission.title}. Open mission details.`}
							>
								<View style={styles.cardHeader}>
									<View style={styles.cardTitleRow}>
										<Text style={styles.cardTitle} numberOfLines={2}>
											{mission.title}
										</Text>
									</View>
									<View
										style={[
											styles.floatingPill,
											floatingPillShadow(lifecyclePal.shadowColor),
											{ backgroundColor: lifecyclePal.bg },
										]}
									>
										<Text style={[styles.floatingPillText, { color: lifecyclePal.text }]}>
											{formatLifecycleStatusLabel(lifecycle)}
										</Text>
									</View>
								</View>

								{isDailyDone ? (
									<LinearGradient
										colors={[colors.mintSoft, 'rgba(232, 248, 238, 0.35)']}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 1 }}
										style={styles.winStrip}
									>
										<View style={styles.winIconOrb}>
											<Icon name="emoji-events" size={24} color={colors.growth} />
										</View>
										<View style={styles.winStripCopy}>
											<Text style={styles.winStripTitle}>Today's win</Text>
											<Text style={styles.winStripSub}>
												You completed this mission for today — keep the momentum going.
											</Text>
										</View>
									</LinearGradient>
								) : null}

								<Text style={styles.cardDesc}>{mission.description}</Text>

								<View style={styles.badgeRow}>
									<View style={[styles.chip, { backgroundColor: typeVisual.backgroundColor }]}>
										<Text style={[styles.chipText, { color: typeVisual.color }]}>
											{formatMissionTypeLabel(mission.missionType)}
										</Text>
									</View>
									<View
										style={[
											styles.floatingPill,
											styles.floatingPillDaily,
											floatingPillShadow(dailyPal.shadowColor),
											{ backgroundColor: dailyPal.bg },
										]}
									>
										<Text style={[styles.floatingPillText, { color: dailyPal.text }]}>
											Today · {formatDailyStatusLabel(daily)}
										</Text>
									</View>
								</View>
								<View style={styles.dateRow}>
									<Text style={styles.dateText}>Start: {formatAppDate(mission.startDate)}</Text>
									<Text style={styles.dateText}>End: {formatAppDate(mission.endDate)}</Text>
								</View>

								<View style={styles.progressWrap}>
									<View style={styles.progressHead}>
										<Text style={styles.progressLabel}>Progress</Text>
										<Text style={styles.progressPct}>{mission.progressPercent}%</Text>
									</View>
									<View style={styles.progressTrack}>
										<View style={[styles.progressFill, { width: `${mission.progressPercent}%` }]} />
									</View>
								</View>
							</Pressable>

							{canMarkDaily && !isDailyDone ? (
								<View style={styles.actionsRow}>
									<View style={styles.actionButtonCol}>
										<Button
											title="Done"
											size="small"
											variant="primary"
											icon={<Icon name="check-circle" size={18} color={colors.surface} />}
											onPress={() => markDone(mission)}
											btnStyle={StyleSheet.flatten([
												styles.missionButtonDone,
												{
													backgroundColor: colors.growth,
													minHeight: 38,
													paddingVertical: 8,
												},
											])}
										/>
									</View>
									<View style={styles.actionButtonCol}>
										<Button
											title="Missed"
											size="small"
											variant="primary"
											icon={<Icon name="highlight-off" size={18} color={colors.surface} />}
											onPress={() => markMissed(mission)}
											btnStyle={StyleSheet.flatten([
												styles.missionButtonMissed,
												{
													backgroundColor: colors.error,
													minHeight: 38,
													paddingVertical: 8,
												},
											])}
										/>
									</View>
								</View>
							) : null}

						</Animated.View>
					);
				})}
			</ScrollView>
		)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
	centeredState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		gap: spacing.md,
	},
	errorText: {
		...textStyles.bodyMedium,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 22,
	},
	retryBtn: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.lg,
		borderRadius: borderRadius.full,
		backgroundColor: colors.primary,
	},
	retryBtnPressed: {
		opacity: 0.82,
	},
	retryBtnText: {
		...textStyles.bodyMedium,
		fontWeight: '700',
		color: colors.surface,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		padding: spacing.lg,
		paddingVertical: spacing.sm
	},
	shadowWrapper: {
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
		overflow: 'hidden',
		marginVertical: spacing.xs,
		padding: spacing.md,
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
	shadowWrapperWon: {
		borderColor: 'rgba(63, 169, 122, 0.35)',
		backgroundColor: colors.surface,
	},
	cardPressed: {
		opacity: 0.9,
	},
	cardHeader: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: spacing.sm,
		paddingRight: 0,
		minHeight: 40,
	},
	cardTitleRow: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.xs,
		paddingRight: spacing.xs,
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
	floatingPillDaily: {
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	floatingPillText: {
		fontFamily: typography.fontFamily.primary,
		fontSize: typography.fontSize.xs,
		fontWeight: '800',
		letterSpacing: 0.2,
	},
	winStrip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginTop: spacing.sm,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.sm,
		borderRadius: borderRadius.large,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(63, 169, 122, 0.2)',
	},
	winIconOrb: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#1A6B4A',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.18,
				shadowRadius: 6,
			},
			android: { elevation: 3 },
			default: {},
		}),
	},
	winStripCopy: {
		flex: 1,
		minWidth: 0,
	},
	winStripTitle: {
		...textStyles.bodyLarge,
		fontWeight: '800',
		color: colors.growth,
	},
	winStripSub: {
		...textStyles.caption,
		color: colors.textSecondary,
		marginTop: 2,
		fontWeight: '600',
		lineHeight: 18,
	},
	cardDesc: {
		...textStyles.bodyMedium,
		color: colors.textSecondary,
		marginTop: spacing.sm,
	},
	badgeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
		marginTop: spacing.sm,
		marginBottom: spacing.xs,
	},
	chip: {
		borderRadius: borderRadius.full,
		paddingVertical: 6,
		paddingHorizontal: spacing.sm,
	},
	chipText: {
		// backgroundColor: 'blue',
		fontFamily: typography.fontFamily.primary,
		fontSize: typography.fontSize.xs,

		// lineHeight: 19,
		// ...textStyles.caption,
		fontWeight: '700',
	},
	dateRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: spacing.sm,
		marginTop: spacing.xs,
	},
	dateText: {
		...textStyles.caption,
		color: colors.textMuted,
		fontWeight: '600',
	},
	progressWrap: {
		marginTop: spacing.sm,
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
		color: colors.primaryDark,
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
		backgroundColor: colors.primary,
		borderRadius: borderRadius.full,
	},
	actionsRow: {
		// flex: 1,
		width: '100%',
		flexDirection: 'row',
		gap: spacing.sm,
		marginTop: spacing.md,
		alignItems: 'stretch'
	},
	actionButtonCol: {
		flex: 1,
		minWidth: 0,

	},
	missionButtonDone: {
		marginVertical: 0,
		...Platform.select({
			ios: {
				shadowColor: '#1A6B4A',
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 0.22,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
			default: {},
		}),
	},
	missionButtonMissed: {
		marginVertical: 0,
		...Platform.select({
			ios: {
				shadowColor: '#B83838',
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 0.2,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
			default: {},
		}),
	},
});
