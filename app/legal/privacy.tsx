import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackHeader from "../../components/PageBackHeader";

export default function PrivacyPolicyPage() {
  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Privacy Policy</Text>
        <Text style={S.date}>Last updated: March 2, 2026</Text>

        <Section title="Information We Collect">
          We collect account details (name, email), watchlist activity, search history, and app preferences to provide
          the MovieTime service.
        </Section>
        <Section title="How We Use Data">
          Data is used for sign-in, personalization, syncing your watchlist across devices, analytics, and support.
        </Section>
        <Section title="Sharing">
          We do not sell personal data. We share limited data only with infrastructure providers required to run the app.
        </Section>
        <Section title="Security">
          We use access controls, encrypted transport (HTTPS), and database permission rules to protect user data.
        </Section>
        <Section title="Your Rights">
          You can request data correction or deletion by contacting support at chidiokwu795@gmail.com.
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.card}>
      <Text style={S.cardTitle}>{title}</Text>
      <Text style={S.cardBody}>{children}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f12" },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  date: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 8 },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: "#AB8BFF", fontSize: 15, fontWeight: "800" },
  cardBody: { color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 21 },
});
