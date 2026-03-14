// app/(auth)/reset-password.tsx  (also works at app/reset-password.tsx)

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { account } from "../../services/appwriteConfig";
import { useToast } from "../../components/Toast";

export default function ResetPassword() {
  const router = useRouter();
  const toast  = useToast();

  // Appwrite appends these to the URL automatically
  const { userId, secret } = useLocalSearchParams<{ userId?: string; secret?: string }>();

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [pwErr,    setPwErr]    = useState("");
  const [confErr,  setConfErr]  = useState("");
  const [done,     setDone]     = useState(false);

  const strength = !password ? 0 : password.length < 4 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4;
  const strengthColors = ["transparent","#ef4444","#f59e0b","#84cc16","#4ade80"];
  const strengthLabels = ["","Weak","Fair","Good","Strong"];

  const handleReset = async () => {
    // Validate
    let ok = true;
    if (password.length < 8)             { setPwErr("Minimum 8 characters");           ok = false; } else setPwErr("");
    if (!/[A-Za-z]/.test(password))      { setPwErr("Include at least one letter");    ok = false; }
    else if (!/\d/.test(password))       { setPwErr("Include at least one number");    ok = false; }
    if (!confirm)                        { setConfErr("Please confirm your password"); ok = false; } else setConfErr("");
    if (confirm && password !== confirm) { setConfErr("Passwords don't match");         ok = false; }
    if (!ok) return;

    if (!userId || !secret) {
      setPwErr("This reset link is invalid or has expired. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      // This is the call that saves the new password to Appwrite
      await account.updateRecovery(userId, secret, password);
      setDone(true);
      toast.success("Password updated!", "You can now sign in with your new password.");
    } catch (e: any) {
      const code = e?.code;
      const msg  = String(e?.message ?? "");
      if (code === 401 || msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
        setPwErr("This reset link has expired or already been used. Please request a new one.");
      } else {
        setPwErr(msg || "Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Guard: if no userId/secret in URL, show an error (user landed here directly)
  const invalidLink = !userId || !secret;

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
          <View style={S.card}>
            <LinearGradient colors={["rgba(171,139,255,0.25)","rgba(171,139,255,0.06)"]} style={S.headIcon}>
              <Ionicons
                name={done ? "checkmark-circle-outline" : invalidLink ? "alert-circle-outline" : "key-outline"}
                size={28} color={done ? "#4ade80" : invalidLink ? "#f59e0b" : "#AB8BFF"} />
            </LinearGradient>

            {/* ── Invalid / expired link ─────────────────────── */}
            {invalidLink && !done && (
              <>
                <Text style={S.heading}>Invalid link</Text>
                <Text style={S.sub}>
                  This reset link is invalid or has expired.{"\n"}
                  Reset links are valid for 1 hour.
                </Text>
                <TouchableOpacity style={S.btn} onPress={() => router.replace("/(auth)/forgot" as any)} activeOpacity={0.85}>
                  <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnIn}>
                    <Ionicons name="refresh-outline" size={17} color="#0f0f12" />
                    <Text style={S.btnTxt}>Request New Link</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── Success ────────────────────────────────────── */}
            {done && (
              <>
                <Text style={S.heading}>Password updated!</Text>
                <Text style={S.sub}>
                  Your new password has been saved.{"\n"}You can now sign in.
                </Text>
                <View style={S.successCheck}>
                  <Ionicons name="checkmark-circle" size={56} color="#4ade80" />
                </View>
                <TouchableOpacity style={S.btn} onPress={() => router.replace("/(auth)/sign-in" as any)} activeOpacity={0.85}>
                  <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnIn}>
                    <Ionicons name="log-in-outline" size={17} color="#0f0f12" />
                    <Text style={S.btnTxt}>Sign In</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── New password form ──────────────────────────── */}
            {!invalidLink && !done && (
              <>
                <Text style={S.heading}>Set new password</Text>
                <Text style={S.sub}>Choose a strong new password for your account.</Text>

                {/* New password */}
                <View style={S.field}>
                  <Text style={S.label}>NEW PASSWORD</Text>
                  <View style={[S.row, !!pwErr && S.rowErr]}>
                    <View style={S.iconBox}>
                      <Ionicons name="lock-closed-outline" size={16} color={pwErr ? "#ef4444" : "#AB8BFF"} />
                    </View>
                    <TextInput
                      style={S.input} value={password}
                      onChangeText={v => { setPassword(v); setPwErr(""); }}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      secureTextEntry={!showPw} returnKeyType="next"
                      {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {})}
                    />
                    <TouchableOpacity onPress={() => setShowPw(p => !p)} style={{ padding: 8 }}>
                      <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={16} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  </View>
                  {!!pwErr && <Text style={S.fieldErr}>{pwErr}</Text>}
                </View>

                {/* Strength bar */}
                {password.length > 0 && (
                  <View style={S.strengthRow}>
                    {[1,2,3,4].map(i => (
                      <View key={i} style={[S.bar, { backgroundColor: strength >= i ? strengthColors[strength] : "rgba(255,255,255,0.08)" }]} />
                    ))}
                    <Text style={[S.strengthLbl, { color: strengthColors[strength] }]}>{strengthLabels[strength]}</Text>
                  </View>
                )}

                {/* Confirm password */}
                <View style={S.field}>
                  <Text style={S.label}>CONFIRM PASSWORD</Text>
                  <View style={[S.row, !!confErr && S.rowErr]}>
                    <View style={S.iconBox}>
                      <Ionicons name="shield-checkmark-outline" size={16} color={confErr ? "#ef4444" : "#AB8BFF"} />
                    </View>
                    <TextInput
                      style={S.input} value={confirm}
                      onChangeText={v => { setConfirm(v); setConfErr(""); }}
                      placeholder="Repeat password"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      secureTextEntry={!showPw} returnKeyType="done"
                      onSubmitEditing={handleReset}
                      {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {})}
                    />
                  </View>
                  {!!confErr && <Text style={S.fieldErr}>{confErr}</Text>}
                </View>

                {confirm.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, alignSelf: "flex-start" }}>
                    <Ionicons name={password === confirm ? "checkmark-circle" : "close-circle"} size={13}
                      color={password === confirm ? "#4ade80" : "#ef4444"} />
                    <Text style={{ color: password === confirm ? "#4ade80" : "#ef4444", fontSize: 11 }}>
                      {password === confirm ? "Passwords match" : "Passwords don't match"}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[S.btn, loading && { opacity: 0.6 }]}
                  onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient
                    colors={loading ? ["#333","#333"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnIn}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="checkmark-outline" size={17} color="#0f0f12" />
                          <Text style={S.btnTxt}>Update Password</Text></>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={S.skip} onPress={() => router.replace("/(auth)/forgot" as any)}>
                  <Text style={S.skipTxt}>Request a new reset link</Text>
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
  root:         { flex: 1, backgroundColor: "#0a001e" },
  glow:         { position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(124,58,237,0.15)" },
  scroll:       { flexGrow: 1, padding: 24, paddingTop: Platform.OS === "web" ? 60 : 80, alignItems: "center" },
  card:         { width: "100%", maxWidth: 440, backgroundColor: "rgba(12,4,30,0.95)", borderRadius: 24, padding: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center" },
  headIcon:     { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heading:      { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  sub:          { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  field:        { width: "100%", marginBottom: 14 },
  label:        { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  row:          { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: Platform.OS === "web" ? 4 : 2 },
  rowErr:       { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  iconBox:      { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  input:        { flex: 1, color: "#fff", fontSize: 15, paddingVertical: Platform.OS === "web" ? 10 : 12 },
  fieldErr:     { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 4 },
  strengthRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12, width: "100%" },
  bar:          { flex: 1, height: 3, borderRadius: 2 },
  strengthLbl:  { fontSize: 10, marginLeft: 4, minWidth: 36, fontWeight: "800" },
  btn:          { width: "100%", borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  btnIn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnTxt:       { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  skip:         { paddingVertical: 8 },
  skipTxt:      { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  successCheck: { marginBottom: 20 },
});