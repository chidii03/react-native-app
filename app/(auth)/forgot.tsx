// app/(auth)/forgot.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView,
  ScrollView, useWindowDimensions,
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
  const { width } = useWindowDimensions();

  const [email,    setEmail]    = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const handleSend = async () => {
    const em = email.trim().toLowerCase();
    if (!em)                  { setEmailErr("Email is required");          return; }
    if (!emailRegex.test(em)) { setEmailErr("Enter a valid email address"); return; }
    setEmailErr("");
    setLoading(true);
    try {
      const recoveryUrl =
        Platform.OS === "web" && typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_URL ?? "https://movietimeapp.vercel.app/reset-password";
      await account.createRecovery(em, recoveryUrl);
      setSent(true);
    } catch (e: any) {
      const code = e?.code;
      const msg  = String(e?.message ?? "");
      if (code === 404 || msg.toLowerCase().includes("not found"))
        setEmailErr("No account found with this email.");
      else
        setEmailErr(msg || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#0a001e","#130030"]} style={StyleSheet.absoluteFill} />
      <View style={S.glow} pointerEvents="none" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={S.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/sign-in" as any)}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Card: full width on small phones, capped at 440 on large screens */}
          <View style={S.card}>
            <LinearGradient colors={["rgba(171,139,255,0.25)","rgba(171,139,255,0.06)"]} style={S.headIcon}>
              <Ionicons name="lock-open-outline" size={26} color="#AB8BFF" />
            </LinearGradient>

            <Text style={S.heading}>Reset password</Text>
            <Text style={S.sub}>
              Enter your account email and we'll send you a link to create a new password.
            </Text>

            {sent ? (
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
                  <Ionicons name="information-circle-outline" size={14} color="#AB8BFF" style={{ flexShrink: 0, marginTop: 1 }} />
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
              <>
                <View style={S.field}>
                  <Text style={S.label}>EMAIL ADDRESS</Text>
                  <View style={[S.inputRow, !!emailErr && S.inputRowErr]}>
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
                      {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
                    />
                  </View>
                  {!!emailErr && <Text style={S.fieldErr}>{emailErr}</Text>}
                </View>

                <TouchableOpacity style={[S.btn, loading && { opacity: 0.6 }]} onPress={handleSend} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={loading ? ["#333","#333"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
                    start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={S.btnIn}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0a001e" },
  glow:           { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(124,58,237,0.12)" },
  // KEY FIX: paddingHorizontal 16 + alignItems center → card fills phone but stays centered on web
  scroll:         { flexGrow: 1, paddingHorizontal: 16, paddingTop: Platform.OS === "web" ? 40 : 52, paddingBottom: 40, alignItems: "center" },
  backBtn:        { alignSelf: "flex-start", width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  // KEY FIX: width 100% + maxWidth 440 + alignSelf center = full on phones, capped on tablets/web
  card:           { width: "100%", maxWidth: 440, alignSelf: "center", backgroundColor: "rgba(12,4,30,0.95)", borderRadius: 22, padding: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center" },
  headIcon:       { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heading:        { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  sub:            { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 22 },
  field:          { width: "100%", marginBottom: 14 },
  label:          { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 },
  inputRow:       { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingLeft: 4, paddingRight: 4, minHeight: 48, overflow: "hidden" },
  inputRowErr:    { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  iconBox:        { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginRight: 6, flexShrink: 0 },
  input:          { flex: 1, minWidth: 0, color: "#fff", fontSize: 14, paddingVertical: Platform.OS === "web" ? 10 : 11, paddingHorizontal: 2 },
  fieldErr:       { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 2 },
  btn:            { width: "100%", borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  btnIn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  btnTxt:         { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  skip:           { paddingVertical: 8 },
  skipTxt:        { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  successBox:     { alignItems: "center", width: "100%" },
  successIconWrap:{ width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(74,222,128,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  successTitle:   { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 8 },
  successSub:     { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 14 },
  infoBox:        { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(171,139,255,0.08)", borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", borderRadius: 12, padding: 12, marginBottom: 18, width: "100%" },
  infoTxt:        { color: "rgba(171,139,255,0.8)", fontSize: 12, flex: 1, lineHeight: 18 },
  outBtn:         { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 24, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)" },
  outBtnTxt:      { color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
});