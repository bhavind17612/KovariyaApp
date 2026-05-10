import { useMemo, useState, useCallback } from 'react';
import { useChildren } from '../../../context/ChildrenContext';
import {
	getSdsAnalytics,
	getFamilyScore,
	getTrustMeter,
	getParentConsistency,
	getAspectScores,
	getDualTrendData,
	getDailyBehaviourScores,
	getSummaryCounters,
	getGuidance,
	getBadges,
	getGoalWiseReport,
	getMonthlyPdfReport,
	getStrengthsWeaknesses,
	type SummaryPeriod,
} from '../../../data/analyticsData';

/**
 * Single hook that fetches every piece of analytics data the screen needs.
 * All values are memoised against `selectedChild.id` (+ heatmap month/year).
 */
export function useAnalyticsData() {
	const { children, selectedChildId } = useChildren();

	const selectedChild = useMemo(
		() => children.find((c) => c.id === selectedChildId) ?? children[0],
		[children, selectedChildId]
	);

	/* ── Data sources ── */
	const bsi = useMemo(() => getSdsAnalytics(selectedChild.id), [selectedChild.id]);
	const familyScore = useMemo(() => getFamilyScore(selectedChild.id), [selectedChild.id]);
	const trust = useMemo(() => getTrustMeter(selectedChild.id), [selectedChild.id]);
	const parentConsistency = useMemo(
		() => getParentConsistency(selectedChild.id),
		[selectedChild.id]
	);
	const aspects = useMemo(() => getAspectScores(selectedChild.id), [selectedChild.id]);
	const dualTrend = useMemo(() => getDualTrendData(selectedChild.id), [selectedChild.id]);
	const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('weekly');
	const counters = useMemo(
		() => getSummaryCounters(selectedChild.id, summaryPeriod),
		[selectedChild.id, summaryPeriod]
	);
	const guidance = useMemo(() => getGuidance(selectedChild.id), [selectedChild.id]);
	const badges = useMemo(() => getBadges(selectedChild.id), [selectedChild.id]);
	const strengthsWeaknesses = useMemo(
		() => getStrengthsWeaknesses(selectedChild.id),
		[selectedChild.id]
	);

	/* ── Heatmap state ── */
	const now = new Date();
	// Stable initialiser — runs once
	const [heatmapYear, setHeatmapYear] = useState(
		() => new Date().getFullYear()
	);
	const [heatmapMonth, setHeatmapMonth] = useState(
		() => new Date().getMonth()
	);

	const heatmapData = useMemo(
		() => getDailyBehaviourScores(selectedChild.id, heatmapYear, heatmapMonth),
		[selectedChild.id, heatmapYear, heatmapMonth]
	);
	const monthlyReport = useMemo(
		() => getMonthlyPdfReport(selectedChild.id, heatmapYear, heatmapMonth),
		[selectedChild.id, heatmapYear, heatmapMonth]
	);
	const goalWiseReport = useMemo(
		() => getGoalWiseReport(selectedChild.id),
		[selectedChild.id]
	);

	const prevMonth = useCallback(() => {
		if (heatmapMonth === 0) {
			setHeatmapYear((y) => y - 1);
			setHeatmapMonth(11);
		} else {
			setHeatmapMonth((m) => m - 1);
		}
	}, [heatmapMonth]);

	const nextMonth = useCallback(() => {
		if (heatmapMonth === 11) {
			setHeatmapYear((y) => y + 1);
			setHeatmapMonth(0);
		} else {
			setHeatmapMonth((m) => m + 1);
		}
	}, [heatmapMonth]);

	/* ── BSI period toggle ── */
	const [bsiPeriod, setBsiPeriod] = useState<'weekly' | 'monthly'>('weekly');

	return {
		selectedChild,
		bsi,
		familyScore,
		trust,
		parentConsistency,
		aspects,
		dualTrend,
		counters,
		guidance,
		badges,
		strengthsWeaknesses,
		monthlyReport,
		goalWiseReport,
		heatmapData,
		heatmapYear,
		heatmapMonth,
		prevMonth,
		nextMonth,
		summaryPeriod,
		setSummaryPeriod,
		bsiPeriod,
		setBsiPeriod,
	};
}
