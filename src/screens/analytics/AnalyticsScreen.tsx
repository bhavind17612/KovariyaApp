import React, { useCallback, useMemo } from 'react';
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
import type { GoalWiseReport, MonthlyPdfReport } from '../../data/analyticsData';
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
	const [activeReport, setActiveReport] = React.useState<'monthly' | 'goalwise' | null>(null);
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
		aspectPeriod,
		setAspectPeriod,
		trends,
		trendsLoading,
		trendsError,
		trendPeriod,
		setTrendPeriod,
		counters,
		countersLoading,
		countersError,
		guidance,
		badges,
		strengthsWeaknesses,
		monthlyReport,
		goalWiseReport,
		heatmapData,
		heatmapLoading,
		heatmapError,
		heatmapYear,
		heatmapMonth,
		prevMonth,
		nextMonth,
		summaryPeriod,
		setSummaryPeriod,
		bsiPeriod,
		setBsiPeriod,
		studentBsi,
		bsiLoading,
		bsiError,
		scoreCards,
		scoreCardsLoading,
		scoreCardsError,
		refreshAnalytics,
	} = useAnalyticsData();

	const { refreshing, onRefresh } = usePullToRefresh(refreshAnalytics);

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

	const openMonthlyReport = useCallback(() => {
		setActiveReport('monthly');
		showToast({
			type: 'info',
			message: `Monthly PDF report is ready for ${selectedChild.name}.`,
			durationMs: 2400,
		});
	}, [selectedChild.name, showToast]);

	const openGoalWiseReport = useCallback(() => {
		setActiveReport('goalwise');
		showToast({
			type: 'info',
			message: `Goal-wise report is ready for ${selectedChild.name}.`,
			durationMs: 2400,
		});
	}, [selectedChild.name, showToast]);

	const closeReport = useCallback(() => {
		setActiveReport(null);
	}, []);

	return (
		<SafeAreaView style={s.root} edges={['left', 'right', 'bottom']}>
			<AppGradientHeader
				title="Progress & Analytics"
				subtitle={`${selectedChild.name}'s Insights`}
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
					bsiPeriod={bsiPeriod}
					onTogglePeriod={setBsiPeriod}
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
					period={aspectPeriod}
					onTogglePeriod={setAspectPeriod}
				/>

				{/* 4. Behaviour Heatmap (DBS Calendar) */}
				<HeatmapCalendar
					data={heatmapData}
					loading={heatmapLoading}
					error={heatmapError}
					year={heatmapYear}
					month={heatmapMonth}
					onPrevMonth={prevMonth}
					onNextMonth={nextMonth}
					onDayPress={handleDayPress}
				/>

				{/* Section divider */}
				{/* <SectionDivider icon="show-chart" label="Trends & Activity" /> */}

				{/* 5. Progress Trends (Dual Line Chart) */}
				<ProgressTrendsChart
					data={trends}
					loading={trendsLoading}
					error={trendsError}
					period={trendPeriod}
					onTogglePeriod={setTrendPeriod}
					childName={selectedChild.name}
				/>

				{/* 6. Summary Counters (Stat Pills) */}
				<SummaryStats
					counters={counters}
					loading={countersLoading}
					error={countersError}
					summaryPeriod={summaryPeriod}
					onTogglePeriod={setSummaryPeriod}
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
				onMonthlyReportPress={openMonthlyReport}
				onGoalWiseReportPress={openGoalWiseReport}
			/>

			<ReportPreviewModal
				visible={activeReport !== null}
				type={activeReport}
				childName={selectedChild.name}
				monthlyReport={monthlyReport}
				goalReport={goalWiseReport}
				onClose={closeReport}
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

interface ReportPreviewModalProps {
	visible: boolean;
	type: 'monthly' | 'goalwise' | null;
	childName: string;
	monthlyReport: MonthlyPdfReport;
	goalReport: GoalWiseReport;
	onClose: () => void;
}

const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
	visible,
	type,
	childName,
	monthlyReport,
	goalReport,
	onClose,
}) => (
	<Modal
		visible={visible}
		animationType="slide"
		presentationStyle="pageSheet"
		onRequestClose={onClose}
	>
		<SafeAreaView style={reportStyles.modalRoot} edges={['top', 'left', 'right', 'bottom']}>
			<View style={reportStyles.modalHeader}>
				<View style={reportStyles.modalHeaderText}>
					<Text style={reportStyles.modalEyebrow}>
						{type === 'monthly' ? 'Monthly PDF Report' : 'Goal-wise Download Report'}
					</Text>
					<Text style={reportStyles.modalTitle}>
						{type === 'monthly' ? `${childName}'s monthly report` : `${childName}'s goal report`}
					</Text>
				</View>
				<Pressable onPress={onClose} style={reportStyles.closeBtn} accessibilityLabel="Close report">
					<Icon name="close" size={22} color={colors.ink} />
				</Pressable>
			</View>

			<ScrollView
				style={reportStyles.modalScroll}
				contentContainerStyle={reportStyles.modalContent}
				showsVerticalScrollIndicator={false}
			>
				{type === 'monthly' ? (
					<MonthlyReportView childName={childName} report={monthlyReport} />
				) : type === 'goalwise' ? (
					<GoalWiseReportView report={goalReport} />
				) : null}
			</ScrollView>
		</SafeAreaView>
	</Modal>
);

const MonthlyReportView = React.memo(
	({ childName, report }: { childName: string; report: MonthlyPdfReport }) => (
		<>
			<View style={reportStyles.heroCard}>
				<Text style={reportStyles.heroTitle}>{report.monthLabel}</Text>
				<Text style={reportStyles.heroSubtitle}>
					{childName}, monthly BSI, family trust, goal progress, behaviour chips, and guidance in one place.
				</Text>
				<View style={reportStyles.heroMetaRow}>
					<MetaPill icon="person" label={childName} />
					<MetaPill icon="calendar-month" label={report.monthLabel} />
				</View>
			</View>

			<ReportSection title="Core scores" icon="query-stats">
				<View style={reportStyles.metricGrid}>
					<MetricTile label="Monthly BSI" value={`${report.metrics.bsi}%`} tint={colors.primary} />
					<MetricTile label="Family Score" value={`${report.metrics.familyScore}%`} tint={colors.accent} />
					<MetricTile label="Trust Meter" value={`${report.metrics.trust}%`} tint={colors.growth} />
					<MetricTile
						label="Parent Consistency"
						value={`${report.metrics.parentConsistency}%`}
						tint={colors.info}
					/>
				</View>
			</ReportSection>

			<ReportSection title="Aspect trends" icon="insights">
				{report.aspects.map((aspect) => (
					<View key={aspect.id} style={reportStyles.rowCard}>
						<View style={[reportStyles.rowIconWrap, { backgroundColor: `${aspect.accent}16` }]}>
							<Icon name={aspect.iconName} size={18} color={aspect.accent} />
						</View>
						<View style={reportStyles.rowTextWrap}>
							<Text style={reportStyles.rowTitle}>{aspect.name}</Text>
							<Text style={reportStyles.rowSubtitle}>
								Trend {aspect.trend >= 0 ? `+${aspect.trend}` : aspect.trend}% this month
							</Text>
						</View>
						<Text style={reportStyles.rowValue}>{aspect.score}%</Text>
					</View>
				))}
			</ReportSection>

			<ReportSection title="Behaviour chips" icon="sell">
				<Text style={reportStyles.blockLabel}>Positive behaviour chips during the month</Text>
				<View style={reportStyles.chipsWrap}>
					{report.positiveChips.map((chip) => (
						<CountChip key={chip.label} chip={chip} />
					))}
				</View>
				<Text style={[reportStyles.blockLabel, reportStyles.blockLabelTight]}>
					Negative behaviour chips during the month
				</Text>
				<View style={reportStyles.chipsWrap}>
					{report.negativeChips.map((chip) => (
						<CountChip key={chip.label} chip={chip} />
					))}
				</View>
			</ReportSection>

			<ReportSection title="DBS summary" icon="calendar-view-month">
				<View style={reportStyles.metricGrid}>
					<MetricTile label="Active days" value={String(report.dbsSummary.activeDays)} tint={colors.primaryDark} />
					<MetricTile label="Average DBS" value={`${report.dbsSummary.averageScore}`} tint={colors.growth} />
				</View>
				<View style={reportStyles.infoBlock}>
					<Text style={reportStyles.infoText}>Best day: {report.dbsSummary.bestDay}</Text>
					<Text style={reportStyles.infoText}>Needs attention day: {report.dbsSummary.needsAttentionDay}</Text>
				</View>
			</ReportSection>

			<ReportSection title="Logged totals" icon="dataset">
				<View style={reportStyles.metricGrid}>
					<MetricTile label="Total logged data" value={String(report.totals.loggedData)} tint={colors.primary} />
					<MetricTile label="Parent entries" value={String(report.totals.parentEntries)} tint={colors.accent} />
				</View>
			</ReportSection>

			<ReportSection title="Goal progress & reward eligibility" icon="emoji-events">
				<View style={reportStyles.infoBlock}>
					<Text style={reportStyles.infoHeadline}>{report.goalProgress.title}</Text>
					<Text style={reportStyles.infoText}>Reward: {report.goalProgress.reward}</Text>
					<Text style={reportStyles.infoText}>
						Progress: {report.goalProgress.current}/{report.goalProgress.target} pts
					</Text>
					<Text style={reportStyles.infoHeadline}>{report.goalProgress.eligibilityText}</Text>
					<Text style={reportStyles.infoText}>{report.goalProgress.explanation}</Text>
				</View>
			</ReportSection>

			<ReportSection title="Parent guidance" icon="lightbulb">
				{report.guidance.map((line) => (
					<BulletLine key={line} text={line} />
				))}
			</ReportSection>

			<ReportSection title="Improve next month" icon="trending-up">
				{report.nextMonthFocus.map((line) => (
					<BulletLine key={line} text={line} />
				))}
			</ReportSection>
		</>
	)
);

const GoalWiseReportView = React.memo(({ report }: { report: GoalWiseReport }) => (
	<>
		<View style={reportStyles.heroCard}>
			<Text style={reportStyles.heroTitle}>{report.goalName}</Text>
			<Text style={reportStyles.heroSubtitle}>
				Target, reward, daily logs, behaviour chips, achieved score, and reward eligibility explanation.
			</Text>
			<View style={reportStyles.heroMetaRow}>
				<MetaPill icon="flag" label={`Target ${report.target} pts`} />
				<MetaPill icon="redeem" label={report.reward} />
			</View>
		</View>

		<ReportSection title="Goal summary" icon="assignment-turned-in">
			<View style={reportStyles.infoBlock}>
				<Text style={reportStyles.infoText}>Reward: {report.reward}</Text>
				<Text style={reportStyles.infoText}>Duration: {report.duration}</Text>
				<Text style={reportStyles.infoText}>Achieved score: {report.achievedScore}</Text>
				<Text style={reportStyles.infoHeadline}>{report.finalResult}</Text>
			</View>
		</ReportSection>

		<ReportSection title="Goal period daily logs" icon="today">
			{report.dailyLogs.map((log) => (
				<View key={log.date} style={reportStyles.logRow}>
					<View style={reportStyles.logDateWrap}>
						<Text style={reportStyles.logDate}>{log.date}</Text>
						<Text style={reportStyles.logNote}>{log.note}</Text>
					</View>
					<View style={reportStyles.logTagWrap}>
						{log.positiveChip ? <TagPill label={log.positiveChip} tone="positive" /> : null}
						{log.negativeChip ? <TagPill label={log.negativeChip} tone="negative" /> : null}
						<Text style={reportStyles.logPoints}>
							{log.pointsDelta > 0 ? `+${log.pointsDelta}` : log.pointsDelta}
						</Text>
					</View>
				</View>
			))}
		</ReportSection>

		<ReportSection title="Behaviour chips during goal period" icon="sell">
			<Text style={reportStyles.blockLabel}>Positive chips</Text>
			<View style={reportStyles.chipsWrap}>
				{report.positiveChips.map((chip) => (
					<CountChip key={chip.label} chip={chip} />
				))}
			</View>
			<Text style={[reportStyles.blockLabel, reportStyles.blockLabelTight]}>Negative chips</Text>
			<View style={reportStyles.chipsWrap}>
				{report.negativeChips.map((chip) => (
					<CountChip key={chip.label} chip={chip} />
				))}
			</View>
		</ReportSection>

		<ReportSection title="Eligibility explanation" icon="rule">
			<View style={reportStyles.infoBlock}>
				<Text style={reportStyles.infoHeadline}>{report.rewardAchieved ? 'Reward achieved' : 'Reward not achieved'}</Text>
				<Text style={reportStyles.infoText}>{report.reasonExplanation}</Text>
			</View>
		</ReportSection>

		<ReportSection title="Improvement note for next attempt" icon="edit-note">
			<BulletLine text={report.improvementNote} />
		</ReportSection>
	</>
));

const ReportSection = ({
	title,
	icon,
	children,
}: {
	title: string;
	icon: string;
	children: React.ReactNode;
}) => (
	<View style={reportStyles.sectionCard}>
		<View style={reportStyles.sectionHeader}>
			<View style={reportStyles.sectionIconWrap}>
				<Icon name={icon} size={16} color={colors.primary} />
			</View>
			<Text style={reportStyles.sectionTitle}>{title}</Text>
		</View>
		{children}
	</View>
);

const MetricTile = ({ label, value, tint }: { label: string; value: string; tint: string }) => (
	<View style={reportStyles.metricTile}>
		<Text style={[reportStyles.metricValue, { color: tint }]}>{value}</Text>
		<Text style={reportStyles.metricLabel}>{label}</Text>
	</View>
);

const CountChip = ({
	chip,
}: {
	chip: { label: string; count: number; kind: 'positive' | 'negative' };
}) => (
	<View
		style={[
			reportStyles.countChip,
			chip.kind === 'positive' ? reportStyles.countChipPositive : reportStyles.countChipNegative,
		]}
	>
		<Text
			style={[
				reportStyles.countChipText,
				chip.kind === 'positive' ? reportStyles.countChipTextPositive : reportStyles.countChipTextNegative,
			]}
		>
			{chip.label} x{chip.count}
		</Text>
	</View>
);

const TagPill = ({ label, tone }: { label: string; tone: 'positive' | 'negative' }) => (
	<View style={[reportStyles.tagPill, tone === 'positive' ? reportStyles.tagPillPositive : reportStyles.tagPillNegative]}>
		<Text style={[reportStyles.tagPillText, tone === 'positive' ? reportStyles.tagPillTextPositive : reportStyles.tagPillTextNegative]}>
			{label}
		</Text>
	</View>
);

const BulletLine = ({ text }: { text: string }) => (
	<View style={reportStyles.bulletRow}>
		<View style={reportStyles.bulletDot} />
		<Text style={reportStyles.bulletText}>{text}</Text>
	</View>
);

const MetaPill = ({ icon, label }: { icon: string; label: string }) => (
	<View style={reportStyles.metaPill}>
		<Icon name={icon} size={14} color={colors.primary} />
		<Text style={reportStyles.metaPillText}>{label}</Text>
	</View>
);

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

const reportStyles = StyleSheet.create({
	modalRoot: {
		flex: 1,
		backgroundColor: colors.background,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		backgroundColor: colors.surface,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	modalHeaderText: {
		flex: 1,
		minWidth: 0,
	},
	modalEyebrow: {
		fontSize: 11,
		fontWeight: '800',
		color: colors.primary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 3,
	},
	modalTitle: {
		...textStyles.headingMedium,
		fontWeight: '800',
		color: colors.ink,
	},
	closeBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surfaceMuted,
		marginLeft: spacing.sm,
	},
	modalScroll: {
		flex: 1,
	},
	modalContent: {
		padding: spacing.lg,
		paddingBottom: spacing.xxl,
		gap: spacing.md,
	},
	heroCard: {
		padding: spacing.lg,
		borderRadius: borderRadius.xxl,
		backgroundColor: '#F6F2FF',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.16)',
	},
	heroTitle: {
		...textStyles.headingMedium,
		fontWeight: '800',
		color: colors.ink,
		marginBottom: spacing.xs,
	},
	heroSubtitle: {
		...textStyles.bodyMedium,
		color: colors.textPrimary,
		lineHeight: 20,
	},
	heroMetaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
		marginTop: spacing.md,
	},
	metaPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: spacing.sm,
		paddingVertical: 7,
		borderRadius: borderRadius.full,
		backgroundColor: colors.surface,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.12)',
	},
	metaPillText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.ink,
	},
	sectionCard: {
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		padding: spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	sectionIconWrap: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: colors.lavenderSoft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sectionTitle: {
		...textStyles.bodyLarge,
		fontWeight: '800',
		color: colors.ink,
	},
	metricGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	metricTile: {
		width: '47%',
		backgroundColor: '#FBFBFF',
		borderRadius: borderRadius.large,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
	},
	metricValue: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 4,
	},
	metricLabel: {
		...textStyles.caption,
		color: colors.textSecondary,
		fontWeight: '700',
	},
	rowCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.sm,
	},
	rowIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowTextWrap: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: colors.ink,
	},
	rowSubtitle: {
		...textStyles.caption,
		color: colors.textSecondary,
		marginTop: 2,
	},
	rowValue: {
		fontSize: 15,
		fontWeight: '800',
		color: colors.ink,
	},
	chipsWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	countChip: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 7,
		borderRadius: borderRadius.full,
		borderWidth: StyleSheet.hairlineWidth,
	},
	countChipPositive: {
		backgroundColor: colors.mintSoft,
		borderColor: 'rgba(63,169,122,0.22)',
	},
	countChipNegative: {
		backgroundColor: colors.peachSoft,
		borderColor: 'rgba(232,93,93,0.18)',
	},
	countChipText: {
		fontSize: 12,
		fontWeight: '700',
	},
	countChipTextPositive: {
		color: colors.growth,
	},
	countChipTextNegative: {
		color: colors.error,
	},
	blockLabel: {
		fontSize: 12,
		fontWeight: '800',
		color: colors.textSecondary,
		marginBottom: spacing.sm,
	},
	blockLabelTight: {
		marginTop: spacing.md,
	},
	infoBlock: {
		backgroundColor: '#FBFBFF',
		borderRadius: borderRadius.large,
		padding: spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
		gap: spacing.xs,
	},
	infoHeadline: {
		fontSize: 14,
		fontWeight: '800',
		color: colors.ink,
	},
	infoText: {
		...textStyles.bodyMedium,
		fontSize: 13,
		color: colors.textPrimary,
		lineHeight: 19,
	},
	bulletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
		marginBottom: spacing.sm,
	},
	bulletDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.primary,
		marginTop: 6,
	},
	bulletText: {
		...textStyles.bodyMedium,
		flex: 1,
		color: colors.textPrimary,
		lineHeight: 19,
	},
	logRow: {
		paddingVertical: spacing.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(17,17,17,0.06)',
	},
	logDateWrap: {
		marginBottom: spacing.xs,
	},
	logDate: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.ink,
	},
	logNote: {
		...textStyles.caption,
		color: colors.textSecondary,
		marginTop: 2,
	},
	logTagWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: spacing.sm,
	},
	tagPill: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 6,
		borderRadius: borderRadius.full,
		borderWidth: StyleSheet.hairlineWidth,
	},
	tagPillPositive: {
		backgroundColor: colors.mintSoft,
		borderColor: 'rgba(63,169,122,0.22)',
	},
	tagPillNegative: {
		backgroundColor: colors.peachSoft,
		borderColor: 'rgba(232,93,93,0.18)',
	},
	tagPillText: {
		fontSize: 11,
		fontWeight: '700',
	},
	tagPillTextPositive: {
		color: colors.growth,
	},
	tagPillTextNegative: {
		color: colors.error,
	},
	logPoints: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.primary,
	},
});
