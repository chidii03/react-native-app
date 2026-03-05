/**
 * Central source of truth for app locales.
 * Keep this in sync with app/settings/language.tsx.
 */
export const APP_LOCALES = [
  "en-US", "en-GB", "en-NG", "en-CA", "en-AU",
  "fr-FR", "fr-CA", "fr-BE",
  "es-ES", "es-MX", "es-AR", "es-CO",
  "pt-PT", "pt-BR",
  "de-DE", "de-AT",
  "it-IT", "nl-NL", "sv-SE", "no-NO", "da-DK", "fi-FI",
  "pl-PL", "cs-CZ", "sk-SK", "hu-HU", "ro-RO",
  "ru-RU", "uk-UA", "bg-BG", "sr-RS", "hr-HR",
  "el-GR", "tr-TR",
  "ar-SA", "ar-EG", "he-IL", "fa-IR", "ur-PK",
  "hi-IN", "bn-BD", "ta-IN", "te-IN", "mr-IN",
  "zh-CN", "zh-TW", "ja-JP", "ko-KR",
  "th-TH", "vi-VN", "id-ID", "ms-MY",
  "sw-KE", "yo-NG", "ig-NG", "ha-NG",
  "am-ET", "zu-ZA", "af-ZA",
] as const;

export type AppLocale = typeof APP_LOCALES[number];

const APP_LOCALE_SET = new Set<string>(APP_LOCALES);

export const isAppLocale = (value: string): value is AppLocale => APP_LOCALE_SET.has(value);

export const normalizeAppLocale = (value: string): AppLocale => {
  const raw = String(value || "").trim();
  if (isAppLocale(raw)) return raw;

  const [lang] = raw.split("-");
  const byLanguage = APP_LOCALES.find((code) => code.toLowerCase().startsWith(`${lang.toLowerCase()}-`));
  return (byLanguage ?? "en-US") as AppLocale;
};

let activeLocale: AppLocale = "en-US";

export const setActiveLocale = (locale: string) => {
  activeLocale = normalizeAppLocale(locale);
};

export const getActiveLocale = (): AppLocale => activeLocale;

/**
 * Convert app locale to TMDB language code.
 * Unsupported languages fall back to English.
 */
export const toTMDBLanguage = (locale: string): string => {
  const normalized = normalizeAppLocale(locale);
  const [lang] = normalized.split("-");

  const map: Record<string, string> = {
    en: "en-US",
    fr: "fr-FR",
    es: "es-ES",
    pt: "pt-BR",
    de: "de-DE",
    it: "it-IT",
    nl: "nl-NL",
    sv: "sv-SE",
    no: "no-NO",
    da: "da-DK",
    fi: "fi-FI",
    pl: "pl-PL",
    cs: "cs-CZ",
    sk: "sk-SK",
    hu: "hu-HU",
    ro: "ro-RO",
    ru: "ru-RU",
    uk: "uk-UA",
    bg: "bg-BG",
    sr: "sr-RS",
    hr: "hr-HR",
    el: "el-GR",
    tr: "tr-TR",
    ar: "ar-SA",
    he: "he-IL",
    fa: "fa-IR",
    ur: "ur-PK",
    hi: "hi-IN",
    bn: "bn-BD",
    ta: "ta-IN",
    te: "te-IN",
    mr: "mr-IN",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    th: "th-TH",
    vi: "vi-VN",
    id: "id-ID",
    ms: "ms-MY",
  };

  return map[lang] ?? "en-US";
};

export const getTMDBLanguage = (): string => toTMDBLanguage(activeLocale);
