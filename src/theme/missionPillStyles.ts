import { Platform } from 'react-native';
import { colors } from './colors';
import type { GoalStatus } from '../types';
import type {
  MentorDailyStatus,
  MentorMissionLifecycleStatus,
  MentorMissionType,
} from '../data/mentorMissions';

export function missionTypeChipStyle(type: MentorMissionType) {
  return type === 'daily-habit'
    ? { backgroundColor: colors.lavenderSoft, color: colors.primaryDark }
    : { backgroundColor: colors.peachSoft, color: '#9A5D14' };
}

export function lifecycleFloatingPalette(status: MentorMissionLifecycleStatus) {
  switch (status) {
    case 'completed':
      return {
        bg: colors.mintSoft,
        text: colors.growth,
        shadowColor: '#1A6B4A',
      };
    case 'expired':
      return {
        bg: colors.surfaceMuted,
        text: colors.textMuted,
        shadowColor: 'rgba(60, 55, 75, 0.35)',
      };
    default:
      return {
        bg: colors.lavenderSoft,
        text: colors.primaryDark,
        shadowColor: '#5E4FD4',
      };
  }
}

export function dailyFloatingPalette(status: MentorDailyStatus | null) {
  if (status === null) {
    return {
      bg: colors.surfaceMuted,
      text: colors.textMuted,
      shadowColor: 'rgba(60, 55, 75, 0.3)',
    };
  }
  switch (status) {
    case 'done':
      return {
        bg: colors.growth,
        text: colors.surface,
        shadowColor: '#1A6B4A',
      };
    case 'missed':
      return {
        bg: colors.error,
        text: colors.surface,
        shadowColor: '#B83838',
      };
    default:
      return {
        bg: colors.skySoft,
        text: colors.primaryDark,
        shadowColor: '#4A7BC8',
      };
  }
}

export function goalStatusFloatingPalette(status: GoalStatus) {
  switch (status) {
    case 'completed':
      return {
        bg: colors.mintSoft,
        text: colors.growth,
        shadowColor: '#1A6B4A',
      };
    // Missed the window — read as a warning, not a neutral state.
    case 'expired':
      return {
        bg: colors.peachSoft,
        text: colors.error,
        shadowColor: 'rgba(178, 46, 46, 0.35)',
      };
    case 'cancelled':
      return {
        bg: colors.surfaceMuted,
        text: colors.textMuted,
        shadowColor: 'rgba(60, 55, 75, 0.35)',
      };
    // Scheduled but not started yet.
    case 'upcoming':
      return {
        bg: colors.skySoft,
        text: colors.info,
        shadowColor: 'rgba(38, 118, 178, 0.35)',
      };
    case 'draft':
      return {
        bg: colors.surfaceMuted,
        text: colors.textSecondary,
        shadowColor: 'rgba(60, 55, 75, 0.35)',
      };
    // 'active'
    default:
      return {
        bg: colors.lavenderSoft,
        text: colors.primaryDark,
        shadowColor: '#5E4FD4',
      };
  }
}

export function floatingPillShadow(shadowColor: string) {
  return Platform.select({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
    },
    android: {
      elevation: 5,
      shadowColor,
    },
    default: {},
  });
}
