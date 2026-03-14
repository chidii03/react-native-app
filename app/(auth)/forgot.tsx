// app/(auth)/forgot.tsx

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { account } from "../../services/appwriteConfig";
import { useToast } from "../../components/Toast";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const router = useRouter();
  const toast  = useToast();

  const [email,    setEmail]    = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const handleSend = async () => {
    const em = email.trim().toLowerCase();
    if (!em)                  { setEmailErr("Email is required");   return; }
    if (!emailRegex.test(em)) { setEmailErr("Enter a valid email"); return; }
    setEmailErr("");
    setLoading(true);

    try {
      // Auto-detect the correct recovery URL for the current environment
      const recoveryUrl =
        Platform.OS === "web" && typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`      // localhost OR Vercel
          : process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_URL ?? // native fallback
            "https://movietimeapp.vercel.app/reset-password";

      // Appwrite sends the email — no SMTP needed
      await account.createRecovery(em, recoveryUrl);
      setSent(true);
    } catch (e: any) {
      const code = e?.code;
      const msg  = String(e?.message ?? "");
      if (code === 404 || msg.toLowerCase().includes("not found")) {
        setEmailErr("No account found with this email.");
      } else if (!code && !msg) {
        setEmailErr("Network error — check your connection.");
      } else {
        setEmailErr(msg || "Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#0a001e", "#130030"]} style={StyleSheet.absoluteFill} />
      <View style={S.glow} pointerEvents="none" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={S.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/sign-in" as any)}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={S.card}>
            <LinearGradient colors={["rgba(171,139,255,0.25)","rgba(171,139,255,0.06)"]} style={S.headIcon}>
              <Ionicons name="lock-open-outline" size={28} color="#AB8BFF" />
            </LinearGradient>

            <Text style={S.heading}>Reset password</Text>
            <Text style={S.sub}>
              Enter your account email and we'll send you a link to create a new password.
            </Text>

            {sent ? (
              /* ── Success state ─────────────────────────────── */
              <View style={S.successBox}>
                <View style={S.successIconWrap}>
                  <Ionicons name="mail-open-outline" size={36} color="#4ade80" />
                </View>
                <Text style={S.successTitle}>Email sent!</Text>
                <Text style={S.successSub}>
                  We sent a reset link to{"\n"}
                  <Text style={{ color: "#AB8BFF", fontWeight: "800" }}>{email}</Text>
                </Text>
                <View style={S.infoBox}>
                  <Ionicons name="information-circle-outline" size={15} color="#AB8BFF" />
                  <Text style={S.infoTxt}>
                    Click the link in the email to set a new password. Check your spam folder if you don't see it within a minute.
                  </Text>
                </View>
                <TouchableOpacity style={S.outBtn} onPress={() => router.replace("/(auth)/sign-in" as any)}>
                  <Ionicons name="log-in-outline" size={15} color="#AB8BFF" />
                  <Text style={S.outBtnTxt}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Form ─────────────────────────────────────── */
              <>
                <View style={S.field}>
                  <Text style={S.label}>EMAIL ADDRESS</Text>
                  <View style={[S.row, !!emailErr && S.rowErr]}>
                    <View style={S.iconBox}>
                      <Ionicons name="mail-outline" size={16} color={emailErr ? "#ef4444" : "#AB8BFF"} />
                    </View>
                    <TextInput
                      style={S.input}
                      value={email}
                      onChangeText={v => { setEmail(v); setEmailErr(""); }}
                      placeholder="you@example.com"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                      {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {})}
                    />
                  </View>
                  {!!emailErr && <Text style={S.fieldErr}>{emailErr}</Text>}
                </View>

                <TouchableOpacity
                  style={[S.btn, loading && { opacity: 0.6 }]}
                  onPress={handleSend}
                  disabled={loading}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={loading ? ["#333","#333"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={S.btnIn}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="paper-plane-outline" size={17} color="#0f0f12" />
                          <Text style={S.btnTxt}>Send Reset Link</Text></>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={S.skip} onPress={() => router.replace("/(auth)/sign-in" as any)}>
                  <Text style={S.skipTxt}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0a001e" },
  glow:           { position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(124,58,237,0.15)" },
  scroll:         { flexGrow: 1, padding: 24, paddingTop: Platform.OS === "web" ? 40 : 56, alignItems: "center" },
  backBtn:        { alignSelf: "flex-start", width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  card:           { width: "100%", maxWidth: 440, backgroundColor: "rgba(12,4,30,0.95)", borderRadius: 24, padding: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center" },
  headIcon:       { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heading:        { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  sub:            { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  field:          { width: "100%", marginBottom: 16 },
  label:          { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  row:            { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: Platform.OS === "web" ? 4 : 2 },
  rowErr:         { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  iconBox:        { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  input:          { flex: 1, color: "#fff", fontSize: 15, paddingVertical: Platform.OS === "web" ? 10 : 12 },
  fieldErr:       { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 4 },
  btn:            { width: "100%", borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  btnIn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnTxt:         { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  skip:           { paddingVertical: 8 },
  skipTxt:        { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  successBox:     { alignItems: "center", width: "100%" },
  successIconWrap:{ width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(74,222,128,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successTitle:   { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 8 },
  successSub:     { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 14 },
  infoBox:        { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(171,139,255,0.08)", borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", borderRadius: 12, padding: 12, marginBottom: 20, width: "100%" },
  infoTxt:        { color: "rgba(171,139,255,0.8)", fontSize: 12, flex: 1, lineHeight: 18 },
  outBtn:         { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)" },
  outBtnTxt:      { color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
});