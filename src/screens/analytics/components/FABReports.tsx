import React from 'react';
import { View, ActivityIndicator, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing } from '../../../theme';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component — single "Download report" FAB (no expand menu).         */
/*  Tapping it is expected to ask weekly/monthly, then call the report */
/*  download API directly — the screen owns that flow, this is just    */
/*  the trigger button + a busy spinner while a download is underway.  */
/* ═══════════════════════════════════════════════════════════════════ */
interface FABReportsProps {
	bottom: number;
	loading?: boolean;
	onPress: () => void;
}

const FABReports: React.FC<FABReportsProps> = ({ bottom, loading = false, onPress }) => {
	const handlePress = React.useCallback(() => {
		if (loading) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
		onPress();
	}, [loading, onPress]);

	return (
		<Animated.View
			entering={FadeInDown.delay(720).springify().damping(18).stiffness(220)}
			pointerEvents="box-none"
			style={[s.container, { bottom }]}
		>
			<Pressable
				onPress={handlePress}
				disabled={loading}
				style={({ pressed }) => [s.fab, pressed && s.fabPressed]}
				accessibilityRole="button"
				accessibilityLabel="Download report"
				android_ripple={{ color: 'rgba(255,255,255,0.22)', borderless: true }}
			>
				<LinearGradient
					colors={[colors.primary, colors.primaryDark]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={s.fabGradient}
				>
					{loading ? (
						<ActivityIndicator size="small" color="#FFF" />
					) : (
						<View style={s.fabIconStack}>
							<Icon name="file-download" size={26} color="#FFF" />
						</View>
					)}
				</LinearGradient>
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
	fabPressed: {
		opacity: 0.9,
		transform: [{ scale: 0.96 }],
	},
});
