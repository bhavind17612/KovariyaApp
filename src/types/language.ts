/** API request / response types for Language and Parent Preference endpoints. */

/** One language item returned by GET /languages */
export interface ApiLanguage {
  id: number;
  /** ISO-639-1 code, e.g. "en", "hi", "gu" — maps to SupportedLanguage */
  language_code: string;
  name: string;
  native_name?: string;
  flag_image: string;
}

/** Response body of GET /parent/preferences/language */
export interface LanguagePreferenceResponse {
  language_id: number;
  code: string;
  name: string;
  native_name?: string;
}

/** Request body of POST /parent/preferences/language */
export interface LanguagePreferenceRequest {
  language_id: number;
}

/** Shape stored in AsyncStorage to avoid an extra network round-trip on cold start */
export interface CachedLanguagePreference {
  languageId: number;
  code: string;
}
