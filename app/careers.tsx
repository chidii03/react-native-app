import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackHeader from "../components/PageBackHeader";

const ROLES = [
  "Marketing Lead",
  "Advertising Specialist",
  "UI/UX Designer",
  "Frontend Engineer",
  "Backend Engineer",
  "Customer Support Specialist",
];

export default function CareersPage() {
  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Careers at MovieTime</Text>
        <Text style={S.subtitle}>Join the team building a global movie platform.</Text>

        <View style={S.card}>
          <Text style={S.cardTitle}>Open Roles</Text>
          {ROLES.map((role) => (
            <Text key={role} style={S.roleItem}>- {role}</Text>
          ))}
        </View>

        <View style={S.card}>
          <Text style={S.cardTitle}>Apply</Text>
          <Text style={S.info}>Email: chidiokwu795@gmail.com</Text>
          <Text style={S.info}>WhatsApp: +234 807 937 9510</Text>
          <Text style={S.info}>Facebook: https://web.facebook.com/profile.php?id=61588136693676</Text>
          <Text style={S.info}>Twitter/X: @chidi03</Text>
        </View>

        <TouchableOpacity
          style={S.applyBtn}
          onPress={() => Linking.openURL("mailto:chidiokwu795@gmail.com?subject=MovieTime%20Career%20Application").catch(() => {})}
          activeOpacity={0.85}
        >
          <Text style={S.applyTxt}>Send Application</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f12" },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 8 },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: "#AB8BFF", fontSize: 15, fontWeight: "800" },
  roleItem: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  info: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 20 },
  applyBtn: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#AB8BFF",
    alignItems: "center",
    paddingVertical: 14,
  },
  applyTxt: { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
});
