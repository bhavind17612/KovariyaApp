import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';
import type {
  ApiLanguage,
  CachedLanguagePreference,
  LanguagePreferenceRequest,
  LanguagePreferenceResponse,
} from '../types/language';

class LanguageService {
  /** Returns all available languages from GET /languages. */
  async getLanguages(): Promise<ApiLanguage[]> {
    const response = await api.get<ApiLanguage[]>(ENDPOINTS.LANGUAGE.LIST);
    return Array.isArray(response.data.data) ? response.data.data : [];
  }

  /**
   * Returns the parent's saved language preference.
   *
   * Strategy: read the AsyncStorage cache first (instant, no network) and only
   * hit the API when no cache is found.  The cache is written on every
   * successful save so it stays in sync.
   */
  async getPreferredLanguage(): Promise<CachedLanguagePreference | null> {
    const cached = await storage.get<CachedLanguagePreference>(
      STORAGE_KEYS.LANGUAGE_PREFERENCE,
    );
    if (cached?.code) {
      return cached;
    }

    const response = await api.get<LanguagePreferenceResponse>(
      ENDPOINTS.LANGUAGE.PREFERENCE,
    );
    const data = response.data.data;
    if (!data?.code) {
      return null;
    }

    const pref: CachedLanguagePreference = {
      languageId: data.language_id,
      code: data.code,
    };
    await storage.set(STORAGE_KEYS.LANGUAGE_PREFERENCE, pref);
    return pref;
  }

  /**
   * Persists the selected language via POST /parent/preferences/language and
   * updates the local AsyncStorage cache so the next cold start is instant.
   */
  async savePreferredLanguage(languageId: number, code: string): Promise<void> {
    const body: LanguagePreferenceRequest = { language_id: languageId };
    await api.post<void>(ENDPOINTS.LANGUAGE.PREFERENCE, body);
    const pref: CachedLanguagePreference = { languageId, code };
    await storage.set(STORAGE_KEYS.LANGUAGE_PREFERENCE, pref);
  }
}

export const languageService = new LanguageService();
