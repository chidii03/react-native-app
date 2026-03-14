// app/(auth)/sign-in.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar, Image,
  KeyboardAvoidingView, ScrollView, useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { OAuthProvider } from "react-native-appwrite";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { account } from "../../services/appwriteConfig";
import GoogleLogo from "../../components/GoogleLogo";
import FacebookIcon from "../../components/FacebookIcon";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TMDB_BASE = "https://image.tmdb.org/t/p/w185";
const POSTERS   = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "/velWPhVi2KkDs2McBNcjfr3VLKB.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
  "/fiVW06jE7z9YnO4trhaMEdclSiC.jpg", "/AuFiYTkAZYTDcdzeqQLrdgw1AOa.jpg",
];

const PosterBg = () => {
  const { width, height } = useWindowDimensions();
  const pw   = Math.max(90, width / 5);
  const ph   = pw * 1.5;
  const cols = Math.ceil(width / pw) + 2;
  const rows = Math.ceil(height / ph) + 2;
  const items = Array.from({ length: cols * rows }, (_, i) => POSTERS[i % POSTERS.length]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{
        position: "absolute", flexDirection: "row", flexWrap: "wrap",
        width: cols * (pw + 4), transform: [{ rotate: "-8deg" }],
        left: -pw, top: -ph * 0.5,
      }}>
        {items.map((src, i) => (
          <Image key={i} source={{ uri: `${TMDB_BASE}${src}` }}
            style={{ width: pw, height: ph, margin: 2, borderRadius: 4 }} resizeMode="cover" />
        ))}
      </View>
      <LinearGradient
        colors={["rgba(10,0,30,0.85)", "rgba(10,0,30,0.92)", "rgba(10,0,30,0.98)"]}
        style={StyleSheet.absoluteFill} />
    </View>
  );
};

const getRawError = (e: any): string => {
  const code = e?.code;
  const msg  = String(e?.message ?? "");
  if (!code && !msg)
    return "Network error — can't reach Appwrite.\nFix: Appwrite Console → Project → Settings → Platforms → Add Web → hostname: vietimeapp.vercel.app";
  if (code === 401) return "Wrong email or password. Please try again.";
  if (code === 404) return "Account not found. Please sign up first.";
  if (code === 409) return "Session conflict. Refresh and try again.";
  if (code === 429) return "Too many attempts. Wait a moment.";
  return msg || `Error ${code}`;
};

const SignIn = () => {
  const router   = useRouter();
  const { returnTo, autoPlay } = useLocalSearchParams<{ returnTo?: string; autoPlay?: string }>();
  const { login } = useAuth();
  const toast    = useToast();
  const { width } = useWindowDimensions();
  const fromMovie = !!returnTo && String(returnTo).includes("/movies/");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [pwErr,    setPwErr]    = useState("");
  const [formErr,  setFormErr]  = useState("");
  const pwRef = useRef<TextInput>(null);

  useEffect(() => {
    account.deleteSession("current").catch(() => {});
  }, []);

  const validate = (): boolean => {
    let ok = true;
    const em = email.trim();
    if (!em)                             { setEmailErr("Email is required");   ok = false; } else setEmailErr("");
    if (em && !emailRegex.test(em))      { setEmailErr("Enter a valid email"); ok = false; }
    if (!password)                       { setPwErr("Password is required");   ok = false; } else setPwErr("");
    if (password && password.length < 8) { setPwErr("Min 8 characters");       ok = false; }
    return ok;
  };

  const handleSignIn = async () => {
    setFormErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { username } = await login(email.trim().toLowerCase(), password);
      toast.success("Welcome back, " + username + "!", fromMovie ? "Returning to your movie..." : "Your watchlist is ready.");
      const rt = returnTo ? String(returnTo) : null;
      if (rt) {
        router.replace((autoPlay === "true" ? rt + "?autoPlay=true" : rt) as any);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setFormErr(getRawError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    try {
      const base =
        Platform.OS === "web" && typeof window !== "undefined"
          ? window.location.origin
          : "https://vietimeapp.vercel.app";
      await account.createOAuth2Session(
        provider,
        `${base}/`,
        `${base}/(auth)/sign-in`
      );
    } catch (e: any) {
      toast.error("OAuth failed", String(e?.message ?? "Please try again"));
    }
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <PosterBg />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[S.scroll, width > 768 && S.scrollWide]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}>

          <TouchableOpacity
            style={S.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={[S.card, width > 768 && S.cardWide]}>

            {/* Header */}
            <View style={S.cardHead}>
              <LinearGradient colors={["rgba(171,139,255,0.25)", "rgba(171,139,255,0.06)"]} style={S.headIcon}>
                <Ionicons name={fromMovie ? "play-circle" : "film"} size={26} color="#AB8BFF" />
              </LinearGradient>
              <Text style={S.heading}>Welcome back</Text>
              <Text style={S.sub}>{fromMovie ? "Sign in to watch this movie" : "Sign in to MovieTime"}</Text>
            </View>

            {fromMovie && (
              <View style={S.contextBox}>
                <Ionicons name="film-outline" size={14} color="#AB8BFF" />
                <Text style={S.contextTxt}>Sign in to unlock the player. You will return to your movie after.</Text>
              </View>
            )}

            {!!formErr && (
              <View style={S.errBox}>
                <Ionicons name="warning-outline" size={15} color="#fca5a5" style={{ flexShrink: 0, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={S.errText}>{formErr}</Text>
                  {(formErr.includes("sign up") || formErr.includes("not found")) && (
                    <TouchableOpacity
                      onPress={() => router.push(
                        (returnTo
                          ? "/(auth)/sign-up?returnTo=" + encodeURIComponent(String(returnTo)) + "&autoPlay=" + (autoPlay ?? "false")
                          : "/(auth)/sign-up") as any)}
                      style={{ marginTop: 6 }}>
                      <Text style={S.errLink}>Create a free account →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Email */}
            <View style={S.field}>
              <Text style={S.label}>EMAIL ADDRESS</Text>
              <View style={[S.row, !!emailErr && S.rowErr]}>
                <View style={S.iconBox}>
                  <Ionicons name="mail-outline" size={16} color={emailErr ? "#ef4444" : "#AB8BFF"} />
                </View>
                <TextInput
                  style={S.input} value={email}
                  onChangeText={v => { setEmail(v); setEmailErr(""); setFormErr(""); }}
                  placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} blurOnSubmit={false}
                  {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {})} />
              </View>
              {!!emailErr && <Text style={S.fieldErr}>{emailErr}</Text>}
            </View>

            {/* Password */}
            <View style={S.field}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={S.label}>PASSWORD</Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/forgot" as any)}>
                  <Text style={S.forgot}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[S.row, !!pwErr && S.rowErr]}>
                <View style={S.iconBox}>
                  <Ionicons name="lock-closed-outline" size={16} color={pwErr ? "#ef4444" : "#AB8BFF"} />
                </View>
                <TextInput
                  ref={pwRef} style={S.input} value={password}
                  onChangeText={v => { setPassword(v); setPwErr(""); setFormErr(""); }}
                  placeholder="Your password" placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showPw} returnKeyType="done" onSubmitEditing={handleSignIn}
                  {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {})} />
                <TouchableOpacity onPress={() => setShowPw(p => !p)} style={{ padding: 8 }}>
                  <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
              {!!pwErr && <Text style={S.fieldErr}>{pwErr}</Text>}
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={[S.btn, loading && { opacity: 0.6 }]}
              onPress={handleSignIn} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={loading ? ["#333","#333"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.btnIn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name={fromMovie ? "play" : "log-in-outline"} size={17} color="#0f0f12" />
                      <Text style={S.btnTxt}>{fromMovie ? "Sign In & Watch" : "Sign In"}</Text></>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={S.divRow}><View style={S.divLine} /><Text style={S.divTxt}>OR</Text><View style={S.divLine} /></View>

            {/* ── OAuth buttons — TouchableOpacity works on BOTH native and web ── */}
            <View style={S.oauthRow}>
              <TouchableOpacity
                style={S.oauthBtn}
                onPress={() => handleOAuth(OAuthProvider.Google)}
                activeOpacity={0.8}>
                <GoogleLogo size={24} />
                <Text style={S.oauthTxt}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={S.oauthBtn}
                onPress={() => handleOAuth(OAuthProvider.Facebook)}
                activeOpacity={0.8}>
                <FacebookIcon size={22} />
                <Text style={S.oauthTxt}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <View style={S.divRow}><View style={S.divLine} /><Text style={S.divTxt}>NO ACCOUNT?</Text><View style={S.divLine} /></View>

            <TouchableOpacity
              style={S.outBtn}
              onPress={() => router.push(
                (returnTo
                  ? "/(auth)/sign-up?returnTo=" + encodeURIComponent(String(returnTo)) + "&autoPlay=" + (autoPlay ?? "false")
                  : "/(auth)/sign-up") as any)}
              activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={15} color="#AB8BFF" />
              <Text style={S.outBtnTxt}>Create a Free Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/")} style={S.skip}>
              <Text style={S.skipTxt}>Continue browsing without signing in</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignIn;

const S = StyleSheet.create({
  root:            { flex: 1, backgroundColor: "#0a001e", overflow: "hidden" },
  scroll:          { flexGrow: 1, padding: 24, paddingTop: Platform.OS === "web" ? 40 : 56, alignItems: "center" },
  scrollWide:      { justifyContent: "center" },
  backBtn:         { alignSelf: "flex-start", width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  card:            { width: "100%", backgroundColor: "rgba(12,4,30,0.95)", borderRadius: 24, padding: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  cardWide:        { maxWidth: 480 },
  cardHead:        { alignItems: "center", marginBottom: 20 },
  headIcon:        { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heading:         { color: "#fff", fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 4 },
  sub:             { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center" },
  contextBox:      { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(171,139,255,0.08)", borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", borderRadius: 12, padding: 12, marginBottom: 18 },
  contextTxt:      { color: "rgba(171,139,255,0.85)", fontSize: 13, flex: 1, lineHeight: 18 },
  errBox:          { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", borderRadius: 14, padding: 14, marginBottom: 18 },
  errText:         { color: "#fca5a5", fontSize: 12, lineHeight: 18 },
  errLink:         { color: "#AB8BFF", fontWeight: "800", fontSize: 13 },
  field:           { marginBottom: 14 },
  label:           { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  row:             { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 6, paddingVertical: Platform.OS === "web" ? 4 : 2 },
  rowErr:          { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  iconBox:         { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  input:           { flex: 1, color: "#fff", fontSize: 15, paddingVertical: Platform.OS === "web" ? 10 : 12 },
  fieldErr:        { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 4 },
  forgot:          { color: "#AB8BFF", fontSize: 12, fontWeight: "700" },
  btn:             { borderRadius: 12, overflow: "hidden", marginBottom: 18 },
  btnIn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  btnTxt:          { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  divRow:          { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  divLine:         { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  divTxt:          { color: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: "800" },
  // ── OAuth row: flex row, equal-width buttons ──────────────────────────────
  oauthRow:        { flexDirection: "row", gap: 12, marginBottom: 18 },
  oauthBtn:        {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 11,
    minHeight: 46,
    backgroundColor: "rgba(243,244,246,0.08)",
    borderColor: "rgba(229,231,235,0.35)",
  },
  oauthTxt:        { fontSize: 14, fontWeight: "800", color: "#f9fafb" },
  outBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)", marginBottom: 8 },
  outBtnTxt:       { color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
  skip:            { alignItems: "center", paddingVertical: 8 },
  skipTxt:         { color: "rgba(255,255,255,0.2)", fontSize: 12 },
});