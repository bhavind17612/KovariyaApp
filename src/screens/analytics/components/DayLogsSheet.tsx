import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, Easing } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { colors, spacing, textStyles, borderRadius } from '../../../theme';
import { getDayLogDetail, type DayAspectLog } from '../../../data/dayLogs';
import { heatmapColor } from '../utils';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Props                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
interface DayLogsSheetProps {
  visible: boolean;
  childId: string;
  date: string | null;       // YYYY-MM-DD
  dbsScore: number | null;
  onClose: () => void;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  BSI score label → colour mapping                                  */
/* ═══════════════════════════════════════════════════════════════════ */
function labelColor(label: string): string {
  switch (label) {
    case 'Excellent': return '#2E8B57';
    case 'Consistent': return '#7BCF7B';
    case 'Average': return '#E8A04A';
    default: return '#E87070';
  }
}

function labelBg(label: string): string {
  switch (label) {
    case 'Excellent': return '#E6F7EE';
    case 'Consistent': return '#F0FAF0';
    case 'Average': return '#FEF5E7';
    default: return '#FEF0F0';
  }
}

function ratingColor(value: number): string {
  if (value >= 2) return '#166534';
  if (value > 0) return '#15803D';
  if (value >= -1) return '#D97706';
  return '#B91C1C';
}
function ratingBg(value: number): string {
  if (value > 0) return '#F0FDF4';
  if (value === 0) return '#FAFAFA';
  return '#FEF2F2';
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                    */
/* ═══════════════════════════════════════════════════════════════════ */
/* ── Helper: format seconds to mm:ss ── */
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const AspectLogCard = React.memo(function AspectLogCard({ log }: { log: DayAspectLog }) {
  return (
    <View style={[card.wrap, { borderLeftColor: log.accent }]}>
      {/* Header row */}
      <View style={card.header}>
        <View style={[card.iconCircle, { backgroundColor: log.softBg }]}>
          <Icon name={log.iconName} size={16} color={log.accent} />
        </View>
        <View style={card.titleCol}>
          <Text style={card.aspectName}>{log.aspectName}</Text>
          <Text style={card.entriesCount}>
            {log.entries.length} log{log.entries.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Entries */}
      <View style={card.entriesWrap}>
        {log.entries.map((entry, index) => {
          const pointText = entry.ratingValue > 0 ? `+${entry.ratingValue}` : `${entry.ratingValue}`;
          const hasChips = entry.chips.length > 0;
          const hasTextNote = !!entry.textNote;
          const hasVoiceNote = !!entry.voiceNote;

          return (
            <View
              key={entry.id}
              style={[
                card.entryRow,
                { backgroundColor: ratingBg(entry.ratingValue) },
                index > 0 && card.entryDivider,
              ]}
            >
              {/* Entry header */}
              <View style={card.entryHeaderRow}>
                <View style={card.entryTimeWrap}>
                  <Icon name="schedule" size={10} color={colors.textMuted} />
                  <Text style={card.entryTime}>{entry.time}</Text>
                </View>
                <Text style={[card.ratingLabel, { color: ratingColor(entry.ratingValue) }]}>
                  {entry.ratingLabel}
                </Text>
                <View style={{ flex: 1 }} />
                <View style={[card.scorePill, { backgroundColor: log.softBg }]}>
                  <Text style={[card.scoreText, { color: log.accent }]}>{pointText} pts</Text>
                </View>
              </View>

              {/* Chips */}
              {hasChips && (
                <View style={card.chipsRow}>
                  {entry.chips.map((chip) => (
                    <View
                      key={chip}
                      style={[
                        card.chip,
                        entry.ratingValue >= 0 ? card.chipPos : card.chipNeg,
                      ]}
                    >
                      <Text
                        style={[
                          card.chipText,
                          entry.ratingValue >= 0 ? card.chipTextPos : card.chipTextNeg,
                        ]}
                      >
                        {chip}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Text note */}
              {hasTextNote && (
                <View style={card.textNoteWrap}>
                  <Icon name="chat-bubble-outline" size={12} color={colors.textSecondary} />
                  <Text style={card.textNoteText}>{entry.textNote}</Text>
                </View>
              )}

              {/* Voice note */}
              {hasVoiceNote && entry.voiceNote && (
                <View style={card.voiceNoteWrap}>
                  <View style={card.voicePlayBtn}>
                    <Icon name="play-arrow" size={14} color="#FFF" />
                  </View>
                  <View style={card.voiceWaveWrap}>
                    {/* Fake waveform bars */}
                    {Array.from({ length: 16 }).map((_, bi) => {
                      const barH = 4 + ((bi * 7 + 3) % 12);
                      return (
                        <View
                          key={bi}
                          style={[
                            card.voiceBar,
                            { height: barH },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={card.voiceDuration}>
                    {formatDuration(entry.voiceNote.durationSec)}
                  </Text>
                </View>
              )}

              {/* Content type indicator when no chips/note (shouldn't happen, but safety) */}
              {!hasChips && !hasTextNote && !hasVoiceNote && (
                <Text style={card.emptyEntry}>Rating logged</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
});

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main sheet                                                        */
/* ═══════════════════════════════════════════════════════════════════ */
const DayLogsSheet: React.FC<DayLogsSheetProps> = ({
  visible,
  childId,
  date,
  dbsScore,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const detail = useMemo(() => {
    if (!date) return null;
    return getDayLogDetail(childId, date, dbsScore);
  }, [childId, date, dbsScore]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!detail) return null;

  const accentColor = heatmapColor(detail.dbsScore);
  const lColor = labelColor(detail.dbsLabel);
  const lBg = labelBg(detail.dbsLabel);
  const hasData = detail.dbsScore !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={s.root}>
        {/* Backdrop */}
        <Pressable style={s.backdrop} onPress={handleClose} accessibilityLabel="Dismiss" />

        {/* Sheet */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={[
            s.sheet,
            {
              maxHeight: windowHeight * 0.88,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          {/* Grabber */}
          <View style={s.grabber} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <View style={s.headerLeft}>
              {/* DBS colour dot */}
              <View style={[s.dateDot, { backgroundColor: accentColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.dateLabel}>{detail.displayDate}</Text>
                <View style={[s.scoreBadge, { backgroundColor: lBg }]}>
                  <Text style={[s.scoreBadgeText, { color: lColor }]}>
                    {hasData
                      ? `DBS ${detail.dbsScore}  ·  ${detail.dbsLabel}`
                      : 'No data logged'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              style={s.closeBtn}
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Icon name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            {/* ── DBS Score Arc / Gauge ── */}
            {hasData && (
              <Animated.View
                entering={FadeInUp.delay(60).springify().damping(18)}
                style={[s.gaugeCard, { borderColor: accentColor + '55' }]}
              >
                <View style={[s.gaugeBar]}>
                  <View
                    style={[
                      s.gaugeFill,
                      {
                        width: `${detail.dbsScore ?? 0}%` as any,
                        backgroundColor: accentColor,
                      },
                    ]}
                  />
                </View>
                <View style={s.gaugeFooter}>
                  <Text style={[s.gaugeScore, { color: lColor }]}>
                    {detail.dbsScore}
                  </Text>
                  <Text style={s.gaugeOf}>/100  Overall Behaviour Score Index</Text>
                </View>
              </Animated.View>
            )}

            {/* ── Summary ── */}
            {hasData && (
              <Animated.View
                entering={FadeInUp.delay(120).springify().damping(18)}
                style={s.summaryCard}
              >
                <View style={s.summaryIconRow}>
                  <Icon name="auto-awesome" size={14} color={colors.primary} />
                  <Text style={s.summaryEyebrow}>DAY SUMMARY</Text>
                </View>
                <Text style={s.summaryText}>{detail.summary}</Text>
              </Animated.View>
            )}

            {/* ── Behaviour chip pills ── */}
            {hasData && (detail.positiveChips.length > 0 || detail.negativeChips.length > 0) && (
              <Animated.View entering={FadeInUp.delay(180).springify().damping(18)}>
                <Text style={s.sectionLabel}>BEHAVIOUR CHIPS</Text>
                <View style={s.chipsWrap}>
                  {detail.positiveChips.map((c) => (
                    <View key={c} style={[s.bigChip, s.bigChipPos]}>
                      <Icon name="thumb-up" size={10} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={[s.bigChipText, { color: '#166534' }]}>{c}</Text>
                    </View>
                  ))}
                  {detail.negativeChips.map((c) => (
                    <View key={c} style={[s.bigChip, s.bigChipNeg]}>
                      <Icon name="thumb-down" size={10} color="#B91C1C" style={{ marginRight: 4 }} />
                      <Text style={[s.bigChipText, { color: '#991B1B' }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── Aspect logs ── */}
            {hasData && detail.aspectLogs.length > 0 && (
              <Animated.View entering={FadeInUp.delay(240).springify().damping(18)}>
                <Text style={s.sectionLabel}>ASPECT LOGS</Text>
                <View style={s.aspectsStack}>
                  {detail.aspectLogs.map((log) => (
                    <AspectLogCard key={log.aspectId} log={log} />
                  ))}
                </View>
              </Animated.View>
            )}

            {/* No data state */}
            {!hasData && (
              <View style={s.emptyState}>
                <Icon name="event-busy" size={48} color={colors.textMuted} />
                <Text style={s.emptyTitle}>No logs for this day</Text>
                <Text style={s.emptySubtitle}>
                  Tap a coloured day on the calendar to see behaviour ratings and aspect logs.
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal >
  );
};

export default React.memo(DayLogsSheet);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Styles                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.52)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 24 },
    }),
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dateDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  dateLabel: {
    ...textStyles.headingMedium,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  /* DBS gauge bar */
  gaugeCard: {
    backgroundColor: '#FAFBFF',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  gaugeBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  gaugeScore: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  gaugeOf: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  /* Summary */
  summaryCard: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,106,232,0.14)',
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  summaryText: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 20,
  },
  /* Section labels */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  /* Chip pill row */
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  bigChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bigChipPos: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(22,163,74,0.22)',
  },
  bigChipNeg: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220,38,38,0.18)',
  },
  bigChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  /* Aspect stack */
  aspectsStack: {
    gap: spacing.sm,
  },
  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...textStyles.headingMedium,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySubtitle: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

/* ─── Aspect log card styles ─── */
const card = StyleSheet.create({
  wrap: {
    borderRadius: borderRadius.large,
    borderLeftWidth: 3,
    backgroundColor: '#FAFAFA',
    padding: spacing.xs,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17,17,17,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  aspectName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  entriesCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  entriesWrap: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  entryRow: {
    borderRadius: borderRadius.medium,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17,17,17,0.04)',
  },
  entryDivider: {
    marginTop: 0,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  entryTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ratingLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  scorePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipPos: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(22,163,74,0.25)',
  },
  chipNeg: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(220,38,38,0.22)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextPos: { color: '#166534' },
  chipTextNeg: { color: '#991B1B' },
  /* Text note */
  textNoteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  textNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 17,
  },
  /* Voice note */
  voiceNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(124,106,232,0.06)',
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,106,232,0.12)',
  },
  voicePlayBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWaveWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  voiceBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(124,106,232,0.35)',
  },
  voiceDuration: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },
  /* Empty fallback */
  emptyEntry: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
