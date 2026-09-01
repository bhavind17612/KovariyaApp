import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Card, SkeletonBox, SkeletonShimmer } from '../../../components';
import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { analyticsStyles as shared } from '../styles';
import { heatmapColor } from '../utils';
import type { HeatmapDay } from '../../../types/heatmap';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface HeatmapCalendarProps {
	data: HeatmapDay[];
	loading: boolean;
	error: boolean;
	year: number;
	month: number;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	/** Called with (year, month) — month is 0-based — when user picks a period from the popup */
	onSelectMonth?: (year: number, month: number) => void;
	/** Called with date string (YYYY-MM-DD) and its score when user taps a cell */
	onDayPress?: (date: string, score: number | null) => void;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Constants                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const DAYS_HEADER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];
const LEGEND_ITEMS = [
	{ label: 'Needs Effort', color: '#E87070' },
	{ label: 'Average', color: '#E8A04A' },
	{ label: 'Consistent', color: '#7BCF7B' },
	{ label: 'Excellent', color: '#2E8B57' },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
	data,
	loading,
	error,
	year,
	month,
	onPrevMonth,
	onNextMonth,
	onSelectMonth,
	onDayPress,
}) => {
	const { width: windowWidth } = useWindowDimensions();
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();

	const [showPicker, setShowPicker] = useState(false);
	const [pickerYear, setPickerYear] = useState(year);

	const openPicker = () => {
		setPickerYear(year);
		setShowPicker(true);
	};

	const isFutureYear = pickerYear >= currentYear;

	const selectMonth = (m: number) => {
		if (pickerYear === currentYear && m > currentMonth) return;
		setShowPicker(false);
		onSelectMonth?.(pickerYear, m);
	};
	const cardInnerWidth = windowWidth - spacing.xl * 2 - spacing.md * 2;
	const cellGap = 4;
	const cellSize = Math.floor((cardInnerWidth - cellGap * 6) / 7);

	/* Responsive legend widths — capped on tablets, snug on phones */
	const legendMaxWidth = Math.min(cardInnerWidth, windowWidth * 0.85, 480);

	const firstDay = new Date(year, month, 1).getDay(); // 0=Sun

	// Build grid with leading empties
	const cells: (HeatmapDay | null)[] = [];
	for (let i = 0; i < firstDay; i++) cells.push(null);
	data.forEach((d) => cells.push(d));

	const rows: (HeatmapDay | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) {
		rows.push(cells.slice(i, i + 7));
	}

	const showSkeleton = loading && data.length === 0;
	const showError = error && data.length === 0;

	return (
		<Animated.View
			entering={FadeInDown.delay(240).springify().damping(18).stiffness(220)}
			style={[s.shadowWrapper, { marginBottom: spacing.sm }]}
		>
			<Card variant="elevated" padding={spacing.md} style={s.heatmapCard}>
				{/* Header */}
				<View style={s.heatmapHeader}>
					<View style={s.heatmapHeaderLeft}>
						<View style={s.heatmapIconWrap}>
							<Icon name="calendar-month" size={16} color={colors.primary} />
						</View>
						<View>
							<Text style={shared.sectionEyebrow}>Daily Behaviour Score</Text>
							<Text style={s.sectionTitle}>DBS Heatmap</Text>
						</View>
					</View>
					<View style={s.heatmapNavWrap}>
						<Pressable
							onPress={openPicker}
							style={s.heatmapMonthPillBtn}
							accessibilityRole="button"
							accessibilityLabel="Choose month and year"
						>
							<Text style={s.heatmapMonthPill}>{MONTH_NAMES[month].slice(0, 3)} {year}</Text>
							<Icon name="arrow-drop-down" size={16} color={colors.primary} />
						</Pressable>
						<View style={s.heatmapNav}>
							<Pressable onPress={onPrevMonth} style={s.heatmapNavBtn}>
								<Icon name="chevron-left" size={20} color={colors.textSecondary} />
							</Pressable>
							<Pressable
								onPress={onNextMonth}
								style={s.heatmapNavBtn}
								disabled={year === currentYear && month === currentMonth}
							>
								<Icon
									name="chevron-right"
									size={20}
									color={year === currentYear && month === currentMonth ? colors.border : colors.textSecondary}
								/>
							</Pressable>
						</View>
					</View>
				</View>

				<View style={s.calendarPanel}>
					<View style={[s.heatmapRow, { gap: cellGap, marginBottom: cellGap }]}>
						{DAYS_HEADER.map((d, i) => (
							<View key={i} style={{ width: cellSize, alignItems: 'center' }}>
								<Text style={s.heatmapDayHeader}>{d}</Text>
							</View>
						))}
					</View>

					{showSkeleton ? (
						<View style={s.skeletonGrid}>
							{Array.from({ length: 6 }).map((_, ri) => (
								<View key={`sk-${ri}`} style={[s.heatmapRow, { gap: cellGap, marginBottom: cellGap }]}>
									{Array.from({ length: 7 }).map((_, ci) => (
										<SkeletonBox key={`sk-${ri}-${ci}`} width={cellSize} height={cellSize} radius={8} />
									))}
								</View>
							))}
							<SkeletonShimmer />
						</View>
					) : showError ? (
						<View style={s.stateBody}>
							<Icon name="cloud-off" size={26} color={colors.textMuted} />
							<Text style={s.stateText}>Could not load the heatmap. Pull to refresh.</Text>
						</View>
					) : (
						rows.map((row, ri) => (
							<View key={ri} style={[s.heatmapRow, { gap: cellGap, marginBottom: cellGap }]}>
								{row.map((cell, ci) => {
									if (!cell) {
										return <View key={`empty-${ri}-${ci}`} style={[s.emptyCell, { width: cellSize, height: cellSize }]} />;
									}
									const bg = heatmapColor(cell.score);
									const dayNum = parseInt(cell.date.split('-')[2], 10);
									const isToday = cell.date === new Date().toISOString().split('T')[0];
									return (
										<Pressable
											key={cell.date}
											onPress={() => onDayPress?.(cell.date, cell.score)}
											android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: false }}
											style={({ pressed }) => [
												s.dayCell,
												{
													width: cellSize,
													height: cellSize,
													backgroundColor: bg,
												},
												isToday && s.dayCellToday,
												pressed && s.dayCellPressed,
											]}
											accessibilityRole="button"
											accessibilityLabel={`View logs for ${cell.date}`}
										>
											<Text style={[s.dayCellText, cell.score === null && s.dayCellTextMuted]}>
												{dayNum}
											</Text>
										</Pressable>
									);
								})}
								{row.length < 7 &&
									Array.from({ length: 7 - row.length }).map((_, ti) => (
										<View key={`pad-${ri}-${ti}`} style={[s.emptyCell, { width: cellSize, height: cellSize }]} />
									))}
							</View>
						))
					)}
				</View>

				{/* Legend */}
				<View style={[s.heatmapLegendRow, { maxWidth: legendMaxWidth }]}>
					{LEGEND_ITEMS.map((item) => (
						<View key={item.label} style={s.legendItem}>
							<View style={[s.legendDot, { backgroundColor: item.color }]} />
							<Text style={[s.legendItemText, { color: item.color }]}>
								{item.label}
							</Text>
						</View>
					))}
				</View>
			</Card>

			<Modal
				transparent
				visible={showPicker}
				animationType="fade"
				onRequestClose={() => setShowPicker(false)}
			>
				<Pressable style={s.pickerOverlay} onPress={() => setShowPicker(false)}>
					<Pressable style={s.pickerCard} onPress={() => {}}>
						<View style={s.pickerHeader}>
							<Text style={s.pickerTitle}>Select Month & Year</Text>
							<Pressable onPress={() => setShowPicker(false)} hitSlop={8}>
								<Icon name="close" size={20} color={colors.textSecondary} />
							</Pressable>
						</View>

						<View style={s.pickerYearRow}>
							<Pressable
								onPress={() => setPickerYear((y) => y - 1)}
								style={s.heatmapNavBtn}
							>
								<Icon name="chevron-left" size={20} color={colors.textSecondary} />
							</Pressable>
							<Text style={s.pickerYearText}>{pickerYear}</Text>
							<Pressable
								onPress={() => setPickerYear((y) => y + 1)}
								style={s.heatmapNavBtn}
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
		</Animated.View>
	);
};

export default React.memo(HeatmapCalendar);

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
	heatmapCard: {
		// marginBottom: spacing.sm,
		backgroundColor: 'rgba(255,255,255,0.96)',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(17,17,17,0.05)',
	},
	skeletonGrid: {
		position: 'relative',
		overflow: 'hidden',
		borderRadius: borderRadius.medium,
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
	heatmapHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: spacing.md,
	},
	heatmapHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		flex: 1,
	},
	heatmapIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: 'rgba(124,106,232,0.08)',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	heatmapNavWrap: {
		alignItems: 'flex-end',
		gap: spacing.xs,
	},
	sectionTitle: {
		...textStyles.headingMedium,
		fontSize: 18,
		fontWeight: '800',
		color: colors.ink,
		letterSpacing: -0.3,
	},
	heatmapNav: {
		flexDirection: 'row',
		gap: 4,
	},
	heatmapMonthPillBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: borderRadius.full,
		backgroundColor: colors.lavenderSoft,
	},
	heatmapMonthPill: {
		...textStyles.caption,
		fontSize: 11,
		fontWeight: '700',
		color: colors.primary,
	},
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
	heatmapNavBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: colors.surfaceMuted,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.border,
	},
	calendarPanel: {
		backgroundColor: '#F9F8FD',
		borderRadius: borderRadius.xl,
		padding: spacing.sm + 2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(124, 106, 232, 0.10)',
		marginBottom: spacing.sm,
	},
	heatmapRow: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
	},
	heatmapDayHeader: {
		fontSize: 10,
		fontWeight: '700',
		color: colors.textMuted,
		letterSpacing: 0.2,
	},
	emptyCell: {
		borderRadius: 10,
		backgroundColor: 'transparent',
	},
	dayCell: {
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(255,255,255,0.4)',
		overflow: 'hidden',
	},
	dayCellToday: {
		borderWidth: 2,
		borderColor: colors.primary,
	},
	dayCellPressed: {
		opacity: 0.78,
		transform: [{ scale: 0.93 }],
	},
	dayCellText: {
		fontSize: 10,
		fontWeight: '800',
		color: '#FFF',
	},
	dayCellTextMuted: {
		color: colors.textMuted,
		opacity: 0.7,
	},
	heatmapLegendRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: spacing.md,
		paddingHorizontal: spacing.xs,
		alignSelf: 'center',
		width: '100%',
		// flexWrap: 'wrap',
		rowGap: spacing.xs,
		columnGap: spacing.sm,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		// backgroundColor: 'red'
	},
	legendDot: {
		width: 9,
		height: 9,
		borderRadius: 4.5,
	},
	legendItemText: {
		fontSize: 9,
		fontWeight: '700',
		letterSpacing: 0.1,
	},
});
