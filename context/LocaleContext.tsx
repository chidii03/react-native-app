import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { account } from "../services/appwriteConfig";
import { AppLocale, normalizeAppLocale, setActiveLocale } from "../services/locale";
import { useAuth } from "./AuthContext";

const LOCALE_KEY = "movietime_locale";

type Dict = Record<string, string>;

const BASE_EN: Dict = {
  home: "Home",
  search: "Search",
  save: "Save",
  profile: "Profile",
  language_updated: "Language updated",
  loading_movies: "Loading movies...",
  search_placeholder_short: "Search 300+ movies...",
  search_placeholder: "Search through 300+ movies online",
  search_empty: "No movies found",
  search_start_typing: "Start typing to search for movies",
  trending_now: "Trending Now",
  updated_daily: "Updated daily",
  top_rated: "Top Rated",
  action_picks: "Action Picks",
  action_picks_sub: "High-octane cinema",
  popular_right_now: "Popular Right Now",
  most_watched: "Most watched",
  browse_by_genre: "Browse by Genre",
  fantasy: "Fantasy",
  fantasy_sub: "Magic & wonder",
  family: "Family",
  family_sub: "Watch together",
  drama_spotlight: "Drama Spotlight",
  drama_spotlight_sub: "Powerful stories",
  crime_files: "Crime Files",
  crime_files_sub: "Dark investigations",
  adventure_world: "Adventure World",
  adventure_world_sub: "Epic journeys",
  top_in_nigeria: "Top in Nigeria",
  top_in_nigeria_sub: "Local audience favorites",
  india_picks: "India Picks",
  india_picks_sub: "Popular regional hits",
  uk_highlights: "UK Highlights",
  uk_highlights_sub: "Trending in Great Britain",
  coming_soon: "Coming Soon",
  coming_soon_sub: "Mark your calendar",
  now_in_theatres: "Now In Theatres",
  book_your_tickets: "Book your tickets",
  movie: "Movie",
  trending: "Trending",
  play_now: "Play Now",
  more_info: "More Info",
  error_prefix: "Error",
  try_wifi: "try connecting to wifi",
  search_results_for: "Search Results for",
  watch_now: "Watch Now",
  your_watchlist: "Your Watchlist",
  watchlist_guest_desc: "Save movies to watch later.",
  sign_in_sync_devices: "Sign in to sync across all your devices.",
  sign_in_required: "Sign in required",
  create_account_save_watchlist: "Create a free account to save your watchlist",
  sign_in: "Sign In",
  create_free_account: "Create Free Account",
  explore_movies_arrow: "Explore movies ->",
  nothing_saved_yet: "Nothing saved yet",
  tap_bookmark_save_movie: "Tap the bookmark icon on any movie",
  add_to_watchlist: "to add it to your watchlist.",
  explore_movies: "Explore Movies",
  loading: "Loading...",
  loading_watchlist: "Loading your watchlist...",
  movies_saved_suffix: "movies saved",
  your_saved_movies: "Your saved movies",
  sign_in_view_list: "Sign in to view your list",
  my_content: "MY CONTENT",
  discover_movies: "Discover Movies",
  browse_all_genres: "Browse all genres",
  account: "ACCOUNT",
  profile_photo: "Profile Photo",
  photo_uploaded: "Photo uploaded",
  upload_profile_photo: "Upload Profile Photo",
  display_name: "Display Name",
  email_address: "Email Address",
  change_password: "Change Password",
  send_reset_link: "Send reset link to your email",
  app: "APP",
  version: "Version",
  privacy_policy: "Privacy Policy",
  terms_of_service: "Terms of Service",
  help_center: "Help Center",
  contact_support: "Contact Support",
  careers: "Careers",
  sign_out: "Sign Out",
  sign_back_anytime: "You can sign back in anytime",
  choose_image_desktop: "Choose an image from Downloads or Pictures.",
  choose_image_phone: "Choose an image from your phone gallery.",
  cancel: "Cancel",
  choose_image: "Choose Image",
  use_google_photo: "Use Google Account Photo",
  sign_out_confirm: "Are you sure you want to sign out?",
  profile_photo_saved: "Profile photo saved",
};

const LANGUAGE_DICT: Record<string, Dict> = {
  en: BASE_EN,
  fr: {
    ...BASE_EN,
    home: "Accueil",
    search: "Rechercher",
    save: "Enregistrer",
    profile: "Profil",
    language_updated: "Langue mise a jour",
    trending_now: "Tendances",
    top_rated: "Les mieux notes",
    coming_soon: "Bientot disponible",
    play_now: "Lire",
    more_info: "Plus d'infos",
    sign_in: "Se connecter",
    profile_photo: "Photo de profil",
    privacy_policy: "Politique de confidentialite",
    terms_of_service: "Conditions d'utilisation",
  },
  es: {
    ...BASE_EN,
    home: "Inicio",
    search: "Buscar",
    save: "Guardar",
    profile: "Perfil",
    language_updated: "Idioma actualizado",
    trending_now: "Tendencias",
    top_rated: "Mejor valoradas",
    coming_soon: "Proximamente",
    play_now: "Reproducir",
    more_info: "Mas informacion",
    sign_in: "Iniciar sesion",
    profile_photo: "Foto de perfil",
    privacy_policy: "Politica de privacidad",
    terms_of_service: "Terminos del servicio",
  },
  pt: {
    ...BASE_EN,
    home: "Inicio",
    search: "Pesquisar",
    save: "Salvar",
    profile: "Perfil",
    language_updated: "Idioma atualizado",
    trending_now: "Em alta",
    top_rated: "Mais bem avaliados",
    coming_soon: "Em breve",
    play_now: "Reproduzir",
    more_info: "Mais info",
    sign_in: "Entrar",
    profile_photo: "Foto do perfil",
    privacy_policy: "Politica de privacidade",
    terms_of_service: "Termos de servico",
  },
  de: {
    ...BASE_EN,
    home: "Start",
    search: "Suche",
    save: "Speichern",
    profile: "Profil",
    language_updated: "Sprache aktualisiert",
    trending_now: "Im Trend",
    top_rated: "Bestbewertet",
    coming_soon: "Demnachst",
    play_now: "Abspielen",
    more_info: "Mehr Infos",
    sign_in: "Anmelden",
    profile_photo: "Profilbild",
    privacy_policy: "Datenschutz",
    terms_of_service: "Nutzungsbedingungen",
  },
  ar: {
    ...BASE_EN,
    home: "الرئيسية",
    search: "بحث",
    save: "حفظ",
    profile: "الملف الشخصي",
    language_updated: "تم تحديث اللغة",
    trending_now: "الرائج الان",
    top_rated: "الاعلى تقييما",
    coming_soon: "قريبا",
  },
  hi: {
    ...BASE_EN,
    home: "होम",
    search: "खोज",
    save: "सेव",
    profile: "प्रोफाइल",
    language_updated: "भाषा अपडेट हो गई",
    trending_now: "ट्रेंडिंग",
    top_rated: "टॉप रेटेड",
    coming_soon: "जल्द आ रहा है",
  },
  zh: {
    ...BASE_EN,
    home: "主页",
    search: "搜索",
    save: "保存",
    profile: "个人资料",
    language_updated: "语言已更新",
    loading_movies: "正在加载电影...",
    search_placeholder_short: "搜索 300+ 部电影...",
    search_empty: "未找到电影",
    search_start_typing: "输入内容开始搜索电影",
    trending_now: "正在流行",
    top_rated: "高分电影",
    coming_soon: "即将上映",
  },
  ja: {
    ...BASE_EN,
    home: "ホーム",
    search: "検索",
    save: "保存",
    profile: "プロフィール",
    language_updated: "言語が更新されました",
    trending_now: "トレンド",
    top_rated: "高評価",
    coming_soon: "近日公開",
  },
  yo: {
    ...BASE_EN,
    home: "Ile",
    search: "Wa",
    save: "Fipamo",
    profile: "Profaili",
    language_updated: "Ede ti ni imudojuiwon",
  },
};

const LOCALE_NAMES: Record<AppLocale, string> = {
  "en-US": "English (United States)",
  "en-GB": "English (United Kingdom)",
  "en-NG": "English (Nigeria)",
  "en-CA": "English (Canada)",
  "en-AU": "English (Australia)",
  "fr-FR": "French (France)",
  "fr-CA": "French (Canada)",
  "fr-BE": "French (Belgium)",
  "es-ES": "Spanish (Spain)",
  "es-MX": "Spanish (Mexico)",
  "es-AR": "Spanish (Argentina)",
  "es-CO": "Spanish (Colombia)",
  "pt-PT": "Portuguese (Portugal)",
  "pt-BR": "Portuguese (Brazil)",
  "de-DE": "German (Germany)",
  "de-AT": "German (Austria)",
  "it-IT": "Italian",
  "nl-NL": "Dutch",
  "sv-SE": "Swedish",
  "no-NO": "Norwegian",
  "da-DK": "Danish",
  "fi-FI": "Finnish",
  "pl-PL": "Polish",
  "cs-CZ": "Czech",
  "sk-SK": "Slovak",
  "hu-HU": "Hungarian",
  "ro-RO": "Romanian",
  "ru-RU": "Russian",
  "uk-UA": "Ukrainian",
  "bg-BG": "Bulgarian",
  "sr-RS": "Serbian",
  "hr-HR": "Croatian",
  "el-GR": "Greek",
  "tr-TR": "Turkish",
  "ar-SA": "Arabic (Saudi Arabia)",
  "ar-EG": "Arabic (Egypt)",
  "he-IL": "Hebrew",
  "fa-IR": "Persian (Farsi)",
  "ur-PK": "Urdu",
  "hi-IN": "Hindi",
  "bn-BD": "Bengali",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "mr-IN": "Marathi",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "th-TH": "Thai",
  "vi-VN": "Vietnamese",
  "id-ID": "Indonesian",
  "ms-MY": "Malay",
  "sw-KE": "Swahili",
  "yo-NG": "Yoruba",
  "ig-NG": "Igbo",
  "ha-NG": "Hausa",
  "am-ET": "Amharic",
  "zu-ZA": "Zulu",
  "af-ZA": "Afrikaans",
};

type LocaleCtx = {
  locale: AppLocale;
  setLocale: (next: AppLocale, syncAccount?: boolean) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  localeName: (code?: AppLocale) => string;
};

const LocaleContext = createContext<LocaleCtx>({
  locale: "en-US",
  setLocale: async () => {},
  t: (_k, fb) => fb ?? "",
  localeName: (code) => LOCALE_NAMES[code ?? "en-US"] ?? "English (United States)",
});

const dictionaryFor = (locale: AppLocale): Dict => {
  const lang = locale.split("-")[0];
  return LANGUAGE_DICT[lang] ?? BASE_EN;
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoggedIn } = useAuth();
  const [locale, setLocaleState] = useState<AppLocale>("en-US");

  useEffect(() => {
    let alive = true;

    (async () => {
      const fromUser = String(user?.prefs?.locale ?? "").trim();
      const fromStorage = await AsyncStorage.getItem(LOCALE_KEY);
      const next = normalizeAppLocale(fromUser || fromStorage || "en-US");
      if (!alive) return;
      setLocaleState(next);
      setActiveLocale(next);
    })();

    return () => {
      alive = false;
    };
  }, [user?.$id]);

  const setLocale = async (next: AppLocale, syncAccount = true) => {
    const normalized = normalizeAppLocale(next);
    setLocaleState(normalized);
    setActiveLocale(normalized);
    await AsyncStorage.setItem(LOCALE_KEY, normalized);

    if (syncAccount && isLoggedIn) {
      try {
        await account.updatePrefs({
          ...(user?.prefs ?? {}),
          locale: normalized,
        } as any);
      } catch {
        // non-blocking
      }
    }
  };

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale,
      t: (key, fallback) => {
        const dict = dictionaryFor(locale);
        return dict[key] ?? BASE_EN[key] ?? fallback ?? key;
      },
      localeName: (code) => LOCALE_NAMES[normalizeAppLocale(String(code ?? locale))],
    }),
    [locale, user?.$id, isLoggedIn]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => useContext(LocaleContext);
