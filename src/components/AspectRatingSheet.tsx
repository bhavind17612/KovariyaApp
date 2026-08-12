import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  Keyboard,
  useWindowDimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
// Not RN's KeyboardAvoidingView: the app mounts KeyboardProvider at the root, and
// the two drive the same layout from different listeners, which made this sheet's
// footer oscillate. This one shares KeyboardProvider's native keyboard frames.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import VoiceRecorderModal, { type VoiceRecordingResult } from './VoiceRecorderModal';
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  shadows,
} from '../theme';
import {
  type RatingAspectDefinition,
  RATING_SCALE_OPTIONS,
  MAX_REASON_CHIPS,
  type AspectRatingPayload,
} from '../data/aspectRating';
import { useToast } from '../context/ToastContext';
import { ToastPortalHost } from '../context/ToastPortal';

import { translationService } from '../services/translationService';
import { behaviourService } from '../services/behaviourService';
import type { AspectReasonChip } from '../types/behaviour';
import type { RatingSheetTranslationsApiData, ScaleLabelEntry } from '../types/translation';

const NEXT_STEP_TOOLTIP_MS = 4000;
const NEXT_STEP_POPOVER_ESTIMATE_H = 48;
const NEXT_STEP_POPOVER_GAP = 8;
const NEXT_STEP_POPOVER_MAX_W = 280;



type Props = {
  visible: boolean;
  aspect: RatingAspectDefinition | null;
  onClose: () => void;
  /** Persists a log; sheet stays open and the form resets so another entry can be added. */
  onSave: (payload: AspectRatingPayload) => void;
  /** Same order as on the dashboard — used for “step” copy and Save & next. */
  orderedAspects?: RatingAspectDefinition[];
  /** When provided with a following aspect in `orderedAspects`, enables seamless handoff after save. */
  onSaveAndNext?: (payload: AspectRatingPayload) => void;
  /** Numeric language ID used to fetch translations from the API. Falls back to English when absent. */
  languageId?: number;
  /** Child's name shown in save-confirmation toasts. */
  childName?: string;
};

export const AspectRatingSheet = React.memo(function AspectRatingSheet({
  visible,
  aspect,
  onClose,
  onSave,
  orderedAspects,
  onSaveAndNext,
  languageId,
  childName = '',
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { showToast } = useToast();
  const scaleBtnWidth = useMemo(() => {
    const sheetPad = spacing.lg * 2;
    const gap = spacing.sm;
    const inner = windowWidth - sheetPad;
    // 2 columns × 3 rows for the six rating scale options.
    return Math.max(140, Math.floor((inner - gap) / 2));
  }, [windowWidth]);

  const [apiTranslations, setApiTranslations] = useState<RatingSheetTranslationsApiData | null>(null);
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
  const [translationFetchError, setTranslationFetchError] = useState(false);

  // Fetch translations from the API whenever languageId changes.
  // No static fallback — the API is the sole source of truth.
  useEffect(() => {
    if (!languageId) {
      setApiTranslations(null);
      setTranslationFetchError(true);
      setIsLoadingTranslations(false);
      return;
    }
    setIsLoadingTranslations(true);
    setTranslationFetchError(false);
    setApiTranslations(null);
    translationService.getRatingSheetTranslations(languageId)
      .then((data) => {
        setApiTranslations(data);
        setTranslationFetchError(false);
      })
      .catch(() => {
        setApiTranslations(null);
        setTranslationFetchError(true);
      })
      .finally(() => {
        setIsLoadingTranslations(false);
      });
  }, [languageId]);

  // Show a human-readable toast whenever the sheet is open and translations failed to load.
  useEffect(() => {
    if (visible && translationFetchError) {
      showToast({
        type: 'error',
        message: "Couldn't load the rating sheet. Please check your internet connection and try again.",
        durationMs: 5000,
      });
    }
  }, [visible, translationFetchError, showToast]);

  // English defaults used as fallback when the API hasn't responded yet or has failed.
  const EN_FALLBACK = useMemo(() => ({
    howWasBehaviour: 'How was behaviour today?',
    sheetHint: 'Select a rating and add at least 2 reason chips, a text note, or a voice note to save. You can log this multiple times today.',
    sectionRating: 'Rating',
    ratingHint: 'Tap a score to choose points',
    sectionReasons: 'Reasons',
    reasonHintPositive: 'Positive',
    reasonHintNeeds: 'Needs work',
    sectionNote: 'Add note (optional)',
    notePlaceholder: 'Other reason or extra notes.',
    voiceNoteAttached: 'Voice note attached',
    voiceNoteRecord: 'Record voice note (optional)',
    saveEntry: 'Save entry',
    save: 'Save',
    saveAndNext: 'Save & Next',
    toastMaxReasons: 'You can pick up to two reasons — remove one to choose another.',
    stepLabel: (c: number, t: number) => `Step ${c} of ${t}`,
  }), []);

  // Maps API response to the internal uiStrings shape.
  // Falls back to EN_FALLBACK when apiTranslations is unavailable.
  const uiStrings = useMemo(() => {
    if (!apiTranslations) return EN_FALLBACK;
    const s = apiTranslations.strings;
    return {
      howWasBehaviour: s?.howWasBehaviour || EN_FALLBACK.howWasBehaviour,
      sheetHint: s?.sheetHint || EN_FALLBACK.sheetHint,
      sectionRating: s?.sectionRating || EN_FALLBACK.sectionRating,
      ratingHint: s?.ratingHint || EN_FALLBACK.ratingHint,
      sectionReasons: s?.sectionReasons || EN_FALLBACK.sectionReasons,
      reasonHintPositive: s?.reasonHintPositive || EN_FALLBACK.reasonHintPositive,
      reasonHintNeeds: s?.reasonHintNeeds || EN_FALLBACK.reasonHintNeeds,
      sectionNote: s?.sectionNote || EN_FALLBACK.sectionNote,
      notePlaceholder: s?.notePlaceholder || EN_FALLBACK.notePlaceholder,
      voiceNoteAttached: s?.voiceNoteAttached || EN_FALLBACK.voiceNoteAttached,
      voiceNoteRecord: s?.voiceNoteRecord || EN_FALLBACK.voiceNoteRecord,
      saveEntry: s?.saveEntry || EN_FALLBACK.saveEntry,
      save: s?.save || EN_FALLBACK.save,
      saveAndNext: s?.saveAndNext || EN_FALLBACK.saveAndNext,
      toastMaxReasons: s?.toastMaxReasons || EN_FALLBACK.toastMaxReasons,
      stepLabel: (c: number, t: number) => {
        const tmpl = s?.stepLabel;
        if (!tmpl) return EN_FALLBACK.stepLabel(c, t);
        return tmpl.replace('{current}', String(c)).replace('{total}', String(t));
      },
    };
  }, [apiTranslations, EN_FALLBACK]);

  const [scale, setScale] = useState<number | null>(null);
  const [reasonIdsByAspect, setReasonIdsByAspect] = useState<Record<string, number[]>>({});
  const [chipsByAspect, setChipsByAspect] = useState<Record<string, AspectReasonChip[]>>({});
  const [note, setNote] = useState('');
  const [voiceResult, setVoiceResult] = useState<VoiceRecordingResult | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const hasVoiceNote = voiceResult !== null;
  const aspectId = aspect?.id;
  const reasonIds = useMemo(
    () => (aspectId ? reasonIdsByAspect[aspectId] ?? [] : []),
    [aspectId, reasonIdsByAspect]
  );
  const aspectChips = useMemo(
    () => (aspectId ? chipsByAspect[aspectId] ?? [] : []),
    [aspectId, chipsByAspect]
  );

  useEffect(() => {
    if (visible && aspectId) {
      setScale(null);
      setNote('');
      setVoiceResult(null);
    }
  }, [visible, aspectId]);

  useEffect(() => {
    if (!visible) {
      setReasonIdsByAspect({});
      setChipsByAspect({});
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !aspectId) {
      return;
    }

    let ignore = false;
    behaviourService.getAspectChips(aspectId, languageId)
      .then((chips) => {
        if (ignore) {
          return;
        }
        setChipsByAspect((prev) => ({ ...prev, [aspectId]: chips }));
      })
      .catch(() => {
        if (ignore) {
          return;
        }
        setChipsByAspect((prev) => ({ ...prev, [aspectId]: [] }));
      });

    return () => {
      ignore = true;
    };
  }, [visible, aspectId]);

  const toggleReason = useCallback(
    (id: number) => {
      console.log("selected chips", id);
      if (!aspectId) {
        return;
      }
      setReasonIdsByAspect((prevByAspect) => {
        const prev = prevByAspect[aspectId] ?? [];
        if (prev.includes(id)) {
          return {
            ...prevByAspect,
            [aspectId]: prev.filter((x) => x !== id),
          };
        }
        if (prev.length >= MAX_REASON_CHIPS) {
          showToast({
            type: 'error',
            message: uiStrings.toastMaxReasons,
            durationMs: 3200,
          });
          return prevByAspect;
        }
        console.log("prev", [...prev, id])
        return {
          ...prevByAspect,
          [aspectId]: [...prev, id],
        };
      });
    },
    [aspectId, showToast, uiStrings]
  );

  const resetForm = useCallback(() => {
    setScale(null);
    setReasonIdsByAspect((prev) => {
      if (!aspectId) {
        return prev;
      }
      return { ...prev, [aspectId]: [] };
    });
    setNote('');
    setVoiceResult(null);
  }, [aspectId]);
  const isFinalAspect = useMemo(() => {
    if (!aspect || !orderedAspects?.length) {
      return false;
    }
    const aspectIndex = orderedAspects.findIndex((a) => a.id === aspect.id);
    return aspectIndex >= 0 && aspectIndex === orderedAspects.length - 1;
  }, [aspect, orderedAspects]);

  const isFirstAspect = useMemo(() => {
    if (!aspect || !orderedAspects?.length) return false;
    return orderedAspects[0]?.id === aspect.id;
  }, [aspect, orderedAspects]);

  const buildPayload = useCallback((): AspectRatingPayload | null => {
    if (!aspect || scale === null) {
      return null;
    }
    return {
      aspectId: aspect.id,
      scale,
      reasonIds,
      note: note.trim(),
      voiceNoteUrl: voiceResult?.uri,
    };
  }, [aspect, scale, reasonIds, note, voiceResult]);

  const handleSaveEntry = useCallback(() => {
    Keyboard.dismiss();
    const payload = buildPayload();
    console.log('payload ', payload);
    if (!payload) {
      return;
    }
    showToast({
      type: 'success',
      message: childName
        ? `Saved · today's behaviour log for ${childName}. You can add another log with Save entry.`
        : "Saved · today's behaviour log. You can add another log with Save entry.",
    });
    onSave(payload);
    if (isFinalAspect) {
      onClose();
      return;
    }
    resetForm();
  }, [buildPayload, childName, isFinalAspect, onClose, onSave, resetForm, showToast]);

  const handleSaveAndNext = useCallback(() => {
    Keyboard.dismiss();
    const payload = buildPayload();
    console.log("save and next", payload)
    if (!payload || !onSaveAndNext) {
      return;
    }
    showToast({
      type: 'success',
      message: childName
        ? `Saved · ${aspect?.name ?? 'aspect'} for ${childName}`
        : `Saved · ${aspect?.name ?? 'aspect'}`,
    });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    onSaveAndNext(payload);
  }, [aspect?.name, buildPayload, childName, onSaveAndNext, showToast]);

  const isReasonChipsValid = reasonIds.length <= MAX_REASON_CHIPS;
  const hasSupportInput = reasonIds.length > 0 || note.trim().length > 0 || hasVoiceNote;
  // Block saving while translations are still loading; English fallback is used if the API fails.
  const canSave = aspect != null && scale !== null && hasSupportInput && isReasonChipsValid && !isLoadingTranslations;

  const aspectStepLabel = useMemo(() => {
    if (!aspect || !orderedAspects?.length) {
      return null;
    }
    const aspectIndex = orderedAspects.findIndex((a) => a.id === aspect.id);
    if (aspectIndex < 0) {
      return null;
    }
    return uiStrings.stepLabel(aspectIndex + 1, orderedAspects.length);
  }, [aspect, orderedAspects, uiStrings]);

  const nextAspect = useMemo(() => {
    if (!aspect || !orderedAspects?.length) {
      return null;
    }
    const aspectIndex = orderedAspects.findIndex((a) => a.id === aspect.id);
    if (aspectIndex < 0 || aspectIndex >= orderedAspects.length - 1) {
      return null;
    }
    return orderedAspects[aspectIndex + 1];
  }, [aspect, orderedAspects]);

  const showSaveAndNext = Boolean(nextAspect && onSaveAndNext);

  // ── Button guide tooltip (first aspect only) ────────────────────────────
  const btnGuideOpacity = useRef(new Animated.Value(0)).current;
  const btnGuideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBtnGuide, setShowBtnGuide] = useState(false);

  useEffect(() => {
    if (btnGuideTimerRef.current) {
      clearTimeout(btnGuideTimerRef.current);
      btnGuideTimerRef.current = null;
    }
    if (!visible || !isFirstAspect || !showSaveAndNext) {
      btnGuideOpacity.setValue(0);
      setShowBtnGuide(false);
      return;
    }
    setShowBtnGuide(true);
    Animated.timing(btnGuideOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    btnGuideTimerRef.current = setTimeout(() => {
      Animated.timing(btnGuideOpacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(() => {
        setShowBtnGuide(false);
      });
      btnGuideTimerRef.current = null;
    }, 5000);
    return () => {
      if (btnGuideTimerRef.current) {
        clearTimeout(btnGuideTimerRef.current);
        btnGuideTimerRef.current = null;
      }
    };
  }, [visible, isFirstAspect, showSaveAndNext, btnGuideOpacity]);

  const prevAspectIdForTooltipRef = useRef<string | null>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNextAnchorRef = useRef<View | null>(null);
  const [nextStepTooltipLabel, setNextStepTooltipLabel] = useState<string | null>(null);
  const [_nextStepPopoverPos, setNextStepPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const measureNextStepPopover = useCallback(() => {
    saveNextAnchorRef.current?.measureInWindow((x, y, w, h) => {
      const popoverW = Math.min(NEXT_STEP_POPOVER_MAX_W, windowWidth - spacing.lg * 2);
      let left = x + w / 2 - popoverW / 2;
      const pad = spacing.md;
      left = Math.max(pad, Math.min(left, windowWidth - popoverW - pad));
      let top = y - NEXT_STEP_POPOVER_ESTIMATE_H - NEXT_STEP_POPOVER_GAP;
      if (top < insets.top + pad) {
        top = y + h + NEXT_STEP_POPOVER_GAP;
      }
      setNextStepPopoverPos({ top, left, width: popoverW });
    });
  }, [insets.top, windowWidth]);

  useEffect(() => {
    if (!visible) {
      prevAspectIdForTooltipRef.current = null;
      setNextStepTooltipLabel(null);
      setNextStepPopoverPos(null);
      if (tooltipHideTimerRef.current) {
        clearTimeout(tooltipHideTimerRef.current);
        tooltipHideTimerRef.current = null;
      }
      return;
    }
    if (!aspectId) {
      return;
    }

    const prevId = prevAspectIdForTooltipRef.current;
    prevAspectIdForTooltipRef.current = aspectId;

    if (prevId === null) {
      return;
    }
    if (prevId === aspectId) {
      return;
    }

    if (nextAspect?.name) {
      setNextStepTooltipLabel(nextAspect.name);
      if (tooltipHideTimerRef.current) {
        clearTimeout(tooltipHideTimerRef.current);
      }
      tooltipHideTimerRef.current = setTimeout(() => {
        setNextStepTooltipLabel(null);
        setNextStepPopoverPos(null);
        tooltipHideTimerRef.current = null;
      }, NEXT_STEP_TOOLTIP_MS);
    }
  }, [visible, aspectId, nextAspect?.name]);

  useEffect(() => {
    if (!nextStepTooltipLabel || !showSaveAndNext) {
      setNextStepPopoverPos(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      measureNextStepPopover();
    });
    return () => cancelAnimationFrame(id);
  }, [nextStepTooltipLabel, showSaveAndNext, measureNextStepPopover, aspectId]);

  if (!aspect) {
    return null;
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.root}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />

          <View
            style={[
              styles.sheet,
              {
                height: windowHeight - insets.top,
                // maxHeight: '1%',
              },
            ]}
          >
            <View style={styles.grabber} />
            <View style={styles.sheetTitleRow}>
              <View style={styles.sheetTitleTextWrap}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {aspect.name}
                </Text>
                <Text style={styles.sheetSubtitle} numberOfLines={2}>
                  {uiStrings.howWasBehaviour}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
                android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }}
              >
                <Icon name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            {aspectStepLabel ? (
              <Text style={styles.sheetStep}>{aspectStepLabel}</Text>
            ) : null}

            {/* ── Translation loading state ──────────────────────────────── */}
            {isLoadingTranslations ? (
              <View style={styles.translationStateWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.translationStateText}>Loading content…</Text>
              </View>
            ) : translationFetchError ? (
              /* ── Translation error state ──────────────────────────────── */
              <View style={styles.translationStateWrap}>
                <View style={styles.translationErrorIcon}>
                  <Icon name="cloud-off" size={36} color={colors.textMuted} />
                </View>
                <Text style={styles.translationErrorTitle}>Content unavailable</Text>
                <Text style={styles.translationStateText}>
                  We couldn't load the rating sheet. Please check your internet connection and try again.
                </Text>
              </View>
            ) : uiStrings ? (
              /* ── Normal form ──────────────────────────────────────────── */
              <>
                <Text style={styles.sheetHint}>{uiStrings.sheetHint}</Text>
                {/*
                  The scroll area AND the save footer both live inside the
                  KeyboardAvoidingView, so the note field and the Save / Save & Next
                  buttons all stay above the keyboard while typing.
                */}
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 50}
                >
                <ScrollView
                  ref={scrollRef}
                  style={[styles.scroll, { maxHeight: windowHeight - insets.top - 270 }]}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                    <Text style={styles.blockLabel}>{uiStrings.sectionRating}</Text>
                    <Text style={styles.ratingHint}>{uiStrings.ratingHint}</Text>
                    <View style={styles.scaleGrid}>
                      {(() => {
                        // Build scale options from API data; fall back to static list when unavailable.
                        const scaleItems: ScaleLabelEntry[] = apiTranslations?.scale_labels
                          ? Object.values(apiTranslations.scale_labels)
                            .filter((raw): raw is ScaleLabelEntry =>
                              typeof raw === 'object' && raw !== null && 'score' in raw
                            )
                          : RATING_SCALE_OPTIONS.map((o) => ({
                            id: o.value,
                            score: o.value,
                            title: o.label,
                            sort_order: 0,
                          }));

                        // The grid wraps at two columns, so array order fills
                        // left, right, left, right… Pairing one negative with one
                        // positive therefore puts every negative in the left
                        // column and every positive in the right, hardest score
                        // first: -4 | +4 / -2 | +2 / -1 | +1.
                        //
                        // The API's `sort_order` is deliberately not used for
                        // layout — the app owns this arrangement so it stays
                        // correct whatever order the backend sends.
                        const negatives = scaleItems
                          .filter((o) => o.score < 0)
                          .sort((a, b) => a.score - b.score); // -4, -2, -1
                        const positives = scaleItems
                          .filter((o) => o.score >= 0)
                          .sort((a, b) => b.score - a.score); // +4, +2, +1

                        const orderedItems: ScaleLabelEntry[] = [];
                        for (let i = 0; i < Math.max(negatives.length, positives.length); i++) {
                          // Guarded so an uneven split can't leave a hole in the grid.
                          if (negatives[i]) {
                            orderedItems.push(negatives[i]);
                          }
                          if (positives[i]) {
                            orderedItems.push(positives[i]);
                          }
                        }

                        return orderedItems.map((opt) => {
                          const neg = opt.score < 0;
                          const selected = scale === opt.id;
                          const ripple = neg
                            ? { color: 'rgba(220, 38, 38, 0.18)', borderless: false }
                            : { color: 'rgba(22, 163, 74, 0.18)', borderless: false };
                          return (
                            <Pressable
                              key={opt.score}
                              onPress={() => setScale(opt.id)}
                              android_ripple={ripple}
                              style={({ pressed }) => [
                                styles.scaleBtn,
                                { width: scaleBtnWidth },
                                neg ? styles.scaleBtnNegBase : styles.scaleBtnPosBase,
                                selected && (neg ? styles.scaleBtnNegSelected : styles.scaleBtnPosSelected),
                                pressed && styles.scaleBtnPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`${opt.title}, ${opt.score >= 0 ? '+' : ''}${opt.score} points`}
                            >
                              <View style={styles.scaleBtnTextCol}>
                                <Text
                                  style={[
                                    styles.scaleBtnLabel,
                                    neg ? styles.scaleBtnLabelNeg : styles.scaleBtnLabelPos,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {opt.title}
                                </Text>
                                <Text
                                  style={[
                                    styles.scalePoints,
                                    neg ? styles.scalePointsNeg : styles.scalePointsPos,
                                  ]}
                                >
                                  {opt.score >= 0 ? `+${opt.score}` : `${opt.score}`} pts
                                </Text>
                              </View>
                            </Pressable>
                          );
                        });
                      })()}
                    </View>

                    <Text style={styles.blockLabel}>
                      {uiStrings.sectionReasons} <Text style={styles.reasonCount}>({reasonIds.length}/{MAX_REASON_CHIPS})</Text>
                    </Text>
                    <Text style={styles.reasonHint}>{uiStrings.reasonHintPositive}</Text>
                    {(() => {
                      type ChipEntry = AspectReasonChip & { chipKey: number };
                      const apiChips: ChipEntry[] = aspectChips.map((chip) => ({
                        ...chip,
                        chipKey: chip.id,
                      }));
                      console.log('apischips ', aspectChips);
                      const positiveChips = apiChips.filter((c) => c.sentiment === 'positive');
                      const negativeChips = apiChips.filter((c) => c.sentiment === 'negative');

                      const renderChip = (c: ChipEntry) => {
                        const isPos = c.sentiment === 'positive';
                        const on = reasonIds.includes(c.chipKey);
                        return (
                          <Pressable
                            key={c.chipKey}
                            onPress={() => toggleReason(c.chipKey)}
                            android_ripple={{
                              color: isPos ? 'rgba(22, 163, 74, 0.14)' : 'rgba(220, 38, 38, 0.14)',
                              borderless: false,
                            }}
                            style={({ pressed }) => [
                              styles.chip,
                              isPos ? styles.chipPos : styles.chipNeg,
                              on && (isPos ? styles.chipPosOn : styles.chipNegOn),
                              pressed && styles.chipPressed,
                            ]}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={c.chip_text}
                          >
                            {c.emoji ? (
                              <Text style={styles.chipEmoji} allowFontScaling={false}>
                                {c.emoji}
                              </Text>
                            ) : null}
                            <Text
                              style={[
                                isPos ? styles.chipText : styles.chipTextNeg,
                                on && (isPos ? styles.chipTextOn : styles.chipTextNegOn),
                              ]}
                              numberOfLines={1}
                            >
                              {c.chip_text}
                            </Text>
                          </Pressable>
                        );
                      };

                      return (
                        <>
                          {positiveChips.length > 0 && (
                            <View style={styles.chipWrap}>
                              {positiveChips.map(renderChip)}
                            </View>
                          )}
                          {negativeChips.length > 0 && (
                            <>
                              <Text style={styles.reasonHint}>{uiStrings.reasonHintNeeds}</Text>
                              <View style={styles.chipWrap}>
                                {negativeChips.map(renderChip)}
                              </View>
                            </>
                          )}
                        </>
                      );
                    })()}

                    <Text style={styles.blockLabel}>{uiStrings.sectionNote}</Text>
                    <TextInput
                      style={styles.noteInput}
                      placeholder={uiStrings.notePlaceholder}
                      placeholderTextColor={colors.textMuted}
                      value={note}
                      onChangeText={setNote}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                      }}
                    />

                    {/* Voice note section */}
                    {hasVoiceNote ? (
                      <View style={styles.voicePreview}>
                        <View style={styles.voicePreviewLeft}>
                          <Icon name="mic" size={18} color={colors.primary} />
                          <Text style={styles.voicePreviewText}>
                            Voice note · {Math.ceil((voiceResult?.durationMs ?? 0) / 1000)}s
                          </Text>
                        </View>
                        <Pressable
                          style={styles.voiceDeleteBtn}
                          onPress={() => setVoiceResult(null)}
                          hitSlop={6}
                        >
                          <Icon name="close" size={16} color="#B91C1C" />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.voiceRow}
                        onPress={() => setVoiceModalVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Record voice note"
                      >
                        <Icon name="mic" size={22} color={colors.primary} />
                        <Text style={styles.voiceText}>
                          {uiStrings.voiceNoteRecord}
                        </Text>
                        <Icon name="chevron-right" size={22} color={colors.textMuted} />
                      </Pressable>
                    )}
                </ScrollView>
                <View style={styles.saveFooter}>
                  {showBtnGuide && showSaveAndNext && (
                    <Animated.View
                      style={[styles.btnGuideRow, { opacity: btnGuideOpacity }]}
                      pointerEvents="none"
                    >
                      <View style={styles.btnGuideHalf}>
                        <View style={styles.btnGuideBubble}>
                          <Text style={styles.btnGuideText}>📝 Logs entry, stays here for another</Text>
                        </View>
                        <View style={styles.btnGuideCaret} />
                      </View>
                      <View style={styles.btnGuideHalf}>
                        <View style={styles.btnGuideBubble}>
                          <Text style={styles.btnGuideText}>⚡ Saves & moves to next aspect</Text>
                        </View>
                        <View style={styles.btnGuideCaret} />
                      </View>
                    </Animated.View>
                  )}
                  {showSaveAndNext && nextAspect ? (
                    <View style={styles.saveFooterRow}>
                      <View style={styles.saveFooterHalf}>
                        <Button
                          androidRipple={{ color: 'rgba(255, 255, 255, 0.6)', foreground: true }}
                          title={uiStrings.save}
                          variant="primary"
                          size="small"
                          onPress={handleSaveEntry}
                          disabled={!canSave}
                          style={styles.footerPrimaryBtn}
                        />
                      </View>
                      <View style={styles.saveFooterHalf}>
                        <Button
                          androidRipple={{ color: 'rgba(124, 106, 232, 0.6)', foreground: true }}
                          title={uiStrings.saveAndNext}
                          variant="outline"
                          size="small"
                          onPress={handleSaveAndNext}
                          disabled={!canSave}
                          style={styles.footerSecondaryBtn}
                        />
                      </View>
                    </View>
                  ) : (
                    <Button
                      title={uiStrings.saveEntry}
                      variant="primary"
                      size="small"
                      onPress={handleSaveEntry}
                      disabled={!canSave}
                      style={styles.footerPrimaryBtnFull}
                    />
                  )}
                </View>
                </KeyboardAvoidingView>
              </>
            ) : null}
          </View>

          {/* Lets toasts raised from this sheet draw inside the sheet's own window on Android. */}
          <ToastPortalHost />
        </View>
      </Modal>

      <VoiceRecorderModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSave={(result) => {
          setVoiceResult(result);
          setVoiceModalVisible(false);
        }}
      />
    </>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  kb: {
    // flex: 1,
    width: '100%',
    // justifyContent: 'flex-end',
    // bottom: 100,
    backgroundColor: 'green'
  },
  kav: {
    width: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // marginBottom: 100,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    ...textStyles.headingMedium,
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    ...textStyles.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.small,
  },
  closeButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  sheetStep: {
    ...textStyles.caption,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sheetHint: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scroll: {
    // maxHeight: 440,
  },
  blockLabel: {
    ...textStyles.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  reasonCount: {
    fontWeight: '700',
    color: colors.primary,
  },
  reasonHint: {
    ...textStyles.caption,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  ratingHint: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.sm,
    marginBottom: spacing.md,
  },
  scaleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  scaleBtnPressed: {
    opacity: Platform.OS === 'ios' ? 0.9 : 1,
    transform: [{ scale: 0.98 }],
  },
  scaleBtnNegBase: {
    ...shadows.small,
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(252, 165, 165, 0.85)',
  },
  scaleBtnPosBase: {
    ...shadows.small,
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(134, 239, 172, 0.9)',
  },
  scaleBtnNegSelected: {
    ...shadows.small,
    backgroundColor: '#FEE2E2',
    borderColor: '#991B1B',
    borderWidth: 2.5,
  },
  scaleBtnPosSelected: {
    ...shadows.small,
    backgroundColor: '#DCFCE7',
    borderColor: '#166534',
    borderWidth: 2.5,
  },
  scaleBtnTextCol: {
    flex: 1,
    minWidth: 0,
  },
  scaleBtnLabel: {
    ...textStyles.bodyLarge,
    fontWeight: '700',
    fontSize: 15,
  },
  scaleBtnLabelNeg: {
    color: '#991B1B',
  },
  scaleBtnLabelPos: {
    color: '#166534',
  },
  scalePoints: {
    ...textStyles.caption,
    fontWeight: '800',
    marginTop: 4,
  },
  scalePointsNeg: {
    color: '#B91C1C',
  },
  scalePointsPos: {
    color: '#15803D',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  chipEmoji: {
    // Fixed size keeps chips the same height regardless of the OS emoji metrics.
    fontSize: 14,
    lineHeight: 18,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipPos: {
    ...shadows.small,
    backgroundColor: '#EEF6F0',
    borderColor: 'rgba(22, 163, 74, 0.22)',
  },
  chipPosOn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#166534',
    borderWidth: 1.5,
  },
  chipNeg: {
    ...shadows.small,
    backgroundColor: '#F9F2F2',
    borderColor: 'rgba(232, 93, 93, 0.28)',
  },
  chipNegOn: {
    backgroundColor: '#F9F2F2',
    borderColor: '#991B1B',
    borderWidth: 1.5,
  },
  chipText: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipTextOn: {
    color: colors.ink,
  },
  chipTextNeg: {
    ...textStyles.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextNegOn: {
    color: colors.error,
    fontWeight: '700',
  },
  noteInput: {
    ...textStyles.bodyMedium,
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.ink,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  voiceText: {
    ...textStyles.bodyLarge,
    flex: 1,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(124,106,232,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,106,232,0.18)',
    marginBottom: spacing.md,
  },
  voicePreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voicePreviewText: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  voiceDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  saveFooter: {
    // flex: 1,
    width: '100%',
    alignContent: 'center',
    justifyContent: 'center',
    // marginVertical: spacing.sm,
    paddingVertical: spacing.sm,
    // paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveNextAnchor: {
    alignSelf: 'stretch',
  },
  nextStepPopoverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  nextStepPopoverModal: {
    position: 'absolute',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.large,
    backgroundColor: colors.primary,
    ...shadows.medium,
  },
  nextStepPopoverText: {
    ...textStyles.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    color: colors.surface,
    textAlign: 'center',
  },
  nextStepPopoverName: {
    fontWeight: '800',
    color: colors.surface,
  },
  saveFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  saveFooterHalf: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
    // backgroundColor: 'green',
  },
  footerPrimaryBtn: {
    marginVertical: 0,
  },
  footerPrimaryBtnFull: {
    marginVertical: 0,
  },
  footerSecondaryBtn: {
    marginVertical: 0,
  },
  btnGuideRow: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  btnGuideHalf: {
    flex: 1,
    alignItems: 'center',
  },
  btnGuideBubble: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: 'center',
    width: '100%',
  },
  btnGuideCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.ink,
  },
  btnGuideText: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.surface,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
  // ── Translation loading / error states ────────────────────────────────────
  translationStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl ?? spacing.lg * 1.5,
    paddingVertical: spacing.xl ?? spacing.lg * 1.5,
    gap: spacing.md,
    minHeight: 200,
  },
  translationErrorIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  translationErrorTitle: {
    ...textStyles.headingMedium,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  translationStateText: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
});
