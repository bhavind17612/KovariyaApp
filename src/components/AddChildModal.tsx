import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
  ActivityIndicator,
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
import { FloatingLabelField } from './FloatingLabelField';
import { DatePickerField } from './DatePickerField';
import { PRESET_SCHOOLS } from '../data/schools';
import { useToast } from '../context/ToastContext';
import type { Child } from '../types';
import { ageFromIsoDate, toIsoDate } from '../utils/age';
import { borderRadius, colors, shadows, spacing, textStyles } from '../theme';
import { GRADIENT_60_END } from '../theme/layout';

const { height: SH } = Dimensions.get('window');
const SHEET_CFG = { duration: 320, easing: Easing.out(Easing.cubic) };

const GRADES = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`);
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const GENDERS = [
  { key: 'male', label: 'Male', emoji: '👦' },
  { key: 'female', label: 'Female', emoji: '👧' },
];

// ── Reusable bottom sheet ────────────────────────────────────────────────────
function PickerSheet({
  visible, title, onClose, children,
}: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const y = useSharedValue(SH);
  useEffect(() => { y.value = withTiming(visible ? 0 : SH, SHEET_CFG); }, [visible]);
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

// ── Grade sheet ──────────────────────────────────────────────────────────────
function GradeSheet({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected: string; onSelect: (g: string) => void; onClose: () => void;
}) {
  return (
    <PickerSheet visible={visible} title="Select Grade" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={ss.listArea}>
        {GRADES.map((g, i) => {
          const on = selected === g;
          return (
            <React.Fragment key={g}>
              <Pressable style={[ss.item, on && ss.itemActive]} onPress={() => { onSelect(g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
                <Text style={[ss.itemText, on && ss.itemTextActive]}>{g}</Text>
                {on ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
              {i < GRADES.length - 1 ? <View style={ss.divider} /> : null}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </PickerSheet>
  );
}

// ── Section sheet ────────────────────────────────────────────────────────────
function SectionSheet({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected: string; onSelect: (s: string) => void; onClose: () => void;
}) {
  return (
    <PickerSheet visible={visible} title="Select Section" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} style={ss.listArea}>
        {SECTIONS.map((s, i) => {
          const on = selected === s;
          return (
            <React.Fragment key={s}>
              <Pressable style={[ss.item, on && ss.itemActive]} onPress={() => { onSelect(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
                <Text style={[ss.itemText, on && ss.itemTextActive]}>Section {s}</Text>
                {on ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
              {i < SECTIONS.length - 1 ? <View style={ss.divider} /> : null}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </PickerSheet>
  );
}

// ── School sheet ─────────────────────────────────────────────────────────────
function SchoolSheet({ visible, selected, onSelect, onClose, schools, onAddSchool }: {
  visible: boolean; selected: string; onSelect: (s: string) => void;
  onClose: () => void; schools: string[]; onAddSchool: (s: string) => void;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (visible) setQuery(''); }, [visible]);
  const filtered = schools.filter(s => s.toLowerCase().includes(query.toLowerCase()));
  const showAdd = query.trim().length > 0 && !schools.some(s => s.toLowerCase() === query.trim().toLowerCase());
  return (
    <PickerSheet visible={visible} title="Select School" onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={ss.search}>
          <Icon name="search" size={20} color={colors.textMuted} />
          <TextInput style={ss.searchInput} placeholder="Search or add school…" value={query} onChangeText={setQuery} placeholderTextColor={colors.textMuted} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={ss.listArea} keyboardShouldPersistTaps="handled">
          {showAdd && (
            <Pressable style={ss.item} onPress={() => { onAddSchool(query.trim()); onSelect(query.trim()); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
              <Icon name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[ss.itemText, { color: colors.primary, marginLeft: spacing.sm }]}>Add "{query.trim()}"</Text>
            </Pressable>
          )}
          {filtered.map((s, i) => {
            const on = selected === s;
            return (
              <React.Fragment key={s}>
                <Pressable style={[ss.item, on && ss.itemActive]} onPress={() => { onSelect(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}>
                  <Text style={[ss.itemText, on && ss.itemTextActive]}>{s}</Text>
                  {on ? <Icon name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
                {(i < filtered.length - 1 || showAdd) ? <View style={ss.divider} /> : null}
              </React.Fragment>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </PickerSheet>
  );
}

// ── Status toggle ─────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { key: 'active', label: 'Active', emoji: '✅' },
  { key: 'inactive', label: 'Inactive', emoji: '⛔' },
];

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = { visible: boolean; onClose: () => void; onSubmit: (child: Child) => void; };

export const AddChildModal = React.memo(function AddChildModal({ visible, onClose, onSubmit }: Props) {
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const schools = useMemo(() => [...PRESET_SCHOOLS], []);
  const [extraSchools, setExtraSchools] = useState<string[]>([]);
  const allSchools = useMemo(() => [...extraSchools, ...schools], [extraSchools, schools]);

  const [childName, setChildName] = useState('');
  const [dobIso, setDobIso] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [school, setSchool] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [status, setStatus] = useState('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showGrade, setShowGrade] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const [showSchool, setShowSchool] = useState(false);

  const resetForm = useCallback(() => {
    setChildName(''); setDobIso(undefined); setGender(null);
    setGrade(''); setSection(''); setSchool(''); setAdmissionNumber(''); setStatus('active');
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose(); resetForm();
  }, [isSubmitting, onClose, resetForm]);

  const handleSubmit = useCallback(() => {
    const fullName = childName.trim();
    if (!fullName) { showToast({ type: 'error', message: 'Enter child name.' }); return; }
    if (!dobIso || dobIso.length < 10) { showToast({ type: 'error', message: 'Select date of birth.' }); return; }
    if (!gender) { showToast({ type: 'error', message: 'Select gender.' }); return; }
    if (!grade) { showToast({ type: 'error', message: 'Select grade.' }); return; }
    if (!section) { showToast({ type: 'error', message: 'Select section.' }); return; }
    if (!school) { showToast({ type: 'error', message: 'Select school.' }); return; }
    const adm = admissionNumber.trim();
    if (!adm) { showToast({ type: 'error', message: 'Enter admission number.' }); return; }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      const child: Child = {
        id: `child-${Date.now()}`,
        name: fullName,
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' ') || '',
        age: ageFromIsoDate(dobIso!),
        dateOfBirth: dobIso!,
        gender: gender === 'male' ? 'male' : 'female',
        grade, section, schoolName: school, admissionNumber: adm, status,
      };
      onSubmit(child);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ type: 'success', message: `${fullName.split(' ')[0]} was added to your family.` });
      setIsSubmitting(false);
      resetForm();
      onClose();
    }, 650);
  }, [childName, dobIso, gender, grade, section, school, admissionNumber, status, onSubmit, onClose, resetForm, showToast]);

  const isFormValid = childName.trim().length > 0 &&
    !!dobIso && !!gender && !!grade && !!section && !!school && admissionNumber.trim().length > 0;

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.safe} edges={['left', 'right']}>
            {/* Header */}
            <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={GRADIENT_60_END}
              style={[styles.gradient, { paddingTop: insets.top }]}>
              <View style={styles.headerOrbs} pointerEvents="none">
                <View style={styles.orbLarge} /><View style={styles.orbMid} /><View style={styles.orbTiny} />
              </View>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconOrb}><Icon name="child-care" size={20} color={colors.surface} /></View>
                  <View>
                    <Text style={styles.headerTitle}>Add Child</Text>
                    <Text style={styles.headerSub}>School &amp; profile details</Text>
                  </View>
                </View>
                <Pressable onPress={handleClose} style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]} disabled={isSubmitting} hitSlop={8}>
                  <Icon name="close" size={26} color="rgba(255,255,255,0.92)" />
                </Pressable>
              </View>
            </LinearGradient>

            {/* Form */}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Name */}
              <Section icon="badge" iconBg={colors.lavenderSoft} iconColor={colors.primary} label="Child Name">
                <FloatingLabelField label="Child's full name" value={childName} onChangeText={setChildName} autoCapitalize="words"
                  leftIcon={<Icon name="child-care" size={18} color={colors.textMuted} />} />
              </Section>

              {/* DOB */}
              <Section icon="cake" iconBg={colors.skySoft} iconColor={colors.info} label="Date of Birth">
                <DatePickerField label="Date of birth" valueIso={dobIso} onChangeIso={setDobIso}
                  placeholder="Tap to choose" maximumDate={new Date()} leftIcon={<Icon name="event" size={18} color={colors.textMuted} />} />
              </Section>

              {/* Gender */}
              <Section icon="wc" iconBg={colors.mintSoft} iconColor={colors.growth} label="Gender">
                <View style={styles.genderRow}>
                  {GENDERS.map(g => {
                    const on = gender === g.key;
                    return (
                      <Pressable key={g.key} style={[styles.genderChip, on && styles.genderChipActive]}
                        onPress={() => { setGender(g.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Text style={styles.genderEmoji}>{g.emoji}</Text>
                        <Text style={[styles.genderLabel, on && styles.genderLabelActive]}>{g.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>

              {/* Grade & Section */}
              <Section icon="class" iconBg={colors.peachSoft} iconColor={colors.accent} label="Class & Section">
                <Pressable style={styles.inputRow} onPress={() => { setShowGrade(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Icon name="menu-book" size={20} color={colors.textMuted} />
                  <Text style={[styles.inputText, !grade && styles.inputMuted]}>{grade || 'Select grade…'}</Text>
                  <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                </Pressable>
                <Pressable style={styles.inputRow} onPress={() => { setShowSection(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Icon name="grid-view" size={20} color={colors.textMuted} />
                  <Text style={[styles.inputText, !section && styles.inputMuted]}>{section ? `Section ${section}` : 'Select section…'}</Text>
                  <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                </Pressable>
              </Section>

              {/* School */}
              <Section icon="school" iconBg={colors.skySoft} iconColor={colors.info} label="School">
                <Pressable style={styles.inputRow} onPress={() => { setShowSchool(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Icon name="account-balance" size={20} color={colors.textMuted} />
                  <Text style={[styles.inputText, !school && styles.inputMuted]} numberOfLines={1}>{school || 'Select your school…'}</Text>
                  <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
                </Pressable>
                <FloatingLabelField label="Admission number" value={admissionNumber} onChangeText={setAdmissionNumber}
                  autoCapitalize="characters" leftIcon={<Icon name="confirmation-number" size={18} color={colors.textMuted} />} />
              </Section>

              {/* Status — only in AddChildModal */}
              <Section icon="toggle-on" iconBg={colors.lavenderSoft} iconColor={colors.primary} label="Status">
                <View style={styles.genderRow}>
                  {STATUS_OPTS.map(s => {
                    const on = status === s.key;
                    return (
                      <Pressable key={s.key} style={[styles.genderChip, on && styles.genderChipActive]}
                        onPress={() => { setStatus(s.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                        <Text style={styles.genderEmoji}>{s.emoji}</Text>
                        <Text style={[styles.genderLabel, on && styles.genderLabelActive]}>{s.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [styles.cta, !isFormValid && !isSubmitting ? styles.ctaDisabled : null, pressed && isFormValid && !isSubmitting ? styles.ctaPressed : null]}
                onPress={handleSubmit} disabled={!isFormValid || isSubmitting}>
                {isSubmitting
                  ? <ActivityIndicator size="small" color={colors.surface} />
                  : <>
                    <Text style={[styles.ctaText, !isFormValid && styles.ctaTextDisabled]}>Add Child</Text>
                    {isFormValid ? <Icon name="check" size={20} color={colors.surface} /> : null}
                  </>}
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom sheets (outside main modal so they render on top) */}
      <GradeSheet visible={showGrade} selected={grade} onSelect={setGrade} onClose={() => setShowGrade(false)} />
      <SectionSheet visible={showSection} selected={section} onSelect={setSection} onClose={() => setShowSection(false)} />
      <SchoolSheet visible={showSchool} selected={school} onSelect={setSchool} onClose={() => setShowSchool(false)}
        schools={allSchools} onAddSchool={s => setExtraSchools(prev => [s, ...prev])} />
    </>
  );
});

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ icon, iconBg, iconColor, label, children }: {
  icon: string; iconBg: string; iconColor: string; label: string; children: React.ReactNode;
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  gradient: { width: '100%' },
  headerOrbs: { ...StyleSheet.absoluteFillObject },
  orbLarge: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.09)', top: -100, right: -72 },
  orbMid: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(232,228,255,0.16)', bottom: 10, left: 12 },
  orbTiny: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', top: 18, left: '38%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md, zIndex: 1, gap: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconOrb: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...textStyles.headingMedium, fontWeight: '800', fontSize: 18, color: colors.surface },
  headerSub: { ...textStyles.caption, color: 'rgba(255,255,255,0.76)', fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full },
  closeBtnPressed: { opacity: 0.88, backgroundColor: 'rgba(255,255,255,0.12)' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 40 },

  // Cards
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, marginTop: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  cardIconOrb: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { ...textStyles.caption, color: colors.textSecondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.xs, gap: spacing.md },

  // Row / cols
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },

  // Input row (OnboardingScreen3 style)
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.large, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, height: 56, gap: spacing.sm },
  inputText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
  inputMuted: { color: colors.textMuted },

  // Gender / status chips
  genderRow: { flexDirection: 'row', gap: spacing.md },
  genderChip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: 24, backgroundColor: colors.surfaceMuted, borderWidth: 2, borderColor: 'transparent', gap: spacing.xs },
  genderChipActive: { backgroundColor: colors.lavenderSoft, borderColor: colors.primary, ...shadows.small },
  genderEmoji: { fontSize: 24 },
  genderLabel: { ...textStyles.bodyMedium, fontWeight: '500', color: colors.textSecondary },
  genderLabelActive: { color: colors.primary, fontWeight: '600' },

  // CTA
  cta: { backgroundColor: colors.primary, borderRadius: borderRadius.large, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, ...shadows.medium },
  ctaDisabled: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0 },
  ctaPressed: { opacity: 0.85 },
  ctaText: { ...textStyles.button, color: colors.surface, fontSize: 16 },
  ctaTextDisabled: { color: colors.textMuted },
});

// ── Sheet styles ──────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, paddingBottom: 40, paddingTop: spacing.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { ...textStyles.headingMedium, flex: 1 },
  sheetClose: { padding: 4 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.large, paddingHorizontal: spacing.md, height: 48, marginHorizontal: spacing.xl, marginBottom: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  searchInput: { flex: 1, ...textStyles.bodyMedium, color: colors.textPrimary, height: '100%', minHeight: 48 },
  listArea: { maxHeight: SH * 0.5 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2, gap: spacing.sm },
  itemActive: { backgroundColor: colors.lavenderSoft },
  itemText: { flex: 1, ...textStyles.bodyLarge, color: colors.textPrimary },
  itemTextActive: { color: colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
});
