// app/admin/sign-in.tsx
// RESPONSIVE FIX: Card fills full width on mobile, caps at 440px on desktop.
// All paddings/font sizes adapt. No overflow on small screens.
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Platform, Image,
  KeyboardAvoidingView, ScrollView, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_SESSION_KEY = "admin_session";

const ADMIN_EMAIL    = (process.env.EXPO_PUBLIC_ADMIN_EMAIL    ?? "").toLowerCase().trim();
const ADMIN_PASSWORD =  process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? "";

// ── Movie poster background ───────────────────────────────────────────────────
const POSTERS = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "/velWPhVi2KkDs2McBNcjfr3VLKB.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
  "/fiVW06jE7z9YnO4trhaMEdclSiC.jpg", "/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
  "/rktDFPbfHfUbArZ6OOOKsXcv0Bm.jpg", "/AuFiYTkAZYTDcdzeqQLrdgw1AOa.jpg",
];
const TMDB = "https://image.tmdb.org/t/p/w185";

const PosterBg = () => {
  const { width, height } = useWindowDimensions();
  // Smaller posters on narrow screens so the grid still covers the bg
  const pw   = Math.max(72, Math.min(110, width / 5));
  const ph   = pw * 1.5;
  const cols = Math.ceil(width  / pw) + 2;
  const rows = Math.ceil(height / ph) + 2;
  const items = Array.from({ length: cols * rows }, (_, i) => POSTERS[i % POSTERS.length]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{
        position: "absolute",
        flexDirection: "row", flexWrap: "wrap",
        width: cols * (pw + 4),
        transform: [{ rotate: "-8deg" }],
        left: -pw, top: -ph * 0.5,
      }}>
        {items.map((src, i) => (
          <Image
            key={i}
            source={{ uri: `${TMDB}${src}` }}
            style={{ width: pw, height: ph, margin: 2, borderRadius: 4 }}
            resizeMode="cover"
          />
        ))}
      </View>
      {/* Dark overlay */}
      <LinearGradient
        colors={["rgba(2,0,15,0.91)", "rgba(5,0,22,0.95)", "rgba(2,0,12,0.98)"]}
        style={StyleSheet.absoluteFill}
      />
      {/* Purple glow */}
      <View style={{
        position: "absolute",
        top: "25%", alignSelf: "center",
        width: Math.min(width * 0.8, 360), height: Math.min(width * 0.8, 360),
        borderRadius: 999,
        backgroundColor: "rgba(109,40,217,0.07)",
      }} pointerEvents="none" />
    </View>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminSignIn() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Break-points
  const isSmall   = width < 380;   // tiny phones (Galaxy Fold, etc.)
  const isDesktop = width > 768;

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [pwErr,    setPwErr]    = useState("");

  const handleLogin = async () => {
    setError(""); setEmailErr(""); setPwErr("");
    const em = email.trim().toLowerCase();

    let ok = true;
    if (!em)              { setEmailErr("Email is required");   ok = false; }
    else if (!em.includes("@")) { setEmailErr("Enter a valid email"); ok = false; }
    if (!password)        { setPwErr("Password is required");   ok = false; }
    if (!ok) return;

    setLoading(true);
    try {
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        setError("Admin credentials not configured. Set EXPO_PUBLIC_ADMIN_EMAIL and EXPO_PUBLIC_ADMIN_PASSWORD in .env");
        return;
      }
      if (em !== ADMIN_EMAIL) {
        setError("Email not recognised. Check your admin credentials.");
        return;
      }
      if (password !== ADMIN_PASSWORD) {
        setError("Incorrect password. Check your admin credentials.");
        return;
      }
      // Success — save session same pattern as dashboard restore
      await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        email: em, loggedIn: true, time: Date.now(),
      }));
      router.replace("/admin" as any);
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Responsive sizing tokens
  const cardPad  = isSmall ? 20 : isDesktop ? 36 : 26;
  const headSize = isSmall ? 22 : 27;
  const subSize  = isSmall ? 12 : 14;
  const iconSize = isSmall ? 58 : 72;
  const iconR    = isSmall ? 16 : 20;

  return (
    <KeyboardAvoidingView
      style={S.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <PosterBg />

      <ScrollView
        contentContainerStyle={[
          S.scroll,
          isDesktop && S.scrollDesktop,
          isSmall   && { paddingHorizontal: 12 },
        ]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={S.backBtn} onPress={() => router.replace("/")}>
          <Ionicons name="arrow-back" size={17} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Card */}
        <View style={[
          S.card,
          { padding: cardPad },
          isDesktop && S.cardDesktop,
          isSmall   && { borderRadius: 16 },
        ]}>

          {/* Shield icon */}
          <View style={[S.iconWrap, { marginBottom: isSmall ? 14 : 20 }]}>
            <LinearGradient
              colors={["#8B5CF6", "#6D28D9", "#4C1D95"]}
              style={[S.iconGrad, { width: iconSize, height: iconSize, borderRadius: iconR }]}
            >
              <Ionicons name="shield-checkmark" size={isSmall ? 24 : 30} color="#fff" />
            </LinearGradient>
            <View style={S.iconGlow} />
          </View>

          <Text style={[S.heading, { fontSize: headSize }]}>Admin Portal</Text>
          <Text style={[S.sub, { fontSize: subSize, marginBottom: isSmall ? 20 : 28 }]}>
            MovieTime Control Center
          </Text>

          {/* Error banner */}
          {!!error && (
            <View style={S.errorBox}>
              <Ionicons name="warning-outline" size={15} color="#fbbf24" />
              <Text style={S.errorTxt}>{error}</Text>
            </View>
          )}

          {/* Email field */}
          <View style={S.field}>
            <Text style={S.label}>ADMIN EMAIL</Text>
            <View style={[S.row, !!emailErr && S.rowErr]}>
              <View style={S.fieldIcon}>
                <Ionicons name="shield-outline" size={15} color={emailErr ? "#ef4444" : "#AB8BFF"} />
              </View>
              <TextInput
                style={S.input}
                value={email}
                onChangeText={v => { setEmail(v); setEmailErr(""); setError(""); }}
                placeholder="admin@movietime.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
            </View>
            {!!emailErr && <Text style={S.fieldErr}>{emailErr}</Text>}
          </View>

          {/* Password field */}
          <View style={S.field}>
            <Text style={S.label}>PASSWORD</Text>
            <View style={[S.row, !!pwErr && S.rowErr]}>
              <View style={S.fieldIcon}>
                <Ionicons name="key-outline" size={15} color={pwErr ? "#ef4444" : "#AB8BFF"} />
              </View>
              <TextInput
                style={S.input}
                value={password}
                onChangeText={v => { setPassword(v); setPwErr(""); setError(""); }}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.2)"
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})}
              />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={{ padding: 8 }}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={15}
                  color="rgba(255,255,255,0.3)"
                />
              </TouchableOpacity>
            </View>
            {!!pwErr && <Text style={S.fieldErr}>{pwErr}</Text>}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[S.btn, loading && { opacity: 0.65 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={loading ? ["#444","#444"] : ["#8B5CF6","#7C3AED","#6D28D9"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={S.btnInner}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="log-in-outline" size={17} color="#fff" />
                    <Text style={[S.btnTxt, isSmall && { fontSize: 13 }]}>Access Dashboard</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Dev hint */}
          {typeof __DEV__ !== "undefined" && __DEV__ && (
            <View style={S.devHint}>
              <Ionicons name="information-circle-outline" size={11} color="rgba(255,255,255,0.2)" />
              <Text style={S.devHintTxt}>
                Set EXPO_PUBLIC_ADMIN_EMAIL and{"\n"}EXPO_PUBLIC_ADMIN_PASSWORD in .env
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Ionicons name="lock-closed-outline" size={10} color="rgba(255,255,255,0.18)" />
          <Text style={S.footerTxt}>Restricted access. Unauthorised attempts are logged.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#02000f" },

  // Scroll: centred horizontally, full width padding on mobile
  scroll:      {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop:  Platform.OS === "web" ? 40 : 56,
    paddingBottom: 32,
    alignItems: "center",
  },
  scrollDesktop: {
    justifyContent: "center",
    minHeight: "100%" as any,
  },

  backBtn: {
    alignSelf: "flex-start",
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },

  // Card: full width on mobile, max 440 on desktop
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(5,0,20,0.92)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.22)",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 0 80px rgba(109,40,217,0.18), 0 32px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(139,92,246,0.12)" } as any
      : {}),
  },
  cardDesktop: { borderRadius: 26 },

  iconWrap:  { alignItems: "center" },
  iconGrad:  { alignItems: "center", justifyContent: "center" },
  iconGlow:  {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(139,92,246,0.13)", top: -14,
    ...(Platform.OS === "web" ? { filter: "blur(22px)" } as any : {}),
  },

  heading: { color: "#fff", fontWeight: "900", textAlign: "center", marginBottom: 6 },
  sub:     { color: "rgba(255,255,255,0.35)", textAlign: "center" },

  errorBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1, borderColor: "rgba(251,191,36,0.22)",
    borderRadius: 12, padding: 12, marginBottom: 18,
  },
  errorTxt: { color: "#fbbf24", fontSize: 13, flex: 1, lineHeight: 18 },

  field:   { marginBottom: 14 },
  label:   {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8,
  },
  row:     {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 11, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === "web" ? 4 : 2,
  },
  rowErr:  { borderColor: "rgba(239,68,68,0.4)", backgroundColor: "rgba(239,68,68,0.04)" },
  fieldIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "rgba(139,92,246,0.1)",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  input:   {
    flex: 1, color: "#fff", fontSize: 14,
    paddingVertical: Platform.OS === "web" ? 10 : 11,
  },
  fieldErr:{ color: "#ef4444", fontSize: 10, marginTop: 3, marginLeft: 3 },

  btn:     { borderRadius: 12, overflow: "hidden", marginTop: 6 },
  btnInner:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  btnTxt:  { color: "#fff", fontWeight: "900", fontSize: 15 },

  devHint: {
    flexDirection: "row", gap: 6, alignItems: "flex-start",
    marginTop: 16, backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10, padding: 10,
  },
  devHintTxt: { color: "rgba(255,255,255,0.18)", fontSize: 10, flex: 1, lineHeight: 15 },

  footer:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 18 },
  footerTxt:{ color: "rgba(255,255,255,0.14)", fontSize: 10 },
});