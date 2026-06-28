import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card } from './Card';
import { colors, spacing, textStyles, borderRadius } from '../theme';
import type { AiWeeklySummary } from '../types/aiSummary';

type Props = {
  summary: AiWeeklySummary;
  /** Called once when the parent has seen an unread summary (marks it read). */
  onRead?: (uuid: string) => void;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "2026-06-13" or "2026-06-13T18:30:00.000Z" → "Jun 13".
 * Returns the raw value if it can't be parsed.
 */
function formatDay(iso: string): string {
  if (!iso) return '';
  // Keep only the calendar-date portion before any time component.
  const datePart = iso.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length < 3) return iso;
  const month = MONTHS[Number(parts[1]) - 1];
  const day = Number(parts[2]);
  if (!month || Number.isNaN(day)) return iso;
  return `${month} ${day}`;
}

export const AIInsightsCard = React.memo(function AIInsightsCard({ summary, onRead }: Props) {
  const { uuid, title, summaryText, actionText, periodStart, periodEnd, readStatus } = summary;
  const [unread, setUnread] = useState(!readStatus);
  const firedFor = useRef<string | null>(null);

  // Auto-mark as read shortly after the unread summary is on screen — the parent
  // is reading it inline on the dashboard. Fire at most once per summary uuid.
  useEffect(() => {
    setUnread(!readStatus);
    if (readStatus || !uuid || firedFor.current === uuid) return;
    const timer = setTimeout(() => {
      firedFor.current = uuid;
      setUnread(false);
      onRead?.(uuid);
    }, 1500);
    return () => clearTimeout(timer);
  }, [uuid, readStatus, onRead]);

  const periodLabel = `${formatDay(periodStart)} – ${formatDay(periodEnd)}`;

  return (
    <Card variant="elevated" padding={spacing.md} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Icon name="auto-awesome" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleLine}>
            <Text style={styles.title} numberOfLines={1}>
              AI Insights
            </Text>
            
            {unread ? (
              <View style={styles.newPill}>
                <Text style={styles.newPillText}>NEW</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.subtitle} numberOfLines={2}>
            Short summaries from what you log each day.
          </Text>
        </View>
      </View>

      {/* Insights text on a soft lavender (default theme) tint */}
      <View style={styles.summaryBlock}>
        <View style={styles.periodChip}>
          <Icon name="event" size={13} color={colors.primaryDark} />
          <Text style={styles.period}>{periodLabel}</Text>
        </View>
        <Text style={styles.summaryText}>{summaryText}</Text>
      </View>

      {actionText ? (
        <View style={styles.actionBlock}>
          <View style={styles.actionIconWrap}>
            <Icon name="lightbulb" size={18} color={colors.accent} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionLabel}>Suggested next step</Text>
            <Text style={styles.actionText}>{actionText}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.22)',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...textStyles.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  subtitle: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  newPillText: {
    ...textStyles.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.22)',
  },
  period: {
    ...textStyles.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.2,
  },
  summaryBlock: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.18)',
  },
  summaryText: {
    ...textStyles.bodyMedium,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  actionBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 160, 74, 0.3)',
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 160, 74, 0.4)',
  },
  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionLabel: {
    ...textStyles.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#8B4514',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  actionText: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    color: '#5C3D1E',
    fontWeight: '500',
  },
});
