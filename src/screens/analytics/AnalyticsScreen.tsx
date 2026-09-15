import React, { useCallback, useMemo, useState } from 'react';
import {
	ScrollView,
	Platform,
	StatusBar as RNStatusBar,
	View,
	Text,
	StyleSheet,
	Modal,
	Pressable,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { AppGradientHeader, AppRefreshControl } from '../../components';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useToast } from '../../context/ToastContext';
import { analyticsService, type ReportPeriod } from '../../services/analyticsService';
import { downloadAndShareFile } from '../../utils/fileDownload';
import { getDisplayMessage } from '../../utils/errorParser';
import {
	FLOATING_TAB_BAR_VISUAL_HEIGHT,
	borderRadius,
	colors,
	getFloatingTabBarBottomPadding,
	spacing,
	textStyles,
} from '../../theme';
import { analyticsStyles as s } from './styles';
import { useAnalyticsData } from './hooks';
import {
	BSIGaugeCard,
	SupportGauges,
	AspectScoreGrid,
	HeatmapCalendar,
	MonthYearPickerModal,
	ProgressTrendsChart,
	SummaryStats,
	InsightsSection,
	FABReports,
	DayLogsSheet,
} from './components';

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN ANALYTICS SCREEN                                             */
/* ═══════════════════════════════════════════════════════════════════ */
const AnalyticsScreen: React.FC = () => {
	const insets = useSafeAreaInsets();
	const { showToast } = useToast();
	const [reportPickerVisible, setReportPickerVisible] = useState(false);
	const [downloadingReport, setDownloadingReport] = useState(false);
	const [selectedDay, setSelectedDay] = React.useState<{
		date: string;
		score: number | null;
	} | null>(null);

	const handleDayPress = useCallback((date: string, score: number | null) => {
		setSelectedDay({ date, score });
	}, []);

	const scrollBottomPad = useMemo(
		() => getFloatingTabBarBottomPadding(insets.bottom),
		[insets.bottom]
	);

	const fabBottom = useMemo(
		() => FLOATING_TAB_BAR_VISUAL_HEIGHT + insets.bottom + 24,
		[insets.bottom]
	);

	const {
		selectedChild,
		aspects,
		aspectsLoading,
		aspectsError,
		trends,
		trendsLoading,
		trendsError,
		counters,
		countersLoading,
		countersError,
		guidance,
		badges,
		strengthsWeaknesses,
		heatmapData,
		heatmapLoading,
		heatmapError,
		selectedYear,
		selectedMonth,
		setSelectedMonth,
		studentBsi,
		bsiLoading,
		bsiError,
		scoreCards,
		scoreCardsLoading,
		scoreCardsError,
		refreshAnalytics,
	} = useAnalyticsData();

	const { refreshing, onRefresh } = usePullToRefresh(refreshAnalytics);

	const [monthPickerVisible, setMonthPickerVisible] = useState(false);
	const monthLabel = useMemo(
		() =>
			new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', {
				month: 'short',
				year: 'numeric',
			}),
		[selectedYear, selectedMonth]
	);

	/* Status bar management */
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

	const openReportPicker = useCallback(() => {
		if (downloadingReport) return;
		setReportPickerVisible(true);
	}, [downloadingReport]);

	const closeReportPicker = useCallback(() => {
		setReportPickerVisible(false);
	}, []);

	const handleDownloadReport = useCallback(
		async (period: ReportPeriod) => {
			setReportPickerVisible(false);
			setDownloadingReport(true);
			try {
				const { url, fileName } = await analyticsService.downloadReport(
					selectedChild.id,
					period
				);
				// Shows its own "Download complete — Open now?" alert, so no success
				// toast needed here.
				await downloadAndShareFile(url, fileName);
			} catch (err) {
				showToast({ type: 'error', message: getDisplayMessage(err), durationMs: 3000 });
			} finally {
				setDownloadingReport(false);
			}
		},
		[selectedChild.id, showToast]
	);

	return (
		<SafeAreaView style={s.root} edges={['left', 'right', 'bottom']}>
			<AppGradientHeader
				title="Progress & Analytics"
				subtitle={`${selectedChild.name}'s Insights`}
			/>

			{/* Global month/year picker — every card below is scoped to this one month */}
			<View style={monthBarStyles.monthBar}>
				<Pressable
					onPress={() => setMonthPickerVisible(true)}
					style={monthBarStyles.monthBarPill}
					accessibilityRole="button"
					accessibilityLabel="Choose month and year"
				>
					<Icon name="calendar-month" size={16} color={colors.primary} />
					<Text style={monthBarStyles.monthBarPillText}>{monthLabel}</Text>
					<Icon name="arrow-drop-down" size={18} color={colors.primary} />
				</Pressable>
			</View>

			<MonthYearPickerModal
				visible={monthPickerVisible}
				year={selectedYear}
				month={selectedMonth}
				onSelect={setSelectedMonth}
				onClose={() => setMonthPickerVisible(false)}
			/>

			<ScrollView
				style={s.scroll}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={[
					s.scrollContent,
					{ paddingBottom: scrollBottomPad },
				]}
				refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			>
				{/* 1. BSI Hero Section */}
				<BSIGaugeCard
					data={studentBsi}
					loading={bsiLoading}
					error={bsiError}
					childName={selectedChild.name}
					monthLabel={monthLabel}
				/>

				{/* 2. Support KPI Gauges (3 semi-circles) */}
				<SupportGauges
					data={scoreCards}
					loading={scoreCardsLoading}
					error={scoreCardsError}
				/>

				{/* Section divider */}
				{/* <SectionDivider icon="tune" label="Detailed Breakdown" /> */}

				{/* 3. Aspect Scores (5 round gauges) */}
				<AspectScoreGrid
					aspects={aspects}
					loading={aspectsLoading}
					error={aspectsError}
					monthLabel={monthLabel}
				/>

				{/* 4. Behaviour Heatmap (DBS Calendar) */}
				<HeatmapCalendar
					data={heatmapData}
					loading={heatmapLoading}
					error={heatmapError}
					year={selectedYear}
					month={selectedMonth}
					onDayPress={handleDayPress}
				/>

				{/* Section divider */}
				{/* <SectionDivider icon="show-chart" label="Trends & Activity" /> */}

				{/* 5. Progress Trends (Dual Line Chart) */}
				<ProgressTrendsChart
					data={trends}
					loading={trendsLoading}
					error={trendsError}
					monthLabel={monthLabel}
					childName={selectedChild.name}
				/>

				{/* 6. Summary Counters (Stat Pills) */}
				<SummaryStats
					counters={counters}
					loading={countersLoading}
					error={countersError}
					monthLabel={monthLabel}
				/>

				{/* Section divider */}
				<SectionDivider icon="auto-awesome" label="Insights & Rewards" />

				{/* 7. Insights Section (AI Tips, Strengths, Badges) */}
				<InsightsSection
					guidance={guidance}
					strengthsWeaknesses={strengthsWeaknesses}
					badges={badges}
					childName={selectedChild.name}
				/>
			</ScrollView>

			<FABReports
				bottom={fabBottom}
				loading={downloadingReport}
				onPress={openReportPicker}
			/>

			<ReportPeriodPickerModal
				visible={reportPickerVisible}
				onSelect={handleDownloadReport}
				onClose={closeReportPicker}
			/>

			<DayLogsSheet
				visible={selectedDay !== null}
				childId={selectedChild.id}
				date={selectedDay?.date ?? null}
				dbsScore={selectedDay?.score ?? null}
				onClose={() => setSelectedDay(null)}
			/>
		</SafeAreaView>
	);
};

export default AnalyticsScreen;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Report period picker — asks weekly/monthly, then the screen calls   */
/*  the download API directly. Replaces the old in-app report preview.  */
/* ═══════════════════════════════════════════════════════════════════ */
interface ReportPeriodPickerModalProps {
	visible: boolean;
	onSelect: (period: ReportPeriod) => void;
	onClose: () => void;
}

const ReportPeriodPickerModal: React.FC<ReportPeriodPickerModalProps> = ({
	visible,
	onSelect,
	onClose,
}) => (
	<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
		<Pressable style={pickerStyles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
		<View style={pickerStyles.sheetWrap} pointerEvents="box-none">
			<View style={pickerStyles.sheet}>
				<Text style={pickerStyles.title}>Download report</Text>
				<Text style={pickerStyles.subtitle}>Which report would you like?</Text>

				<Pressable
					onPress={() => onSelect('weekly')}
					style={({ pressed }) => [pickerStyles.option, pressed && pickerStyles.optionPressed]}
					accessibilityRole="button"
					accessibilityLabel="Download weekly report"
				>
					<View style={pickerStyles.optionIconWrap}>
						<Icon name="calendar-view-week" size={20} color={colors.primary} />
					</View>
					<View style={pickerStyles.optionTextWrap}>
						<Text style={pickerStyles.optionTitle}>Weekly report</Text>
						<Text style={pickerStyles.optionHint}>This week's scores and activity</Text>
					</View>
					<Icon name="chevron-right" size={20} color={colors.textMuted} />
				</Pressable>

				<Pressable
					onPress={() => onSelect('monthly')}
					style={({ pressed }) => [pickerStyles.option, pressed && pickerStyles.optionPressed]}
					accessibilityRole="button"
					accessibilityLabel="Download monthly report"
				>
					<View style={pickerStyles.optionIconWrap}>
						<Icon name="calendar-month" size={20} color={colors.primary} />
					</View>
					<View style={pickerStyles.optionTextWrap}>
						<Text style={pickerStyles.optionTitle}>Monthly report</Text>
						<Text style={pickerStyles.optionHint}>Full month summary and trends</Text>
					</View>
					<Icon name="chevron-right" size={20} color={colors.textMuted} />
				</Pressable>

				<Pressable
					onPress={onClose}
					style={({ pressed }) => [pickerStyles.cancelBtn, pressed && pickerStyles.optionPressed]}
					accessibilityRole="button"
					accessibilityLabel="Cancel"
				>
					<Text style={pickerStyles.cancelText}>Cancel</Text>
				</Pressable>
			</View>
		</View>
	</Modal>
);

const monthBarStyles = StyleSheet.create({
	monthBar: {
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.sm,
		alignItems: 'flex-start',
	},
	monthBarPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 8,
		paddingHorizontal: spacing.md,
		borderRadius: borderRadius.full,
		backgroundColor: colors.lavenderSoft,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.2)',
	},
	monthBarPillText: {
		...textStyles.bodyMedium,
		fontWeight: '800',
		color: colors.primary,
	},
});

const pickerStyles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(13, 13, 13, 0.45)',
	},
	sheetWrap: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: spacing.lg,
	},
	sheet: {
		width: '100%',
		maxWidth: 360,
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		padding: spacing.lg,
	},
	title: {
		...textStyles.headingMedium,
		fontWeight: '800',
		color: colors.ink,
	},
	subtitle: {
		...textStyles.bodyMedium,
		color: colors.textSecondary,
		marginTop: 2,
		marginBottom: spacing.md,
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xs,
		borderRadius: borderRadius.large,
	},
	optionPressed: {
		backgroundColor: colors.surfaceMuted,
	},
	optionIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.lavenderSoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionTextWrap: {
		flex: 1,
		minWidth: 0,
	},
	optionTitle: {
		...textStyles.bodyLarge,
		fontWeight: '800',
		color: colors.ink,
	},
	optionHint: {
		...textStyles.caption,
		color: colors.textMuted,
		marginTop: 2,
	},
	cancelBtn: {
		marginTop: spacing.sm,
		alignItems: 'center',
		paddingVertical: spacing.sm,
		borderRadius: borderRadius.large,
	},
	cancelText: {
		...textStyles.bodyMedium,
		fontWeight: '700',
		color: colors.textSecondary,
	},
});

/* ═══════════════════════════════════════════════════════════════════ */
/*  Section Divider — decorative break between major sections        */
/* ═══════════════════════════════════════════════════════════════════ */
const SectionDivider = React.memo(({ icon, label }: { icon: string; label: string }) => (
	<Animated.View
		entering={FadeInDown.delay(100).springify().damping(20).stiffness(200)}
		style={dividerStyles.wrap}
	>
		<View style={dividerStyles.line} />
		<View style={dividerStyles.pill}>
			<Icon name={icon} size={13} color={colors.primary} />
			<Text style={dividerStyles.pillText}>{label}</Text>
		</View>
		<View style={dividerStyles.line} />
	</Animated.View>
));

const dividerStyles = StyleSheet.create({
	wrap: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: spacing.md,
		gap: spacing.sm,
	},
	line: {
		flex: 1,
		height: StyleSheet.hairlineWidth,
		backgroundColor: 'rgba(124, 106, 232, 0.18)',
	},
	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: borderRadius.full,
		backgroundColor: 'rgba(124, 106, 232, 0.06)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124, 106, 232, 0.14)',
	},
	pillText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.primary,
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
});
