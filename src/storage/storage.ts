import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Typed async storage abstraction.
 *
 * MMKV drop-in upgrade (synchronous, faster, encrypted):
 * ─────────────────────────────────────────────────────
 *   npm install react-native-mmkv   (requires native rebuild)
 *
 *   import { MMKV } from 'react-native-mmkv';
 *   const mmkv = new MMKV({ id: 'kovariya', encryptionKey: SECURE_KEY });
 *
 *   Then replace the class body:
 *     get<T>(key: string): T | null {
 *       const raw = mmkv.getString(key);
 *       if (!raw) return null;
 *       try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
 *     }
 *     set<T>(key: string, value: T): void {
 *       const s = typeof value === 'string' ? value : JSON.stringify(value);
 *       mmkv.set(key, s);
 *     }
 *     delete(key: string): void { mmkv.delete(key); }
 *     multiDelete(keys: string[]): void { keys.forEach(k => mmkv.delete(k)); }
 *     clearAll(): void { mmkv.clearAll(); }
 *   (Remove async/await — MMKV is synchronous.)
 */
class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const s = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, s);
    } catch (e) {
      if (__DEV__) {
        console.warn('[Storage] set failed:', key, e);
      }
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }

  async multiDelete(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {}
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch {}
  }
}

export const storage = new StorageService();
