import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '../../../components';
import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { analyticsStyles as shared } from '../styles';
import type {
	GuidanceItem,
	BadgeItem,
	StrengthWeakness,
} from '../../../data/analyticsData';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface InsightsSectionProps {
	guidance: GuidanceItem[];
	strengthsWeaknesses: StrengthWeakness;
	badges: BadgeItem[];
	childName: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Look-up maps                                                      */
/* ═══════════════════════════════════════════════════════════════════ */
const ICON_MAP: Record<GuidanceItem['type'], string> = {
	tip: 'lightbulb',
	warning: 'warning-amber',
	suggestion: 'psychology',
};
const COLOR_MAP: Record<GuidanceItem['type'], string> = {
	tip: colors.growth,
	warning: colors.warning,
	suggestion: colors.primary,
};
const BG_MAP: Record<GuidanceItem['type'], string> = {
	tip: colors.mintSoft,
	warning: colors.peachSoft,
	suggestion: colors.lavenderSoft,
};
const BORDER_MAP: Record<GuidanceItem['type'], string> = {
	tip: 'rgba(63, 169, 122, 0.25)',
	warning: 'rgba(232, 160, 74, 0.3)',
	suggestion: 'rgba(124, 106, 232, 0.25)',
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const InsightsSection: React.FC<InsightsSectionProps> = ({
	guidance,
	strengthsWeaknesses: sw,
	// Still received from AnalyticsScreen, but unused while section 7c is hidden.
	// Rename back to `badges` when un-commenting that block.
	badges: _badges,
	childName,
}) => {
	return (
		<>
			{/* 7a. AI Insights / Guidance */}
			<Animated.View
				entering={FadeInDown.delay(480).springify().damping(18).stiffness(220)}
				style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
			>
				<Card variant="elevated" padding={spacing.md} style={s.insightCard}>
					<View style={shared.insightHeader}>
						<View style={[shared.insightIconWrap, { backgroundColor: colors.primaryLight }]}>
							<Icon name="auto-awesome" size={20} color={colors.primaryDark} />
						</View>
						<View style={shared.insightHeaderText}>
							<Text style={shared.insightTitle}>AI Insights</Text>
							<Text style={shared.insightSubtitle}>
								Personalized tips based on recent data
							</Text>
						</View>
					</View>

					{guidance.map((item, idx) => (
						<View
							key={item.id}
							style={[
								s.guidanceItem,
								{
									backgroundColor: BG_MAP[item.type],
									borderColor: BORDER_MAP[item.type],
								},
								idx === guidance.length - 1 && { marginBottom: 0 },
							]}
						>
							<View
								style={[
									s.guidanceItemIcon,
									{
										backgroundColor: colors.surface,
										borderColor: BORDER_MAP[item.type],
									},
								]}
							>
								<Icon
									name={ICON_MAP[item.type]}
									size={18}
									color={COLOR_MAP[item.type]}
								/>
							</View>
							<View style={s.guidanceItemText}>
								<Text style={s.guidanceItemTitle}>{item.title}</Text>
								<Text style={s.guidanceItemMsg}>{item.message}</Text>
							</View>
						</View>
					))}
				</Card>
			</Animated.View>

			{/* 7b. Strengths & Growth Areas */}
			<Animated.View
				entering={FadeInDown.delay(560).springify().damping(18).stiffness(220)}
				style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
			>
				<Card variant="elevated" padding={spacing.md} style={s.insightCard}>
					<View style={shared.insightHeader}>
						<View style={[shared.insightIconWrap, { backgroundColor: colors.growthLight }]}>
							<Icon name="insights" size={20} color={colors.growth} />
						</View>
						<View style={shared.insightHeaderText}>
							<Text style={shared.insightTitle}>Strengths & Growth Areas</Text>
							<Text style={shared.insightSubtitle}>
								How {childName} is doing across key behaviours
							</Text>
						</View>
					</View>

					{/* Strengths */}
					{sw.strengths.length > 0 && (
						<View style={s.swBlock}>
							<View style={s.swLabelRow}>
								<Icon name="check-circle" size={16} color={colors.growth} />
								<Text style={[s.swLabel, { color: '#145A3D' }]}>Strengths</Text>
							</View>
							<Text style={s.swSummary}>{sw.strengthSummary}</Text>
							<View style={s.swChips}>
								{sw.strengths.map((item) => (
									<View
										key={item.id}
										style={[
											s.swChip,
											{ backgroundColor: item.softBg, borderColor: item.borderColor },
										]}
									>
										<Icon name={item.iconName} size={14} color={item.accent} />
										<Text style={[s.swChipText, { color: item.accent }]}>
											{item.name} · {item.score}%
										</Text>
									</View>
								))}
							</View>
						</View>
					)}

					{/* Weak areas */}
					{sw.weakAreas.length > 0 && (
						<View style={[s.swBlock, s.swBlockWeak]}>
							<View style={s.swLabelRow}>
								<Icon name="flag" size={16} color={colors.warning} />
								<Text style={[s.swLabel, { color: '#8B4514' }]}>Needs Focus</Text>
							</View>
							<Text style={s.swSummary}>{sw.weakSummary}</Text>
							<View style={s.swChips}>
								{sw.weakAreas.map((item) => (
									<View
										key={item.id}
										style={[
											s.swChip,
											{
												backgroundColor: colors.peachSoft,
												borderColor: 'rgba(232, 160, 74, 0.35)',
											},
										]}
									>
										<Icon name={item.iconName} size={14} color={colors.warning} />
										<Text style={[s.swChipText, { color: '#8B4514' }]}>
											{item.name} · {item.score}%
										</Text>
									</View>
								))}
							</View>
						</View>
					)}
				</Card>
			</Animated.View>

			{/*
				7c. Badges & Achievements — TEMPORARILY HIDDEN.
				Badges now live on their own screen (BadgesScreen). Uncomment this
				block to bring the section back; the `badges` prop, its type and the
				badge styles below are all still in place.

			<Animated.View
				entering={FadeInDown.delay(640).springify().damping(18).stiffness(220)}
				style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
			>
				<Card variant="elevated" padding={spacing.md} style={s.badgesCard}>
					<View style={shared.insightHeader}>
						<View style={[shared.insightIconWrap, { backgroundColor: colors.accentLight }]}>
							<Icon name="military-tech" size={20} color={colors.accent} />
						</View>
						<View style={shared.insightHeaderText}>
							<Text style={shared.insightTitle}>Badges & Achievements</Text>
							<Text style={shared.insightSubtitle}>
								{badges.filter((b) => b.earned).length} of {badges.length} unlocked
							</Text>
						</View>
					</View>

					<View style={s.badgesGrid}>
						{badges.map((badge) => (
							<View
								key={badge.id}
								style={[
									s.badgeTile,
									!badge.earned && s.badgeTileLocked,
								]}
							>
								<View
									style={[
										s.badgeIconCircle,
										{
											backgroundColor: badge.earned
												? `${badge.color}22`
												: colors.surfaceMuted,
											borderColor: badge.earned
												? `${badge.color}55`
												: colors.border,
										},
									]}
								>
									<Icon
										name={badge.iconName}
										size={22}
										color={badge.earned ? badge.color : colors.textMuted}
									/>
								</View>
								<Text
									style={[
										s.badgeLabel,
										!badge.earned && s.badgeLabelLocked,
									]}
									numberOfLines={2}
								>
									{badge.label}
								</Text>
								<Text style={s.badgeDesc} numberOfLines={2}>
									{badge.description}
								</Text>
								{!badge.earned && (
									<View style={s.lockedChip}>
										<Icon name="lock" size={10} color={colors.textMuted} />
										<Text style={s.lockedChipText}>Locked</Text>
									</View>
								)}
							</View>
						))}
					</View>
				</Card>
			</Animated.View>
			*/}
		</>
	);
};

export default React.memo(InsightsSection);

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
	insightCard: {
		// marginBottom: spacing.sm,
		backgroundColor: 'rgba(255,255,255,0.96)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.05)',
	},
	topGradient: {
		borderRadius: borderRadius.xl,
		padding: 0,
	},

	/* Guidance items */
	guidanceItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.sm,
		padding: spacing.md,
		borderRadius: borderRadius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: spacing.sm,
	},
	guidanceItemIcon: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: StyleSheet.hairlineWidth,
	},
	guidanceItemText: {
		flex: 1,
		minWidth: 0,
	},
	guidanceItemTitle: {
		...textStyles.bodyLarge,
		fontSize: 14,
		fontWeight: '800',
		color: colors.ink,
		marginBottom: 3,
	},
	guidanceItemMsg: {
		...textStyles.bodyMedium,
		fontSize: 13,
		color: colors.textPrimary,
		lineHeight: 19,
	},

	/* Strengths / Weak areas */
	swBlock: {
		backgroundColor: colors.mintSoft,
		borderRadius: borderRadius.large,
		padding: spacing.md,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(63, 169, 122, 0.25)',
		marginBottom: spacing.sm,
	},
	swBlockWeak: {
		backgroundColor: colors.peachSoft,
		borderColor: 'rgba(232, 160, 74, 0.3)',
		marginBottom: 0,
	},
	swLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.xs,
		marginBottom: spacing.xs,
	},
	swLabel: {
		fontSize: 14,
		fontWeight: '800',
		letterSpacing: -0.2,
	},
	swSummary: {
		...textStyles.bodyMedium,
		fontSize: 13,
		color: colors.textPrimary,
		lineHeight: 19,
		marginBottom: spacing.sm,
	},
	swChips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	swChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: spacing.sm,
		paddingVertical: 5,
		borderRadius: borderRadius.full,
		borderWidth: StyleSheet.hairlineWidth,
	},
	swChipText: {
		fontSize: 12,
		fontWeight: '700',
	},

	/* Badges */
	badgesCard: {
		marginBottom: spacing.sm,
		backgroundColor: 'rgba(255,255,255,0.96)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.05)',
	},
	badgesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	badgeTile: {
		width: '47%',
		backgroundColor: '#FDFCFF',
		borderRadius: borderRadius.xl,
		padding: spacing.md,
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124,106,232,0.10)',
	},
	badgeTileLocked: {
		opacity: 0.45,
		backgroundColor: colors.surfaceMuted,
		borderColor: 'rgba(17,17,17,0.06)',
	},
	badgeIconCircle: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		marginBottom: spacing.sm,
	},
	badgeLabel: {
		...textStyles.bodyMedium,
		fontSize: 13,
		fontWeight: '800',
		color: colors.ink,
		textAlign: 'center',
		marginBottom: 3,
		letterSpacing: -0.1,
	},
	badgeLabelLocked: {
		color: colors.textMuted,
	},
	badgeDesc: {
		...textStyles.caption,
		fontSize: 11,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 15,
	},
	lockedChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingVertical: 3,
		borderRadius: borderRadius.full,
		backgroundColor: colors.surfaceMuted,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
	},
	lockedChipText: {
		fontSize: 9,
		fontWeight: '700',
		color: colors.textMuted,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
});
