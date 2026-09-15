import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, textStyles, borderRadius } from '../../../theme';

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthYearPickerModalProps {
	visible: boolean;
	/** Currently selected year/month (0-based month). */
	year: number;
	month: number;
	onSelect: (year: number, month: number) => void;
	onClose: () => void;
}

/**
 * Shared month/year picker — the single control that scopes every card on
 * the Analytics screen to one calendar month. Extracted from what used to be
 * HeatmapCalendar's own inline modal so the whole screen shares one picker.
 */
const MonthYearPickerModal: React.FC<MonthYearPickerModalProps> = ({
	visible,
	year,
	month,
	onSelect,
	onClose,
}) => {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();

	const [pickerYear, setPickerYear] = useState(year);

	// Re-anchor the year page to whatever's currently selected each time it opens.
	React.useEffect(() => {
		if (visible) setPickerYear(year);
	}, [visible, year]);

	const isFutureYear = pickerYear >= currentYear;

	const selectMonth = (m: number) => {
		if (pickerYear === currentYear && m > currentMonth) return;
		onSelect(pickerYear, m);
		onClose();
	};

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<Pressable style={s.pickerOverlay} onPress={onClose}>
				<Pressable style={s.pickerCard} onPress={() => {}}>
					<View style={s.pickerHeader}>
						<Text style={s.pickerTitle}>Select Month & Year</Text>
						<Pressable onPress={onClose} hitSlop={8}>
							<Icon name="close" size={20} color={colors.textSecondary} />
						</Pressable>
					</View>

					<View style={s.pickerYearRow}>
						<Pressable onPress={() => setPickerYear((y) => y - 1)} style={s.navBtn}>
							<Icon name="chevron-left" size={20} color={colors.textSecondary} />
						</Pressable>
						<Text style={s.pickerYearText}>{pickerYear}</Text>
						<Pressable
							onPress={() => setPickerYear((y) => y + 1)}
							style={s.navBtn}
							disabled={isFutureYear}
						>
							<Icon
								name="chevron-right"
								size={20}
								color={isFutureYear ? colors.border : colors.textSecondary}
							/>
						</Pressable>
					</View>

					<View style={s.pickerMonthGrid}>
						{MONTH_NAMES.map((name, m) => {
							const isSelected = pickerYear === year && m === month;
							const isDisabled = pickerYear === currentYear && m > currentMonth;
							return (
								<Pressable
									key={name}
									onPress={() => selectMonth(m)}
									disabled={isDisabled}
									style={[
										s.pickerMonthCell,
										isSelected && s.pickerMonthCellActive,
										isDisabled && s.pickerMonthCellDisabled,
									]}
								>
									<Text
										style={[
											s.pickerMonthText,
											isSelected && s.pickerMonthTextActive,
											isDisabled && s.pickerMonthTextDisabled,
										]}
									>
										{name.slice(0, 3)}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default React.memo(MonthYearPickerModal);

const s = StyleSheet.create({
	pickerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xl,
	},
	pickerCard: {
		width: '100%',
		maxWidth: 360,
		backgroundColor: colors.surface,
		borderRadius: borderRadius.xl,
		padding: spacing.lg,
	},
	pickerHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: spacing.md,
	},
	pickerTitle: {
		...textStyles.headingMedium,
		fontSize: 16,
		fontWeight: '800',
		color: colors.ink,
	},
	pickerYearRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.lg,
		marginBottom: spacing.md,
	},
	pickerYearText: {
		...textStyles.headingMedium,
		fontSize: 18,
		fontWeight: '800',
		color: colors.ink,
		minWidth: 64,
		textAlign: 'center',
	},
	pickerMonthGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	pickerMonthCell: {
		width: '30%',
		paddingVertical: spacing.sm + 2,
		borderRadius: borderRadius.medium,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surfaceMuted,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	pickerMonthCellActive: {
		backgroundColor: colors.lavenderSoft,
		borderColor: colors.primary,
	},
	pickerMonthCellDisabled: {
		opacity: 0.4,
	},
	pickerMonthText: {
		...textStyles.bodyMedium,
		fontWeight: '700',
		color: colors.textPrimary,
	},
	pickerMonthTextActive: {
		color: colors.primary,
	},
	pickerMonthTextDisabled: {
		color: colors.textMuted,
	},
	navBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.surfaceMuted,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
	},
});
