import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { scoreColor } from '../utils';
import { SemiCircleGauge, AnimatedNumber } from './gauges';
import type {
	FamilyScoreData,
	TrustMeterData,
	ParentConsistencyData,
} from '../../../data/analyticsData';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface SupportGaugesProps {
	familyScore: FamilyScoreData;
	trust: TrustMeterData;
	parentConsistency: ParentConsistencyData;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const SupportGauges: React.FC<SupportGaugesProps> = ({
	familyScore: fs,
	trust,
	parentConsistency: pc,
}) => {
	const gauges = [
		{
			value: fs.score,
			label: 'FS',
			sublabel: fs.subtitle,
			delay: 100,
			trendIcon: fs.trend >= 0 ? 'trending-up' : 'trending-down',
			trendText: `${fs.trend}%`,
			trendColor: fs.trend >= 0 ? colors.growth : colors.error,
			labelColor: undefined,
			accentColor: colors.primary,
			icon: 'family-restroom',
		},
		{
			value: trust.level,
			label: 'Trust Meter',
			sublabel: trust.subtitle,
			delay: 200,
			trendIcon: trust.trend > 0 ? 'favorite' : trust.trend < 0 ? 'heart-broken' : 'favorite-border',
			trendText: trust.trend === 0 ? '0%' : trust.trend > 0 ? `+${trust.trend}%` : `${trust.trend}%`,
			trendColor: trust.trend >= 0 ? colors.growth : colors.error,
			labelColor: undefined,
			accentColor: colors.accent,
			icon: 'favorite',
		},
		{
			value: pc.score,
			label: 'PCS',
			sublabel: pc.subtitle,
			delay: 300,
			trendIcon: pc.trend >= 0 ? 'trending-up' : 'trending-down',
			trendText: `${pc.trend}%`,
			trendColor: pc.trend >= 0 ? colors.growth : colors.error,
			labelColor: undefined,
			accentColor: colors.growth,
			icon: 'verified',
		},
	];

	return (
		<Animated.View
			entering={FadeInDown.delay(80).springify().damping(18).stiffness(220)}
			style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
		>
			<View style={s.kpiRow}>
				{gauges.map((g, idx) => (
					<View key={g.label} style={s.kpiCard}>
						{idx > 0 && <View style={s.kpiCardDivider} />}
						<View style={s.kpiCardBody}>
							<SemiCircleGauge
								percent={g.value}
								size={90}
								strokeWidth={10}
								fillColor={scoreColor(g.value)}
								delay={g.delay}
							/>
							<View style={s.kpiCenterOverlay}>
								<AnimatedNumber
									value={g.value}
									suffix="%"
									delay={g.delay}
									duration={1100}
									style={[s.kpiValue, { color: scoreColor(g.value), textAlign: 'center' }]}
								/>
							</View>
							<Text style={[s.kpiLabel, g.labelColor ? { color: g.labelColor } : undefined]}>
								{g.label}
							</Text>
							<Text style={s.kpiSublabel} numberOfLines={2}>{g.sublabel}</Text>
							<View style={[s.kpiTrendPill, { backgroundColor: `${g.trendColor}12` }]}>
								{g.label != 'Trust Meter' && <Text style={[s.kpiTrendText, { color: g.trendColor }]}>This Week</Text>}
								<Icon name={g.trendIcon} size={11} color={g.trendColor} />
								<Text style={[s.kpiTrendText, { color: g.trendColor }]}>
									{g.trendText}
								</Text>
							</View>
						</View>
					</View>
				))}
			</View>
		</Animated.View >
	);
};

export default React.memo(SupportGauges);

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
	kpiRow: {
		flexDirection: 'row',
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		overflow: 'hidden',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.06)',
	},
	kpiCard: {
		flex: 1,
		position: 'relative',
	},
	kpiCardDivider: {
		position: 'absolute',
		left: 0,
		top: spacing.md,
		bottom: spacing.md,
		width: StyleSheet.hairlineWidth,
		backgroundColor: 'rgba(17,17,17,0.10)',
	},
	kpiAccentBar: {
		height: 3,
		width: '100%',
	},
	kpiCardBody: {
		padding: spacing.sm,
		paddingVertical: spacing.md,
		alignItems: 'center',
		// backgroundColor: 'red'
	},
	kpiCenterOverlay: {
		position: 'absolute',
		top: spacing.md + 3 + 28,
		alignItems: 'center',
		marginBottom: 10
	},
	kpiValue: {
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: -0.5,
		marginBottom: 5
	},
	kpiLabel: {
		...textStyles.caption,
		fontWeight: '800',
		color: colors.ink,
		textAlign: 'center',
		marginTop: 2,
		fontSize: 11,
		letterSpacing: -0.1,
	},
	kpiSublabel: {
		fontSize: 9,
		color: colors.textMuted,
		textAlign: 'center',
		marginTop: 2,
		letterSpacing: 0.1,
	},
	kpiTrendPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 6,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
		borderRadius: borderRadius.full,
	},
	kpiTrendText: {
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.1,
	},
});
