/**
 * Single locale for user-visible dates across the app (cards, detail, profile).
 */
export const APP_DATE_LOCALE = 'en-GB';

/**
 * Formats a calendar date for display. Accepts `YYYY-MM-DD` or full ISO strings.
 * Uses noon local time for date-only strings to avoid off-by-one from UTC midnight.
 */
export function formatAppDate(isoDate: string): string {
  const normalized = isoDate.trim();
  if (!normalized) {
    return '';
  }
  const parseInput =
    normalized.length === 10 && normalized[4] === '-' && normalized[7] === '-'
      ? `${normalized}T12:00:00`
      : normalized;
  const t = Date.parse(parseInput);
  if (Number.isNaN(t)) {
    return isoDate;
  }
  return new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(t));
}

/** A bare calendar date with no time part. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Formats a timestamp as `YYYY-MM-DD hh:mm am|pm` — e.g. `2026-08-10 11:46 pm`.
 *
 * Accepts both shapes the app sees: the API's full ISO string with an offset
 * (`2026-08-10T23:46:01+05:30`) and the plainer `2026-03-30 09:15`. A string
 * carrying an offset is converted to the device's local time; one without is
 * read as local wall-clock time. Date-only input is returned as-is (there is no
 * time to label), and anything unparseable is returned untouched.
 */
export function formatAppDateTime(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return '';
  }
  if (DATE_ONLY_RE.test(raw)) {
    return raw;
  }

  // `2026-03-30 09:15` is not spec-parseable; `2026-03-30T09:15` is.
  const t = Date.parse(raw.replace(' ', 'T'));
  if (Number.isNaN(t)) {
    return raw;
  }

  const d = new Date(t);
  const hours24 = d.getHours();
  const suffix = hours24 < 12 ? 'am' : 'pm';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(hours12)}:${pad2(d.getMinutes())} ${suffix}`
  );
}

/**
 * Month and year (e.g. membership / "member since" lines).
 */
export function formatAppMonthYear(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    month: 'short',
    year: 'numeric',
  }).format(d);
}
