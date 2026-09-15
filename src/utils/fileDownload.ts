import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';

/** Android's FLAG_GRANT_READ_URI_PERMISSION — lets the launched viewer app read our content URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Writes an already-downloaded file into a folder the user granted access to
 * via Android's Storage Access Framework — this is what actually lands the
 * file in a real, browsable location (typically Downloads, since that's what
 * users pick when asked). Android's generic share sheet (ACTION_SEND) only
 * lists apps that registered themselves as receivers for the file's mime type,
 * so whether a "Save to..." entry even appears there depends entirely on what
 * apps happen to be installed — it is not a reliable save path.
 *
 * The granted directory is cached so only the first download this app-install
 * ever prompts for a folder; later downloads reuse it silently.
 *
 * Returns the SAF content:// URI of the saved file, which can be handed to
 * an ACTION_VIEW intent to open it directly afterwards.
 */
async function saveToAndroidDownloads(
  sourceUri: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: 'base64' });

  const writeInto = async (directoryUri: string): Promise<string> => {
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      fileName,
      mimeType
    );
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
    return fileUri;
  };

  const cachedDirectoryUri = await storage.get<string>(STORAGE_KEYS.ANDROID_DOWNLOAD_DIR_URI);
  if (cachedDirectoryUri) {
    try {
      return await writeInto(cachedDirectoryUri);
    } catch {
      // Permission was likely revoked (cleared app storage, folder deleted, etc.)
      // — fall through and ask again below.
    }
  }

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Storage access was not granted, so the file could not be saved.');
  }
  await storage.set(STORAGE_KEYS.ANDROID_DOWNLOAD_DIR_URI, permission.directoryUri);
  return writeInto(permission.directoryUri);
}

/** Opens a downloaded file with whichever app the user picks from the system chooser. */
async function openFile(uri: string, mimeType: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: uri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: mimeType,
      });
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType, UTI: 'com.adobe.pdf' });
    }
  } catch {
    Alert.alert('Couldn’t open file', 'No app was found on this device to open this file.');
  }
}

/**
 * Downloads a remote file, saves it (Android: to a real folder via SAF; iOS:
 * to the app's sandbox — there's no shared Downloads location there), then
 * asks the user whether to open it right away via the system's "Open with"
 * chooser — no need to go hunting for it in a file manager afterwards.
 */
export async function downloadAndShareFile(
  url: string,
  fileName: string,
  mimeType = 'application/pdf'
): Promise<void> {
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('No writable directory available on this device.');
  }
  const { uri: downloadedUri } = await FileSystem.downloadAsync(url, `${baseDir}${fileName}`);

  const openableUri =
    Platform.OS === 'android'
      ? await saveToAndroidDownloads(downloadedUri, fileName, mimeType)
      : downloadedUri;

  Alert.alert('Download complete', `${fileName} has been downloaded. Open it now?`, [
    { text: 'Later', style: 'cancel' },
    { text: 'Open', onPress: () => openFile(openableUri, mimeType) },
  ]);
}
