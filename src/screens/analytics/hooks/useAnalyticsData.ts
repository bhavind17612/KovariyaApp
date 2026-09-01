import { useMemo, useState, useCallback, useEffect } from 'react';
import { useChildren } from '../../../context/ChildrenContext';
import { analyticsService } from '../../../services/analyticsService';
import { insightsService } from '../../../services/insightsService';
import { languageService } from '../../../services/languageService';
import type { StudentBsi } from '../../../types/bsi';
import type { ScoreCards } from '../../../types/scoreCards';
import type { AspectScore } from '../../../types/aspectScore';
import type { HeatmapDay } from '../../../types/heatmap';
import type { TrendPoint } from '../../../types/progressTrends';
import type { SummaryStatsData } from '../../../types/summaryStats';
import {
	getSdsAnalytics,
	getGoalWiseReport,
	getMonthlyPdfReport,
	type GuidanceItem,
	type BadgeItem,
	type StrengthWeakness,
	type SummaryPeriod,
} from '../../../data/analyticsData';

/** Empty strengths/weaknesses used before the API responds. */
const EMPTY_STRENGTHS_WEAKNESSES: StrengthWeakness = {
	strengths: [],
	weakAreas: [],
	strengthSummary: '',
	weakSummary: '',
};

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

	/* ── Language preference (drives localized insights) ── */
	const [language, setLanguage] = useState('en');
	useEffect(() => {
		languageService
			.getPreferredLanguage()
			.then((pref) => {
				if (pref?.code) setLanguage(pref.code);
			})
			.catch(() => {});
	}, []);

	/* ── Heatmap state ── */
	const now = new Date();
	// Stable initialiser — runs once
	const [heatmapYear, setHeatmapYear] = useState(
		() => new Date().getFullYear()
	);
	const [heatmapMonth, setHeatmapMonth] = useState(
		() => new Date().getMonth()
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

	/** Jumps the heatmap directly to an arbitrary year/month (0-based). */
	const setHeatmapPeriod = useCallback((y: number, m: number) => {
		setHeatmapYear(y);
		setHeatmapMonth(m);
	}, []);

	/* ── BSI (live API) ── */
	const [bsiPeriod, setBsiPeriod] = useState<'weekly' | 'monthly'>('weekly');
	const [studentBsi, setStudentBsi] = useState<StudentBsi | null>(null);
	const [bsiLoading, setBsiLoading] = useState(true);
	const [bsiError, setBsiError] = useState(false);

	const fetchBsi = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setStudentBsi(null);
			setBsiLoading(false);
			return Promise.resolve();
		}
		setBsiLoading(true);
		return analyticsService
			.getStudentBsi(studentUuid, bsiPeriod)
			.then((data) => {
				setStudentBsi(data);
				setBsiError(false);
			})
			.catch(() => {
				setStudentBsi(null);
				setBsiError(true);
			})
			.finally(() => setBsiLoading(false));
	}, [selectedChild?.id, bsiPeriod]);

	useEffect(() => {
		fetchBsi();
	}, [fetchBsi]);

	/* ── Support score cards (live API) ── */
	const [scoreCards, setScoreCards] = useState<ScoreCards | null>(null);
	const [scoreCardsLoading, setScoreCardsLoading] = useState(true);
	const [scoreCardsError, setScoreCardsError] = useState(false);

	const fetchScoreCards = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setScoreCards(null);
			setScoreCardsLoading(false);
			return Promise.resolve();
		}
		setScoreCardsLoading(true);
		return analyticsService
			.getScoreCards(studentUuid)
			.then((data) => {
				setScoreCards(data);
				setScoreCardsError(false);
			})
			.catch(() => {
				setScoreCards(null);
				setScoreCardsError(true);
			})
			.finally(() => setScoreCardsLoading(false));
	}, [selectedChild?.id]);

	useEffect(() => {
		fetchScoreCards();
	}, [fetchScoreCards]);

	/* ── Aspect scores (live API) ── */
	const [aspectPeriod, setAspectPeriod] = useState<'weekly' | 'monthly'>('weekly');
	const [aspects, setAspects] = useState<AspectScore[]>([]);
	const [aspectsLoading, setAspectsLoading] = useState(true);
	const [aspectsError, setAspectsError] = useState(false);

	const fetchAspects = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setAspects([]);
			setAspectsLoading(false);
			return Promise.resolve();
		}
		setAspectsLoading(true);
		return analyticsService
			.getAspectScores(studentUuid, aspectPeriod)
			.then((data) => {
				setAspects(data);
				setAspectsError(false);
			})
			.catch(() => {
				setAspects([]);
				setAspectsError(true);
			})
			.finally(() => setAspectsLoading(false));
	}, [selectedChild?.id, aspectPeriod]);

	useEffect(() => {
		fetchAspects();
	}, [fetchAspects]);

	/* ── DBS heatmap (live API) ── */
	const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
	const [heatmapLoading, setHeatmapLoading] = useState(true);
	const [heatmapError, setHeatmapError] = useState(false);

	const fetchHeatmap = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setHeatmapData([]);
			setHeatmapLoading(false);
			return Promise.resolve();
		}
		setHeatmapLoading(true);
		// API month is 1-based; heatmapMonth is 0-based.
		return analyticsService
			.getDbsHeatmap(studentUuid, heatmapYear, heatmapMonth + 1)
			.then((days) => {
				setHeatmapData(days);
				setHeatmapError(false);
			})
			.catch(() => {
				setHeatmapData([]);
				setHeatmapError(true);
			})
			.finally(() => setHeatmapLoading(false));
	}, [selectedChild?.id, heatmapYear, heatmapMonth]);

	useEffect(() => {
		fetchHeatmap();
	}, [fetchHeatmap]);

	/* ── Progress trends (live API) ── */
	const [trendPeriod, setTrendPeriod] = useState<'weekly' | 'monthly'>('weekly');
	const [trends, setTrends] = useState<TrendPoint[]>([]);
	const [trendsLoading, setTrendsLoading] = useState(true);
	const [trendsError, setTrendsError] = useState(false);

	const fetchTrends = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setTrends([]);
			setTrendsLoading(false);
			return Promise.resolve();
		}
		setTrendsLoading(true);
		return analyticsService
			.getProgressTrends(studentUuid, trendPeriod)
			.then((points) => {
				setTrends(points);
				setTrendsError(false);
			})
			.catch(() => {
				setTrends([]);
				setTrendsError(true);
			})
			.finally(() => setTrendsLoading(false));
	}, [selectedChild?.id, trendPeriod]);

	useEffect(() => {
		fetchTrends();
	}, [fetchTrends]);

	/* ── Summary stats (live API) ── */
	const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('weekly');
	const [counters, setCounters] = useState<SummaryStatsData | null>(null);
	const [countersLoading, setCountersLoading] = useState(true);
	const [countersError, setCountersError] = useState(false);

	const fetchSummaryStats = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setCounters(null);
			setCountersLoading(false);
			return Promise.resolve();
		}
		setCountersLoading(true);
		return analyticsService
			.getSummaryStats(studentUuid, summaryPeriod)
			.then((data) => {
				setCounters(data);
				setCountersError(false);
			})
			.catch(() => {
				setCounters(null);
				setCountersError(true);
			})
			.finally(() => setCountersLoading(false));
	}, [selectedChild?.id, summaryPeriod]);

	useEffect(() => {
		fetchSummaryStats();
	}, [fetchSummaryStats]);

	/* ── Insights: guidance, strengths/weaknesses & badges (live API) ── */
	const [guidance, setGuidance] = useState<GuidanceItem[]>([]);
	const [badges, setBadges] = useState<BadgeItem[]>([]);
	const [strengthsWeaknesses, setStrengthsWeaknesses] = useState<StrengthWeakness>(
		EMPTY_STRENGTHS_WEAKNESSES
	);
	const [insightsLoading, setInsightsLoading] = useState(true);
	const [insightsError, setInsightsError] = useState(false);

	const fetchInsights = useCallback(() => {
		const studentUuid = selectedChild?.id;
		if (!studentUuid) {
			setGuidance([]);
			setBadges([]);
			setStrengthsWeaknesses(EMPTY_STRENGTHS_WEAKNESSES);
			setInsightsLoading(false);
			return Promise.resolve();
		}
		setInsightsLoading(true);
		return insightsService
			.getInsights(studentUuid, language)
			.then((data) => {
				setGuidance(data?.guidance ?? []);
				setBadges(data?.badges ?? []);
				setStrengthsWeaknesses(data?.strengthsWeaknesses ?? EMPTY_STRENGTHS_WEAKNESSES);
				setInsightsError(false);
			})
			.catch(() => {
				setGuidance([]);
				setBadges([]);
				setStrengthsWeaknesses(EMPTY_STRENGTHS_WEAKNESSES);
				setInsightsError(true);
			})
			.finally(() => setInsightsLoading(false));
	}, [selectedChild?.id, language]);

	useEffect(() => {
		fetchInsights();
	}, [fetchInsights]);

	/* ── Pull-to-refresh: re-runs every live API in parallel ── */
	const refreshAnalytics = useCallback(
		() => Promise.all([
			fetchBsi(),
			fetchScoreCards(),
			fetchAspects(),
			fetchHeatmap(),
			fetchTrends(),
			fetchSummaryStats(),
			fetchInsights(),
		]),
		[fetchBsi, fetchScoreCards, fetchAspects, fetchHeatmap, fetchTrends, fetchSummaryStats, fetchInsights]
	);

	return {
		selectedChild,
		bsi,
		aspects,
		aspectsLoading,
		aspectsError,
		aspectPeriod,
		setAspectPeriod,
		trends,
		trendsLoading,
		trendsError,
		trendPeriod,
		setTrendPeriod,
		counters,
		countersLoading,
		countersError,
		guidance,
		badges,
		strengthsWeaknesses,
		insightsLoading,
		insightsError,
		monthlyReport,
		goalWiseReport,
		heatmapData,
		heatmapLoading,
		heatmapError,
		heatmapYear,
		heatmapMonth,
		prevMonth,
		nextMonth,
		setHeatmapPeriod,
		summaryPeriod,
		setSummaryPeriod,
		bsiPeriod,
		setBsiPeriod,
		studentBsi,
		bsiLoading,
		bsiError,
		scoreCards,
		scoreCardsLoading,
		scoreCardsError,
		refreshAnalytics,
	};
}
