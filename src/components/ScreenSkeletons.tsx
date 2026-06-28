import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { borderRadius, colors, spacing } from '../theme';
import { SkeletonBox, SkeletonShimmer } from './Skeleton';

/**
 * Shared list skeletons for the Missions and Goals screens.
 *
 * They mirror the real card layouts (padding, radius, row structure) so the
 * swap from skeleton → content causes no layout shift, and they reuse the same
 * SkeletonBox/SkeletonShimmer primitives + shadowWrapper card shell as the
 * Dashboard skeletons for a consistent shimmer animation and styling.
 */

/* ─── Missions ─── */

function MissionCardSkeleton() {
  return (
    <View style={[styles.cardShell, styles.cardPadMd]}>
      {/* Header: title lines + status pill */}
      <View style={styles.rowBetween}>
        <View style={styles.flex1}>
          <SkeletonBox width="72%" height={16} />
          <SkeletonBox width="46%" height={12} style={styles.gap8} />
        </View>
        <SkeletonBox width={78} height={26} radius={borderRadius.full} />
      </View>

      {/* Description */}
      <View style={styles.blockSm}>
        <SkeletonBox width="100%" height={10} />
        <SkeletonBox width="88%" height={10} style={styles.gap8} />
      </View>

      {/* Badge row: type chip + daily pill */}
      <View style={styles.rowBetween}>
        <SkeletonBox width={96} height={26} radius={borderRadius.full} />
        <SkeletonBox width={120} height={28} radius={borderRadius.full} />
      </View>

      {/* Date row */}
      <View style={[styles.rowBetween, styles.gap8]}>
        <SkeletonBox width="40%" height={10} />
        <SkeletonBox width="40%" height={10} />
      </View>

      {/* Progress */}
      <View style={styles.blockMd}>
        <View style={[styles.rowBetween, styles.gap0]}>
          <SkeletonBox width={64} height={10} />
          <SkeletonBox width={34} height={10} />
        </View>
        <SkeletonBox width="100%" height={8} radius={borderRadius.full} style={styles.gap8} />
      </View>

      <SkeletonShimmer />
    </View>
  );
}

/** A list of mission card placeholders that matches the live Missions list. */
export function MissionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.listPad}>
      {Array.from({ length: count }).map((_, i) => (
        <MissionCardSkeleton key={i} />
      ))}
    </View>
  );
}

/* ─── Goals ─── */

function GoalSummaryStripSkeleton() {
  return (
    <View style={[styles.summaryStrip, styles.cardPadMd]}>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={styles.summaryDivider} /> : null}
          <View style={styles.summaryStatCol}>
            <SkeletonBox width={32} height={32} radius={16} />
            <SkeletonBox width={24} height={18} style={styles.gap6} />
            <SkeletonBox width={40} height={10} style={styles.gap6} />
          </View>
        </React.Fragment>
      ))}
      <SkeletonShimmer />
    </View>
  );
}

function GoalCardSkeleton() {
  return (
    <View style={[styles.cardShell, styles.cardPadMd]}>
      {/* Header: status orb + title + status pill */}
      <View style={styles.rowBetween}>
        <View style={styles.rowStart}>
          <SkeletonBox width={34} height={34} radius={17} />
          <View style={styles.flex1}>
            <SkeletonBox width="80%" height={15} />
            <SkeletonBox width="50%" height={11} style={styles.gap8} />
          </View>
        </View>
        <SkeletonBox width={74} height={26} radius={borderRadius.full} />
      </View>

      {/* Reward strip */}
      <SkeletonBox
        width="100%"
        height={46}
        radius={borderRadius.large}
        style={styles.blockMd}
      />

      {/* Meta grid */}
      <View style={[styles.rowBetween, styles.blockSm]}>
        <SkeletonBox width="46%" height={10} />
        <SkeletonBox width="28%" height={10} />
      </View>

      {/* Progress */}
      <View style={styles.blockMd}>
        <View style={[styles.rowBetween, styles.gap0]}>
          <SkeletonBox width={64} height={10} />
          <SkeletonBox width={34} height={10} />
        </View>
        <SkeletonBox width="100%" height={8} radius={borderRadius.full} style={styles.gap8} />
      </View>

      <SkeletonShimmer />
    </View>
  );
}

/** Summary strip + goal card placeholders that match the live Goals list. */
export function GoalsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listPad}>
      <GoalSummaryStripSkeleton />
      {Array.from({ length: count }).map((_, i) => (
        <GoalCardSkeleton key={i} />
      ))}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  listPad: {
    padding: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cardShell: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    ...cardShadow,
  },
  cardPadMd: {
    padding: spacing.md,
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowStart: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  blockSm: {
    marginTop: spacing.sm,
  },
  blockMd: {
    marginTop: spacing.md,
  },
  gap0: {
    marginTop: 0,
  },
  gap6: {
    marginTop: 6,
  },
  gap8: {
    marginTop: 8,
  },
  /* Goals summary strip */
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...cardShadow,
  },
  summaryStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: colors.border,
  },
});
