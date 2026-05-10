import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
	FadeInDown,
	Easing,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius } from '../../../theme';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
interface FABReportsProps {
	bottom: number;
	onMonthlyReportPress?: () => void;
	onGoalWiseReportPress?: () => void;
}

const ACTIONS = [
	{
		key: 'monthly',
		label: 'Download Monthly Report',
		icon: 'picture-as-pdf',
		tint: colors.error,
		bg: '#FFF4F4',
		border: 'rgba(232, 93, 93, 0.18)',
	},
	{
		key: 'goalwise',
		label: 'Download Goal-wise Report',
		icon: 'assignment',
		tint: colors.primary,
		bg: colors.lavenderSoft,
		border: 'rgba(124, 106, 232, 0.2)',
	},
] as const;

const FABReports: React.FC<FABReportsProps> = ({
	bottom,
	onMonthlyReportPress,
	onGoalWiseReportPress,
}) => {
	const [expanded, setExpanded] = React.useState(false);
	const progress = useSharedValue(0);

	React.useEffect(() => {
		progress.value = expanded
			? withSpring(1, { damping: 18, stiffness: 220 })
			: withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
	}, [expanded, progress]);

	const toggleMenu = React.useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
		setExpanded((prev) => !prev);
	}, []);

	const closeMenu = React.useCallback(() => {
		setExpanded(false);
	}, []);

	const runAction = React.useCallback(
		(actionKey: (typeof ACTIONS)[number]['key']) => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
			closeMenu();
			if (actionKey === 'monthly') {
				onMonthlyReportPress?.();
				return;
			}
			onGoalWiseReportPress?.();
		},
		[closeMenu, onGoalWiseReportPress, onMonthlyReportPress]
	);

	const fabIconStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${progress.value * 45}deg` }],
	}));

	const downloadIconStyle = useAnimatedStyle(() => ({
		opacity: 1 - progress.value,
		transform: [
			{ scale: 1 - progress.value * 0.18 },
			{ rotate: `${progress.value * -90}deg` },
		],
	}));

	const closeIconStyle = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [
			{ scale: 0.82 + progress.value * 0.18 },
			{ rotate: `${(1 - progress.value) * 90}deg` },
		],
	}));

	return (
		<View style={StyleSheet.absoluteFill} pointerEvents="box-none">
			{expanded ? (
				<Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
			) : null}

			<Animated.View
				entering={FadeInDown.delay(720).springify().damping(18).stiffness(220)}
				pointerEvents="box-none"
				style={[s.container, { bottom }]}
			>
				<View style={s.actionsWrap} pointerEvents={expanded ? 'auto' : 'none'}>
					{ACTIONS.map((action, index) => (
						<ActionButton
							key={action.key}
							index={index}
							progress={progress}
							label={action.label}
							icon={action.icon}
							tint={action.tint}
							backgroundColor={action.bg}
							borderColor={action.border}
							onPress={() => runAction(action.key)}
						/>
					))}
				</View>

				<Pressable
					onPress={toggleMenu}
					style={({ pressed }) => [s.fab, pressed && s.fabPressed]}
					accessibilityRole="button"
					accessibilityLabel={expanded ? 'Collapse reports menu' : 'Expand reports menu'}
					android_ripple={{ color: 'rgba(255,255,255,0.22)', borderless: true }}
				>
					<LinearGradient
						colors={[colors.primary, colors.primaryDark]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={s.fabGradient}
					>
						<View style={s.fabIconStack}>
							<Animated.View style={[s.fabIconLayer, downloadIconStyle]}>
								<Icon name="file-download" size={26} color="#FFF" />
							</Animated.View>
							<Animated.View style={[s.fabIconLayer, fabIconStyle, closeIconStyle]}>
								<Icon name="close" size={24} color="#FFF" />
							</Animated.View>
						</View>
					</LinearGradient>
				</Pressable>
			</Animated.View>
		</View>
	);
};

interface ActionButtonProps {
	index: number;
	progress: SharedValue<number>;
	label: string;
	icon: string;
	tint: string;
	backgroundColor: string;
	borderColor: string;
	onPress: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
	index,
	progress,
	label,
	icon,
	tint,
	backgroundColor,
	borderColor,
	onPress,
}) => {
	const animatedStyle = useAnimatedStyle(() => {
		const stagger = index * 0.12;
		const reveal = Math.max(0, Math.min(1, (progress.value - stagger) / (1 - stagger || 1)));
		return {
			opacity: reveal,
			transform: [
				{ translateY: (1 - reveal) * 18 },
				{ scale: 0.92 + reveal * 0.08 },
			],
		};
	});

	return (
		<Animated.View style={[s.actionShell, animatedStyle]} pointerEvents="box-none">
			<Pressable
				onPress={onPress}
				style={({ pressed }) => [
					s.actionButton,
					{
						backgroundColor,
						borderColor,
					},
					pressed && s.actionButtonPressed,
				]}
				accessibilityRole="button"
				accessibilityLabel={label}
			>
				<View style={[s.actionIconWrap, { backgroundColor: `${tint}16` }]}>
					<Icon name={icon} size={18} color={tint} />
				</View>
				<Text style={s.actionText}>{label}</Text>
			</Pressable>
		</Animated.View>
	);
};

export default React.memo(FABReports);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Styles                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
	container: {
		position: 'absolute',
		right: spacing.lg,
		alignItems: 'flex-end',
		zIndex: 50,
	},
	actionsWrap: {
		alignItems: 'flex-end',
		marginBottom: spacing.md,
		gap: spacing.sm,
	},
	actionShell: {
		width: 232,
		...Platform.select({
			ios: {
				shadowColor: colors.ink,
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.12,
				shadowRadius: 18,
			},
			android: {
				elevation: 6,
			},
			default: {},
		}),
		borderRadius: borderRadius.full,
		borderWidth: StyleSheet.hairlineWidth,
		overflow: 'hidden',
		borderColor: colors.border
	},
	actionButton: {
		minHeight: 52,
		paddingLeft: spacing.md,
		paddingRight: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.sm,
	},
	actionButtonPressed: {
		opacity: 0.92,
	},
	actionIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionText: {
		fontSize: 13,
		fontWeight: '800',
		color: colors.ink,
		flex: 1,
		// backgroundColor: 'red',
		lineHeight: 12
	},
	fab: {
		width: 60,
		height: 60,
		borderRadius: 30,
		overflow: 'hidden',
		...Platform.select({
			ios: {
				shadowColor: colors.primaryDark,
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.32,
				shadowRadius: 16,
			},
			android: {
				elevation: 10,
			},
			default: {},
		}),
	},
	fabGradient: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fabIconStack: {
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fabIconLayer: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	fabPressed: {
		opacity: 0.9,
		transform: [{ scale: 0.96 }],
	},
});
