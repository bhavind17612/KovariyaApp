import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, textStyles, borderRadius } from '../theme';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Types                                                             */
/* ═══════════════════════════════════════════════════════════════════ */
export type VoiceRecordingResult = {
  uri: string;
  durationMs: number;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (result: VoiceRecordingResult) => void;
}

type RecorderState = 'idle' | 'recording' | 'recorded' | 'playing' | 'denied';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helpers                                                           */
/* ═══════════════════════════════════════════════════════════════════ */
function fmtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const BAR_COUNT = 28;

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const VoiceRecorderModal: React.FC<Props> = ({ visible, onClose, onSave }) => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackPos, setPlaybackPos] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barsData = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, () => 0.15)
  );

  // Pulsing ring animation for recording
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startPulse = useCallback(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const stopPulse = useCallback(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = withTiming(1, { duration: 200 });
    pulseOpacity.value = withTiming(0, { duration: 200 });
  }, []);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!visible) {
      cleanup();
      setState('idle');
      setElapsed(0);
      setRecordingUri(null);
      setRecordingDuration(0);
      setPlaybackPos(0);
      barsData.current = Array.from({ length: BAR_COUNT }, () => 0.15);
      stopPulse();
    }
  }, [visible]);

  const cleanup = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recordingRef.current) {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
        recordingRef.current = null;
      }
    } catch {}
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
  }, []);

  /* ── Permission ── */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existing } = await Audio.getPermissionsAsync();
      if (existing === 'granted') return true;

      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') return true;

      setState('denied');
      return false;
    } catch {
      setState('denied');
      return false;
    }
  }, []);

  /* ── Start recording ── */
  const startRecording = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    await cleanup();

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering != null) {
            // Normalise metering (-160…0 dB) to 0…1
            const norm = Math.max(0, Math.min(1, (status.metering + 60) / 60));
            barsData.current = [...barsData.current.slice(1), norm];
          }
        },
        100
      );
      recordingRef.current = recording;
      setState('recording');
      setElapsed(0);
      startPulse();

      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 200);
    } catch (err) {
      console.warn('Recording start failed:', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }, [requestPermission, cleanup, startPulse]);

  /* ── Stop recording ── */
  const stopRecording = useCallback(async () => {
    stopPulse();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const status = await recordingRef.current.getStatusAsync();
      const dur = status.durationMillis ?? elapsed;
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (uri) {
        setRecordingUri(uri);
        setRecordingDuration(dur);
        setState('recorded');
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  }, [elapsed, stopPulse]);

  /* ── Play / pause recorded ── */
  const togglePlayback = useCallback(async () => {
    if (state === 'playing') {
      await soundRef.current?.pauseAsync();
      setState('recorded');
      return;
    }
    if (!recordingUri) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPos(status.positionMillis);
            if (status.didJustFinish) {
              setState('recorded');
              setPlaybackPos(0);
            }
          }
        }
      );
      soundRef.current = sound;
      setState('playing');
    } catch {
      Alert.alert('Error', 'Could not play recording.');
    }
  }, [state, recordingUri]);

  /* ── Delete recording ── */
  const deleteRecording = useCallback(async () => {
    await cleanup();
    setRecordingUri(null);
    setRecordingDuration(0);
    setPlaybackPos(0);
    setState('idle');
    barsData.current = Array.from({ length: BAR_COUNT }, () => 0.15);
  }, [cleanup]);

  /* ── Save ── */
  const handleSave = useCallback(() => {
    if (recordingUri && recordingDuration > 0) {
      onSave({ uri: recordingUri, durationMs: recordingDuration });
    }
  }, [recordingUri, recordingDuration, onSave]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  /* ── Waveform bars ── */
  const bars = barsData.current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.card, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Voice Note</Text>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Icon name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          {/* ── Permission denied state ── */}
          {state === 'denied' && (
            <View style={s.deniedWrap}>
              <View style={s.deniedIconCircle}>
                <Icon name="mic-off" size={32} color="#B91C1C" />
              </View>
              <Text style={s.deniedTitle}>Microphone Access Required</Text>
              <Text style={s.deniedSubtitle}>
                Please allow microphone access in your device settings to record voice notes.
              </Text>
              <Pressable style={s.settingsBtn} onPress={handleOpenSettings}>
                <Icon name="settings" size={16} color={colors.primary} />
                <Text style={s.settingsBtnText}>Open Settings</Text>
              </Pressable>
              <Pressable
                style={s.retryBtn}
                onPress={async () => {
                  const ok = await requestPermission();
                  if (ok) setState('idle');
                }}
              >
                <Text style={s.retryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* ── Idle / Recording / Recorded states ── */}
          {state !== 'denied' && (
            <>
              {/* Waveform visualisation */}
              <View style={s.waveWrap}>
                {bars.map((val, i) => {
                  const h = 6 + val * 44;
                  const isActive = state === 'recording';
                  const isPlayed =
                    state === 'playing' &&
                    recordingDuration > 0 &&
                    i / BAR_COUNT <= playbackPos / recordingDuration;
                  return (
                    <View
                      key={i}
                      style={[
                        s.waveBar,
                        {
                          height: h,
                          backgroundColor: isActive
                            ? colors.primary
                            : isPlayed
                            ? colors.primary
                            : 'rgba(124,106,232,0.25)',
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Timer */}
              <Text style={s.timer}>
                {state === 'playing'
                  ? `${fmtTime(playbackPos)} / ${fmtTime(recordingDuration)}`
                  : state === 'recorded'
                  ? fmtTime(recordingDuration)
                  : fmtTime(elapsed)}
              </Text>

              {/* Controls */}
              <View style={s.controlsRow}>
                {/* Delete button (when recorded) */}
                {(state === 'recorded' || state === 'playing') && (
                  <Pressable style={s.secondaryBtn} onPress={deleteRecording}>
                    <Icon name="delete-outline" size={22} color="#B91C1C" />
                  </Pressable>
                )}

                {/* Main action button */}
                <View style={s.mainBtnWrap}>
                  {state === 'recording' && (
                    <Animated.View style={[s.pulseRing, pulseRingStyle]} />
                  )}
                  <Pressable
                    style={[
                      s.mainBtn,
                      state === 'recording' && s.mainBtnRecording,
                    ]}
                    onPress={
                      state === 'idle'
                        ? startRecording
                        : state === 'recording'
                        ? stopRecording
                        : togglePlayback
                    }
                  >
                    <Icon
                      name={
                        state === 'idle'
                          ? 'mic'
                          : state === 'recording'
                          ? 'stop'
                          : state === 'playing'
                          ? 'pause'
                          : 'play-arrow'
                      }
                      size={30}
                      color="#FFF"
                    />
                  </Pressable>
                </View>

                {/* Save button (when recorded) */}
                {(state === 'recorded' || state === 'playing') && (
                  <Pressable style={s.secondaryBtn} onPress={handleSave}>
                    <Icon name="check" size={22} color="#15803D" />
                  </Pressable>
                )}
              </View>

              {/* Instruction label */}
              <Text style={s.instruction}>
                {state === 'idle'
                  ? 'Tap to start recording'
                  : state === 'recording'
                  ? 'Recording… Tap to stop'
                  : 'Tap ▶ to preview · ✓ to save'}
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(VoiceRecorderModal);

/* ═══════════════════════════════════════════════════════════════════ */
/*  Styles                                                            */
/* ═══════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,13,13,0.55)',
  },
  card: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.headingMedium,
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  /* Waveform */
  waveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 56,
    marginBottom: spacing.md,
    width: '100%',
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
  /* Timer */
  timer: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
  },
  /* Controls */
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  mainBtnWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
  },
  mainBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  mainBtnRecording: {
    backgroundColor: '#DC2626',
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  instruction: {
    ...textStyles.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  /* Denied */
  deniedWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  deniedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  deniedTitle: {
    ...textStyles.headingMedium,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  deniedSubtitle: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 19,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lavenderSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,106,232,0.2)',
    marginTop: spacing.sm,
  },
  settingsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  retryBtn: {
    paddingVertical: spacing.sm,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
