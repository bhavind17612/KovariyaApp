import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button } from '../Button';
import { useToast } from '../../context/ToastContext';
import { borderRadius, colors, shadows, spacing, textStyles } from '../../theme';

type Props = {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  /** Called with the picked local photo URI and an optional note. */
  onSubmit: (proofUri: string, note?: string) => void;
};

/**
 * Bottom-sheet modal to capture or pick a photo as mission proof.
 * Used when a parent chooses to attach a photo while marking a mission done.
 */
export function MissionProofModal({ visible, submitting, onClose, onSubmit }: Props) {
  const { showToast } = useToast();
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Reset whenever the sheet is reopened.
  useEffect(() => {
    if (visible) {
      setProofUri(null);
      setNote('');
    }
  }, [visible]);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({ type: 'error', message: 'Camera permission is required to take a photo.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProofUri(result.assets[0].uri);
    }
  };

  const chooseFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ type: 'error', message: 'Photo access is required to choose a photo.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!proofUri) {
      return;
    }
    onSubmit(proofUri, note.trim() || undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={submitting ? undefined : onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.iconOrb}>
              <Icon name="photo-camera" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Add proof photo</Text>
              <Text style={styles.subtitle}>Capture or pick a photo for this mission.</Text>
            </View>
          </View>

          {proofUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: proofUri }} style={styles.preview} resizeMode="cover" />
              <Pressable
                style={({ pressed }) => [styles.changeChip, pressed && styles.pressed]}
                onPress={() => setProofUri(null)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Choose a different photo"
              >
                <Icon name="refresh" size={16} color={colors.primaryDark} />
                <Text style={styles.changeChipText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <Pressable
                style={({ pressed }) => [styles.pickCard, pressed && styles.pressed]}
                onPress={takePhoto}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Take a photo"
              >
                <Icon name="photo-camera" size={26} color={colors.primary} />
                <Text style={styles.pickText}>Take Photo</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.pickCard, pressed && styles.pressed]}
                onPress={chooseFromGallery}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Choose from gallery"
              >
                <Icon name="photo-library" size={26} color={colors.primary} />
                <Text style={styles.pickText}>Choose from Gallery</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.noteLabel}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Finished the journal"
            placeholderTextColor={colors.textMuted}
            style={styles.noteInput}
            editable={!submitting}
            multiline
          />

          <View style={styles.footer}>
            <View style={styles.footerSlot}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="ghost"
                size="medium"
                disabled={submitting}
                style={styles.cancelBtn}
                textStyle={styles.cancelBtnText}
              />
            </View>
            <View style={styles.footerSlot}>
              <Button
                title="Upload & Mark Done"
                onPress={handleSubmit}
                variant="primary"
                size="medium"
                loading={submitting}
                disabled={submitting || !proofUri}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.inkOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    ...shadows.large,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...textStyles.headingMedium,
    color: colors.ink,
    fontWeight: '800',
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  pickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  pickText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  previewWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surfaceMuted,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.lavenderSoft,
  },
  changeChipText: {
    ...textStyles.caption,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  noteLabel: {
    ...textStyles.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  noteInput: {
    ...textStyles.bodyMedium,
    minHeight: 56,
    color: colors.ink,
    textAlignVertical: 'top',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.surfaceMuted,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  footerSlot: {
    flex: 1,
    minWidth: 0,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.large,
    width: '100%',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
