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
	type GuidanceItem,
	type BadgeItem,
	type StrengthWeakness,
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

	/*
	 * ── Global selected month (0-based month) ──
	 * Single source of truth for the whole screen — every card below (BSI,
	 * aspect scores, progress trends, summary stats, heatmap) is scoped to
	 * this one month, driven by the month/year picker in AnalyticsScreen.
	 */
	const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
	const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());

	const prevMonth = useCallback(() => {
		if (selectedMonth === 0) {
			setSelectedYear((y) => y - 1);
			setSelectedMonth(11);
		} else {
			setSelectedMonth((m) => m - 1);
		}
	}, [selectedMonth]);

	const nextMonth = useCallback(() => {
		if (selectedMonth === 11) {
			setSelectedYear((y) => y + 1);
			setSelectedMonth(0);
		} else {
			setSelectedMonth((m) => m + 1);
		}
	}, [selectedMonth]);

	/** Jumps directly to an arbitrary year/month (0-based) — used by the month/year picker. */
	const setHeatmapPeriod = useCallback((y: number, m: number) => {
		setSelectedYear(y);
		setSelectedMonth(m);
	}, []);

	/* ── BSI (live API) ── */
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
		// API month is 1-based; selectedMonth is 0-based.
		return analyticsService
			.getStudentBsi(studentUuid, selectedYear, selectedMonth + 1)
			.then((data) => {
				setStudentBsi(data);
				setBsiError(false);
			})
			.catch(() => {
				setStudentBsi(null);
				setBsiError(true);
			})
			.finally(() => setBsiLoading(false));
	}, [selectedChild?.id, selectedYear, selectedMonth]);

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
			.getAspectScores(studentUuid, selectedYear, selectedMonth + 1)
			.then((data) => {
				setAspects(data);
				setAspectsError(false);
			})
			.catch(() => {
				setAspects([]);
				setAspectsError(true);
			})
			.finally(() => setAspectsLoading(false));
	}, [selectedChild?.id, selectedYear, selectedMonth]);

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
		// API month is 1-based; selectedMonth is 0-based.
		return analyticsService
			.getDbsHeatmap(studentUuid, selectedYear, selectedMonth + 1)
			.then((days) => {
				setHeatmapData(days);
				setHeatmapError(false);
			})
			.catch(() => {
				setHeatmapData([]);
				setHeatmapError(true);
			})
			.finally(() => setHeatmapLoading(false));
	}, [selectedChild?.id, selectedYear, selectedMonth]);

	useEffect(() => {
		fetchHeatmap();
	}, [fetchHeatmap]);

	/* ── Progress trends (live API) ── */
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
			.getProgressTrends(studentUuid, selectedYear, selectedMonth + 1)
			.then((points) => {
				setTrends(points);
				setTrendsError(false);
			})
			.catch(() => {
				setTrends([]);
				setTrendsError(true);
			})
			.finally(() => setTrendsLoading(false));
	}, [selectedChild?.id, selectedYear, selectedMonth]);

	useEffect(() => {
		fetchTrends();
	}, [fetchTrends]);

	/* ── Summary stats (live API) ── */
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
			.getSummaryStats(studentUuid, selectedYear, selectedMonth + 1)
			.then((data) => {
				setCounters(data);
				setCountersError(false);
			})
			.catch(() => {
				setCounters(null);
				setCountersError(true);
			})
			.finally(() => setCountersLoading(false));
	}, [selectedChild?.id, selectedYear, selectedMonth]);

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
		trends,
		trendsLoading,
		trendsError,
		counters,
		countersLoading,
		countersError,
		guidance,
		badges,
		strengthsWeaknesses,
		insightsLoading,
		insightsError,
		heatmapData,
		heatmapLoading,
		heatmapError,
		// Global month selector — drives every card on the screen.
		selectedYear,
		selectedMonth,
		prevMonth,
		nextMonth,
		setSelectedMonth: setHeatmapPeriod,
		studentBsi,
		bsiLoading,
		bsiError,
		scoreCards,
		scoreCardsLoading,
		scoreCardsError,
		refreshAnalytics,
	};
}
