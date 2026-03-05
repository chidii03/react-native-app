// app/(auth)/forgot.tsx
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, Image, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { account } from "../../services/appwriteConfig";
import { useToast } from "../../components/Toast";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getRecoveryUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/reset-password`;
  }
  return process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_URL ?? "http://localhost:8081/reset-password";
};

const POSTERS = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "/velWPhVi2KkDs2McBNcjfr3VLKB.jpg",
];
const TMDB_BASE = "https://image.tmdb.org/t/p/w185";

const PosterBackground = () => {
  const { width, height } = useWindowDimensions();
  const posterW = Math.max(90, width / 5);
  const posterH = posterW * 1.5;
  const cols = Math.ceil(width / posterW) + 2;
  const rows = Math.ceil(height / posterH) + 2;
  const items = Array.from({ length: cols * rows }, (_, i) => POSTERS[i % POSTERS.length]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: "absolute", flexDirection: "row", flexWrap: "wrap", width: cols * (posterW + 4), transform: [{ rotate: "-8deg" }], left: -posterW, top: -posterH * 0.5 }}>
        {items.map((src, i) => <Image key={i} source={{ uri: `${TMDB_BASE}${src}` }} style={{ width: posterW, height: posterH, margin: 2, borderRadius: 4 }} resizeMode="cover" />)}
      </View>
      <LinearGradient colors={["rgba(10,0,30,0.92)", "rgba(10,0,30,0.96)", "rgba(10,0,30,0.99)"]} style={StyleSheet.absoluteFill} />
    </View>
  );
};

export default function Forgot() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]  = useState(false);
  const [smtpError, setSmtpError] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/sign-in");
  };

  const handleReset = async () => {
    const em = email.trim().toLowerCase();
    if (!em) { setEmailErr("Email is required"); return; }
    if (!emailRegex.test(em)) { setEmailErr("Enter a valid email"); return; }
    setEmailErr("");

    setLoading(true);
    setSmtpError(false);

    try {
      const recoveryUrl = getRecoveryUrl();
      console.log("[Forgot] Sending recovery to:", em, "with URL:", recoveryUrl);

      await account.createRecovery(em, recoveryUrl);
      setSent(true);
      toast.success("Reset link sent!", "Check your inbox.");
    } catch (e: any) {
      const code = e?.code;
      const msg  = (e?.message ?? "").toLowerCase();

      console.error("[Forgot] Recovery error:", code, e?.message);

      if (msg.includes("user_not_found") || msg.includes("not found") || code === 404) {
        setEmailErr("No account found with this email.");
      } else if (msg.includes("rate limit") || code === 429) {
        toast.error("Too many requests", "Wait a minute and try again.");
      } else if (msg.includes("smtp") || msg.includes("email") || code === 503 || code === 500) {
        setSmtpError(true);
        toast.error("Email service error", "SMTP is not configured in Appwrite.");
      } else {
        toast.error("Failed to send", e?.message || "Try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const cardMaxW = isDesktop ? 460 : "100%";

  // ── Success State ───────────────────────────────────────────────
  if (sent) {
    return (
      <View style={styles.root}>
        <PosterBackground />
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.center}>
          <View style={styles.successIconWrap}>
            <LinearGradient colors={["rgba(74,222,128,0.2)","rgba(74,222,128,0.05)"]} style={styles.successIconGrad}>
              <Ionicons name="mail" size={56} color="#4ade80" />
            </LinearGradient>
            <View style={styles.successCheckBadge}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successSub}>We sent a password reset link to</Text>
          <View style={styles.emailPill}>
            <Ionicons name="mail-outline" size={14} color="#AB8BFF" />
            <Text style={styles.emailPillText}>{email}</Text>
          </View>
          <Text style={styles.successNote}>
            Can't find it? Check your spam folder.{"\n"}Link expires in 1 hour.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace("/(auth)/sign-in")} activeOpacity={0.85}>
            <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnInner}>
              <Ionicons name="log-in-outline" size={17} color="#0f0f12" />
              <Text style={styles.btnText}>Back to Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resendRow} onPress={() => setSent(false)}>
            <Text style={styles.resendText}>Didn't receive it? Send again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Form ───────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <PosterBackground />

      <ScrollView
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.card, { maxWidth: cardMaxW as any }, isDesktop && styles.cardDesktop]}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <LinearGradient colors={["rgba(171,139,255,0.2)","rgba(171,139,255,0.06)"]} style={styles.iconGrad}>
              <Ionicons name="key-outline" size={40} color="#AB8BFF" />
            </LinearGradient>
          </View>

          <Text style={styles.heading}>Forgot password?</Text>
          <Text style={styles.sub}>No worries! Enter your email and we'll send a reset link to your inbox.</Text>

          {/* SMTP Error Banner */}
          {smtpError && (
            <View style={styles.smtpBanner}>
              <Ionicons name="warning-outline" size={16} color="#fbbf24" />
              <View style={{ flex: 1 }}>
                <Text style={styles.smtpBannerTitle}>Email Service Not Configured</Text>
                <Text style={styles.smtpBannerText}>
                  Go to: Appwrite Console → Settings → SMTP{"\n"}
                  Configure with Gmail, SendGrid, or any SMTP provider.{"\n"}
                  Sender: chidiokwu795@gmail.com
                </Text>
              </View>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>YOUR EMAIL ADDRESS</Text>
            <View style={[styles.inputRow, !!emailErr && styles.inputRowError]}>
              <View style={styles.fieldIcon}>
                <Ionicons name="mail-outline" size={16} color={emailErr ? "#ef4444" : "#AB8BFF"} />
              </View>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={v => { setEmail(v); setEmailErr(""); }}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleReset}
                autoFocus
              />
            </View>
            {!!emailErr && <Text style={styles.fieldError}>{emailErr}</Text>}
          </View>

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.65 }]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={loading ? ["#444","#444"] : ["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnInner}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send-outline" size={17} color="#0f0f12" /><Text style={styles.btnText}>Send Reset Link</Text></>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToSignIn} onPress={() => router.replace("/(auth)/sign-in")} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.backToSignInText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0a001e" },
  scroll: { flexGrow: 1, padding: 24, paddingTop: Platform.OS === "web" ? 40 : 60, alignItems: "center" },
  scrollDesktop: { justifyContent: "center", minHeight: "100%" as any },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  backBtn:{ alignSelf: "flex-start", width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  card:   { width: "100%", backgroundColor: "rgba(12,4,30,0.94)", borderRadius: 24, padding: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", ...(Platform.OS === "web" ? { boxShadow: "0 32px 80px rgba(0,0,0,0.6)" } as any : {}) },
  cardDesktop: { borderRadius: 28, padding: 36 },
  iconWrap: { alignItems: "center", marginBottom: 20 },
  iconGrad: { width: 84, height: 84, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heading:  { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  sub:      { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  smtpBanner: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "rgba(251,191,36,0.07)", borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", borderRadius: 12, padding: 12, marginBottom: 18 },
  smtpBannerTitle: { color: "#fbbf24", fontWeight: "800", fontSize: 12, marginBottom: 4 },
  smtpBannerText:  { color: "rgba(251,191,36,0.7)", fontSize: 11, lineHeight: 16 },
  fieldWrap:   { marginBottom: 18 },
  label:       { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  inputRow:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: Platform.OS === "web" ? 4 : 2 },
  inputRowError: { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  fieldIcon:   { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  input:       { flex: 1, color: "#fff", fontSize: 15, paddingVertical: Platform.OS === "web" ? 10 : 12, ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
  fieldError:  { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 4 },
  btn:         { borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  btnInner:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnText:     { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  backToSignIn:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  backToSignInText: { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  // Success states
  successIconWrap:  { position: "relative", marginBottom: 8 },
  successIconGrad:  { width: 120, height: 120, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  successCheckBadge:{ position: "absolute", bottom: 4, right: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: "#4ade80", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0a001e" },
  successTitle:     { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center" },
  successSub:       { color: "rgba(255,255,255,0.4)", fontSize: 15, textAlign: "center" },
  emailPill:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(171,139,255,0.1)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", paddingHorizontal: 16, paddingVertical: 8 },
  emailPillText:    { color: "#AB8BFF", fontWeight: "700", fontSize: 14 },
  successNote:      { color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", lineHeight: 20 },
  resendRow:        { paddingVertical: 8 },
  resendText:       { color: "rgba(255,255,255,0.3)", fontSize: 13, textDecorationLine: "underline" },
});