import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  size?: "sm" | "md";
};

export default function MovieTimeLogo({ size = "md" }: Props) {
  const large = size === "md";
  return (
    <View style={S.row}>
      <LinearGradient
        colors={["#c4a8ff", "#AB8BFF", "#7c3aed"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[S.badge, large ? S.badgeMd : S.badgeSm]}
      >
        <Ionicons name="film-outline" size={large ? 18 : 14} color="#0f0f12" />
      </LinearGradient>
      <Text style={[S.title, large ? S.titleMd : S.titleSm]}>
        MOVIE<Text style={S.accent}>TIME</Text>
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badgeMd: { width: 34, height: 34 },
  badgeSm: { width: 28, height: 28 },
  title: { color: "#fff", fontWeight: "900", letterSpacing: -0.4, fontStyle: "italic" },
  titleMd: { fontSize: 24 },
  titleSm: { fontSize: 18 },
  accent: { color: "#AB8BFF" },
});
