import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Card } from './Card';
import { colors, spacing, textStyles, borderRadius } from '../theme';
import type { AIInsightsPayload } from '../types';

type Props = {
  payload: AIInsightsPayload;
};

type InsightTab = 'positive' | 'attention';

export const AIInsightsCard = React.memo(function AIInsightsCard({ payload }: Props) {
  const { title, subtitle, sourceLabel, positive, attention } = payload;
  const [tab, setTab] = useState<InsightTab>('positive');

  const onTabChange = useCallback((next: InsightTab) => {
    setTab(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const activeBlock = tab === 'positive' ? positive : attention;

  return (
    <Card variant="elevated" padding={spacing.md} style={styles.card}>
      {/* Single header cluster: icon + titles + source in one flow — less vertical stacking */}
      <View style={styles.headerCluster}>
        <View style={styles.titleIconWrap}>
          <Icon name="auto-awesome" size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
          <Text style={styles.sourceMerged} numberOfLines={2}>
            {sourceLabel}
          </Text>
        </View>
      </View>

      {/* Tabs: one section at a time — same card height feels shorter than two stacked blocks */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => onTabChange('positive')}
          style={[styles.tab, tab === 'positive' && styles.tabActivePositive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'positive' }}
        >
          <Icon
            name="trending-up"
            size={18}
            color={tab === 'positive' ? colors.growth : colors.textMuted}
          />
          <Text style={[styles.tabLabel, tab === 'positive' && styles.tabLabelActivePositive]}>
            Going well
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onTabChange('attention')}
          style={[styles.tab, tab === 'attention' && styles.tabActiveAttention]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'attention' }}
        >
          <Icon
            name="flag"
            size={18}
            color={tab === 'attention' ? colors.warning : colors.textMuted}
          />
          <Text style={[styles.tabLabel, tab === 'attention' && styles.tabLabelActiveAttention]}>
            Needs attention
          </Text>
        </Pressable>
      </View>

      <View style={[styles.block, tab === 'positive' ? styles.blockPositive : styles.blockAttention]}>
        <View style={styles.blockHeader}>
          <View
            style={[
              styles.blockIconCircle,
              tab === 'positive' ? styles.blockIconPositive : styles.blockIconAttention,
            ]}
          >
            <Icon name={activeBlock.iconName} size={20} color={tab === 'positive' ? colors.growth : colors.warning} />
          </View>
          <View style={styles.blockHeaderText}>
            <Text
              style={tab === 'positive' ? styles.blockHeadingPositive : styles.blockHeadingAttention}
            >
              {activeBlock.heading}
            </Text>
            <Text style={styles.blockSub}>{activeBlock.subheading}</Text>
          </View>
        </View>
        {activeBlock.lines.map((line, i) => (
          <View key={line.id} style={[styles.lineRow, i === 0 && styles.lineRowFirst]}>
            <Icon
              name={tab === 'positive' ? 'check-circle' : 'arrow-circle-right'}
              size={18}
              color={tab === 'positive' ? colors.growth : colors.warning}
              style={styles.lineIcon}
            />
            <Text style={tab === 'positive' ? styles.lineText : styles.lineTextAttention}>
              {line.text}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    // marginHorizontal: spacing.lg,
    // marginVertical: spacing.xs,
  },
  headerCluster: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 106, 232, 0.22)',
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...textStyles.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  sourceMerged: {
    ...textStyles.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tabActivePositive: {
    backgroundColor: colors.mintSoft,
    borderColor: 'rgba(63, 169, 122, 0.45)',
  },
  tabActiveAttention: {
    backgroundColor: colors.peachSoft,
    borderColor: 'rgba(232, 160, 74, 0.5)',
  },
  tabLabel: {
    ...textStyles.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  tabLabelActivePositive: {
    color: '#145A3D',
  },
  tabLabelActiveAttention: {
    color: '#8B4514',
  },
  block: {
    borderRadius: borderRadius.large,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  blockPositive: {
    backgroundColor: colors.mintSoft,
    borderColor: 'rgba(63, 169, 122, 0.28)',
  },
  blockAttention: {
    backgroundColor: colors.peachSoft,
    borderColor: 'rgba(232, 160, 74, 0.35)',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  blockIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  blockIconPositive: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(63, 169, 122, 0.35)',
  },
  blockIconAttention: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(232, 160, 74, 0.45)',
  },
  blockHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  blockHeadingPositive: {
    ...textStyles.headingMedium,
    fontSize: 17,
    fontWeight: '800',
    color: '#145A3D',
    letterSpacing: -0.2,
  },
  blockHeadingAttention: {
    ...textStyles.headingMedium,
    fontSize: 17,
    fontWeight: '800',
    color: '#8B4514',
    letterSpacing: -0.2,
  },
  blockSub: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  lineRowFirst: {
    marginTop: 0,
  },
  lineIcon: {
    marginTop: 2,
  },
  lineText: {
    ...textStyles.bodyMedium,
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  lineTextAttention: {
    ...textStyles.bodyMedium,
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: '#5C3D1E',
  },
});
