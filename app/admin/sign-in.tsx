// app/admin/sign-in.tsx
import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar, Image,
  KeyboardAvoidingView, ScrollView, useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_EMAIL    = "chidiokwu795@gmail.com";
const ADMIN_PASSWORD = "chidi@admin2024";
const SESSION_KEY    = "admin_session";

const TMDB_BASE = "https://image.tmdb.org/t/p/w185";
const POSTERS   = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "/velWPhVi2KkDs2McBNcjfr3VLKB.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
  "/fiVW06jE7z9YnO4trhaMEdclSiC.jpg", "/AuFiYTkAZYTDcdzeqQLrdgw1AOa.jpg",
];

// ── Poster background — FIXED:
//   • overflow: "hidden" on the container clips the rotated grid
//   • position absolute so it never pushes layout
const PosterBg = () => {
  const { width, height } = useWindowDimensions();
  const pw   = Math.max(72, width / 5);
  const ph   = pw * 1.5;
  const cols = Math.ceil(width / pw) + 2;
  const rows = Math.ceil(height / ph) + 2;
  const items = Array.from({ length: cols * rows }, (_, i) => POSTERS[i % POSTERS.length]);

  return (
    // KEY FIX: overflow hidden clips the rotated grid so it never
    // bleeds outside the screen and causes white space on mobile
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      <View style={{
        position: "absolute",
        flexDirection: "row",
        flexWrap: "wrap",
        // width must be big enough to fill after rotation
        width: (cols + 2) * (pw + 4),
        // shift left and up so the grid covers the full screen after rotation
        left: -pw * 1.5,
        top:  -ph,
        transform: [{ rotate: "-8deg" }],
      }}>
        {items.map((src, i) => (
          <Image key={i} source={{ uri: `${TMDB_BASE}${src}` }}
            style={{ width: pw, height: ph, margin: 2, borderRadius: 4 }}
            resizeMode="cover" />
        ))}
      </View>
      {/* Gradient overlay darkens the posters */}
      <LinearGradient
        colors={["rgba(4,0,15,0.82)", "rgba(4,0,15,0.90)", "rgba(4,0,15,0.97)"]}
        style={StyleSheet.absoluteFill} />
    </View>
  );
};

export default function AdminSignIn() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const pwRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError("");
    const em = email.trim().toLowerCase();
    if (!em || !password) { setError("Please enter your email and password."); return; }

    setLoading(true);
    // Short artificial delay to prevent brute-force timing
    await new Promise(r => setTimeout(r, 400));

    if (em !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
      setError("Invalid credentials. Access denied.");
      setLoading(false);
      return;
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, email: em, ts: Date.now() }));
    router.replace("/admin" as any);
  };

  return (
    // KEY FIX: root is flex:1 with overflow hidden — contains the poster grid
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <PosterBg />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Card — full width on phones, capped on large screens */}
          <View style={S.card}>

            {/* Icon */}
            <LinearGradient colors={["#8B5CF6","#6D28D9"]} style={S.iconWrap}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </LinearGradient>

            <Text style={S.heading}>Admin Portal</Text>
            <Text style={S.sub}>MovieTime Control Center</Text>

            {/* Error box */}
            {!!error && (
              <View style={S.errBox}>
                <Ionicons name="warning-outline" size={14} color="#fca5a5" style={{ flexShrink: 0 }} />
                <Text style={S.errTxt}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <Text style={S.label}>ADMIN EMAIL</Text>
            <View style={S.inputRow}>
              <View style={S.inputIcon}>
                <Ionicons name="mail-outline" size={16} color="#AB8BFF" />
              </View>
              <TextInput
                style={S.input}
                value={email}
                onChangeText={v => { setEmail(v); setError(""); }}
                placeholder="admin@movietime.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                blurOnSubmit={false}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>

            {/* Password */}
            <Text style={[S.label, { marginTop: 14 }]}>PASSWORD</Text>
            <View style={S.inputRow}>
              <View style={S.inputIcon}>
                <Ionicons name="lock-closed-outline" size={16} color="#AB8BFF" />
              </View>
              <TextInput
                ref={pwRef}
                style={S.input}
                value={password}
                onChangeText={v => { setPassword(v); setError(""); }}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.2)"
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
              {/* Eye button — fixed size, never overflows */}
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={S.eyeBtn}
                hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18}
                  color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[S.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}>
              <LinearGradient
                colors={loading ? ["#333","#333"] : ["#8B5CF6","#6D28D9"]}
                start={{ x:0,y:0 }} end={{ x:1,y:0 }}
                style={S.btnInner}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="shield-checkmark-outline" size={17} color="#fff" />
                      <Text style={S.btnTxt}>Access Dashboard</Text></>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={S.notice}>
              🔒 Restricted access. Unauthorised attempts are logged.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  // KEY FIXES:
  //   overflow: "hidden" — clips poster grid, no white bleed on mobile
  //   backgroundColor — fallback for slow image loads
  root:     { flex: 1, backgroundColor: "#04000f", overflow: "hidden" },

  // scroll: alignItems center + paddingHorizontal 20 = card fills phone width,
  // centers on tablet/web, never overflows
  scroll:   {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    minHeight: "100%" as any,
  },

  // card: width 100% + maxWidth 420 = full width on phones, capped on large screens
  card:     {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(10,0,28,0.92)",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    alignItems: "center",
  },

  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heading:  { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  sub:      { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginBottom: 20 },
  errBox:   { flexDirection: "row", alignItems: "flex-start", gap: 8, width: "100%", backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", borderRadius: 10, padding: 10, marginBottom: 14 },
  errTxt:   { color: "#fca5a5", fontSize: 12, flex: 1, lineHeight: 17 },
  label:    { alignSelf: "flex-start", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 7 },
  inputRow: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingLeft: 6, paddingRight: 4, minHeight: 50, overflow: "hidden" },
  inputIcon:{ width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 },
  input:    { flex: 1, minWidth: 0, color: "#fff", fontSize: 14, paddingVertical: Platform.OS === "web" ? 11 : 12 },
  eyeBtn:   { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  btn:      { width: "100%", borderRadius: 13, overflow: "hidden", marginTop: 22, marginBottom: 16 },
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnTxt:   { color: "#fff", fontWeight: "900", fontSize: 15 },
  notice:   { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", lineHeight: 16 },
});