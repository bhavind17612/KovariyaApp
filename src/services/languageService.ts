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
    const lang = data?.behaviour_language;
    // No behaviour language chosen yet — caller should fall back to a default.
    if (!data?.is_language_set || !lang?.id || !lang?.language_code) {
      return null;
    }

    const pref: CachedLanguagePreference = {
      languageId: lang.id,
      code: lang.language_code,
    };
    await storage.set(STORAGE_KEYS.LANGUAGE_PREFERENCE, pref);
    return pref;
  }

  /**
   * Resolves the language to use for behaviour rating. Returns the parent's
   * saved preference, or falls back to English (from the languages list) when
   * none is set. The English fallback is intentionally NOT cached, so it is
   * superseded the moment the parent picks a real preference.
   */
  async getBehaviourLanguage(): Promise<CachedLanguagePreference | null> {
    const pref = await this.getPreferredLanguage();
    if (pref?.code) {
      return pref;
    }

    const languages = await this.getLanguages();
    const english =
      languages.find((l) => l.language_code?.toLowerCase() === 'en') ?? languages[0];
    return english
      ? { languageId: english.id, code: english.language_code }
      : null;
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
