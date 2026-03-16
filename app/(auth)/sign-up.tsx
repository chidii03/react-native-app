// app/(auth)/sign-up.tsx
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
import * as Linking from "expo-linking";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { account } from "../../services/appwriteConfig";
import GoogleLogo from "../../components/GoogleLogo";
import FacebookIcon from "../../components/FacebookIcon";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TMDB_BASE  = "https://image.tmdb.org/t/p/w185";
const POSTERS    = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", "/velWPhVi2KkDs2McBNcjfr3VLKB.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", "/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
  "/fiVW06jE7z9YnO4trhaMEdclSiC.jpg", "/AuFiYTkAZYTDcdzeqQLrdgw1AOa.jpg",
];

const PosterBg = () => {
  const { width, height } = useWindowDimensions();
  const pw   = Math.max(80, width / 5);
  const ph   = pw * 1.5;
  const cols = Math.ceil(width / pw) + 2;
  const rows = Math.ceil(height / ph) + 2;
  const items = Array.from({ length: cols * rows }, (_, i) => POSTERS[i % POSTERS.length]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: "absolute", flexDirection: "row", flexWrap: "wrap", width: cols * (pw + 4), transform: [{ rotate: "-8deg" }], left: -pw, top: -ph * 0.5 }}>
        {items.map((src, i) => (
          <Image key={i} source={{ uri: `${TMDB_BASE}${src}` }}
            style={{ width: pw, height: ph, margin: 2, borderRadius: 4 }} resizeMode="cover" />
        ))}
      </View>
      <LinearGradient colors={["rgba(10,0,30,0.88)","rgba(10,0,30,0.94)","rgba(10,0,30,0.99)"]} style={StyleSheet.absoluteFill} />
    </View>
  );
};

const buildOAuthUrl = (provider: OAuthProvider, successUrl: string, failureUrl: string) => {
  const endpoint  = "https://fra.cloud.appwrite.io/v1";
  const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "699381200024b709931f";
  const params    = new URLSearchParams({ project: projectId, success: successUrl, failure: failureUrl });
  return `${endpoint}/account/sessions/oauth2/${provider}?${params.toString()}`;
};

const parseRegErr = (e: any): string => {
  const msg  = String(e?.message ?? "").toLowerCase();
  const code = e?.code;
  if (msg.includes("missing scopes") || msg.includes("platform is not registered"))
    return "Setup issue — please contact support.";
  if (msg.includes("already exists") || msg.includes("user_already_exists") || code === 409)
    return "An account with this email already exists. Please sign in instead.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network error. Please check your connection and try again.";
  return e?.message || "Registration failed. Please try again.";
};

const SignUp = () => {
  const router = useRouter();
  const { returnTo, autoPlay } = useLocalSearchParams<{ returnTo?: string; autoPlay?: string }>();
  const { register } = useAuth();
  const toast = useToast();
  const fromMovie = !!returnTo && returnTo.includes("/movies/");

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [formErr,      setFormErr]      = useState("");
  const [errs,         setErrs]         = useState({ name: "", email: "", password: "", confirm: "" });

  const emailRef   = useRef<TextInput>(null);
  const pwRef      = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => { account.deleteSession("current").catch(() => {}); }, []);

  const setE = (f: keyof typeof errs, v: string) => setErrs(p => ({ ...p, [f]: v }));

  const validate = (): boolean => {
    let ok = true;
    const n  = name.trim();
    const em = email.trim().toLowerCase();

    // Name validation
    if (!n)           { setE("name", "Full name is required");   ok = false; }
    else if (n.length < 2) { setE("name", "Name must be at least 2 characters"); ok = false; }
    else if (n.length > 64){ setE("name", "Name is too long");   ok = false; }
    else              setE("name", "");

    // Email validation
    if (!em)                    { setE("email", "Email is required");          ok = false; }
    else if (!emailRegex.test(em)) { setE("email", "Enter a valid email address"); ok = false; }
    else                        setE("email", "");

    // Password validation
    if (!password)              { setE("password", "Password is required");     ok = false; }
    else if (password.length < 8) { setE("password", "Minimum 8 characters");  ok = false; }
    else if (!/[A-Za-z]/.test(password)) { setE("password", "Include at least one letter"); ok = false; }
    else if (!/\d/.test(password))       { setE("password", "Include at least one number"); ok = false; }
    else                        setE("password", "");

    // Confirm password
    if (!confirm)               { setE("confirm", "Please confirm your password"); ok = false; }
    else if (password !== confirm) { setE("confirm", "Passwords don't match");  ok = false; }
    else                        setE("confirm", "");

    return ok;
  };

  const handleSignUp = async () => {
    setFormErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { username } = await register(email.trim().toLowerCase(), password, name.trim());
      toast.success(`Welcome, ${username}! 🎬`, fromMovie ? "Account created! Opening your movie…" : "Your free trial has started.");
      if (returnTo) router.replace((autoPlay === "true" ? `${returnTo}?autoPlay=true` : returnTo) as any);
      else router.replace("/(tabs)/profile");
    } catch (e: any) {
      setFormErr(parseRegErr(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthLoading(String(provider));
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const origin = window.location.origin;
        window.location.href = buildOAuthUrl(provider, `${origin}/`, `${origin}/(auth)/sign-in`);
      } else {
        const redirectUri = Linking.createURL("/");
        const oauthUrl    = await account.createOAuth2Token(provider, redirectUri, redirectUri);
        if (!oauthUrl) throw new Error("No OAuth URL returned");
        const WebBrowser = await import("expo-web-browser");
        const result     = await WebBrowser.openAuthSessionAsync(oauthUrl.toString(), redirectUri);
        if (result.type === "success" && result.url) {
          const url    = new URL(result.url);
          const secret = url.searchParams.get("secret");
          const userId = url.searchParams.get("userId");
          if (secret && userId) {
            await account.createSession(userId, secret);
            toast.success("Account created with Google!");
            router.replace(returnTo ? String(returnTo) as any : "/(tabs)/profile");
          }
        }
        setOauthLoading(null);
      }
    } catch (e: any) {
      toast.error("Sign up failed", String(e?.message ?? "Please try again"));
      setOauthLoading(null);
    }
  };

  const strength = !password ? 0 : password.length < 4 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4;
  const strengthColors = ["transparent","#ef4444","#f59e0b","#84cc16","#4ade80"];
  const strengthLabels = ["","Weak","Fair","Good","Strong"];

  return (
    <KeyboardAvoidingView style={S.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <PosterBg />
      <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={S.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={S.card}>
          <View style={S.cardHead}>
            <LinearGradient colors={["rgba(171,139,255,0.25)","rgba(171,139,255,0.06)"]} style={S.headIcon}>
              <Ionicons name={fromMovie ? "play-circle" : "person-add"} size={24} color="#AB8BFF" />
            </LinearGradient>
            <Text style={S.heading}>Create account</Text>
            <Text style={S.sub}>{fromMovie ? "Join millions of subscribers 🎬" : "Join free — 14-day trial included"}</Text>
          </View>

          {!!formErr && (
            <View style={S.errBox}>
              <Ionicons name="warning-outline" size={15} color="#fca5a5" />
              <View style={{ flex: 1 }}>
                <Text style={S.errText}>{formErr}</Text>
                {formErr.includes("sign in") && (
                  <TouchableOpacity onPress={() => router.push("/(auth)/sign-in" as any)} style={{ marginTop: 6 }}>
                    <Text style={S.errLink}>→ Sign in instead</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Name */}
          <View style={S.field}>
            <Text style={S.label}>FULL NAME</Text>
            <View style={[S.inputRow, !!errs.name && S.inputRowErr]}>
              <View style={S.iconBox}><Ionicons name="person-outline" size={16} color={errs.name ? "#ef4444" : "#AB8BFF"} /></View>
              <TextInput style={S.input} value={name} onChangeText={v => { setName(v); setE("name",""); }}
                placeholder="John Doe" placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="words" returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()} blurOnSubmit={false}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
            </View>
            {!!errs.name && <Text style={S.fieldErr}>{errs.name}</Text>}
          </View>

          {/* Email */}
          <View style={S.field}>
            <Text style={S.label}>EMAIL ADDRESS</Text>
            <View style={[S.inputRow, !!errs.email && S.inputRowErr]}>
              <View style={S.iconBox}><Ionicons name="mail-outline" size={16} color={errs.email ? "#ef4444" : "#AB8BFF"} /></View>
              <TextInput ref={emailRef} style={S.input} value={email}
                onChangeText={v => { setEmail(v); setE("email",""); setFormErr(""); }}
                placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} blurOnSubmit={false}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
            </View>
            {!!errs.email && <Text style={S.fieldErr}>{errs.email}</Text>}
          </View>

          {/* Password */}
          <View style={S.field}>
            <Text style={S.label}>PASSWORD</Text>
            <View style={[S.inputRow, !!errs.password && S.inputRowErr]}>
              <View style={S.iconBox}><Ionicons name="lock-closed-outline" size={16} color={errs.password ? "#ef4444" : "#AB8BFF"} /></View>
              <TextInput ref={pwRef} style={S.input} value={password}
                onChangeText={v => { setPassword(v); setE("password",""); }}
                placeholder="Min. 8 chars, letter + number" placeholderTextColor="rgba(255,255,255,0.2)"
                secureTextEntry={!showPw} returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()} blurOnSubmit={false}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={S.eyeBtn} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            {!!errs.password && <Text style={S.fieldErr}>{errs.password}</Text>}
          </View>

          {password.length > 0 && (
            <View style={S.strengthRow}>
              {[1,2,3,4].map(i => (
                <View key={i} style={[S.bar, { backgroundColor: strength >= i ? strengthColors[strength] : "rgba(255,255,255,0.08)" }]} />
              ))}
              <Text style={[S.strengthLbl, { color: strengthColors[strength] }]}>{strengthLabels[strength]}</Text>
            </View>
          )}

          {/* Confirm Password */}
          <View style={S.field}>
            <Text style={S.label}>CONFIRM PASSWORD</Text>
            <View style={[S.inputRow, !!errs.confirm && S.inputRowErr]}>
              <View style={S.iconBox}><Ionicons name="shield-checkmark-outline" size={16} color={errs.confirm ? "#ef4444" : "#AB8BFF"} /></View>
              <TextInput ref={confirmRef} style={S.input} value={confirm}
                onChangeText={v => { setConfirm(v); setE("confirm",""); }}
                placeholder="Repeat password" placeholderTextColor="rgba(255,255,255,0.2)"
                secureTextEntry={!showPw} returnKeyType="done" onSubmitEditing={handleSignUp}
                {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} style={S.eyeBtn} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            {!!errs.confirm && <Text style={S.fieldErr}>{errs.confirm}</Text>}
          </View>

          {confirm.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 }}>
              <Ionicons name={password === confirm ? "checkmark-circle" : "close-circle"} size={13}
                color={password === confirm ? "#4ade80" : "#ef4444"} />
              <Text style={{ color: password === confirm ? "#4ade80" : "#ef4444", fontSize: 11 }}>
                {password === confirm ? "Passwords match" : "Passwords don't match"}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[S.btn, loading && { opacity: 0.6 }]} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={loading ? ["#333","#333"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
              start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={S.btnIn}>
              {loading ? <ActivityIndicator color="#fff" />
                : <><Ionicons name={fromMovie ? "play" : "person-add-outline"} size={17} color="#0f0f12" />
                    <Text style={S.btnTxt}>{fromMovie ? "Create Account & Watch" : "Create Account"}</Text></>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={S.divRow}><View style={S.divLine} /><Text style={S.divTxt}>OR SIGN UP WITH</Text><View style={S.divLine} /></View>

          <View style={S.oauthRow}>
            <TouchableOpacity style={S.oauthBtn} onPress={() => handleOAuth(OAuthProvider.Google)} activeOpacity={0.8} disabled={!!oauthLoading}>
              {oauthLoading === String(OAuthProvider.Google)
                ? <ActivityIndicator size="small" color="#fff" />
                : <><GoogleLogo size={20} /><Text style={S.oauthTxt}>Google</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={S.oauthBtn} onPress={() => handleOAuth(OAuthProvider.Facebook)} activeOpacity={0.8} disabled={!!oauthLoading}>
              {oauthLoading === String(OAuthProvider.Facebook)
                ? <ActivityIndicator size="small" color="#fff" />
                : <><FacebookIcon size={18} /><Text style={S.oauthTxt}>Facebook</Text></>}
            </TouchableOpacity>
          </View>

          <View style={S.divRow}><View style={S.divLine} /><Text style={S.divTxt}>ALREADY HAVE AN ACCOUNT?</Text><View style={S.divLine} /></View>

          <TouchableOpacity style={S.outBtn}
            onPress={() => router.push(returnTo
              ? `/(auth)/sign-in?returnTo=${encodeURIComponent(returnTo)}&autoPlay=${autoPlay ?? "false"}` as any
              : "/(auth)/sign-in")} activeOpacity={0.85}>
            <Ionicons name="log-in-outline" size={15} color="#AB8BFF" />
            <Text style={S.outBtnTxt}>Sign In</Text>
          </TouchableOpacity>

          <Text style={S.terms}>
            By signing up you agree to our <Text style={{ color: "#AB8BFF" }}>Terms</Text> and <Text style={{ color: "#AB8BFF" }}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;

const S = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#0a001e", overflow: "hidden" },
  scroll:      { flexGrow: 1, paddingHorizontal: 16, paddingTop: Platform.OS === "web" ? 40 : 52, paddingBottom: 40, alignItems: "center" },
  backBtn:     { alignSelf: "flex-start", width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  card:        { width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: "rgba(12,4,30,0.95)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  cardHead:    { alignItems: "center", marginBottom: 18 },
  headIcon:    { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  heading:     { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 4 },
  sub:         { color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center" },
  errBox:      { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", borderRadius: 11, padding: 10, marginBottom: 14 },
  errText:     { color: "#fca5a5", fontSize: 12, lineHeight: 17 },
  errLink:     { color: "#AB8BFF", fontWeight: "800", fontSize: 12 },
  field:       { marginBottom: 10 },
  label:       { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 },
  inputRow:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingLeft: 4, paddingRight: 4, minHeight: 46, overflow: "hidden" },
  inputRowErr: { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  iconBox:     { width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginRight: 6, flexShrink: 0 },
  input:       { flex: 1, minWidth: 0, color: "#fff", fontSize: 13, paddingVertical: Platform.OS === "web" ? 9 : 10, paddingHorizontal: 2 },
  eyeBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fieldErr:    { color: "#ef4444", fontSize: 10, marginTop: 2, marginLeft: 2 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  bar:         { flex: 1, height: 3, borderRadius: 2 },
  strengthLbl: { fontSize: 10, marginLeft: 4, minWidth: 34, fontWeight: "800" },
  btn:         { borderRadius: 11, overflow: "hidden", marginTop: 4, marginBottom: 12 },
  btnIn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  btnTxt:      { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
  divRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  divLine:     { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  divTxt:      { color: "rgba(255,255,255,0.2)", fontSize: 9, fontWeight: "800" },
  oauthRow:    { flexDirection: "row", gap: 10, marginBottom: 12 },
  oauthBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 999, borderWidth: 1, paddingVertical: 10, minHeight: 44, backgroundColor: "rgba(243,244,246,0.08)", borderColor: "rgba(229,231,235,0.35)" },
  oauthTxt:    { fontSize: 13, fontWeight: "800", color: "#f9fafb" },
  outBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 12, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)", marginBottom: 12 },
  outBtnTxt:   { color: "#AB8BFF", fontWeight: "800", fontSize: 13 },
  terms:       { color: "rgba(255,255,255,0.18)", fontSize: 11, textAlign: "center", lineHeight: 16 },
});