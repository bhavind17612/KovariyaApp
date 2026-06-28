import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import { colors } from '../theme';
import { DASHBOARD_RATING_ASPECTS } from '../data/aspectRating';
import type {
  GuidanceItem,
  BadgeItem,
  StrengthWeakness,
  AspectScoreRow,
} from '../data/analyticsData';
import type {
  ApiInsights,
  ApiInsightAspect,
  ApiInsightBadge,
  InsightsData,
} from '../types/insights';

/* Sensible fallbacks for an aspect the client doesn't know about. */
const FALLBACK_ASPECT = {
  iconName: 'insights',
  accent: colors.primary,
  softBg: colors.lavenderSoft,
  borderColor: 'rgba(124, 106, 232, 0.25)',
};

/** Attaches client-side visual fields to a raw strength / weak-area aspect. */
function enrichAspect(raw: ApiInsightAspect, isStrength: boolean): AspectScoreRow {
  const def = DASHBOARD_RATING_ASPECTS.find((a) => a.id === raw.aspect_id);
  return {
    id: raw.aspect_id,
    name: raw.name,
    score: raw.score,
    change: raw.change,
    strength: isStrength,
    iconName: def?.iconName ?? FALLBACK_ASPECT.iconName,
    accent: def?.accent ?? FALLBACK_ASPECT.accent,
    softBg: def?.softBg ?? FALLBACK_ASPECT.softBg,
    borderColor: def?.borderColor ?? FALLBACK_ASPECT.borderColor,
  };
}

/* Badge art is presentation-only: the server sends a code, the client paints it.
   Known codes get a tailored icon; everything else rotates through a palette. */
const BADGE_ICON_BY_CODE: Record<string, string> = {
  BADGE_1: 'emoji-events',
  BADGE_2: 'star',
  BADGE_3: 'military-tech',
  BADGE_4: 'workspace-premium',
  BADGE_5: 'verified',
};
const BADGE_PALETTE = [colors.peach, colors.lavender, colors.mint, colors.sky, '#F0C6E8'];
const DEFAULT_BADGE_ICON = 'military-tech';

/** Attaches an icon + colour to a raw badge using its code (or index fallback). */
function enrichBadge(raw: ApiInsightBadge, index: number): BadgeItem {
  return {
    id: raw.id,
    label: raw.label,
    description: raw.description ?? '',
    earned: raw.earned,
    iconName: BADGE_ICON_BY_CODE[raw.code] ?? DEFAULT_BADGE_ICON,
    color: BADGE_PALETTE[index % BADGE_PALETTE.length],
  };
}

function mapInsights(raw: ApiInsights): InsightsData {
  const guidance: GuidanceItem[] = Array.isArray(raw.guidance)
    ? raw.guidance.map((g) => ({
        id: g.id,
        type: g.type,
        title: g.title,
        message: g.message,
      }))
    : [];

  const sw = raw.strengths_weaknesses;
  const strengthsWeaknesses: StrengthWeakness = {
    strengthSummary: sw?.strength_summary ?? '',
    weakSummary: sw?.weak_summary ?? '',
    strengths: Array.isArray(sw?.strengths)
      ? sw.strengths.map((a) => enrichAspect(a, true))
      : [],
    weakAreas: Array.isArray(sw?.weak_areas)
      ? sw.weak_areas.map((a) => enrichAspect(a, false))
      : [],
  };

  const badges: BadgeItem[] = Array.isArray(raw.badges)
    ? raw.badges.map(enrichBadge)
    : [];

  return { guidance, strengthsWeaknesses, badges };
}

class InsightsService {
  /**
   * AI guidance, strengths/weak areas and badges for a child, in the parent's
   * preferred language. Returns null when no insights are available yet.
   */
  async getInsights(studentUuid: string, language: string): Promise<InsightsData | null> {
    const res = await api.get<ApiInsights | null>(
      ENDPOINTS.ANALYTICS.INSIGHTS(studentUuid),
      { params: { language } },
    );
    const data = res.data.data;
    return data ? mapInsights(data) : null;
  }
}

export const insightsService = new InsightsService();
