import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { analyticsStyles as shared } from '../styles';
import { SkeletonBox, SkeletonShimmer } from '../../../components';
import type { SummaryStatsData } from '../../../types/summaryStats';

type SummaryPeriod = 'weekly' | 'monthly';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface SummaryStatsProps {
	counters: SummaryStatsData | null;
	loading: boolean;
	error: boolean;
	summaryPeriod: SummaryPeriod;
	onTogglePeriod: (period: SummaryPeriod) => void;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Constants                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const STAT_PILLS = [
	{ key: 'totalLogs', icon: 'article', color: colors.primary, bg: 'rgba(124,106,232,0.10)', label: 'Parent Logs' },
	{ key: 'activeDays', icon: 'calendar-today', color: colors.growth, bg: 'rgba(63,169,122,0.10)', label: 'Active Days' },
	{ key: 'totalEntries', icon: 'list-alt', color: colors.accent, bg: 'rgba(232,160,74,0.10)', label: 'Total Entries' },
	{ key: 'streak', icon: 'local-fire-department', color: '#E85D5D', bg: 'rgba(232,93,93,0.10)', label: 'Day Streak' },
] as const;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const SummaryStats: React.FC<SummaryStatsProps> = ({
	counters,
	loading,
	error,
	summaryPeriod,
	onTogglePeriod,
}) => {
	const showSkeleton = loading && !counters;
	return (
		<Animated.View
			entering={FadeInDown.delay(400).springify().damping(18).stiffness(220)}
			style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
		>
			<View style={s.summaryWrap}>
				<View style={s.headerRow}>
					<View style={s.titleRow}>
						<Text style={shared.sectionEyebrow}>Activity snapshot</Text>
						<Text style={s.summaryTitle}>
							{summaryPeriod === 'weekly' ? 'This week at a glance' : 'This month at a glance'}
						</Text>
					</View>
					<View style={s.bsiToggle}>
						<Pressable
							onPress={() => onTogglePeriod('weekly')}
							style={[
								s.bsiToggleBtn,
								summaryPeriod === 'weekly' && s.bsiToggleBtnActive,
							]}
						>
							<Text
								style={[
									s.bsiToggleText,
									summaryPeriod === 'weekly' && s.bsiToggleTextActive,
								]}
							>
								Weekly
							</Text>
						</Pressable>
						<Pressable
							onPress={() => onTogglePeriod('monthly')}
							style={[
								s.bsiToggleBtn,
								summaryPeriod === 'monthly' && s.bsiToggleBtnActive,
							]}
						>
							<Text
								style={[
									s.bsiToggleText,
									summaryPeriod === 'monthly' && s.bsiToggleTextActive,
								]}
							>
								Monthly
							</Text>
						</Pressable>
					</View>
				</View>

				<View style={s.statPillsRow}>
					{STAT_PILLS.map((pill) => (
						<View key={pill.key} style={s.statPill}>
							<View style={[s.statPillIconWrap, { backgroundColor: pill.bg }]}>
								<Icon name={pill.icon} size={18} color={pill.color} />
							</View>
							{showSkeleton ? (
								<SkeletonBox width={28} height={22} radius={6} style={s.statPillSkeleton} />
							) : (
								<Text style={s.statPillValue}>{counters ? counters[pill.key] : '—'}</Text>
							)}
							<Text style={s.statPillLabel}>{pill.label}</Text>
						</View>
					))}
					{showSkeleton ? <SkeletonShimmer /> : null}
				</View>

				{error && !counters ? (
					<Text style={s.errorNote}>Could not load stats. Pull to refresh.</Text>
				) : null}
			</View>
		</Animated.View>
	);
};

export default React.memo(SummaryStats);

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
	summaryWrap: {
		// marginBottom: spacing.md,
		padding: spacing.md,
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		overflow: 'hidden',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
	},
	summaryTitle: {
		...textStyles.headingMedium,
		fontSize: 18,
		fontWeight: '800',
		color: colors.ink,
		letterSpacing: -0.3,
		marginBottom: spacing.md,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: spacing.xs,
	},
	titleRow: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		// gap: 6,
		flex: 1,
	},
	statPillsRow: {
		flexDirection: 'row',
		gap: spacing.sm,
		flexWrap: 'wrap',
		position: 'relative',
	},
	statPillSkeleton: {
		marginVertical: 4,
	},
	errorNote: {
		...textStyles.caption,
		fontSize: 11,
		color: colors.textMuted,
		textAlign: 'center',
		marginTop: spacing.sm,
	},
	statPill: {
		flex: 1,
		minWidth: 50,
		backgroundColor: 'rgba(255,255,255,0.96)',
		borderRadius: borderRadius.xl,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
		gap: 2,
		...Platform.select({
			ios: {
				shadowColor: colors.ink,
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.06,
				shadowRadius: 12,
			},
			android: { elevation: 3 },
			default: {},
		}),
	},
	statPillIconWrap: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 2,
	},
	statPillValue: {
		fontSize: 22,
		fontWeight: '800',
		color: colors.ink,
		letterSpacing: -0.5,
	},
	statPillLabel: {
		...textStyles.caption,
		fontSize: 10,
		fontWeight: '700',
		color: colors.textSecondary,
		textAlign: 'center',
		letterSpacing: 0.1,
		lineHeight: 12
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
});
