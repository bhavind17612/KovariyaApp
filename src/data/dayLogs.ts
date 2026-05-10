/**
 * dayLogs.ts
 * Per-day detail data derived from the same deterministic hash already used
 * in analyticsData.ts — so values are consistent between sessions.
 */

import { DASHBOARD_RATING_ASPECTS } from './aspectRating';
import {
  REASON_CHIPS_POSITIVE,
  REASON_CHIPS_NEGATIVE,
} from './aspectRating';

/* ─── internal helpers (duplicated to keep this file self-contained) ─── */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/* ─── Types ─── */
export type DayAspectLogEntry = {
  id: string;
  /** signed raw point value (-4 … +4) */
  ratingValue: number;
  /** Positive/negative scale label */
  ratingLabel: string;
  /** Reason chip labels — may be empty if log was note-only */
  chips: string[];
  /** Text note — null when not provided */
  textNote: string | null;
  /** Voice note type — 'voice' when a voice recording exists */
  voiceNote: { durationSec: number } | null;
  time: string;
};

export type DayAspectLog = {
  aspectId: string;
  aspectName: string;
  iconName: string;
  accent: string;
  softBg: string;
  entries: DayAspectLogEntry[];
};

export type DayLogDetail = {
  date: string;           // YYYY-MM-DD
  displayDate: string;    // e.g. "Saturday, 10 May 2026"
  dbsScore: number | null;
  dbsLabel: string;
  aspectLogs: DayAspectLog[];
  positiveChips: string[];
  negativeChips: string[];
  summary: string;
};

/* ─── Scale options ─── */
const SCALE_OPTIONS = [
  { label: 'Needs Attention', value: -4 },
  { label: 'Below Expectations', value: -2 },
  { label: 'Inconsistent', value: -1 },
  { label: 'Improving', value: 1 },
  { label: 'Strong', value: 2 },
  { label: 'Excellent', value: 4 },
];

function dbsLabel(score: number | null): string {
  if (score === null) return 'No data';
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Consistent';
  if (score >= 50) return 'Average';
  return 'Needs Effort';
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getDayLogDetail(
  childId: string,
  date: string,         // YYYY-MM-DD
  dbsScore: number | null,
): DayLogDetail {
  const displayDate = formatDisplayDate(date);
  const label = dbsLabel(dbsScore);

  if (dbsScore === null) {
    return {
      date,
      displayDate,
      dbsScore: null,
      dbsLabel: 'No data',
      aspectLogs: [],
      positiveChips: [],
      negativeChips: [],
      summary: 'No behaviour data was logged for this day.',
    };
  }

  /* ── Aspect logs: each aspect gets a pseudo-random rating ── */
  let aspectLogs: DayAspectLog[] = DASHBOARD_RATING_ASPECTS.map((aspect) => {
    const hBase = hash(`${childId}:aspect:${date}:${aspect.id}`);
    
    // Determine number of entries (40% 0, 40% 1, 10% 2, 10% 3)
    let numEntries = 0;
    const rand = hBase % 100;
    if (rand < 40) numEntries = 0;
    else if (rand < 80) numEntries = 1;
    else if (rand < 90) numEntries = 2;
    else numEntries = 3;

    const entries: DayAspectLogEntry[] = [];
    for (let i = 0; i < numEntries; i++) {
      const h = hash(`${childId}:aspect:${date}:${aspect.id}:entry:${i}`);
      const scaleIndex = h % SCALE_OPTIONS.length;
      const option = SCALE_OPTIONS[scaleIndex];

      // Determine entry content type:
      // 0 = chips only, 1 = text note only, 2 = voice note only,
      // 3 = chips + text note, 4 = chips + voice note
      const contentType = h % 5;

      // Build chips (only for types 0, 3, 4)
      let chips: string[] = [];
      if (contentType === 0 || contentType === 3 || contentType === 4) {
        const allChips = option.value >= 0 ? REASON_CHIPS_POSITIVE : REASON_CHIPS_NEGATIVE;
        const chip1 = allChips[h % allChips.length].label;
        chips = [chip1];
        const chip2Count = h % 3;
        if (chip2Count > 0) {
          const chip2 = allChips[(h + 1) % allChips.length];
          if (chip2.label !== chip1) chips.push(chip2.label);
        }
      }

      // Text note pool
      const textNotePool = [
        'Showed great maturity today.',
        'Needed a gentle reminder but responded well.',
        'Made a positive difference in the family routine.',
        'Struggled a little but kept trying.',
        'Attitude improved significantly compared to yesterday.',
        'Was kind to siblings without being asked.',
        'Completed homework independently before dinner.',
        'Had a minor tantrum but recovered quickly.',
      ];

      // Build text note (only for types 1, 3)
      let textNote: string | null = null;
      if (contentType === 1 || contentType === 3) {
        textNote = textNotePool[h % textNotePool.length];
      }

      // Build voice note (only for types 2, 4)
      let voiceNote: { durationSec: number } | null = null;
      if (contentType === 2 || contentType === 4) {
        // Duration between 5s and 45s
        voiceNote = { durationSec: 5 + (h % 41) };
      }

      // Mock a realistic-looking time (e.g. 08:30 AM, 02:15 PM)
      const hour = 8 + (h % 12);
      const minute = (h % 4) * 15;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const time = `${displayHour}:${minute === 0 ? '00' : minute} ${ampm}`;

      entries.push({
        id: `${aspect.id}-${i}`,
        ratingValue: option.value,
        ratingLabel: option.label,
        chips,
        textNote,
        voiceNote,
        time,
      });
    }

    return {
      aspectId: aspect.id,
      aspectName: aspect.name,
      iconName: aspect.iconName,
      accent: aspect.accent,
      softBg: aspect.softBg,
      entries,
    };
  }).filter((log) => log.entries.length > 0);

  // Fallback if no entries generated but we have a score (dbsScore != null)
  if (aspectLogs.length === 0 && DASHBOARD_RATING_ASPECTS.length > 0) {
    const aspect = DASHBOARD_RATING_ASPECTS[0];
    aspectLogs = [{
      aspectId: aspect.id,
      aspectName: aspect.name,
      iconName: aspect.iconName,
      accent: aspect.accent,
      softBg: aspect.softBg,
      entries: [{
        id: `${aspect.id}-0`,
        ratingValue: 2,
        ratingLabel: 'Strong',
        chips: ['Listened well'],
        textNote: null,
        voiceNote: null,
        time: '4:30 PM',
      }]
    }];
  }

  /* ── Aggregate chips across all aspects ── */
  const positiveChips: string[] = [];
  const negativeChips: string[] = [];
  aspectLogs.forEach((log) => {
    log.entries.forEach((entry) => {
      if (entry.ratingValue >= 0) {
        entry.chips.forEach((c) => { if (!positiveChips.includes(c)) positiveChips.push(c); });
      } else {
        entry.chips.forEach((c) => { if (!negativeChips.includes(c)) negativeChips.push(c); });
      }
    });
  });

  /* ── Short summary ── */
  let totalEntries = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  
  aspectLogs.forEach(log => {
    log.entries.forEach(entry => {
      totalEntries++;
      if (entry.ratingValue > 0) positiveCount++;
      else if (entry.ratingValue < 0) negativeCount++;
    });
  });

  let summary: string;
  if (positiveCount >= 4) {
    summary = `Outstanding day! ${positiveCount} out of ${totalEntries} behaviour entries were rated positively. Keep reinforcing these patterns with consistent praise.`;
  } else if (positiveCount > negativeCount) {
    summary = `Good day overall with ${positiveCount} positive aspects. ${negativeCount > 0 ? `${negativeCount} area${negativeCount > 1 ? 's' : ''} still need attention.` : ''}`;
  } else if (negativeCount > positiveCount) {
    summary = `Challenging day — ${negativeCount} aspect${negativeCount > 1 ? 's' : ''} rated below expectations. Consider a calm check-in to understand what triggered the difficulties.`;
  } else {
    summary = `Mixed day with balanced positives and areas to improve. A good day to revisit expectations and celebrate small wins.`;
  }

  return {
    date,
    displayDate,
    dbsScore,
    dbsLabel: label,
    aspectLogs,
    positiveChips,
    negativeChips,
    summary,
  };
}
