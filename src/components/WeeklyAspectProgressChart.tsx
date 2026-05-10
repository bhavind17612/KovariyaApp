import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Card } from './Card';
import { colors, spacing, textStyles, borderRadius } from '../theme';
import type { RatingAspectDefinition } from '../data/aspectRating';
import {
  WEEKLY_PROGRESS_DAYS,
  type WeeklyAspectSeriesRow,
} from '../data/weeklyAspectProgress';

type Props = {
  aspects: RatingAspectDefinition[];
  series: WeeklyAspectSeriesRow[];
};

type Selection = { aspectId: string; dayIndex: number };

/** Short legend labels — full `aspect.name` stays on accessibility. */
const LEGEND_SHORT: Record<string, string> = {
  respect: 'Respect',
  responsibility: 'Resp.',
  kindness: 'Kindness',
  discipline: 'Discipl.',
  civic: 'Civic',
};

const PAD = { l: 28, r: 10, t: 6, b: 20 };
const PLOT_H = 132;
const Y_TICKS = [100, 75, 50, 25, 0];

function buildPoints(
  values: number[],
  innerW: number,
  innerH: number,
  n: number
): { x: number; y: number }[] {
  if (n <= 0) {
    return [];
  }
  if (n === 1) {
    const v = values[0] ?? 0;
    return [{ x: innerW / 2, y: (1 - v / 100) * innerH }];
  }
  return values.slice(0, n).map((v, i) => ({
    x: (i / (n - 1)) * innerW,
    y: (1 - v / 100) * innerH,
  }));
}

export const WeeklyAspectProgressChart = React.memo(function WeeklyAspectProgressChart({
  aspects,
  series,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [selected, setSelected] = useState<Selection | null>(null);

  const cardContentW = useMemo(
    () => Math.max(220, windowWidth - spacing.lg * 2 - spacing.md * 2),
    [windowWidth]
  );

  const plotW = cardContentW - PAD.l - PAD.r;
  const plotH = PLOT_H;
  const svgW = cardContentW;
  const svgH = PAD.t + plotH + PAD.b;

  const seriesMap = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const row of series) {
      m.set(row.aspectId, row.values);
    }
    return m;
  }, [series]);

  const aspectById = useMemo(() => {
    const m = new Map<string, RatingAspectDefinition>();
    for (const a of aspects) {
      m.set(a.id, a);
    }
    return m;
  }, [aspects]);

  useEffect(() => {
    setSelected(null);
  }, [series]);

  const onPointPress = useCallback((aspectId: string, dayIndex: number) => {
    setSelected((prev) =>
      prev?.aspectId === aspectId && prev?.dayIndex === dayIndex ? null : { aspectId, dayIndex }
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const detail = useMemo(() => {
    if (!selected) {
      return null;
    }
    const aspect = aspectById.get(selected.aspectId);
    const vals = seriesMap.get(selected.aspectId);
    if (!aspect || !vals || vals.length !== WEEKLY_PROGRESS_DAYS.length) {
      return null;
    }
    const day = WEEKLY_PROGRESS_DAYS[selected.dayIndex];
    const value = vals[selected.dayIndex] ?? 0;
    const prevVal = selected.dayIndex > 0 ? vals[selected.dayIndex - 1] : null;
    const delta =
      prevVal !== null ? Math.round((value - prevVal) * 10) / 10 : null;
    const weekAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const vsAvg = Math.round((value - weekAvg) * 10) / 10;
    return {
      aspectName: aspect.name,
      accent: aspect.accent,
      dayLabel: day.label,
      value,
      deltaPrev: delta,
      vsAvg,
    };
  }, [selected, aspectById, seriesMap]);

  return (
    <Card variant="elevated" padding={spacing.md} style={styles.card}>
      {/* Priority: title + context in one row — no stacked subtitle block */}
      <View style={styles.cardHeader}>
        <Text style={styles.title}>Weekly aspect progress</Text>
        <Text style={styles.headerContext} numberOfLines={1}>
          Mon–Sun
        </Text>
      </View>

      {/* Chart first: main visual without legend above it */}
      <View style={[styles.chartWrap, { height: svgH }]}>
        <Svg width={svgW} height={svgH}>
          {Y_TICKS.map((tick) => {
            const y = PAD.t + (1 - tick / 100) * plotH;
            return (
              <Line
                key={tick}
                x1={PAD.l}
                y1={y}
                x2={PAD.l + plotW}
                y2={y}
                stroke={colors.border}
                strokeWidth={tick === 0 || tick === 100 ? 1 : 0.5}
                strokeDasharray={tick === 0 || tick === 100 ? undefined : '4 6'}
                opacity={0.85}
              />
            );
          })}
          {Y_TICKS.map((tick) => (
            <SvgText
              key={`y-${tick}`}
              x={PAD.l - 4}
              y={PAD.t + (1 - tick / 100) * plotH + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {tick}
            </SvgText>
          ))}

          {aspects.map((aspect) => {
            const vals = seriesMap.get(aspect.id);
            if (!vals || vals.length !== WEEKLY_PROGRESS_DAYS.length) {
              return null;
            }
            const pts = buildPoints(vals, plotW, plotH, WEEKLY_PROGRESS_DAYS.length);
            const pointsStr = pts.map((p) => `${PAD.l + p.x},${PAD.t + p.y}`).join(' ');
            return (
              <Polyline
                key={aspect.id}
                points={pointsStr}
                fill="none"
                stroke={aspect.accent}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.92}
              />
            );
          })}

          {aspects.map((aspect) => {
            const vals = seriesMap.get(aspect.id);
            if (!vals || vals.length !== WEEKLY_PROGRESS_DAYS.length) {
              return null;
            }
            const pts = buildPoints(vals, plotW, plotH, WEEKLY_PROGRESS_DAYS.length);
            return pts.map((p, i) => {
              const cx = PAD.l + p.x;
              const cy = PAD.t + p.y;
              const isSel = selected?.aspectId === aspect.id && selected?.dayIndex === i;
              return (
                <Circle
                  key={`${aspect.id}-${i}`}
                  cx={cx}
                  cy={cy}
                  r={isSel ? 6 : 3.5}
                  fill={aspect.accent}
                  stroke={isSel ? colors.surface : 'transparent'}
                  strokeWidth={isSel ? 2 : 0}
                />
              );
            });
          })}

          {WEEKLY_PROGRESS_DAYS.map((d, i) => {
            const n = WEEKLY_PROGRESS_DAYS.length;
            const x = n <= 1 ? PAD.l + plotW / 2 : PAD.l + (i / (n - 1)) * plotW;
            return (
              <SvgText
                key={d.id}
                x={x}
                y={svgH - 4}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>

        <View style={[StyleSheet.absoluteFill, styles.hitLayer]} pointerEvents="box-none">
          {aspects.map((aspect) => {
            const vals = seriesMap.get(aspect.id);
            if (!vals || vals.length !== WEEKLY_PROGRESS_DAYS.length) {
              return null;
            }
            const pts = buildPoints(vals, plotW, plotH, WEEKLY_PROGRESS_DAYS.length);
            return pts.map((p, i) => {
              const cx = PAD.l + p.x;
              const cy = PAD.t + p.y;
              return (
                <Pressable
                  key={`hit-${aspect.id}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${aspect.name}, ${WEEKLY_PROGRESS_DAYS[i].label}, ${vals[i]
                    } percent`}
                  onPress={() => onPointPress(aspect.id, i)}
                  style={[
                    styles.hit,
                    {
                      left: cx - 22,
                      top: cy - 22,
                    },
                  ]}
                />
              );
            });
          })}
        </View>
      </View>

      {/* Legend grouped in scroll — one row, no wrapping clutter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.legendScrollContent}
        style={styles.legendScroll}
      >
        {aspects.map((a) => (
          <View
            key={a.id}
            style={styles.legendChip}
            accessibilityLabel={`${a.name}: legend colour ${LEGEND_SHORT[a.id] ?? a.name}`}
          >
            <View style={[styles.legendSwatch, { backgroundColor: a.accent }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {LEGEND_SHORT[a.id] ?? a.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      {!detail ? (
        <Text style={styles.helperLine}>
          Colour = behaviour area · tap a point for day score &amp; comparisons.
        </Text>
      ) : null}

      {detail ? (
        <View style={[styles.detailBox, { borderLeftColor: detail.accent }]}>
          <View style={styles.detailMainRow}>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailTitle} numberOfLines={2}>
                {detail.aspectName} · {detail.dayLabel}
              </Text>
              <Text style={styles.detailMeta}>
                {detail.deltaPrev !== null
                  ? `vs prev day ${detail.deltaPrev >= 0 ? '+' : ''}${detail.deltaPrev}%`
                  : 'vs prev day —'}
                {' · '}
                {`vs week avg ${detail.vsAvg >= 0 ? '+' : ''}${detail.vsAvg}%`}
              </Text>
            </View>
            <Text style={styles.detailScore}>{detail.value}%</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    // marginHorizontal: spacing.lg,
    // marginVertical: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.headingMedium,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  headerContext: {
    ...textStyles.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chartWrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  hitLayer: {
    marginTop: 0,
  },
  hit: {
    position: 'absolute',
    width: 44,
    height: 44,
  },
  legendScroll: {
    marginBottom: spacing.sm,
    marginHorizontal: -4,
  },
  legendScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...textStyles.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helperLine: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  detailBox: {
    borderLeftWidth: 4,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
  },
  detailMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detailTextCol: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    ...textStyles.bodyLarge,
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  detailMeta: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  detailScore: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
});
