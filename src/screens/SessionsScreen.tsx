import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type View as RNView,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { apiClient } from '../api/client';
import { AppGradientHeader, Card } from '../components';
import { useToast } from '../context/ToastContext';
import {
  borderRadius,
  colors,
  getFloatingTabBarBottomPadding,
  spacing,
  textStyles,
  typography,
} from '../theme';
import { floatingPillShadow } from '../theme/missionPillStyles';
import { getDisplayMessage } from '../utils/errorParser';


// ─── Types ────────────────────────────────────────────────────────────────────

type SessionGroup = 'Upcoming' | 'Conducted' | 'Watch Session';

type SessionItem = {
  id: string;
  group: SessionGroup;
  title: string;
  shortDescription: string;
  description: string;
  date: string;
  duration: string;
  imageUri: string;
  bullets: string[];
  whyItMatters: string;
  tipsForParents: string;
};

// ─── Status pill palette (matches mission floating-pill pattern) ─────────────

type StatusPalette = {
  label: string;
  bg: string;
  text: string;
  shadowColor: string;
  icon: string;
  accent: string;
  tint: string;
  border: string;
};

function sessionStatusPalette(group: SessionGroup): StatusPalette {
  switch (group) {
    case 'Upcoming':
      return {
        label: 'Upcoming',
        bg: colors.lavenderSoft,
        text: colors.primaryDark,
        shadowColor: '#5E4FD4',
        icon: 'schedule',
        accent: colors.primaryDark,
        tint: 'rgba(124, 106, 232, 0.08)',
        border: 'rgba(124, 106, 232, 0.14)',
      };
    case 'Conducted':
      return {
        label: 'Conducted',
        bg: colors.mintSoft,
        text: colors.growth,
        shadowColor: '#1A6B4A',
        icon: 'check-circle',
        accent: colors.growth,
        tint: 'rgba(63, 169, 122, 0.08)',
        border: 'rgba(63, 169, 122, 0.14)',
      };
    case 'Watch Session':
      return {
        label: 'Watch Session',
        bg: colors.peachSoft,
        text: '#9A5D14',
        shadowColor: '#9A5D14',
        icon: 'play-circle-filled',
        accent: colors.accent,
        tint: 'rgba(232, 160, 74, 0.08)',
        border: 'rgba(232, 160, 74, 0.16)',
      };
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SESSION_GROUPS: SessionGroup[] = ['Upcoming', 'Conducted', 'Watch Session'];

type ApiSession = {
  id?: number | string;
  uuid?: string;
  session_code?: string;
  session_name?: string;
  short_description?: string | null;
  description?: string | null;
  banner_image_url?: string | null;
  video_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
};

type SessionsApiResponse =
  | ApiSession[]
  | {
      success?: boolean;
      data?: ApiSession[] | { sessions?: ApiSession[]; rows?: ApiSession[]; items?: ApiSession[] } | null;
      sessions?: ApiSession[];
      message?: string;
      error?: string | { message?: string } | null;
    };

const FALLBACK_SESSION_IMAGE =
  'https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?w=600&q=80';

function extractApiSessions(payload: SessionsApiResponse): ApiSession[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.sessions)) return payload.data.sessions;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }
  if (Array.isArray(payload.sessions)) return payload.sessions;
  return [];
}

function extractSessionsError(payload: SessionsApiResponse): string {
  if (Array.isArray(payload)) return 'Could not load sessions. Please try again.';
  if (payload.error && typeof payload.error === 'object' && payload.error.message?.trim()) {
    return payload.error.message.trim();
  }
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim();
  return 'Could not load sessions. Please try again.';
}

function formatSessionDate(start?: string | null, end?: string | null): string {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (startDate && !Number.isNaN(startDate.getTime())) {
    const startText = formatter.format(startDate);
    if (endDate && !Number.isNaN(endDate.getTime())) {
      const endText = formatter.format(endDate);
      return startText === endText ? startText : `${startText} - ${endText}`;
    }
    return startText;
  }

  return 'Date to be announced';
}

function formatSessionDuration(start?: string | null, end?: string | null): string {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    const days = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
    );
    return days === 1 ? '1 day' : `${days} days`;
  }
  return 'Session';
}

function mapSessionGroup(status?: string | null, videoUrl?: string | null): SessionGroup {
  const normalized = (status ?? '').trim().toUpperCase();
  if (normalized === 'UPCOMING' || normalized === 'SCHEDULED') return 'Upcoming';
  if (videoUrl) return 'Watch Session';
  return 'Conducted';
}

function mapApiSessionToItem(session: ApiSession, index: number): SessionItem {
  const shortDescription = session.short_description?.trim() || 'Session details will be shared soon.';
  const description = session.description?.trim() || shortDescription;

  return {
    id: String(session.uuid ?? session.id ?? session.session_code ?? `session-${index}`),
    group: mapSessionGroup(session.status, session.video_url),
    title: session.session_name?.trim() || 'Session',
    shortDescription,
    description,
    date: formatSessionDate(session.start_date, session.end_date),
    duration: formatSessionDuration(session.start_date, session.end_date),
    imageUri: session.banner_image_url?.trim() || FALLBACK_SESSION_IMAGE,
    bullets: [shortDescription],
    whyItMatters: description,
    tipsForParents: 'Please check the session details and follow updates from the school.',
  };
}


// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ group }: { group: SessionGroup }) {
  const pal = sessionStatusPalette(group);
  return (
    <View
      style={[
        styles.floatingPill,
        floatingPillShadow(pal.shadowColor),
        { backgroundColor: pal.bg },
      ]}
    >
      <Icon name={pal.icon} size={12} color={pal.accent} />
      <Text style={[styles.floatingPillText, { color: pal.text }]}>
        {pal.label}
      </Text>
    </View>
  );
}

// ─── Session Card (list item) ─────────────────────────────────────────────────

function SessionCard({ session }: { session: SessionItem }) {
  const isUpcoming = session.group === 'Upcoming';
  const isReplay = session.group === 'Watch Session';
  const isConducted = session.group === 'Conducted';
  const pal = sessionStatusPalette(session.group);

  return (
    <Card
      variant="elevated"
      padding={0}
      style={StyleSheet.flatten([styles.sessionCard, { borderColor: pal.border }])}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: session.imageUri }}
          style={styles.image}
          resizeMode="cover"
        />
        {isUpcoming ? <View style={styles.imageLockedOverlay} /> : null}
        {isReplay ? (
          <View style={styles.playIconWrap}>
            <View style={styles.playIconCircle}>
              <Icon name="play-arrow" size={24} color="#fff" />
            </View>
          </View>
        ) : null}
        <View style={styles.durationChip}>
          <Icon name="timer" size={12} color="rgba(255,255,255,0.92)" />
          <Text style={styles.durationChipText}>{session.duration}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[
                styles.cardTitle,
                isUpcoming && styles.cardTitleUpcoming,
                isConducted && styles.cardTitleConducted,
              ]}
              numberOfLines={2}
            >
              {session.title}
            </Text>
          </View>
          <StatusPill group={session.group} />
        </View>

        <Text
          style={[styles.cardDesc, isUpcoming && styles.textMutedSoft]}
          numberOfLines={2}
        >
          {session.shortDescription}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: colors.skySoft }]}>
            <Icon name="event" size={13} color={colors.primaryDark} />
            <Text style={styles.metaChipText}>{session.date}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: pal.tint }]}>
            <Icon name={isReplay ? 'play-circle-outline' : 'schedule'} size={13} color={pal.accent} />
            <Text style={[styles.metaChipText, { color: pal.accent }]}>
              {isUpcoming ? 'Live soon' : isReplay ? 'Watch Session' : 'Completed'}
            </Text>
          </View>
        </View>

        {isUpcoming ? (
          <View style={styles.lockedStrip}>
            <Icon name="lock-outline" size={14} color={colors.textMuted} />
            <Text style={styles.lockedText}>Available after the live session</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

// ─── Detail Cards ─────────────────────────────────────────────────────────────

function DetailHeroCard({ session }: { session: SessionItem }) {
  return (
    <Card variant="elevated" style={styles.detailCard} padding={0}>
      <View style={styles.heroImageWrap}>
        <Image
          source={{ uri: session.imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      </View>
      <View style={styles.detailCardPad}>
        <Text style={styles.detailHeroTitle}>{session.title}</Text>
        <Text style={styles.detailHeroDesc}>{session.description}</Text>
        <View style={styles.heroChipRow}>
          <View style={[styles.heroChip, { backgroundColor: colors.skySoft }]}>
            <Icon name="event" size={14} color={colors.primaryDark} />
            <Text style={styles.heroChipText}>{session.date}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function DetailCoveredCard({ session }: { session: SessionItem }) {
  return (
    <Card variant="elevated" style={styles.detailCard} padding={0}>
      <View style={styles.detailCardPad}>
        <View style={styles.detailCardHeader}>
          <View style={[styles.detailCardIconWrap, { backgroundColor: colors.lavenderSoft }]}>
            <Icon name="format-list-bulleted" size={18} color={colors.primary} />
          </View>
          <Text style={styles.detailCardTitle}>What Was Covered</Text>
        </View>
        {session.bullets.map((bullet, i) => (
          <View key={bullet} style={styles.coveredRow}>
            {i < session.bullets.length - 1 ? (
              <View style={[styles.coveredConnector, { backgroundColor: `${colors.primary}30` }]} />
            ) : null}
            <View style={[styles.coveredOrb, { backgroundColor: colors.primary }]}>
              <Text style={styles.coveredOrbNum}>{i + 1}</Text>
            </View>
            <View style={styles.coveredTextWrap}>
              <Text style={styles.coveredText}>{bullet}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function DetailWhyCard({ session }: { session: SessionItem }) {
  return (
    <Card variant="elevated" style={StyleSheet.flatten([styles.detailCard, styles.whyCard])} padding={0}>
      <LinearGradient
        colors={[colors.lavenderSoft, colors.skySoft, '#F9F8FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.whyGradient}
      >
        <View style={styles.detailCardPad}>
          <View style={styles.detailCardHeader}>
            <View style={styles.detailCardIconWrapSoft}>
              <Icon name="lightbulb-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.detailCardTitle}>Why This Matters</Text>
          </View>
          <Text style={styles.whyBody}>{session.whyItMatters}</Text>
        </View>
      </LinearGradient>
    </Card>
  );
}

function DetailVideoCard({ session }: { session: SessionItem }) {
  return (
    <Card variant="elevated" style={StyleSheet.flatten([styles.detailCard, styles.videoCard])} padding={0}>
      <View style={styles.videoThumbWrap}>
        <Image
          source={{ uri: session.imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.playButtonWrap}>
          <Pressable
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Play session video"
          >
            <View style={styles.playRing}>
              <Icon name="play-arrow" size={36} color="#fff" />
            </View>
          </Pressable>
        </View>
        <View style={styles.videoDurationPill}>
          <Icon name="videocam" size={11} color="rgba(255,255,255,0.88)" />
          <Text style={styles.videoDurationText}>{session.duration}</Text>
        </View>
        <View style={styles.videoBottomRow}>
          <Text style={styles.videoBottomTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={styles.videoBottomSub}>Session Replay</Text>
        </View>
      </View>
    </Card>
  );
}

function DetailTipsCard({ session }: { session: SessionItem }) {
  return (
    <Card variant="elevated" style={styles.detailCard} padding={0}>
      <View style={styles.detailCardPad}>
        <View style={styles.detailCardHeader}>
          <View style={[styles.detailCardIconWrap, { backgroundColor: colors.peachSoft }]}>
            <Icon name="favorite-border" size={18} color={colors.accent} />
          </View>
          <Text style={styles.detailCardTitle}>Tips for Parents</Text>
        </View>
        <View style={styles.tipBubble}>
          <Text style={styles.tipBubbleText}>{session.tipsForParents}</Text>
          <Text style={[styles.tipQuoteDeco, { color: `${colors.primary}14` }]}>"</Text>
        </View>
      </View>
    </Card>
  );
}

// ─── Session Detail (full overlay content) ────────────────────────────────────

function SessionDetail({
  session,
  insetsTop,
  progress: _progress,
  onClose,
  contentStyle,
}: {
  session: SessionItem;
  insetsTop: number;
  progress: SharedValue<number>;
  onClose: () => void;
  contentStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  return (
    <View style={styles.detailShell}>
      {/* Fixed header — stays pinned at the top */}
      <Animated.View style={contentStyle}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 0.87 }}
          style={[styles.detailGradientBar, { paddingTop: insetsTop + spacing.xs }]}
        >
          <View style={styles.detailOrbs} pointerEvents="none">
            <View style={styles.detailOrbLarge} />
            <View style={styles.detailOrbMid} />
            <View style={styles.detailOrbTiny} />
          </View>
          <View style={styles.detailTopBar}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Close session details"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={24} color="rgba(255,255,255,0.92)" />
            </Pressable>
            <View style={styles.detailNavCenter}>
              <Text style={styles.detailNavTitle} numberOfLines={1}>
                Session Details
              </Text>
              <Text style={styles.detailNavSubtitle} numberOfLines={1}>
                {session.title}
              </Text>
            </View>
            <View style={styles.detailNavSpacer} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable cards */}
      <Animated.View style={[styles.detailScrollArea, contentStyle]}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.detailCardsScroll}
          showsVerticalScrollIndicator={false}
        >
          <DetailHeroCard session={session} />
          <DetailCoveredCard session={session} />
          <DetailWhyCard session={session} />
          <DetailVideoCard session={session} />
          <DetailTipsCard session={session} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SessionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { showToast } = useToast();

  const rootRef = useRef<RNView | null>(null);
  const cardRefs = useRef<Record<string, RNView | null>>({});

  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);

  const progress = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const cardX = useSharedValue(0);
  const cardY = useSharedValue(0);
  const cardW = useSharedValue(0);
  const cardH = useSharedValue(0);
  const rootX = useSharedValue(0);
  const rootY = useSharedValue(0);

  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      if (Platform.OS === 'android') {
        RNStatusBar.setTranslucent(true);
        RNStatusBar.setBackgroundColor('transparent');
      }
      return () => {
        setStatusBarStyle('dark');
        if (Platform.OS === 'android') {
          RNStatusBar.setTranslucent(false);
          RNStatusBar.setBackgroundColor(colors.background);
        }
      };
    }, [])
  );

  const bottomPad = useMemo(
    () => getFloatingTabBarBottomPadding(insets.bottom),
    [insets.bottom]
  );

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const response = await apiClient.get<SessionsApiResponse>('/api/v1/sessions');
      const responseData = response.data;
      if (!Array.isArray(responseData) && responseData.success === false) {
        throw new Error(extractSessionsError(responseData));
      }
      const apiSessions = extractApiSessions(responseData);
      setSessionItems(apiSessions.map(mapApiSessionToItem));
    } catch (error) {
      const message = getDisplayMessage(error);
      setSessionItems([]);
      setSessionsError(message);
      showToast({ message, type: 'error', durationMs: 3000 });
    } finally {
      setIsLoadingSessions(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const groupedSessions = useMemo(
    () =>
      SESSION_GROUPS.map((group) => ({
        group,
        sessions: sessionItems.filter((s) => s.group === group),
      })).filter(({ sessions: groupSessions }) => groupSessions.length > 0),
    [sessionItems]
  );

  const openDetail = useCallback(
    (session: SessionItem) => {
      if (session.group === 'Upcoming') return;
      const node = cardRefs.current[session.id];
      if (!node) return;
      node.measureInWindow((cx, cy, cw, ch) => {
        if (!cw || !ch) return;
        rootRef.current?.measureInWindow((rx, ry) => {
          cardX.value = cx;
          cardY.value = cy;
          cardW.value = cw;
          cardH.value = ch;
          rootX.value = rx;
          rootY.value = ry;
          setSelectedSession(session);
          setOverlayMounted(true);
          progress.value = 0;
          backdropOpacity.value = 0;
          backdropOpacity.value = withTiming(1, {
            duration: 220,
            easing: Easing.out(Easing.quad),
          });
          progress.value = withSpring(1, {
            damping: 18,
            stiffness: 170,
            mass: 0.82,
          });
        });
      });
    },
    [backdropOpacity, cardH, cardW, cardX, cardY, progress, rootX, rootY]
  );

  const finishClosing = useCallback(() => {
    setOverlayMounted(false);
    setSelectedSession(null);
  }, []);

  const closeDetail = useCallback(() => {
    progress.value = withTiming(0, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(
      0,
      { duration: 280, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(finishClosing)();
      }
    );
  }, [backdropOpacity, finishClosing, progress]);

  useEffect(() => {
    if (!overlayMounted) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDetail();
      return true;
    });
    return () => sub.remove();
  }, [overlayMounted, closeDetail]);

  const overlayCardStyle = useAnimatedStyle(() => {
    const relX = cardX.value - rootX.value;
    const relY = cardY.value - rootY.value;
    return {
      position: 'absolute',
      left: interpolate(progress.value, [0, 1], [relX, 0], Extrapolation.CLAMP),
      top: interpolate(progress.value, [0, 1], [relY, 0], Extrapolation.CLAMP),
      width: interpolate(progress.value, [0, 1], [cardW.value, screenWidth], Extrapolation.CLAMP),
      height: interpolate(
        progress.value,
        [0, 1],
        [cardH.value, containerHeight || screenHeight],
        Extrapolation.CLAMP
      ),
      borderRadius: interpolate(
        progress.value,
        [0, 1],
        [borderRadius.xl, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [1, 0.94, 0.9], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 0.986], Extrapolation.CLAMP) },
    ],
  }));

  const detailContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.3, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [22, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <View
        ref={rootRef}
        style={styles.root}
        collapsable={false}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        <Animated.View style={[styles.listLayer, listStyle]}>
          <AppGradientHeader
            title="Sessions"
            subtitle="Workshops, events & replays for parents"
            rightAccessory={
              <Pressable
                style={({ pressed }) => [
                  styles.headerAction,
                  pressed && styles.headerActionPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sessions calendar"
              >
                <Icon name="event-note" size={23} color="rgba(255,255,255,0.92)" />
              </Pressable>
            }
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
            showsVerticalScrollIndicator={false}
          >
            {isLoadingSessions ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.stateTitle}>Loading sessions</Text>
              </View>
            ) : sessionsError ? (
              <View style={styles.stateContainer}>
                <Icon name="error-outline" size={28} color={colors.error} />
                <Text style={styles.stateTitle}>Could not load sessions</Text>
                <Text style={styles.stateBody}>{sessionsError}</Text>
                <Pressable
                  onPress={loadSessions}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading sessions"
                >
                  <Icon name="refresh" size={16} color={colors.surface} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : groupedSessions.length === 0 ? (
              <View style={styles.stateContainer}>
                <Icon name="event-busy" size={28} color={colors.textMuted} />
                <Text style={styles.stateTitle}>No sessions available</Text>
              </View>
            ) : groupedSessions.map(({ group, sessions: groupSessions }, groupIndex) => (
              <Animated.View
                key={group}
                entering={FadeInDown.delay(groupIndex * 85)
                  .springify()
                  .damping(18)
                  .stiffness(220)}
              >

                {groupSessions.map((session, sessionIndex) => {
                  const isExpanded = overlayMounted && selectedSession?.id === session.id;
                  const isUpcoming = session.group === 'Upcoming';

                  return (
                    <Animated.View
                      key={session.id}
                      entering={FadeInDown.delay(groupIndex * 90 + sessionIndex * 75)
                        .springify()
                        .damping(18)
                        .stiffness(220)}
                      style={[styles.shadowWrapper, isExpanded ? styles.hiddenCard : undefined, { marginBottom: spacing.md }]}
                    >
                      <View
                        ref={(node) => { cardRefs.current[session.id] = node; }}
                        collapsable={false}
                      >
                        <Pressable
                          onPress={() => openDetail(session)}
                          style={({ pressed }) => [
                            styles.cardPressable,
                            !isUpcoming && pressed && styles.cardPressablePressed,
                          ]}
                          accessibilityState={{ disabled: isUpcoming }}
                        >
                          <SessionCard session={session} />
                        </Pressable>
                      </View>
                    </Animated.View>
                  );
                })}
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        {overlayMounted && selectedSession ? (
          <>
            <Animated.View
              style={[styles.backdrop, backdropStyle]}
              pointerEvents="none"
            />
            <Animated.View style={[styles.overlayCard, overlayCardStyle]}>
              <SessionDetail
                session={selectedSession}
                insetsTop={insets.top}
                progress={progress}
                onClose={closeDetail}
                contentStyle={detailContentStyle}
              />
            </Animated.View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default SessionsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listLayer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  stateContainer: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateTitle: {
    ...textStyles.headingMedium,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  stateBody: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '800',
    color: colors.surface,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerActionPressed: {
    opacity: 0.88,
  },

  /* Group header */
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  groupIconOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  groupLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  hiddenCard: {
    opacity: 0,
  },
  cardPressable: {
    marginBottom: spacing.xs,
  },
  cardPressablePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  shadowWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    // padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },

  /* Session card */
  sessionCard: {
    marginVertical: 0,
    overflow: 'hidden'
  },

  imageWrap: {
    height: 116,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(243,242,247,0.55)',
    zIndex: 2,
  },
  playIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationChip: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    zIndex: 4,
  },
  imageStateStrip: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    zIndex: 4,
  },
  imageStateText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  durationChipText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
  },

  cardBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleRow: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardTitleUpcoming: {
    color: colors.primaryDark,
  },
  cardTitleConducted: {
    color: colors.growth,
  },
  floatingPill: {
    borderRadius: borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingPillText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardDesc: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 6,
  },
  textMuted: {
    color: colors.textMuted,
  },
  textMutedSoft: {
    color: colors.textMuted,
    opacity: 0.75,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  metaChipText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  lockedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  lockedText: {
    ...textStyles.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  /* Overlay */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.inkOverlay,
    zIndex: 19,
  },
  overlayCard: {
    overflow: 'hidden',
    backgroundColor: colors.background,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 26,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  /* Detail shell */
  detailShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailGradientBar: {
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  detailOrbs: {
    ...StyleSheet.absoluteFillObject,
  },
  detailOrbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.09)',
    top: -100,
    right: -72,
  },
  detailOrbMid: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(232,228,255,0.16)',
    bottom: 10,
    left: 12,
  },
  detailOrbTiny: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: 18,
    left: '38%',
  },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    zIndex: 1,
    gap: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs,
    borderRadius: borderRadius.full,
  },
  closeButtonPressed: {
    opacity: 0.88,
  },
  detailNavCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  detailNavTitle: {
    ...textStyles.headingMedium,
    fontSize: 18,
    color: colors.surface,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  detailNavSubtitle: {
    ...textStyles.caption,
    color: 'rgba(255,255,255,0.76)',
    fontWeight: '600',
    marginTop: 1,
  },
  detailNavSpacer: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  detailScrollArea: {
    flex: 1,
  },
  detailCardsScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  /* Detail cards shared */
  detailCard: {
    marginVertical: 0,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  detailCardPad: {
    padding: spacing.lg,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardIconWrapSoft: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  detailCardTitle: {
    ...textStyles.headingMedium,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    flex: 1,
  },

  /* Hero */
  heroImageWrap: {
    height: 210,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  detailHeroTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  detailHeroDesc: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  heroChipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  heroChipText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  /* Covered */
  coveredRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 52,
    position: 'relative',
  },
  coveredConnector: {
    position: 'absolute',
    left: 13,
    top: 30,
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
  coveredOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    zIndex: 1,
  },
  coveredOrbNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  coveredTextWrap: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
  },
  coveredText: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 23,
  },

  /* Why it matters */
  whyCard: {
    backgroundColor: 'transparent',
  },
  whyGradient: {
    borderRadius: borderRadius.xl,
  },
  whyBody: {
    ...textStyles.bodyLarge,
    color: colors.ink,
    lineHeight: 26,
    opacity: 0.8,
  },

  /* Video */
  videoCard: {
    backgroundColor: '#000',
  },
  videoThumbWrap: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonWrap: {
    position: 'absolute',
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {},
  playButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  playRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.46)',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDurationPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    zIndex: 4,
  },
  videoDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  videoBottomRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 4,
  },
  videoBottomTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },
  videoBottomSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    fontWeight: '600',
  },

  /* Tips */
  tipBubble: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  tipBubbleText: {
    ...textStyles.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  tipQuoteDeco: {
    position: 'absolute',
    bottom: -28,
    right: 6,
    fontSize: 128,
    lineHeight: 128,
    fontWeight: '900',
  },
});
