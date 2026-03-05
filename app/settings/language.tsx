import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../../components/Toast";
import { useLocale } from "../../context/LocaleContext";
import { AppLocale } from "../../services/locale";
import PageBackHeader from "../../components/PageBackHeader";

const LANGUAGES = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-NG", label: "English (Nigeria)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "en-AU", label: "English (Australia)" },

  { code: "fr-FR", label: "French (France)" },
  { code: "fr-CA", label: "French (Canada)" },
  { code: "fr-BE", label: "French (Belgium)" },

  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "es-AR", label: "Spanish (Argentina)" },
  { code: "es-CO", label: "Spanish (Colombia)" },

  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },

  { code: "de-DE", label: "German (Germany)" },
  { code: "de-AT", label: "German (Austria)" },

  { code: "it-IT", label: "Italian" },
  { code: "nl-NL", label: "Dutch" },
  { code: "sv-SE", label: "Swedish" },
  { code: "no-NO", label: "Norwegian" },
  { code: "da-DK", label: "Danish" },
  { code: "fi-FI", label: "Finnish" },

  { code: "pl-PL", label: "Polish" },
  { code: "cs-CZ", label: "Czech" },
  { code: "sk-SK", label: "Slovak" },
  { code: "hu-HU", label: "Hungarian" },
  { code: "ro-RO", label: "Romanian" },

  { code: "ru-RU", label: "Russian" },
  { code: "uk-UA", label: "Ukrainian" },
  { code: "bg-BG", label: "Bulgarian" },
  { code: "sr-RS", label: "Serbian" },
  { code: "hr-HR", label: "Croatian" },

  { code: "el-GR", label: "Greek" },
  { code: "tr-TR", label: "Turkish" },

  { code: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { code: "ar-EG", label: "Arabic (Egypt)" },
  { code: "he-IL", label: "Hebrew" },
  { code: "fa-IR", label: "Persian (Farsi)" },
  { code: "ur-PK", label: "Urdu" },

  { code: "hi-IN", label: "Hindi" },
  { code: "bn-BD", label: "Bengali" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "mr-IN", label: "Marathi" },

  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },

  { code: "th-TH", label: "Thai" },
  { code: "vi-VN", label: "Vietnamese" },
  { code: "id-ID", label: "Indonesian" },
  { code: "ms-MY", label: "Malay" },

  { code: "sw-KE", label: "Swahili" },
  { code: "yo-NG", label: "Yoruba" },
  { code: "ig-NG", label: "Igbo" },
  { code: "ha-NG", label: "Hausa" },

  { code: "am-ET", label: "Amharic" },
  { code: "zu-ZA", label: "Zulu" },
  { code: "af-ZA", label: "Afrikaans" }
];

export default function LanguageSettingsPage() {
  const { locale: current, setLocale, localeName, t } = useLocale();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const updateLocale = async (nextLocale: AppLocale) => {
    if (nextLocale === current) return;
    try {
      setSaving(nextLocale);
      await setLocale(nextLocale, true);
      toast.success(`${localeName(nextLocale)} ${t("language_updated", "language updated")}`);
    } catch (e: any) {
      toast.error("Failed", e?.message ?? "");
    } finally {
      setSaving(null);
    }
  };

  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Language</Text>
        <Text style={S.subtitle}>Choose your app language preference. This changes translated labels app-wide.</Text>

        {LANGUAGES.map((lang) => {
          const active = current === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[S.row, active && S.rowActive]}
              onPress={() => updateLocale(lang.code as AppLocale)}
              activeOpacity={0.8}
              disabled={!!saving}
            >
              <View style={[S.activeIndicator, active && S.activeIndicatorOn]} />
              <View>
                <Text style={[S.name, active && S.nameActive]}>{lang.label}</Text>
                <Text style={S.code}>{lang.code}</Text>
              </View>
              {saving === lang.code ? (
                <ActivityIndicator size="small" color="#AB8BFF" />
              ) : (
                <Text style={[S.status, active && S.statusActive]}>{active ? "Selected" : "Select"}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f12" },
  content: { padding: 20, paddingBottom: 120, gap: 10 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 8 },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowActive: { borderColor: "rgba(171,139,255,0.6)", backgroundColor: "rgba(171,139,255,0.14)" },
  activeIndicator: { width: 4, height: 42, borderRadius: 4, backgroundColor: "transparent" },
  activeIndicatorOn: { backgroundColor: "#AB8BFF" },
  name: { color: "#fff", fontSize: 15, fontWeight: "700" },
  nameActive: { color: "#AB8BFF" },
  code: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 },
  status: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "700" },
  statusActive: { color: "#AB8BFF" },
});
