import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackHeader from "../../components/PageBackHeader";

export default function TermsPage() {
  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Terms of Service</Text>
        <Text style={S.date}>Effective date: March 2, 2026</Text>

        <Section title="Service Use">
          MovieTime provides movie discovery, trailers, and watchlist tools. You agree to use the platform lawfully.
        </Section>
        <Section title="Accounts">
          You are responsible for account activity and for keeping your credentials secure.
        </Section>
        <Section title="Content Sources">
          Movie metadata and posters come from TMDB. Streaming content may come from third-party providers.
        </Section>
        <Section title="Availability">
          We may update, pause, or remove app features at any time to improve stability and security.
        </Section>
        <Section title="Contact">
          For legal/support inquiries, contact chidiokwu795@gmail.com.
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
