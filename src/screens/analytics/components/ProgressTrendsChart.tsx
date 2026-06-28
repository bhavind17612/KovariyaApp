import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Polyline, Line, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card, SkeletonBox, SkeletonShimmer } from '../../../components';
import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { analyticsStyles as shared } from '../styles';
import type { TrendPoint } from '../../../types/progressTrends';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Chart constants                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
const LINE_PAD = { l: 36, r: 14, t: 10, b: 24 };
const LINE_PLOT_H = 120;
const LINE_Y_TICKS = [100, 75, 50, 25];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface ProgressTrendsChartProps {
	data: TrendPoint[];
	loading: boolean;
	error: boolean;
	period: 'weekly' | 'monthly';
	onTogglePeriod: (period: 'weekly' | 'monthly') => void;
	childName: string;
}

/** Last non-null value in a series, or 0. */
function lastValue(vals: (number | null)[]): number {
	for (let i = vals.length - 1; i >= 0; i--) {
		const v = vals[i];
		if (v != null) return v;
	}
	return 0;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const ProgressTrendsChart: React.FC<ProgressTrendsChartProps> = ({
	data: series,
	loading,
	error,
	period,
	onTogglePeriod,
	childName,
}) => {
	const { width: windowWidth } = useWindowDimensions();
	const chartW = Math.max(220, windowWidth - spacing.xl * 2 - spacing.md * 2);
	const plotW = chartW - LINE_PAD.l - LINE_PAD.r;
	const plotH = LINE_PLOT_H;
	const svgH = LINE_PAD.t + plotH + LINE_PAD.b;

	const n = series.length;

	// Plot only points that have data; nulls (e.g. future days) become gaps.
	const buildPts = (vals: (number | null)[]) =>
		vals.reduce<{ x: number; y: number }[]>((acc, v, i) => {
			if (v != null) {
				acc.push({
					x: LINE_PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW),
					y: LINE_PAD.t + (1 - v / 100) * plotH,
				});
			}
			return acc;
		}, []);

	const bsiPts = buildPts(series.map((d) => d.bsi));
	const pcPts = buildPts(series.map((d) => d.parentConsistency));
	const latestBsi = lastValue(series.map((d) => d.bsi));
	const latestPc = lastValue(series.map((d) => d.parentConsistency));

	const toStr = (pts: { x: number; y: number }[]) =>
		pts.map((p) => `${p.x},${p.y}`).join(' ');

	const lines = [
		{ pts: bsiPts, color: colors.primary, label: 'BSI Trend' },
		{ pts: pcPts, color: colors.growth, label: 'Parent Consistency' },
	];

	const showSkeleton = loading && series.length === 0;
	const showError = error && series.length === 0;
	const showEmpty = !loading && !error && series.length === 0;

	return (
		<Animated.View
			entering={FadeInDown.delay(320).springify().damping(18).stiffness(220)}
			style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
		>
			<Card variant="elevated" padding={spacing.md} style={s.trendCard}>
				<View style={s.trendHeader}>
					<View style={s.trendHeaderLeft}>
						<View style={s.trendIconWrap}>
							<Icon name="show-chart" size={16} color={colors.primary} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={shared.sectionEyebrow}>Momentum</Text>
							<Text style={s.sectionTitle}>Progress Trends</Text>
							<Text style={s.sectionSubtitle}>
								BSI vs Consistency
							</Text>
						</View>
					</View>
					{/* <View style={s.trendScorePill}>
						<Text style={s.trendScorePillLabel}>Now</Text>
						<Text style={s.trendScorePillValue}>{latest?.bsi ?? 0}</Text>
					</View> */}
					{/* Period toggle */}
					<View style={s.trendToggle}>
						<Pressable
							onPress={() => onTogglePeriod('weekly')}
							style={[
								s.trendToggleBtn,
								period === 'weekly' && s.trendToggleBtnActive,
							]}
						>
							<Text
								style={[
									s.trendToggleText,
									period === 'weekly' && s.trendToggleTextActive,
								]}
							>
								Weekly
							</Text>
						</Pressable>
						<Pressable
							onPress={() => onTogglePeriod('monthly')}
							style={[
								s.trendToggleBtn,
								period === 'monthly' && s.trendToggleBtnActive,
							]}
						>
							<Text
								style={[
									s.trendToggleText,
									period === 'monthly' && s.trendToggleTextActive,
								]}
							>
								Monthly
							</Text>
						</Pressable>
					</View>
				</View>



				<LinearGradient
					colors={['rgba(124,106,232,0.08)', 'rgba(182,215,251,0.08)']}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={s.chartPanel}
				>
					{showSkeleton ? (
							<View style={s.skeletonWrap}>
								<View style={s.metricChipsRow}>
									<SkeletonBox style={s.skeletonChip} height={30} radius={borderRadius.full} />
									<SkeletonBox style={s.skeletonChip} height={30} radius={borderRadius.full} />
								</View>
								<SkeletonBox width="100%" height={svgH} radius={borderRadius.large} style={{ marginTop: spacing.sm }} />
								<SkeletonShimmer />
							</View>
						) : showError || showEmpty ? (
							<View style={s.stateBody}>
								<Icon name={showError ? 'cloud-off' : 'show-chart'} size={26} color={colors.textMuted} />
								<Text style={s.stateText}>
									{showError ? 'Could not load trends. Pull to refresh.' : 'Not enough data to show trends yet.'}
								</Text>
							</View>
						) : (
						<>
						<View style={s.metricChipsRow}>
						<View style={s.metricChip}>
							<View style={[s.metricChipDot, { backgroundColor: colors.primary }]} />
							<Text style={s.metricChipLabel}>BSI</Text>
							<Text style={s.metricChipValue}>{latestBsi}%</Text>
						</View>
						<View style={s.metricChip}>
							<View style={[s.metricChipDot, { backgroundColor: colors.growth }]} />
							<Text style={s.metricChipLabel}>Consistency</Text>
							<Text style={s.metricChipValue}>{latestPc}%</Text>
						</View>
					</View>

					{/* SVG chart */}
					<View style={{ height: svgH }}>
						<Svg width={chartW} height={svgH}>
							{LINE_Y_TICKS.map((tick) => {
								const y = LINE_PAD.t + (1 - tick / 100) * plotH;
								return (
									<React.Fragment key={tick}>
										<Line
											x1={LINE_PAD.l}
											y1={y}
											x2={LINE_PAD.l + plotW}
											y2={y}
											stroke={colors.border}
											strokeWidth={0.5}
											strokeDasharray="4 6"
											opacity={0.85}
										/>
										<SvgText
											x={LINE_PAD.l - 6}
											y={y + 4}
											fontSize={10}
											fill={colors.textMuted}
											textAnchor="end"
										>
											{tick}
										</SvgText>
									</React.Fragment>
								);
							})}

							{lines.map(({ pts, color, label }) => (
								<React.Fragment key={label}>
									<Polyline
										points={toStr(pts)}
										fill="none"
										stroke={color}
										strokeWidth={2.5}
										strokeLinejoin="round"
										strokeLinecap="round"
										opacity={0.9}
									/>
									{pts.map((p, i) => (
										<Circle
											key={`${label}-${i}`}
											cx={p.x}
											cy={p.y}
											r={4}
											fill={color}
											stroke={colors.surface}
											strokeWidth={2}
										/>
									))}
								</React.Fragment>
							))}

							{series.map((d, i) => {
								const x = n <= 1 ? LINE_PAD.l + plotW / 2 : LINE_PAD.l + (i / (n - 1)) * plotW;
								return (
									<SvgText
										key={d.label}
										x={x}
										y={svgH - 6}
										fontSize={10}
										fill={colors.textSecondary}
										textAnchor="middle"
									>
										{d.label}
									</SvgText>
								);
							})}
						</Svg>
					</View>

					{/* Legend */}
					<View style={s.trendLegend}>
						{lines.map(({ color, label }) => (
							<View key={label} style={s.legendChip}>
								<View style={[s.legendDot, { backgroundColor: color }]} />
								<Text style={s.legendChipText}>{label}</Text>
							</View>
						))}
					</View>
									</>
						)}
					</LinearGradient>

				<View style={s.trendInsightCallout}>
					<Icon name="lightbulb" size={14} color={colors.accent} style={{ marginTop: 1 }} />
					<Text style={s.trendInsightText}>
						Parent consistency drives {childName}'s behaviour scores over time.
					</Text>
				</View>
			</Card>
		</Animated.View>
	);
};

export default React.memo(ProgressTrendsChart);

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
	trendCard: {
		// marginBottom: spacing.md,
		backgroundColor: 'rgba(255,255,255,0.96)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.05)',
	},
	trendHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: spacing.md,
	},
	trendHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
		flex: 1,
	},
	trendIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: 'rgba(124,106,232,0.08)',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	sectionTitle: {
		...textStyles.headingMedium,
		fontSize: 18,
		fontWeight: '800',
		color: colors.ink,
		letterSpacing: -0.3,
	},
	sectionSubtitle: {
		...textStyles.caption,
		color: colors.textSecondary,
		marginTop: 2,
	},
	trendScorePill: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: borderRadius.xl,
		backgroundColor: colors.lavenderSoft,
		alignItems: 'center',
		minWidth: 58,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.15)',
	},
	trendScorePillLabel: {
		...textStyles.caption,
		fontSize: 9,
		fontWeight: '700',
		color: colors.primary,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	trendScorePillValue: {
		fontSize: 20,
		fontWeight: '800',
		color: colors.primaryDark,
		letterSpacing: -0.4,
	},
	trendToggle: {
		flexDirection: 'row',
		alignSelf: 'flex-start',
		backgroundColor: colors.surfaceMuted,
		borderRadius: borderRadius.full,
		padding: 2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
		marginBottom: spacing.sm,
	},
	trendToggleBtn: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 5,
		borderRadius: borderRadius.full,
	},
	trendToggleBtnActive: {
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
	trendToggleText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.textMuted,
		letterSpacing: 0.2,
	},
	trendToggleTextActive: {
		color: colors.primary,
	},
	chartPanel: {
		borderRadius: borderRadius.xl,
		padding: spacing.sm + 2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.10)',
	},
	skeletonWrap: {
		position: 'relative',
		overflow: 'hidden',
		borderRadius: borderRadius.large,
	},
	skeletonChip: {
		flex: 1,
	},
	stateBody: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.lg,
	},
	stateText: {
		...textStyles.bodyMedium,
		fontSize: 13,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 19,
	},
	metricChipsRow: {
		flexDirection: 'row',
		gap: spacing.sm,
		marginBottom: spacing.sm,
	},
	metricChip: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs + 2,
		borderRadius: borderRadius.full,
		backgroundColor: 'rgba(255,255,255,0.85)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.04)',
	},
	metricChipDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	metricChipLabel: {
		...textStyles.caption,
		fontSize: 11,
		fontWeight: '700',
		color: colors.textSecondary,
		flex: 1,
	},
	metricChipValue: {
		fontSize: 12,
		fontWeight: '800',
		color: colors.ink,
	},
	trendLegend: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: spacing.md,
		marginTop: spacing.sm,
	},
	trendInsightCallout: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
		marginTop: spacing.md,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.sm,
		backgroundColor: 'rgba(232,160,74,0.06)',
		borderRadius: borderRadius.large,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(232,160,74,0.12)',
	},
	trendInsightText: {
		...textStyles.caption,
		fontSize: 12,
		color: colors.textSecondary,
		lineHeight: 17,
		flex: 1,
	},
	legendChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 5,
		paddingHorizontal: spacing.sm,
		borderRadius: borderRadius.full,
		backgroundColor: colors.surfaceMuted,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
	},
	legendDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	legendChipText: {
		...textStyles.caption,
		fontSize: 11,
		fontWeight: '700',
		color: colors.textPrimary,
	},
});
