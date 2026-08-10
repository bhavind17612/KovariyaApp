import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { InputField } from './InputField';
import { DatePickerField } from './DatePickerField';
import { PRESET_SCHOOLS } from '../data/schools';
import { useToast } from '../context/ToastContext';
import { ToastPortalHost } from '../context/ToastPortal';
import { studentsService } from '../services/studentsService';
import type { UpdateStudentPayload, CreateStudentPayload } from '../services/studentsService';
import { schoolsService } from '../services/schoolsService';
import type { Child } from '../types';
import { ageFromIsoDate, toIsoDate } from '../utils/age';
import { formatAppDate } from '../utils/dateFormat';
import { borderRadius, colors, shadows, spacing, textStyles } from '../theme';
import { GRADIENT_60_END } from '../theme/layout';

const { height: SH } = Dimensions.get('window');
const SHEET_CFG = { duration: 320, easing: Easing.out(Easing.cubic) };
const GRADES = ['Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const currentYear = new Date().getFullYear();

/** Normalises a stored grade (e.g. "class5", "Class 5", "kg") to a GRADES entry. */
function normalizeGrade(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (GRADES.includes(trimmed)) return trimmed;
  if (/^(kg|kindergarten)$/i.test(trimmed)) return 'Kindergarten';
  const match = trimmed.match(/(\d+)/);
  if (match) {
    const candidate = `Class ${match[1]}`;
    if (GRADES.includes(candidate)) return candidate;
  }
  return '';
}
const GENDERS = [
  { key: 'male', label: 'Male', marker: 'B' },
  { key: 'female', label: 'Female', marker: 'G' },
];

function PickerSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const y = useSharedValue(SH);

  useEffect(() => {
    y.value = withTiming(visible ? 0 : SH, SHEET_CFG);
  }, [visible, y]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Pressable style={ss.overlay} onPress={onClose} />
      <Animated.View style={[ss.sheet, sheetStyle]}>
        <View style={ss.sheetHeader}>
          <Text style={ss.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} style={ss.sheetClose}>
            <Icon name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

function GradeSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (g: string) => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet visible={visible} title="Select Standard" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={ss.listArea}>
        {GRADES.map((grade, index) => {
          const isSelected = selected === grade;
          return (
            <React.Fragment key={grade}>
              <Pressable
                style={[ss.item, isSelected && ss.itemActive]}
                onPress={() => {
                  onSelect(grade);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <Text style={[ss.itemText, isSelected && ss.itemTextActive]}>{grade}</Text>
                {isSelected ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
              {index < GRADES.length - 1 ? <View style={ss.divider} /> : null}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </PickerSheet>
  );
}

function SchoolSheet({
  visible,
  selected,
  onSelect,
  onClose,
  schools,
  onAddSchool,
}: {
  visible: boolean;
  selected: string;
  onSelect: (s: string) => void;
  onClose: () => void;
  schools: string[];
  onAddSchool: (s: string) => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setQuery('');
    }
  }, [visible]);

  const filtered = schools.filter((school) => school.toLowerCase().includes(query.toLowerCase()));
  const showAdd =
    query.trim().length > 0 &&
    !schools.some((school) => school.toLowerCase() === query.trim().toLowerCase());

  return (
    <PickerSheet visible={visible} title="Select School" onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={ss.search}>
          <Icon name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={ss.searchInput}
            placeholder="Search or add school..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={ss.listArea}
          keyboardShouldPersistTaps="handled"
        >
          {showAdd ? (
            <Pressable
              style={ss.item}
              onPress={() => {
                onAddSchool(query.trim());
                onSelect(query.trim());
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Icon name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[ss.itemText, styles.addSchoolText]}>Add "{query.trim()}"</Text>
            </Pressable>
          ) : null}

          {filtered.map((school, index) => {
            const isSelected = selected === school;
            return (
              <React.Fragment key={school}>
                <Pressable
                  style={[ss.item, isSelected && ss.itemActive]}
                  onPress={() => {
                    onSelect(school);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                >
                  <Text style={[ss.itemText, isSelected && ss.itemTextActive]}>{school}</Text>
                  {isSelected ? <Icon name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
                {index < filtered.length - 1 || showAdd ? <View style={ss.divider} /> : null}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </PickerSheet>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (child: Child) => void;
  /** When provided, the modal opens in edit mode and prefills this child. */
  child?: Child | null;
};

export const AddChildModal = React.memo(function AddChildModal({
  visible,
  onClose,
  onSubmit,
  child,
}: Props) {
  const isEdit = !!child;
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  // Schools come from the API (with ids) so creating a child can send school_id.
  // Falls back to the preset names if the request fails.
  const [apiSchools, setApiSchools] = useState<{ id: string; name: string }[]>([]);
  const [extraSchools, setExtraSchools] = useState<string[]>([]);
  const schoolNames = useMemo(
    () => (apiSchools.length > 0 ? apiSchools.map((s) => s.name) : [...PRESET_SCHOOLS]),
    [apiSchools]
  );
  // Dedupe so a school never appears twice (e.g. the child's school is both a
  // custom "extra" and already present in the API list).
  const allSchools = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const name of [...extraSchools, ...schoolNames]) {
      if (name && !seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
    return result;
  }, [extraSchools, schoolNames]);
  const schoolIdByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of apiSchools) map[s.name] = s.id;
    return map;
  }, [apiSchools]);

  const [childName, setChildName] = useState('');
  const [dobIso, setDobIso] = useState(() => toIsoDate(new Date(currentYear - 8, 0, 1)));
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [classSec, setClassSec] = useState('');
  const [status, setStatus] = useState('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showGrade, setShowGrade] = useState(false);
  const [showSchool, setShowSchool] = useState(false);

  const ageYears = ageFromIsoDate(dobIso);
  const formattedDob = formatAppDate(dobIso);

  const resetForm = useCallback(() => {
    setChildName('');
    setDobIso(toIsoDate(new Date(currentYear - 8, 0, 1)));
    setGrade('');
    setSchool('');
    setGender(null);
    setClassSec('');
    setStatus('active');
    setExtraSchools([]);
  }, []);

  /** Loads form fields from a child (used in edit mode). */
  const prefillFromChild = useCallback((c: Child) => {
    setChildName(c.name ?? '');
    if (c.dateOfBirth) setDobIso(c.dateOfBirth);
    setGrade(normalizeGrade(c.grade));
    setSchool(c.schoolName ?? '');
    setGender(c.gender ?? null);
    setClassSec(c.section ?? '');
    setStatus(c.status === 'inactive' ? 'inactive' : 'active');
    // Make sure a custom school value is selectable in the picker.
    if (c.schoolName && !PRESET_SCHOOLS.includes(c.schoolName)) {
      setExtraSchools((prev) => (prev.includes(c.schoolName!) ? prev : [c.schoolName!, ...prev]));
    }
  }, []);

  // Prefill (edit) or reset (add) whenever the modal opens. In edit mode we also
  // refresh from GET /students/:uuid so the form reflects the latest server data.
  useEffect(() => {
    if (!visible) return;
    if (child) {
      prefillFromChild(child);
      let cancelled = false;
      studentsService
        .getStudent(child.id)
        .then((fresh) => { if (!cancelled) prefillFromChild(fresh); })
        .catch(() => {});
      return () => { cancelled = true; };
    }
    resetForm();
  }, [visible, child, prefillFromChild, resetForm]);

  // Load the schools list (with ids) once the modal opens.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    schoolsService
      .getSchools()
      .then((list) => { if (!cancelled) setApiSchools(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible]);

  // The detail endpoint returns school_id (not a name), so once the schools
  // list loads, resolve the id to a name to prefill the picker in edit mode.
  useEffect(() => {
    if (!visible || !child?.schoolId || apiSchools.length === 0) return;
    const match = apiSchools.find((s) => String(s.id) === String(child.schoolId));
    if (match) setSchool((prev) => prev || match.name);
  }, [visible, child, apiSchools]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
    resetForm();
  }, [isSubmitting, onClose, resetForm]);

  const handleSubmit = useCallback(() => {
    const fullName = childName.trim();
    const classSection = classSec.trim();

    if (!fullName) {
      showToast({ type: 'error', message: 'Enter child name.' });
      return;
    }
    if (!grade) {
      showToast({ type: 'error', message: 'Select standard.' });
      return;
    }
    if (!school) {
      showToast({ type: 'error', message: 'Select school.' });
      return;
    }
    if (!gender) {
      showToast({ type: 'error', message: 'Select gender.' });
      return;
    }
    if (!classSection) {
      showToast({ type: 'error', message: 'Enter class / section.' });
      return;
    }

    const firstName = fullName.split(' ')[0];

    // ── Add mode requires a real school id (school_id) ──
    if (!child) {
      const schoolId = schoolIdByName[school];
      if (!schoolId) {
        showToast({ type: 'error', message: 'Please pick a school from the list.' });
        return;
      }

      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const payload: CreateStudentPayload = {
        full_name: fullName,
        date_of_birth: dobIso,
        gender: gender === 'male' ? 'male' : 'female',
        grade,
        section: classSection,
        school_id: schoolId,
        is_active: status === 'active',
      };

      studentsService
        .createStudent(payload)
        .then((created) => {
          onSubmit(created);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({ type: 'success', message: `${firstName} was added to your family.` });
          resetForm();
          onClose();
        })
        .catch(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast({ type: 'error', message: 'Could not add child. Please try again.' });
        })
        .finally(() => setIsSubmitting(false));
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // ── Edit mode: PATCH the existing student ──
    if (child) {
      const payload: UpdateStudentPayload = {
        full_name: fullName,
        date_of_birth: dobIso,
        gender: gender === 'male' ? 'male' : 'female',
        class_name: grade,
        section: classSection,
        school_name: school,
        is_active: status === 'active',
      };

      studentsService
        .updateStudent(child.id, payload)
        .then((updated) => {
          onSubmit(updated);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({ type: 'success', message: `${firstName}'s details were updated.` });
          onClose();
        })
        .catch(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast({ type: 'error', message: 'Could not update child. Please try again.' });
        })
        .finally(() => setIsSubmitting(false));
    }
  }, [child, childName, classSec, dobIso, gender, grade, onClose, onSubmit, resetForm, school, schoolIdByName, showToast, status]);

  const isFormValid =
    childName.trim().length > 0 &&
    grade !== '' &&
    school !== '' &&
    gender !== null &&
    classSec.trim().length > 0;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.safe} edges={['left', 'right']}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={GRADIENT_60_END}
              style={[styles.gradient, { paddingTop: insets.top }]}
            >
              <View style={styles.headerOrbs} pointerEvents="none">
                <View style={styles.orbLarge} />
                <View style={styles.orbMid} />
                <View style={styles.orbTiny} />
              </View>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconOrb}>
                    <Icon name="child-care" size={20} color={colors.surface} />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>{isEdit ? 'Edit Child' : 'Add Child'}</Text>
                    <Text style={styles.headerSub}>
                      {isEdit ? "Update your child's details" : 'Same child details flow as onboarding'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                  disabled={isSubmitting}
                  hitSlop={8}
                >
                  <Icon name="close" size={26} color="rgba(255,255,255,0.92)" />
                </Pressable>
              </View>
            </LinearGradient>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Section icon="badge" iconBg={colors.lavenderSoft} iconColor={colors.primary} label="Child Name">
                <InputField
                  label="Child's Full Name"
                  value={childName}
                  onChangeText={setChildName}
                  placeholder="e.g. Arya Sharma"
                  autoCapitalize="words"
                  autoCorrect={false}
                  leftIcon={<Icon name="child-care" size={20} color={colors.textMuted} />}
                />
              </Section>

              <Section icon="cake" iconBg={colors.skySoft} iconColor={colors.info} label="Date of Birth">
                <DatePickerField
                  valueIso={dobIso}
                  onChangeIso={(nextDob) => {
                    setDobIso(nextDob);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  maximumDate={new Date()}
                  label={null}
                >
                  <View style={styles.inputRow}>
                    <Icon name="cake" size={20} color={colors.textMuted} />
                    <Text style={styles.inputText}>{formattedDob}</Text>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeText}>Age {ageYears}</Text>
                    </View>
                    <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                  </View>
                </DatePickerField>
              </Section>

              <Section icon="class" iconBg={colors.peachSoft} iconColor={colors.accent} label="School Details">
                <View>
                  <Text style={styles.fieldLabel}>Select Standard</Text>
                  <Pressable
                    style={styles.inputRow}
                    onPress={() => {
                      setShowGrade(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Icon name="school" size={20} color={colors.textMuted} />
                    <Text style={[styles.inputText, !grade && styles.inputMuted]}>
                      {grade || 'Select standard...'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <InputField
                  label="Class / Sections"
                  value={classSec}
                  onChangeText={setClassSec}
                  placeholder="e.g. 5-A or Section B"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  leftIcon={<Icon name="class" size={20} color={colors.textMuted} />}
                />
              </Section>

              <Section icon="school" iconBg={colors.skySoft} iconColor={colors.info} label="School">
                <View>
                  <Text style={styles.fieldLabel}>Select School</Text>
                  <Pressable
                    style={styles.inputRow}
                    onPress={() => {
                      setShowSchool(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Icon name="account-balance" size={20} color={colors.textMuted} />
                    <Text style={[styles.inputText, !school && styles.inputMuted]} numberOfLines={1}>
                      {school || 'Select your school...'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </Section>

              <Section icon="wc" iconBg={colors.mintSoft} iconColor={colors.growth} label="Gender">
                <View style={styles.genderRow}>
                  {GENDERS.map((item) => {
                    const isActive = gender === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.genderChip, isActive && styles.genderChipActive]}
                        onPress={() => {
                          setGender(item.key);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.genderEmoji}>{item.marker}</Text>
                        <Text style={[styles.genderLabel, isActive && styles.genderLabelActive]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>

              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  !isFormValid && !isSubmitting ? styles.ctaDisabled : null,
                  pressed && isFormValid && !isSubmitting ? styles.ctaPressed : null,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <>
                    <Text style={[styles.ctaText, !isFormValid && styles.ctaTextDisabled]}>
                      {isEdit ? 'Save Changes' : 'Add Child'}
                    </Text>
                    {isFormValid ? <Icon name="check" size={20} color={colors.surface} /> : null}
                  </>
                )}
              </Pressable>
            </ScrollView>
          </SafeAreaView>

          {/* Lets toasts raised from this modal draw inside the modal's own window on Android. */}
          <ToastPortalHost />
        </KeyboardAvoidingView>
      </Modal>

      <GradeSheet
        visible={showGrade}
        selected={grade}
        onSelect={setGrade}
        onClose={() => setShowGrade(false)}
      />
      <SchoolSheet
        visible={showSchool}
        selected={school}
        onSelect={setSchool}
        onClose={() => setShowSchool(false)}
        schools={allSchools}
        onAddSchool={(value) => setExtraSchools((prev) => [value, ...prev])}
      />
    </>
  );
});

function Section({
  icon,
  iconBg,
  iconColor,
  label,
  children,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconOrb, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  gradient: { width: '100%' },
  headerOrbs: { ...StyleSheet.absoluteFillObject },
  orbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.09)',
    top: -100,
    right: -72,
  },
  orbMid: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(232,228,255,0.16)',
    bottom: 10,
    left: 12,
  },
  orbTiny: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: 18,
    left: '38%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    zIndex: 1,
    gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textStyles.headingMedium,
    fontWeight: '800',
    fontSize: 18,
    color: colors.surface,
  },
  headerSub: {
    ...textStyles.caption,
    color: 'rgba(255,255,255,0.76)',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  closeBtnPressed: { opacity: 0.88, backgroundColor: 'rgba(255,255,255,0.12)' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  cardIconOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  // Matches the label styling used inside InputField.
  fieldLabel: {
    ...textStyles.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 56,
    gap: spacing.sm,
  },
  inputText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
  inputMuted: { color: colors.textMuted },
  ageBadge: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.xs,
  },
  ageBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  genderRow: { flexDirection: 'row', gap: spacing.md },
  genderChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.xs,
  },
  genderChipActive: {
    backgroundColor: colors.lavenderSoft,
    borderColor: colors.primary,
    ...shadows.small,
  },
  genderEmoji: { fontSize: 20, fontWeight: '700', color: colors.primaryDark },
  genderLabel: { ...textStyles.bodyMedium, fontWeight: '500', color: colors.textSecondary },
  genderLabelActive: { color: colors.primary, fontWeight: '600' },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.large,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadows.medium,
  },
  ctaDisabled: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0 },
  ctaPressed: { opacity: 0.85 },
  ctaText: { ...textStyles.button, color: colors.surface, fontSize: 16 },
  ctaTextDisabled: { color: colors.textMuted },
  addSchoolText: { color: colors.primary, marginLeft: spacing.sm, fontWeight: '600' },
});

const ss = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingBottom: 40,
    paddingTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { ...textStyles.headingMedium, flex: 1 },
  sheetClose: { padding: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.md,
    height: 48,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    height: '100%',
    minHeight: 48,
  },
  listArea: { maxHeight: SH * 0.5 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  itemActive: { backgroundColor: colors.lavenderSoft },
  itemText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
  itemTextActive: { color: colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
});
