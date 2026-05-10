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
import type { SdsAnalytics, StrengthWeakness } from '../../../data/analyticsData';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface BSIGaugeCardProps {
	bsi: SdsAnalytics;
	childName: string;
	weakAreas: StrengthWeakness['weakAreas'];
	bsiPeriod: 'weekly' | 'monthly';
	onTogglePeriod: (period: 'weekly' | 'monthly') => void;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const BSIGaugeCard: React.FC<BSIGaugeCardProps> = ({
	bsi,
	childName,
	weakAreas,
	bsiPeriod,
	onTogglePeriod,
}) => {
	const bsiColor = scoreColor(bsi.percent);

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
						<View style={s.bsiToggle}>
							<Pressable
								onPress={() => onTogglePeriod('weekly')}
								style={[
									s.bsiToggleBtn,
									bsiPeriod === 'weekly' && s.bsiToggleBtnActive,
								]}
							>
								<Text
									style={[
										s.bsiToggleText,
										bsiPeriod === 'weekly' && s.bsiToggleTextActive,
									]}
								>
									Weekly
								</Text>
							</Pressable>
							<Pressable
								onPress={() => onTogglePeriod('monthly')}
								style={[
									s.bsiToggleBtn,
									bsiPeriod === 'monthly' && s.bsiToggleBtnActive,
								]}
							>
								<Text
									style={[
										s.bsiToggleText,
										bsiPeriod === 'monthly' && s.bsiToggleTextActive,
									]}
								>
									Monthly
								</Text>
							</Pressable>
						</View>
					</View>

					{/* Gauge */}
					<View style={s.gaugeStage}>
						<View style={s.bsiGaugeWrap}>
							<SemiCircleGauge
								percent={bsi.percent}
								size={196}
								strokeWidth={16}
								fillColor={bsiColor}
								trackColor="rgba(17,17,17,0.05)"
							/>
							{/* Center overlay */}
							<View style={s.bsiCenterOverlay}>
								<AnimatedNumber
									value={bsi.percent}
									suffix="%"
									delay={200}
									duration={1200}
									style={[s.bsiBigNumber, { color: bsiColor, textAlign: 'center' }]}
								/>
								<View style={s.bsiLabelRow}>
									<Icon
										name={
											bsi.trend > 0
												? 'trending-up'
												: bsi.trend < 0
													? 'trending-down'
													: 'trending-flat'
										}
										size={16}
										color={bsiColor}
									/>
									<Text style={[s.bsiLabelText, { color: bsiColor }]}>
										{scoreLabel(bsi.percent)}
									</Text>
								</View>
							</View>
						</View>
					</View>

					{/* Bottom info */}
					<View style={s.bsiBottomRow}>
						<View style={[s.bsiTrendPill, { backgroundColor: scoreBg(bsi.percent) }]}>
							<Text style={[s.bsiTrendText, { color: bsiColor }]}>
								This Week
							</Text>
							<Icon
								name={bsi.trend > 0 ? 'trending-up' : bsi.trend < 0 ? 'trending-down' : 'trending-flat'}
								size={14}
								color={bsiColor}
							/>
							<Text style={[s.bsiTrendText, { color: bsiColor }]}>
								{bsi.trend}%
							</Text>
						</View>
					</View>

					{/* AI insight line */}
					<View style={s.bsiInsightWrap}>
						<Icon name="auto-awesome" size={14} color={colors.primary} style={{ marginTop: 1 }} />
						<Text style={s.bsiInsightLine}>
							{childName} is doing well. Focus on{' '}
							<Text style={{ fontWeight: '800', color: colors.primaryDark }}>
								{weakAreas.length > 0 ? weakAreas[0].name : 'all areas'}
							</Text>
							.
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
});
