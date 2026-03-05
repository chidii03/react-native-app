import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackHeader from "../components/PageBackHeader";
import { useToast } from "../components/Toast";

const SUPPORT_API =
  process.env.EXPO_PUBLIC_SUPPORT_API_URL?.trim() ||
  "/api/support";

export default function SupportPage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Missing details", "Please fill name, email, and message.");
      return;
    }

    try {
      setSending(true);
      const res = await fetch(SUPPORT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send message");
      }

      setName("");
      setEmail("");
      setMessage("");
      toast.success(
        "Thank you, we have received your message",
        "One of our team members will reach out to you shortly."
      );
    } catch (e: any) {
      toast.error("Unable to send", e?.message ?? "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Contact Support</Text>
        <Text style={S.subtitle}>Send us a message and we will reply by email.</Text>

        <View style={S.card}>
          <Text style={S.label}>Full Name</Text>
          <TextInput
            style={S.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />

          <Text style={S.label}>Email</Text>
          <TextInput
            style={S.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={S.label}>Message</Text>
          <TextInput
            style={[S.input, S.message]}
            value={message}
            onChangeText={setMessage}
            placeholder="How can we help?"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={S.sendBtn} onPress={submit} disabled={sending} activeOpacity={0.85}>
            {sending ? (
              <ActivityIndicator size="small" color="#0f0f12" />
            ) : (
              <Text style={S.sendTxt}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>
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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  label: { color: "#AB8BFF", fontSize: 13, fontWeight: "700", marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  message: { minHeight: 120, marginBottom: 12 },
  sendBtn: {
    marginTop: 10,
    backgroundColor: "#AB8BFF",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sendTxt: { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
});
