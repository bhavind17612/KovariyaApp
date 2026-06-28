import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	TouchableOpacity,
	Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { scoreColor, scoreBg, scoreLabel } from '../utils';
import { AnimatedNumber, SemiCircleGauge } from './gauges';
import { SkeletonBox, SkeletonShimmer } from '../../../components';
import type { StudentBsi } from '../../../types/bsi';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface BSIGaugeCardProps {
	data: StudentBsi | null;
	loading: boolean;
	error: boolean;
	childName: string;
	bsiPeriod: 'weekly' | 'monthly';
	onTogglePeriod: (period: 'weekly' | 'monthly') => void;
}

/** "2026-06-08" → "Jun 8". Falls back to the raw value. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDay(iso: string): string {
	if (!iso) return '';
	const [, m, d] = iso.split('T')[0].split('-');
	const month = MONTHS[Number(m) - 1];
	return month ? `${month} ${Number(d)}` : iso;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const PeriodToggle: React.FC<{
	bsiPeriod: 'weekly' | 'monthly';
	onTogglePeriod: (period: 'weekly' | 'monthly') => void;
}> = ({ bsiPeriod, onTogglePeriod }) => (
	<View style={s.bsiToggle}>
		<Pressable
			onPress={() => onTogglePeriod('weekly')}
			style={[s.bsiToggleBtn, bsiPeriod === 'weekly' && s.bsiToggleBtnActive]}
		>
			<Text style={[s.bsiToggleText, bsiPeriod === 'weekly' && s.bsiToggleTextActive]}>
				Weekly
			</Text>
		</Pressable>
		<Pressable
			onPress={() => onTogglePeriod('monthly')}
			style={[s.bsiToggleBtn, bsiPeriod === 'monthly' && s.bsiToggleBtnActive]}
		>
			<Text style={[s.bsiToggleText, bsiPeriod === 'monthly' && s.bsiToggleTextActive]}>
				Monthly
			</Text>
		</Pressable>
	</View>
);

const BSIGaugeCard: React.FC<BSIGaugeCardProps> = ({
	data,
	loading,
	error,
	childName,
	bsiPeriod,
	onTogglePeriod,
}) => {
	const percent = data ? Math.max(0, Math.round(data.bsi)) : 0;
	const bsiColor = scoreColor(percent);
	const periodLabel = bsiPeriod === 'weekly' ? 'This Week' : 'This Month';

	// Direction → trend icon. Prefer the server's `direction`, fall back to change sign.
	const trendIcon = React.useMemo(() => {
		const dir = data?.direction;
		if (dir === 'improved') return 'trending-up';
		if (dir === 'declined') return 'trending-down';
		if (dir === 'steady') return 'trending-flat';
		const change = data?.change ?? 0;
		return change > 0 ? 'trending-up' : change < 0 ? 'trending-down' : 'trending-flat';
	}, [data?.direction, data?.change]);

	/* Build a soft 3-stop wash from the score colour itself.
	   Hex + 2-digit alpha (00-FF) keeps everything tinted around bsiColor. */
	const cardGradient = React.useMemo(
		() =>
			[
				`${bsiColor}26`, // ~15% — top-left soft wash
				`${bsiColor}0F`, // ~6%  — mid soft
				`${bsiColor}1F`, // ~12% — bottom-right echo
			] as const,
		[bsiColor],
	);

	/* ── Loading skeleton ── */
	if (loading && !data) {
		return (
			<Animated.View
				entering={FadeInDown.springify().damping(18).stiffness(220)}
				style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
			>
				<View style={[s.bsiCard, s.skeletonCard]}>
					<View style={s.bsiHeaderRow}>
						<SkeletonBox width="56%" height={12} />
						<SkeletonBox width={120} height={28} radius={borderRadius.full} />
					</View>
					<View style={s.skeletonGauge}>
						<SkeletonBox width={196} height={104} radius={16} />
					</View>
					<SkeletonBox width={120} height={30} radius={borderRadius.full} style={s.skeletonCenter} />
					<SkeletonBox width="100%" height={52} radius={borderRadius.large} style={{ marginTop: spacing.md }} />
					<SkeletonBox width="100%" height={44} radius={borderRadius.large} style={{ marginTop: spacing.md }} />
					<SkeletonShimmer />
				</View>
			</Animated.View>
		);
	}

	/* ── Error / empty state ── */
	if (!data) {
		return (
			<Animated.View
				entering={FadeInDown.springify().damping(18).stiffness(220)}
				style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
			>
				<View style={[s.bsiCard, s.emptyCard]}>
					<View style={s.bsiHeaderRow}>
						<Text style={s.bsiTitle}>Behaviour Score Index (BSI)</Text>
						<PeriodToggle bsiPeriod={bsiPeriod} onTogglePeriod={onTogglePeriod} />
					</View>
					<View style={s.emptyBody}>
						<Icon
							name={error ? 'cloud-off' : 'insights'}
							size={30}
							color={colors.textMuted}
						/>
						<Text style={s.emptyText}>
							{error
								? 'Could not load the BSI score. Pull to refresh.'
								: `No ${bsiPeriod} BSI data yet for ${childName}.`}
						</Text>
					</View>
				</View>
			</Animated.View>
		);
	}

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(18).stiffness(220)}
			style={[s.shadowWrapper, { marginBottom: spacing.sm }]}>
			<View style={s.heroSection}>
				<LinearGradient
					colors={cardGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={[s.bsiCard, { borderColor: `${bsiColor}26` }]}
				>
					{/* Header row with title + toggle */}
					<View style={s.bsiHeaderRow}>
						<View style={s.bsiTitleRow}>
							<Text style={s.bsiTitle}>Behaviour Score Index (BSI)</Text>
						</View>
						<PeriodToggle bsiPeriod={bsiPeriod} onTogglePeriod={onTogglePeriod} />
					</View>

					{/* Period range */}
					<Text style={s.bsiRange}>
						{formatDay(data.periodStart)} – {formatDay(data.periodEnd)}
					</Text>

					{/* Gauge */}
					<View style={s.gaugeStage}>
						<View style={s.bsiGaugeWrap}>
							<SemiCircleGauge
								percent={percent}
								size={196}
								strokeWidth={16}
								fillColor={bsiColor}
								trackColor="rgba(17,17,17,0.05)"
							/>
							{/* Center overlay */}
							<View style={s.bsiCenterOverlay}>
								<AnimatedNumber
									value={percent}
									suffix="%"
									delay={200}
									duration={1200}
									style={[s.bsiBigNumber, { color: bsiColor, textAlign: 'center' }]}
								/>
								<View style={s.bsiLabelRow}>
									<Icon name={trendIcon} size={16} color={bsiColor} />
									<Text style={[s.bsiLabelText, { color: bsiColor }]}>
										{scoreLabel(percent)}
									</Text>
								</View>
							</View>
						</View>
					</View>

					{/* Bottom info */}
					<View style={s.bsiBottomRow}>
						<View style={[s.bsiTrendPill, { backgroundColor: scoreBg(percent) }]}>
							<Text style={[s.bsiTrendText, { color: bsiColor }]}>{periodLabel}</Text>
							<Icon name={trendIcon} size={14} color={bsiColor} />
							<Text style={[s.bsiTrendText, { color: bsiColor }]}>
								{data.change > 0 ? `+${data.change}` : data.change}%
							</Text>
						</View>
					</View>

					{/* Quick stats */}
					<View style={s.statsRow}>
						<View style={s.statItem}>
							<Text style={s.statValue}>{data.previousBsi}%</Text>
							<Text style={s.statLabel}>Previous</Text>
						</View>
						<View style={s.statDivider} />
						<View style={s.statItem}>
							<Text style={s.statValue}>
								{data.activeDays}/{data.totalDays}
							</Text>
							<Text style={s.statLabel}>Active days</Text>
						</View>
						<View style={s.statDivider} />
						<View style={s.statItem}>
							<Text style={s.statValue}>{Math.round(data.avgDbs)}</Text>
							<Text style={s.statLabel}>Avg DBS</Text>
						</View>
					</View>

					{/* AI insight line */}
					<View style={s.bsiInsightWrap}>
						<Icon name="auto-awesome" size={14} color={colors.primary} style={{ marginTop: 1 }} />
						<Text style={s.bsiInsightLine}>
							{data.weakArea
								? data.weakArea.focus
								: `${childName} is doing well — keep the momentum going across all areas.`}
						</Text>
					</View>

					<TouchableOpacity style={s.viewHistoryBtn} activeOpacity={0.85}>
						<LinearGradient
							colors={[colors.primary, colors.primaryDark]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={s.viewHistoryInner}
						>
							<Text style={s.viewHistoryText}>View History</Text>
							<Icon name="chevron-right" size={16} color="#FFF" />
						</LinearGradient>
					</TouchableOpacity>
				</LinearGradient>
			</View>
		</Animated.View>
	);
};

export default React.memo(BSIGaugeCard);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Styles                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
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
	heroSection: {
		// marginBottom: spacing.sm,
	},
	bsiCard: {
		// borderRadius: borderRadius.xxl,
		padding: spacing.md,
		overflow: 'hidden',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.12)',
		backgroundColor: '#fff',
		// marginVertical: spacing.sm,
	},
	bsiHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: spacing.xs,
	},
	bsiTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flex: 1,
	},
	bsiTitleIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(124,106,232,0.10)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bsiTitle: {
		...textStyles.caption,
		fontWeight: '800',
		color: colors.ink,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		fontSize: 11,
	},
	bsiToggle: {
		flexDirection: 'row',
		backgroundColor: colors.surfaceMuted,
		borderRadius: borderRadius.full,
		padding: 2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
	},
	bsiToggleBtn: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 5,
		borderRadius: borderRadius.full,
	},
	bsiToggleBtnActive: {
		backgroundColor: colors.surface,
		...Platform.select({
			ios: {
				shadowColor: colors.primary,
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.12,
				shadowRadius: 4,
			},
			android: { elevation: 2 },
			default: {},
		}),
	},
	bsiToggleText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.textMuted,
		letterSpacing: 0.2,
	},
	bsiToggleTextActive: {
		color: colors.primary,
	},
	bsiGaugeWrap: {
		alignItems: 'center',
		position: 'relative',
		paddingTop: spacing.md,
		paddingBottom: spacing.sm,
	},
	gaugeStage: {
		borderRadius: borderRadius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.08)',
		marginBottom: spacing.md,
		// backgroundColor: 'rgba(255,255,255,0.5)',
	},
	gaugeHalo: {
		position: 'absolute',
		top: 28,
		width: 140,
		height: 140,
		borderRadius: 70,
	},
	gaugeHaloOuter: {
		position: 'absolute',
		top: 8,
		width: 180,
		height: 180,
		borderRadius: 90,
	},
	bsiCenterOverlay: {
		position: 'absolute',
		top: 62,
		alignItems: 'center',
	},
	bsiBigNumber: {
		fontSize: 42,
		fontWeight: '800',
		letterSpacing: -1.5,
		lineHeight: 44,
	},
	bsiLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	bsiLabelText: {
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.2,
	},
	bsiBottomRow: {
		alignItems: 'center',
		marginBottom: spacing.md,
	},
	bsiTrendPill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.md,
		paddingVertical: 8,
		borderRadius: borderRadius.full,
		gap: 5,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.04)',
	},
	bsiTrendText: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.2,
	},
	bsiInsightWrap: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
		backgroundColor: 'rgba(124,106,232,0.05)',
		borderRadius: borderRadius.large,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		marginBottom: spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.10)',
	},
	bsiInsightLine: {
		...textStyles.bodyMedium,
		fontSize: 13,
		color: colors.textPrimary,
		lineHeight: 19,
		flex: 1,
	},
	viewHistoryBtn: {
		borderRadius: borderRadius.large,
		...Platform.select({
			ios: {
				shadowColor: colors.primary,
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.32,
				shadowRadius: 12,
			},
			android: { elevation: 6 },
			default: {},
		}),
	},
	viewHistoryInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: spacing.sm + 4,
		paddingHorizontal: spacing.md,
		borderRadius: borderRadius.large,
		gap: 6,
	},
	viewHistoryText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#FFF',
		letterSpacing: 0.3,
	},
	bsiRange: {
		...textStyles.caption,
		color: colors.textMuted,
		fontWeight: '700',
		fontSize: 11,
		marginBottom: spacing.sm,
	},
	statsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.6)',
		borderRadius: borderRadius.large,
		paddingVertical: spacing.sm,
		marginBottom: spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.05)',
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
		gap: 2,
	},
	statValue: {
		...textStyles.bodyLarge,
		fontWeight: '800',
		color: colors.ink,
		fontSize: 16,
	},
	statLabel: {
		...textStyles.caption,
		color: colors.textMuted,
		fontWeight: '600',
		fontSize: 10,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	statDivider: {
		width: StyleSheet.hairlineWidth,
		height: 28,
		backgroundColor: colors.border,
	},
	skeletonCard: {
		alignItems: 'stretch',
	},
	skeletonGauge: {
		alignItems: 'center',
		marginTop: spacing.md,
	},
	skeletonCenter: {
		alignSelf: 'center',
		marginTop: spacing.sm,
	},
	emptyCard: {
		alignItems: 'stretch',
	},
	emptyBody: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.xl,
	},
	emptyText: {
		...textStyles.bodyMedium,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
		paddingHorizontal: spacing.lg,
	},
});
