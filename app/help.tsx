import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackHeader from "../components/PageBackHeader";

export default function HelpCenterPage() {
  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Help Center</Text>
        <Section q="How do I save movies?">Open any movie and tap the bookmark icon.</Section>
        <Section q="Why can streaming fail?">
          Some third-party streams are region-limited or temporarily unavailable. Try another title or retry later.
        </Section>
        <Section q="How do I change language?">Go to Profile - Settings - Language.</Section>
        <Section q="How do I reset password?">Go to Sign In - Forgot Password.</Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <View style={S.card}>
      <Text style={S.q}>{q}</Text>
      <Text style={S.a}>{children}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f12" },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  q: { color: "#AB8BFF", fontSize: 15, fontWeight: "800" },
  a: { color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 21 },
});
