// app/support.tsx
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageBackHeader from "../components/PageBackHeader";
import { useToast } from "../components/Toast";
import { functions } from "../services/appwriteConfig";

// Function ID hardcoded as fallback — also set EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID in Vercel
const FUNCTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID?.trim() ||
  "69b688f20036184f0e7f";

export default function SupportPage() {
  const toast = useToast();
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Missing details", "Please fill in your name, email, and message.");
      return;
    }

    setSending(true);
    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          name:    name.trim(),
          email:   email.trim(),
          message: message.trim(),
        }),
        false, // synchronous execution — waits for result
      );

      // Log full result for debugging
      console.log("[Support] execution status:", execution.status);
      console.log("[Support] responseStatusCode:", execution.responseStatusCode);
      console.log("[Support] responseBody:", execution.responseBody);
      console.log("[Support] logs:", execution.logs);
      console.log("[Support] errors:", execution.errors);

      const statusCode = execution.responseStatusCode ?? 200;

      if (statusCode >= 400 || execution.status === "failed") {
        // Parse the error body if possible
        let errMsg = "Function returned an error. Check Appwrite function logs.";
        try {
          const body = JSON.parse(execution.responseBody ?? "{}");
          errMsg = body?.error ?? errMsg;
        } catch {}
        // Also surface the raw errors field
        if (execution.errors?.trim()) errMsg = execution.errors;
        throw new Error(errMsg);
      }

      setName(""); setEmail(""); setMessage("");
      toast.success("Message sent! 🎬", "We'll reply to your email shortly.");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      console.error("[Support] error:", msg);

      // Show the REAL error — don't hide it
      if (msg.includes("missing scope") || msg.includes("unauthorized") || msg.toLowerCase().includes("401")) {
        toast.error(
          "Permission error",
          "The function doesn't allow public execution. Go to Appwrite → Functions → your function → Settings → Permissions → add role 'Any' → Execute."
        );
      } else if (msg.includes("not found") || msg.toLowerCase().includes("404")) {
        toast.error("Function not found", `Check that function ID "${FUNCTION_ID}" exists in Appwrite.`);
      } else if (msg.includes("RESEND") || msg.includes("apiKey")) {
        toast.error("Email not configured", "Add RESEND_API_KEY to the function's environment variables in Appwrite.");
      } else {
        toast.error("Unable to send", msg || "Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.title}>Contact Support</Text>
        <Text style={S.subtitle}>Send us a message and we'll reply by email.</Text>

        <View style={S.card}>
          <Text style={S.label}>Full Name</Text>
          <TextInput
            style={S.input} value={name} onChangeText={setName}
            placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.35)" />

          <Text style={S.label}>Email</Text>
          <TextInput
            style={S.input} value={email} onChangeText={setEmail}
            placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none" keyboardType="email-address" />

          <Text style={S.label}>Message</Text>
          <TextInput
            style={[S.input, S.message]} value={message} onChangeText={setMessage}
            placeholder="How can we help?" placeholderTextColor="rgba(255,255,255,0.35)"
            multiline textAlignVertical="top" />

          <TouchableOpacity style={S.sendBtn} onPress={submit} disabled={sending} activeOpacity={0.85}>
            {sending
              ? <ActivityIndicator size="small" color="#0f0f12" />
              : <Text style={S.sendTxt}>Send Message</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root:     { flex: 1, backgroundColor: "#0f0f12" },
  content:  { padding: 20, paddingBottom: 120, gap: 12 },
  title:    { color: "#fff", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 8 },
  card:     { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14, width: "100%", maxWidth: 760, alignSelf: "center" },
  label:    { color: "#AB8BFF", fontSize: 13, fontWeight: "700", marginBottom: 6, marginTop: 8 },
  input:    { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  message:  { minHeight: 120, marginBottom: 12 },
  sendBtn:  { marginTop: 10, backgroundColor: "#AB8BFF", borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  sendTxt:  { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
});