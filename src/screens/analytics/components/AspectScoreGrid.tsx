import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { RoundGauge } from './gauges';
import { SkeletonBox, SkeletonShimmer } from '../../../components';
import type { AspectScore } from '../../../types/aspectScore';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface AspectScoreGridProps {
	aspects: AspectScore[];
	loading: boolean;
	error: boolean;
	period: 'weekly' | 'monthly';
	onTogglePeriod: (period: 'weekly' | 'monthly') => void;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const SectionHeader: React.FC<{
	period: 'weekly' | 'monthly';
	onTogglePeriod: (period: 'weekly' | 'monthly') => void;
}> = ({ period, onTogglePeriod }) => (
	<View style={s.sectionHeaderRow}>
		<View style={s.headerLeft}>
			<View style={s.sectionIconWrap}>
				<Icon name="grid-view" size={16} color={colors.primary} />
			</View>
			<View>
				<Text style={s.sectionTitle}>Aspect Scores</Text>
				<Text style={s.sectionSubtitle}>
					{period === 'weekly' ? "This week's breakdown" : "This month's breakdown"}
				</Text>
			</View>
		</View>
		<View style={s.toggle}>
			<Pressable
				onPress={() => onTogglePeriod('weekly')}
				style={[s.toggleBtn, period === 'weekly' && s.toggleBtnActive]}
			>
				<Text style={[s.toggleText, period === 'weekly' && s.toggleTextActive]}>Weekly</Text>
			</Pressable>
			<Pressable
				onPress={() => onTogglePeriod('monthly')}
				style={[s.toggleBtn, period === 'monthly' && s.toggleBtnActive]}
			>
				<Text style={[s.toggleText, period === 'monthly' && s.toggleTextActive]}>Monthly</Text>
			</Pressable>
		</View>
	</View>
);

const AspectScoreGrid: React.FC<AspectScoreGridProps> = ({
	aspects,
	loading,
	error,
	period,
	onTogglePeriod,
}) => {
	const row1 = aspects.slice(0, 3);
	const row2 = aspects.slice(3, 5);

	return (
		<Animated.View
			entering={FadeInDown.delay(160).springify().damping(18).stiffness(220)}
			style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
		>
			<View style={s.sectionWrap}>
				<SectionHeader period={period} onTogglePeriod={onTogglePeriod} />

				{loading && aspects.length === 0 ? (
					<AspectGridSkeleton />
				) : aspects.length === 0 ? (
					<View style={s.emptyBody}>
						<Icon name={error ? 'cloud-off' : 'grid-view'} size={26} color={colors.textMuted} />
						<Text style={s.emptyText}>
							{error
								? 'Could not load aspect scores. Pull to refresh.'
								: 'No aspect scores available yet.'}
						</Text>
					</View>
				) : (
					<>
						{/* Row 1: 3 columns */}
						<View style={s.gridRow}>
							{row1.map((aspect, idx) => (
								<View key={aspect.id} style={s.aspectCol}>
									{idx > 0 && <View style={s.colDivider} />}
									<AspectTile aspect={aspect} animDelay={idx * 80} />
								</View>
							))}
						</View>

						{/* Horizontal divider between rows */}
						{row2.length > 0 ? <View style={s.rowDivider} /> : null}

						{/* Row 2: 2 columns */}
						{row2.length > 0 ? (
							<View style={s.gridRow}>
								{row2.map((aspect, idx) => (
									<View key={aspect.id} style={s.aspectCol}>
										{idx > 0 && <View style={s.colDivider} />}
										<AspectTile aspect={aspect} animDelay={idx * 80} />
									</View>
								))}
								<View style={s.aspectCol}>
									<View style={s.colDivider} />
								</View>
							</View>
						) : null}
					</>
				)}
			</View>
		</Animated.View>
	);
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Skeleton                                                          */
/* ═══════════════════════════════════════════════════════════════════ */
const AspectTileSkeleton: React.FC = () => (
	<View style={s.aspectBody}>
		<SkeletonBox width={38} height={38} radius={19} />
		<SkeletonBox width="70%" height={11} radius={4} style={{ marginTop: spacing.sm }} />
		<SkeletonBox width={64} height={64} radius={32} style={{ marginTop: spacing.sm }} />
		<SkeletonBox width={56} height={16} radius={borderRadius.full} style={{ marginTop: spacing.sm }} />
	</View>
);

const AspectGridSkeleton: React.FC = () => (
	<View>
		<View style={s.gridRow}>
			{[0, 1, 2].map((i) => (
				<View key={i} style={s.aspectCol}>
					<AspectTileSkeleton />
				</View>
			))}
		</View>
		<View style={s.rowDivider} />
		<View style={s.gridRow}>
			{[0, 1].map((i) => (
				<View key={i} style={s.aspectCol}>
					<AspectTileSkeleton />
				</View>
			))}
			<View style={s.aspectCol} />
		</View>
		<SkeletonShimmer />
	</View>
);

export default React.memo(AspectScoreGrid);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Single Aspect Tile                                                */
/* ═══════════════════════════════════════════════════════════════════ */
interface AspectTileProps {
	aspect: AspectScore;
	animDelay: number;
}

const AspectTile: React.FC<AspectTileProps> = React.memo(({
	aspect,
	animDelay,
}) => {
	const trendColor = aspect.change >= 0 ? colors.growth : colors.error;

	return (
		<View style={[s.aspectCard]}>
			{/* Top accent bar */}
			{/* <View style={[s.aspectTopAccent, { backgroundColor: aspect.accent }]} /> */}

			{/* Card body */}
			<View style={s.aspectBody}>
				{/* Icon */}
				<View
					style={[
						s.aspectIconWrap,
						{ backgroundColor: `${aspect.accent}28` },
					]}
				>
					<Icon name={aspect.iconName} size={20} color={aspect.accent} />
				</View>

				{/* Name */}
				<Text style={s.aspectName} numberOfLines={2}>
					{aspect.name}
				</Text>

				{/* Gauge */}
				<RoundGauge
					percent={aspect.score}
					size={64}
					strokeWidth={7}
					fillColor={aspect.accent}
					trackColor={aspect.softBg}
					delay={animDelay}
				/>

				{/* Trend indicator */}
				<View style={[s.aspectTrendPill, { backgroundColor: `${trendColor}14` }]}>
					<Text style={[s.aspectTrendText, { color: trendColor }]}>This Week</Text>
					<Icon
						name={aspect.change >= 0 ? 'trending-up' : 'trending-down'}
						size={12}
						color={trendColor}
					/>
					<Text style={[s.aspectTrendText, { color: trendColor }]}>
						{aspect.change}%
					</Text>
				</View>
			</View>
		</View>
	);
});

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
	sectionWrap: {
		// flexDirection: 'row',
		padding: spacing.md,
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		overflow: 'hidden',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: spacing.md,
	},
	headerLeft: {
		flex: 1,
		marginRight: spacing.sm,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	sectionIconWrap: {
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

	/* Toggle */
	toggle: {
		flexDirection: 'row',
		backgroundColor: colors.surfaceMuted,
		borderRadius: borderRadius.full,
		padding: 2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
	},
	toggleBtn: {
		paddingHorizontal: spacing.sm,
		paddingVertical: 5,
		borderRadius: borderRadius.full,
	},
	toggleBtnActive: {
		backgroundColor: colors.surface,
		...Platform.select({
			ios: {
				shadowColor: colors.ink,
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.08,
				shadowRadius: 4,
			},
			android: { elevation: 2 },
			default: {},
		}),
	},
	toggleText: {
		fontSize: 11,
		fontWeight: '700',
		color: colors.textMuted,
		letterSpacing: 0.2,
	},
	toggleTextActive: {
		color: colors.primary,
	},

	/* Grid */
	gridRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6
	},
	aspectCol: {
		flex: 1,
		position: 'relative',
	},
	colDivider: {
		position: 'absolute',
		left: -3,
		top: spacing.md,
		bottom: spacing.md,
		width: StyleSheet.hairlineWidth,
		// width: 5,

		backgroundColor: 'rgba(17,17,17,0.10)',
		zIndex: 1,
	},
	rowDivider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: 'rgba(17,17,17,0.08)',
		marginVertical: spacing.sm,
		marginHorizontal: spacing.md,
	},

	/* Tile (sits inside the unified section card — no own border/shadow) */
	aspectCard: {
		flex: 1,
		overflow: 'hidden',
	},
	aspectTopAccent: {
		height: 3,
		width: '100%',
	},
	aspectBody: {
		paddingHorizontal: spacing.xs,
		paddingTop: spacing.sm + 4,
		paddingBottom: spacing.sm + 4,
		alignItems: 'center',
	},
	aspectIconWrap: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.xs,
	},
	aspectName: {
		fontSize: 12,
		fontWeight: '500',
		color: colors.ink,
		letterSpacing: -0.15,
		textAlign: 'center',
		marginBottom: spacing.xs,
		width: '100%',
	},
	aspectTrendPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: spacing.xs,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
		borderRadius: borderRadius.full,
	},
	aspectTrendText: {
		fontSize: 9,
		fontWeight: '700',
		letterSpacing: 0.1,
	},
	emptyBody: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
		paddingVertical: spacing.xl,
		paddingHorizontal: spacing.lg,
	},
	emptyText: {
		...textStyles.bodyMedium,
		fontSize: 13,
		color: colors.textSecondary,
		textAlign: 'center',
		lineHeight: 19,
	},
});
