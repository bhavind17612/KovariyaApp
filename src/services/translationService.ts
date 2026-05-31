import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import { storage } from '../storage/storage';
import { STORAGE_KEYS } from '../storage/storageKeys';
import type {
  RatingSheetTranslationsApiData,
  RatingSheetTranslationsCache,
} from '../types/translation';

class TranslationService {
  /**
   * Returns Rating Sheet UI translations for the given language.
   *
   * Strategy: read the AsyncStorage cache first (instant, no network) and
   * only hit the API when no cached entry is found for this language_id.
   * The cache is written on every successful fetch so subsequent opens are
   * served instantly even when offline.
   */
  async getRatingSheetTranslations(
    languageId: number,
  ): Promise<RatingSheetTranslationsApiData> {
    // const cache =
    //   (await storage.get<RatingSheetTranslationsCache>(
    //     STORAGE_KEYS.RATING_SHEET_TRANSLATIONS,
    //   )) ?? {};

    // if (cache[languageId]) {
    //   return cache[languageId];
    // }

    const response = await api.get<RatingSheetTranslationsApiData>(
      ENDPOINTS.TRANSLATIONS.RATING_SHEET,
      { params: { language_id: languageId } },
    );
    const data = response.data.data;
    await storage.set(STORAGE_KEYS.RATING_SHEET_TRANSLATIONS, {
      // ...cache,
      [languageId]: data,
    });
    return data;
  }

  /** Clears the cached translations for a single language, forcing a re-fetch. */
  async invalidate(languageId: number): Promise<void> {
    const cache =
      (await storage.get<RatingSheetTranslationsCache>(
        STORAGE_KEYS.RATING_SHEET_TRANSLATIONS,
      )) ?? {};
    const updated = { ...cache };
    delete updated[languageId];
    await storage.set(STORAGE_KEYS.RATING_SHEET_TRANSLATIONS, updated);
  }
}

export const translationService = new TranslationService();
