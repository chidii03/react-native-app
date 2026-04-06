// app/movies/[id].tsx
import React, { useState, useEffect } from "react";
import {
  ScrollView, Image, Text, View, TouchableOpacity,
  ImageBackground, StatusBar, ActivityIndicator, Modal,
  StyleSheet, useWindowDimensions, Platform, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import useFetch from "../../services/useFetch";
import { fetchMovieDetails, TMDB_IMAGE } from "../../services/api";
import { toggleWatchlist, checkIsSaved } from "../../services/appwrite";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";

const OWNER_EMAILS = ["chidiokwu795@gmail.com"];

const fmtMoney = (v: number) => {
  if (!v) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
};
const fmtTime = (m: number) => {
  if (!m) return "N/A";
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const Stars = ({ rating }: { rating: number }) => {
  const n = Math.round(rating / 2);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[0,1,2,3,4].map(i => (
        <Ionicons key={i} name={i < n ? "star" : "star-outline"} size={12}
          color={i < n ? "#f5c518" : "rgba(255,255,255,0.2)"} />
      ))}
    </View>
  );
};

const openUrl = (url: string) => {
  if (!url) return;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank");
  } else {
    const { Linking } = require("react-native");
    Linking.openURL(url).catch(() => {});
  }
};

const PAYMENT_LINKS = {
  paystack:    { monthly: "https://paystack.shop/pay/u-e7b46zzv",     yearly: "https://paystack.shop/pay/mkghesxsg2" },
  flutterwave: {
    // NGN
    monthly: "https://flutterwave.com/pay/7rlc2qs2qcfd",
    yearly:  "https://flutterwave.com/pay/xfqscqzgcwit",
    // USD — create these in Flutterwave Dashboard → Payment Links
    usd_monthly: process.env.EXPO_PUBLIC_FLW_USD_MONTHLY ?? "",
    usd_yearly:  process.env.EXPO_PUBLIC_FLW_USD_YEARLY  ?? "",
    // EUR
    eur_monthly: process.env.EXPO_PUBLIC_FLW_EUR_MONTHLY ?? "",
    eur_yearly:  process.env.EXPO_PUBLIC_FLW_EUR_YEARLY  ?? "",
    // GBP
    gbp_monthly: process.env.EXPO_PUBLIC_FLW_GBP_MONTHLY ?? "",
    gbp_yearly:  process.env.EXPO_PUBLIC_FLW_GBP_YEARLY  ?? "",
    // CAD — Monthly: CA$1.36  |  Yearly: CA$10.88
    cad_monthly: process.env.EXPO_PUBLIC_FLW_CAD_MONTHLY ?? "",
    cad_yearly:  process.env.EXPO_PUBLIC_FLW_CAD_YEARLY  ?? "",
  },
};

// Helper: pick the right Flutterwave link for the selected currency + plan
const getFLWUrl = (currency: string, plan: PlanId): string => {
  const key = currency === "NGN" ? plan : `${currency.toLowerCase()}_${plan}`;
  return (PAYMENT_LINKS.flutterwave as any)[key] ?? "";
};

const NGN_TO: Record<string, number> = { NGN: 1, USD: 1/1600, EUR: 1/1720, GBP: 1/2025, CAD: 1/1175 };
const SYM:   Record<string, string>  = { NGN: "₦", USD: "$", EUR: "€", GBP: "£", CAD: "CA$" };
type PlanId    = "monthly" | "yearly";
type GatewayId = "paystack" | "flutterwave";
const fmt = (ngn: number, cur: string) => {
  const n = ngn * NGN_TO[cur];
  return cur === "NGN" ? `${SYM[cur]}${n.toLocaleString()}` : `${SYM[cur]}${n.toFixed(2)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// PaywallModal — FIXED:
//   • Close (×) button is positioned in the OVERLAY (outside the sheet)
//     so it's always visible even when the sheet is 100% height.
//   • Sheet content is in a ScrollView so nothing is cut off.
//   • Web: centred rounded modal. Mobile: bottom sheet.
// ─────────────────────────────────────────────────────────────────────────────
const PaywallModal = ({
  visible, onClose, userEmail, userId, userName,
}: {
  visible: boolean; onClose: () => void;
  userEmail: string; userId: string; userName: string;
}) => {
  const [plan,     setPlan]     = useState<PlanId>("monthly");
  const [currency, setCurrency] = useState<"NGN"|"USD"|"EUR"|"GBP"|"CAD">("NGN");
  const [gateway,  setGateway]  = useState<GatewayId>("flutterwave");

  const isWeb = Platform.OS === "web";

  const handleCurrencyChange = (c: typeof currency) => {
    setCurrency(c);
    if (c !== "NGN") setGateway("flutterwave");
  };

  const pay = (gw: GatewayId) => {
    let baseUrl = "";
    if (gw === "paystack") {
      baseUrl = PAYMENT_LINKS.paystack[plan];
    } else {
      baseUrl = getFLWUrl(currency, plan);
    }
    if (!baseUrl) {
      Alert.alert("Not configured", `${gw} ${currency} ${plan} link not set up yet. Add it to Vercel env vars.`);
      return;
    }
    const params = new URLSearchParams({ plan, uid: userId, email: userEmail, name: userName });
    openUrl(`${baseUrl}?${params.toString()}`);
    onClose();
  };

  const ngnPlans = [
    { id: "monthly" as PlanId, label: "Monthly", ngn: 1600  },
    { id: "yearly"  as PlanId, label: "Yearly",  ngn: 12800 },
  ];

  return (
    <Modal visible={visible} transparent animationType={isWeb ? "fade" : "slide"}
      statusBarTranslucent onRequestClose={onClose}>

      {/* ── OVERLAY ── */}
      <View style={PW.overlay}>

        {/* Tap outside to dismiss */}
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        {/* ── CLOSE BUTTON — lives in the OVERLAY, not inside the sheet.
              This means it is ALWAYS visible at 100% sheet height too. ── */}
        <TouchableOpacity style={PW.closeBtn} onPress={onClose} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        {/* ── SHEET ── */}
        <View style={[PW.sheet, isWeb && PW.sheetWeb]}>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={PW.scrollContent} bounces={false}>

            <LinearGradient colors={["rgba(171,139,255,0.2)","rgba(171,139,255,0.04)"]} style={PW.iconWrap}>
              <Ionicons name="diamond" size={32} color="#AB8BFF" />
            </LinearGradient>
            <Text style={PW.title}>Subscribe to Watch</Text>
            <Text style={PW.sub}>
              Get full access to stream all movies{"\n"}starting from{" "}
              <Text style={{ color: "#AB8BFF", fontWeight: "900" }}>₦1,600 / month</Text>
            </Text>

            {["Unlimited movie streaming","Personal watchlist","HD quality player","Cancel anytime"].map(f => (
              <View key={f} style={PW.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                <Text style={PW.featureTxt}>{f}</Text>
              </View>
            ))}

            {/* Plan toggle */}
            <View style={PW.planToggle}>
              {ngnPlans.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setPlan(p.id)}
                  style={[PW.planChip, plan === p.id && PW.planChipActive]} activeOpacity={0.8}>
                  <Text style={[PW.planChipTxt, plan === p.id && { color: "#AB8BFF" }]}>{p.label}</Text>
                  <Text style={[PW.planChipPrice, plan === p.id && { color: "#fff" }]}>
                    {fmt(p.ngn, currency)}
                  </Text>
                  {p.id === "yearly" && (
                    <View style={PW.saveBadge}><Text style={PW.saveBadgeTxt}>Save 33%</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Currency */}
            <View style={PW.currencyRow}>
              {(["NGN","USD","EUR","GBP","CAD"] as const).map(c => (
                <TouchableOpacity key={c} onPress={() => handleCurrencyChange(c)}
                  style={[PW.currChip, currency === c && PW.currChipActive]} activeOpacity={0.8}>
                  <Text style={[PW.currTxt, currency === c && { color: "#AB8BFF" }]}>{SYM[c]}{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Paystack — NGN only */}
            {currency === "NGN" && (
              <TouchableOpacity style={PW.paystackBtn} onPress={() => pay("paystack")} activeOpacity={0.85}>
                <View style={[PW.gwDot, { backgroundColor: "#00c3f7" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={PW.gatewayTitle}>Pay with Paystack</Text>
                  <Text style={PW.gatewaySubtitle}>Cards, Bank Transfer, USSD</Text>
                </View>
                <Text style={PW.priceTag}>{fmt(ngnPlans.find(p=>p.id===plan)!.ngn, "NGN")}</Text>
              </TouchableOpacity>
            )}

            {/* Flutterwave — all currencies */}
            <TouchableOpacity style={PW.flutterwaveBtn} onPress={() => pay("flutterwave")} activeOpacity={0.85}>
              <View style={[PW.gwDot, { backgroundColor: "#f5a623" }]} />
              <View style={{ flex: 1 }}>
                <Text style={PW.gatewayTitle}>Pay with Flutterwave</Text>
                <Text style={PW.gatewaySubtitle}>
                  {currency === "NGN" ? "Cards, Bank, Mobile Money" : `Cards & Bank · ${currency}`}
                </Text>
              </View>
              <Text style={PW.priceTag}>{fmt(ngnPlans.find(p=>p.id===plan)!.ngn, currency)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={PW.fullPageBtn}
              onPress={() => { onClose(); router.push("/paywall"); }} activeOpacity={0.8}>
              <Text style={PW.fullPageTxt}>See all plans & currencies →</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const PW = StyleSheet.create({
  overlay:        {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: "center",
  },
  // ── KEY FIX: close button is in the overlay (zIndex 999), not inside the sheet ──
  closeBtn:       {
    position: "absolute",
    top: Platform.OS === "web" ? 24 : 54,
    right: 18,
    zIndex: 999,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(20,0,44,0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(171,139,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet:          {
    backgroundColor: "#150030",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(171,139,255,0.2)",
    width: "100%",
    maxHeight: "88%",
  },
  sheetWeb:       {
    borderRadius: 24,
    maxWidth: 560,
    maxHeight: "90%",
  },
  scrollContent:  { padding: 24, paddingBottom: 44, alignItems: "center" },
  iconWrap:       { width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 12 },
  title:          { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  sub:            { color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 16 },
  featureRow:     { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", marginBottom: 7, paddingHorizontal: 4 },
  featureTxt:     { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },
  planToggle:     { flexDirection: "row", gap: 10, width: "100%", marginTop: 14, marginBottom: 10 },
  planChip:       { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)", padding: 12, alignItems: "center", gap: 3 },
  planChipActive: { borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.1)" },
  planChipTxt:    { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  planChipPrice:  { color: "rgba(255,255,255,0.9)", fontSize: 18, fontWeight: "900" },
  saveBadge:      { backgroundColor: "rgba(74,222,128,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeTxt:   { color: "#4ade80", fontSize: 9, fontWeight: "800" },
  currencyRow:    { flexDirection: "row", gap: 6, marginBottom: 14, alignSelf: "flex-start" },
  currChip:       { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.04)" },
  currChipActive: { borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.12)" },
  currTxt:        { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "700" },
  paystackBtn:    { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(0,195,247,0.08)", borderWidth: 1, borderColor: "rgba(0,195,247,0.3)", borderRadius: 14, padding: 14, marginTop: 4 },
  flutterwaveBtn: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(245,166,35,0.08)", borderWidth: 1, borderColor: "rgba(245,166,35,0.3)", borderRadius: 14, padding: 14, marginTop: 10 },

  gwDot:          { width: 12, height: 12, borderRadius: 6 },
  gatewayTitle:   { color: "#fff", fontSize: 14, fontWeight: "800" },
  gatewaySubtitle:{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 },
  priceTag:       { color: "#AB8BFF", fontWeight: "900", fontSize: 16 },
  fullPageBtn:    { marginTop: 18, paddingVertical: 6 },
  fullPageTxt:    { color: "#AB8BFF", fontSize: 13, fontWeight: "700" },
});

// ── Stream player ─────────────────────────────────────────────────────────────
const VIDSRC = "https://vidsrc.to/embed/movie/";

const StreamPlayer = ({ movieId, playerH }: { movieId: number; playerH: number }) => {
  const url = `${VIDSRC}${movieId}`;
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamTimeout, setStreamTimeout] = useState(false);

  useEffect(() => {
    setStreamLoading(true); setStreamTimeout(false);
    const t = setTimeout(() => { setStreamTimeout(true); setStreamLoading(false); }, 9000);
    return () => clearTimeout(t);
  }, [movieId]);

  return (
    <View style={SP.wrap}>
      <View style={SP.bar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={SP.dot} /><Text style={SP.live}>STREAMING</Text>
        </View>
        <Text style={SP.liveSub}>Player</Text>
      </View>
      {Platform.OS === "web" ? (
        // @ts-ignore
        <iframe src={url} width="100%" height={playerH} frameBorder="0"
          allowFullScreen allow="autoplay; encrypted-media; fullscreen"
          onLoad={() => setStreamLoading(false)}
          style={{ display: "block", border: "none" }} />
      ) : (
        (() => {
          try {
            const { WebView } = require("react-native-webview");
            return (
              <WebView source={{ uri: url }} style={{ height: playerH }}
                allowsFullscreenVideo javaScriptEnabled domStorageEnabled
                mediaPlaybackRequiresUserAction={false}
                onLoadStart={() => setStreamLoading(true)}
                onLoadEnd={() => setStreamLoading(false)} />
            );
          } catch {
            return (
              <View style={[SP.fallback, { height: playerH }]}>
                <Ionicons name="play-circle-outline" size={48} color="#AB8BFF" />
                <Text style={SP.fallTxt}>Install react-native-webview</Text>
              </View>
            );
          }
        })()
      )}
      {streamLoading && (
        <View style={[SP.loadingOverlay, { height: playerH }]}>
          <ActivityIndicator size="large" color="#AB8BFF" />
          <Text style={SP.loadingTxt}>Loading stream...</Text>
        </View>
      )}
      {streamTimeout && (
        <TouchableOpacity style={SP.timeoutBanner} onPress={() => openUrl(url)} activeOpacity={0.85}>
          <Ionicons name="open-outline" size={14} color="#AB8BFF" />
          <Text style={SP.timeoutTxt}>Stream not loading? Open in new tab</Text>
        </TouchableOpacity>
      )}
      <View style={SP.disclaimer}>
        <Ionicons name="information-circle-outline" size={12} color="rgba(255,255,255,0.3)" />
        <Text style={SP.disclaimerTxt}>Streams from third-party services. Quality may vary.</Text>
      </View>
    </View>
  );
};

const SP = StyleSheet.create({
  wrap:           { backgroundColor: "#000", position: "relative" },
  bar:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "rgba(0,0,0,0.85)" },
  dot:            { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" },
  live:           { color: "#ef4444", fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  liveSub:        { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600" },
  fallback:       { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#0a0a0a" },
  fallTxt:        { color: "#fff", fontWeight: "700", fontSize: 14 },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 40, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(0,0,0,0.45)" },
  loadingTxt:     { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  timeoutBanner:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(15,15,18,0.95)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  timeoutTxt:     { color: "#AB8BFF", fontSize: 12, fontWeight: "700" },
  disclaimer:     { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: "rgba(0,0,0,0.6)" },
  disclaimerTxt:  { color: "rgba(255,255,255,0.25)", fontSize: 10, flex: 1, lineHeight: 14 },
});

const StatsGrid = ({ movie, width }: { movie: any; width: number }) => {
  const cols = width >= 768 ? 4 : width >= 600 ? 3 : 2;
  const cellW = (width - 40 - (cols - 1) * 10) / cols;
  const stats = [
    { label: "IMDB Rating", value: `${movie.vote_average?.toFixed(1) ?? "N/A"}/10`, accent: true },
    { label: "Votes",   value: movie.vote_count?.toLocaleString() ?? "N/A" },
    { label: "Runtime", value: fmtTime(movie.runtime) },
    { label: "Release", value: movie.release_date ?? "N/A" },
    { label: "Budget",  value: fmtMoney(movie.budget) },
    { label: "Revenue", value: fmtMoney(movie.revenue), accent: true },
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {stats.map(s => (
        <View key={s.label} style={[S.statCard, { width: cellW }]}>
          <Text style={S.statLabel}>{s.label}</Text>
          <Text style={[S.statValue, s.accent && { color: "#AB8BFF" }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
};

const CastGrid = ({ cast, width }: { cast: any[]; width: number }) => {
  const cols = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  const cellW = (width - 40 - (cols - 1) * 12) / cols;
  const photoW = Math.round(cellW * 0.65);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {cast.filter((a: any) => a.profile_path).map((actor: any) => (
        <View key={actor.id} style={{ width: cellW, alignItems: "center", marginBottom: 16 }}>
          <Image source={{ uri: TMDB_IMAGE(actor.profile_path, "w185") ?? "" }}
            style={{ width: photoW, height: photoW, borderRadius: 10, marginBottom: 6 }} resizeMode="cover" />
          <Text style={S.castName} numberOfLines={1}>{actor.name}</Text>
          <Text style={S.castChar} numberOfLines={1}>{actor.character}</Text>
        </View>
      ))}
    </View>
  );
};

const SimilarGrid = ({ movies, width }: { movies: any[]; width: number }) => {
  const cols = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  const cellW = (width - 40 - (cols - 1) * 12) / cols;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {movies.filter((m: any) => m.poster_path).slice(0, 12).map((sim: any) => (
        <TouchableOpacity key={sim.id} onPress={() => router.push(`/movies/${sim.id}`)} activeOpacity={0.85} style={{ width: cellW }}>
          <View>
            <Image source={{ uri: TMDB_IMAGE(sim.poster_path, "w342") ?? "" }}
              style={{ width: cellW, height: cellW * 1.5, borderRadius: 12, backgroundColor: "#1a1a2e" }} resizeMode="cover" />
            <View style={S.simBadge}>
              <Ionicons name="star" size={9} color="#f5c518" />
              <Text style={S.simRating}>{(sim.vote_average / 2).toFixed(1)}</Text>
            </View>
          </View>
          <Text style={S.simTitle} numberOfLines={1}>{sim.title}</Text>
          <Text style={S.simYear}>{sim.release_date?.split("-")[0]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const MovieDetails = () => {
  const { id }       = useLocalSearchParams();
  const { autoPlay } = useLocalSearchParams<{ autoPlay?: string }>();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [isSaved,     setIsSaved]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [playTrailer, setPlayTrailer] = useState(false);
  const [showStream,  setShowStream]  = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTab,   setActiveTab]   = useState<"info"|"cast"|"similar">("info");

  const { data: movie, loading } = useFetch(() => fetchMovieDetails(id as string));

  const isOwner      = OWNER_EMAILS.includes((user?.email ?? "").toLowerCase().trim());
  const isSubscribed = isOwner || user?.prefs?.subscribed === true;

  const isTablet = width >= 768;
  const playerW  = Math.min(width - (isTablet ? 52 : 14), 1180);
  const playerH  = Math.min(height * 0.72, isTablet ? 760 : 560);
  const closeTop = Math.max(insets.top + (isTablet ? 12 : 6), isTablet ? 24 : 8);

  useEffect(() => {
    if (movie && isLoggedIn && user?.$id)
      checkIsSaved(user.$id, movie.id).then(setIsSaved).catch(() => {});
  }, [movie?.id, isLoggedIn, user?.$id]);

  useEffect(() => {
    if (!authLoading && isSubscribed && autoPlay === "true" && movie)
      setShowStream(true);
  }, [authLoading, isSubscribed, autoPlay, movie?.id]);

  const handleWatch = () => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.push(`/(auth)/sign-in?returnTo=${encodeURIComponent(`/movies/${id}`)}&autoPlay=true` as any);
      return;
    }
    if (isSubscribed) { setShowStream(p => !p); return; }
    setShowPaywall(true);
  };

  const handleSave = async () => {
    if (!movie || authLoading) return;
    if (!isLoggedIn || !user?.$id) {
      Alert.alert("Sign in required", "Create a free account to save movies.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push(`/(auth)/sign-in?returnTo=${encodeURIComponent(`/movies/${id}`)}` as any) },
        { text: "Sign Up", onPress: () => router.push(`/(auth)/sign-up?returnTo=${encodeURIComponent(`/movies/${id}`)}` as any) },
      ]);
      return;
    }
    if (saving) return;
    setSaving(true);
    const next = await toggleWatchlist(user.$id, movie);
    setSaving(false);
    setIsSaved(next);
    toast.success(next ? "Saved to watchlist 🎬" : "Removed from watchlist");
  };

  if (loading || !movie) {
    return (
      <View style={S.loaderWrap}>
        <ActivityIndicator size="large" color="#AB8BFF" />
        <Text style={S.loaderTxt}>Loading movie...</Text>
      </View>
    );
  }

  const trailer  = movie.videos?.find((v: any) => v.site === "YouTube" && v.type === "Trailer");
  const director = movie.crew?.find((c: any) => c.job === "Director");

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)}
        userEmail={user?.email ?? ""} userId={user?.$id ?? ""} userName={user?.name ?? ""} />

      {/* Trailer Modal */}
      <Modal visible={playTrailer} transparent animationType="fade" statusBarTranslucent>
        <View style={S.modalBg}>
          <TouchableOpacity style={S.modalClose} onPress={() => setPlayTrailer(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          {trailer ? (
            Platform.OS !== "web" ? (
              (() => {
                try {
                  const YT = require("react-native-youtube-iframe").default;
                  return <YT height={300} width={width} play videoId={trailer.key}
                    onChangeState={(e: string) => e === "ended" && setPlayTrailer(false)} />;
                } catch {
                  return <View style={S.noTrailer}><Text style={S.noTrailerTxt}>Install react-native-youtube-iframe</Text></View>;
                }
              })()
            ) : (
              <View style={{ width: "100%", maxWidth: 800, height: 450 }}>
                {/* @ts-ignore */}
                <iframe width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                  frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: 12 }} />
              </View>
            )
          ) : (
            <View style={S.noTrailer}>
              <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={S.noTrailerTxt}>No Trailer Available</Text>
              <TouchableOpacity onPress={() => setPlayTrailer(false)} style={S.noTrailerBtn}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Stream Modal */}
      <Modal visible={showStream && isSubscribed} transparent animationType="fade" statusBarTranslucent>
        <View style={S.modalBg}>
          <TouchableOpacity style={[S.streamCloseEdge, { top: closeTop }]} onPress={() => setShowStream(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={[S.streamModalShell, { width: playerW, maxWidth: playerW }]}>
            <StreamPlayer movieId={movie.id} playerH={playerH} />
          </View>
        </View>
      </Modal>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}
        style={S.scrollView} contentContainerStyle={S.scrollContent}>

        <View style={{ height: 480 }}>
          <ImageBackground
            source={{ uri: `https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path}` }}
            style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.3)","rgba(0,0,0,0.05)","#0f0f12"]}
            locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={["top"]}>
            <View style={S.heroNav}>
              <TouchableOpacity style={S.navBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              {isSaved && (
                <View style={S.savedBadge}>
                  <Ionicons name="bookmark" size={13} color="#AB8BFF" />
                  <Text style={S.savedBadgeTxt}>Saved</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
          <View style={S.heroBottom}>
            <View style={S.heroContent}>
              <Image source={{ uri: TMDB_IMAGE(movie.poster_path, "w342") ?? "" }}
                style={S.poster} resizeMode="cover" />
              <View style={S.heroInfo}>
                <Text style={S.heroTitle} numberOfLines={3}>{movie.title}</Text>
                {!!movie.tagline && <Text style={S.heroTagline} numberOfLines={2}>"{movie.tagline}"</Text>}
                <View style={S.heroMeta}>
                  <Stars rating={movie.vote_average} />
                  <Text style={S.heroRating}>{(movie.vote_average / 2).toFixed(1)}/5</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {movie.release_date && <Text style={S.metaChip}>{movie.release_date.split("-")[0]}</Text>}
                  {movie.runtime > 0  && <Text style={S.metaChip}>{fmtTime(movie.runtime)}</Text>}
                  {movie.original_language && <Text style={S.metaChip}>{movie.original_language.toUpperCase()}</Text>}
                </View>
              </View>
            </View>
            <View style={S.ctaRow}>
              <TouchableOpacity style={S.watchBtn} onPress={handleWatch} activeOpacity={0.85}>
                <LinearGradient
                  colors={showStream ? ["#ef4444","#dc2626"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
                  start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={S.watchBtnIn}>
                  {authLoading
                    ? <ActivityIndicator size="small" color="#0f0f12" />
                    : <>
                        <Ionicons name={showStream ? "stop-circle" : isSubscribed ? "play" : "diamond-outline"} size={17} color="#0f0f12" />
                        <Text style={S.watchBtnTxt}>
                          {showStream ? "Close Player" : !isLoggedIn ? "Sign In to Watch" : isSubscribed ? "Watch Movie" : "Subscribe to Watch"}
                        </Text>
                      </>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={S.trailerBtn} onPress={() => setPlayTrailer(true)} activeOpacity={0.85}>
                <Ionicons name="film-outline" size={17} color="#fff" />
                <Text style={S.trailerBtnTxt}>Trailer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.saveBtn, isSaved && S.saveBtnActive]}
                onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator size="small" color="#AB8BFF" />
                  : <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20}
                      color={isSaved ? "#AB8BFF" : "#fff"} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!authLoading && isLoggedIn && !isSubscribed && (
          <TouchableOpacity style={S.subscribeBar} onPress={() => setShowPaywall(true)} activeOpacity={0.85}>
            <Ionicons name="diamond-outline" size={14} color="#AB8BFF" />
            <Text style={S.subscribeBarTxt}>Subscribe for ₦1,600/month to stream all movies</Text>
            <Text style={S.subscribeBarCta}>Subscribe →</Text>
          </TouchableOpacity>
        )}
        {!authLoading && !isLoggedIn && (
          <TouchableOpacity style={S.signInBar} onPress={() => router.push(
            `/(auth)/sign-in?returnTo=${encodeURIComponent(`/movies/${id}`)}&autoPlay=true` as any)}>
            <Ionicons name="lock-closed-outline" size={14} color="#AB8BFF" />
            <Text style={S.signInBarTxt}>Sign in and subscribe to watch movies</Text>
            <Text style={S.signInBarCta}>Sign In →</Text>
          </TouchableOpacity>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genreRow}>
          {movie.genres?.map((g: any) => (
            <View key={g.id} style={S.genrePill}><Text style={S.genrePillTxt}>{g.name}</Text></View>
          ))}
        </ScrollView>

        <View style={S.tabs}>
          {(["info","cast","similar"] as const).map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
              style={[S.tab, activeTab === tab && S.tabActive]}>
              <Text style={[S.tabTxt, activeTab === tab && S.tabTxtActive]}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "info" && (
          <View style={S.section}>
            <Text style={S.secTitle}>Overview</Text>
            <Text style={S.overview}>{movie.overview || "No overview available."}</Text>
            {director && (
              <>
                <Text style={S.secTitle}>Director</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Image source={{ uri: TMDB_IMAGE(director.profile_path, "w185") ?? "https://placehold.co/44x44/1a1a2e/fff" }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#1a1a2e" }} />
                  <View>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{director.name}</Text>
                    <Text style={{ color: "#AB8BFF", fontSize: 12, fontWeight: "600", marginTop: 2 }}>Director</Text>
                  </View>
                </View>
              </>
            )}
            <Text style={S.secTitle}>Movie Facts</Text>
            <StatsGrid movie={movie} width={width} />
            <View style={S.statusRow}>
              <View style={S.statusDot} />
              <Text style={S.statusTxt}>{movie.status}</Text>
              {movie.spoken_languages?.[0] && (
                <><Text style={{ color: "rgba(255,255,255,0.2)" }}>·</Text>
                  <Text style={S.statusTxt}>{movie.spoken_languages[0].english_name}</Text></>
              )}
            </View>
            {movie.production_companies?.length > 0 && (
              <>
                <Text style={S.secTitle}>Production</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {movie.production_companies.filter((c: any) => c.name).slice(0, 5).map((c: any) => (
                    <View key={c.id} style={S.prodChip}><Text style={S.prodChipTxt}>{c.name}</Text></View>
                  ))}
                </View>
              </>
            )}
            {movie.reviews?.length > 0 && (
              <>
                <Text style={S.secTitle}>Reviews</Text>
                {movie.reviews.slice(0, 2).map((r: any) => (
                  <View key={r.id} style={S.reviewCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <View style={S.reviewAvatar}><Text style={S.reviewAvatarTxt}>{r.author?.[0]?.toUpperCase() ?? "?"}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13, marginBottom: 3 }}>{r.author}</Text>
                        {r.author_details?.rating && <Stars rating={r.author_details.rating} />}
                      </View>
                    </View>
                    <Text style={S.reviewTxt} numberOfLines={4}>{r.content}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === "cast" && (
          <View style={S.section}>
            <Text style={S.secTitle}>Cast</Text>
            <CastGrid cast={movie.cast ?? []} width={width} />
            {movie.crew?.length > 0 && (
              <>
                <Text style={S.secTitle}>Key Crew</Text>
                {movie.crew.slice(0, 6).map((c: any, i: number) => (
                  <View key={`${c.id}-${i}`} style={S.crewRow}>
                    <View style={S.crewBadge}><Text style={S.crewJob}>{c.job}</Text></View>
                    <Text style={S.crewName}>{c.name}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === "similar" && (
          <View style={S.section}>
            <Text style={S.secTitle}>More Like This</Text>
            <SimilarGrid movies={movie.similar ?? []} width={width} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MovieDetails;

const S = StyleSheet.create({
  root:             { flex: 1, backgroundColor: "#0f0f12" },
  scrollView:       { flex: 1, backgroundColor: "#0f0f12" },
  scrollContent:    { paddingBottom: 90 },
  loaderWrap:       { flex: 1, backgroundColor: "#0f0f12", justifyContent: "center", alignItems: "center", gap: 12 },
  loaderTxt:        { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  modalBg:          { flex: 1, backgroundColor: "rgba(0,0,0,0.97)", justifyContent: "center", alignItems: "center" },
  streamModalShell: { width: "100%", maxWidth: 1180 },
  streamCloseEdge:  { position: "absolute", top: 6, right: 6, zIndex: 20, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,15,18,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  modalClose:       { position: "absolute", top: 56, right: 20, zIndex: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  noTrailer:        { alignItems: "center", gap: 16, paddingHorizontal: 32 },
  noTrailerTxt:     { color: "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: "600", textAlign: "center" },
  noTrailerBtn:     { backgroundColor: "#AB8BFF", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  heroNav:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8 },
  navBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  savedBadge:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(171,139,255,0.15)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(171,139,255,0.3)", paddingHorizontal: 12, paddingVertical: 5 },
  savedBadgeTxt:    { color: "#AB8BFF", fontWeight: "800", fontSize: 12 },
  heroBottom:       { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  heroContent:      { flexDirection: "row", gap: 14, marginBottom: 14 },
  poster:           { width: 88, height: 130, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)" },
  heroInfo:         { flex: 1, justifyContent: "flex-end" },
  heroTitle:        { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: -0.3, lineHeight: 25 },
  heroTagline:      { color: "rgba(255,255,255,0.4)", fontSize: 11, fontStyle: "italic", marginTop: 4 },
  heroMeta:         { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  heroRating:       { color: "#f5c518", fontSize: 12, fontWeight: "800" },
  metaChip:         { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600" },
  ctaRow:           { flexDirection: "row", gap: 10 },
  watchBtn:         { flex: 1, borderRadius: 12, overflow: "hidden" },
  watchBtnIn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  watchBtnTxt:      { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
  trailerBtn:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  trailerBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 13 },
  saveBtn:          { width: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  saveBtnActive:    { backgroundColor: "rgba(171,139,255,0.15)", borderColor: "rgba(171,139,255,0.5)" },
  subscribeBar:     { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 12, backgroundColor: "rgba(171,139,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(171,139,255,0.15)", padding: 12 },
  subscribeBarTxt:  { flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 12 },
  subscribeBarCta:  { color: "#AB8BFF", fontWeight: "800", fontSize: 12 },
  signInBar:        { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 12, backgroundColor: "rgba(171,139,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(171,139,255,0.15)", padding: 12 },
  signInBarTxt:     { flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 13 },
  signInBarCta:     { color: "#AB8BFF", fontWeight: "800", fontSize: 13 },
  genreRow:         { paddingHorizontal: 20, gap: 8, paddingVertical: 14 },
  genrePill:        { backgroundColor: "rgba(171,139,255,0.12)", borderWidth: 1, borderColor: "rgba(171,139,255,0.25)", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6 },
  genrePillTxt:     { color: "#AB8BFF", fontSize: 12, fontWeight: "700" },
  tabs:             { flexDirection: "row", marginHorizontal: 20, marginBottom: 4, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 },
  tab:              { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 9 },
  tabActive:        { backgroundColor: "rgba(171,139,255,0.2)" },
  tabTxt:           { color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: "700" },
  tabTxtActive:     { color: "#AB8BFF" },
  section:          { paddingHorizontal: 20, paddingTop: 4 },
  secTitle:         { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: -0.3, marginTop: 22, marginBottom: 10 },
  overview:         { color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 22 },
  statCard:         { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, marginBottom: 10 },
  statLabel:        { color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  statValue:        { color: "#fff", fontSize: 14, fontWeight: "800" },
  statusRow:        { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  statusDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  statusTxt:        { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },
  prodChip:         { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  prodChipTxt:      { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600" },
  reviewCard:       { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  reviewAvatar:     { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(171,139,255,0.2)", alignItems: "center", justifyContent: "center" },
  reviewAvatarTxt:  { color: "#AB8BFF", fontWeight: "900", fontSize: 15 },
  reviewTxt:        { color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 20 },
  castName:         { color: "#e2e2e2", fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 2 },
  castChar:         { color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center", marginTop: 2 },
  crewRow:          { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  crewBadge:        { backgroundColor: "rgba(171,139,255,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  crewJob:          { color: "#AB8BFF", fontSize: 11, fontWeight: "700" },
  crewName:         { color: "#fff", fontSize: 14, fontWeight: "600" },
  simBadge:         { position: "absolute", top: 7, left: 7, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  simRating:        { color: "#f5c518", fontSize: 10, fontWeight: "800" },
  simTitle:         { color: "#e2e2e2", fontSize: 11, fontWeight: "700", marginTop: 6 },
  simYear:          { color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 },
});