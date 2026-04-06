// app/paywall.tsx
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

const OWNER_EMAILS = ["chidiokwu795@gmail.com"];

// ── Payment links ─────────────────────────────────────────────────────────────
// To add yearly Paystack: create a ₦12,800 page in paystack dashboard → paste URL below
// Flutterwave handles USD, EUR, GBP — add env vars EXPO_PUBLIC_FLW_USD_MONTHLY etc. in Vercel
const PAYMENT_LINKS = {
  paystack: {
    monthly: "https://paystack.shop/pay/u-e7b46zzv",
    yearly:  "https://paystack.shop/pay/mkghesxsg2",
  },
  flutterwave: {
    // NGN
    monthly_ngn: "https://flutterwave.com/pay/nbzc1l6pb4gn",
    yearly_ngn:  "https://flutterwave.com/pay/cbcapoz0v5gk",
    // USD — create at dashboard.flutterwave.com → Payment Links → currency: USD
    // Monthly: $1.00  |  Yearly: $8.00
    monthly_usd: process.env.EXPO_PUBLIC_FLW_USD_MONTHLY ?? "",
    yearly_usd:  process.env.EXPO_PUBLIC_FLW_USD_YEARLY  ?? "",
    // EUR — Monthly: €0.93  |  Yearly: €7.44
    monthly_eur: process.env.EXPO_PUBLIC_FLW_EUR_MONTHLY ?? "",
    yearly_eur:  process.env.EXPO_PUBLIC_FLW_EUR_YEARLY  ?? "",
    // GBP — Monthly: £0.79  |  Yearly: £6.32
    monthly_gbp: process.env.EXPO_PUBLIC_FLW_GBP_MONTHLY ?? "",
    yearly_gbp:  process.env.EXPO_PUBLIC_FLW_GBP_YEARLY  ?? "",
    // CAD — Monthly: CA$1.36  |  Yearly: CA$10.88
    monthly_cad: process.env.EXPO_PUBLIC_FLW_CAD_MONTHLY ?? "",
    yearly_cad:  process.env.EXPO_PUBLIC_FLW_CAD_YEARLY  ?? "",
  },
};

const getFLWUrl = (plan: PlanId, currency: string): string => {
  const key = currency === "NGN"
    ? `${plan}_ngn`
    : `${plan}_${currency.toLowerCase()}`;
  return (PAYMENT_LINKS.flutterwave as any)[key] ?? "";
};

const NGN_TO: Record<string, number> = {
  NGN: 1, USD: 1 / 1600, EUR: 1 / 1720, GBP: 1 / 2025, CAD: 1 / 1175,
};
const SYM: Record<string, string> = {
  NGN: "₦", USD: "$", EUR: "€", GBP: "£", CAD: "CA$",
};
const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "CAD"] as const;

const PLANS = [
  { id: "monthly", label: "Monthly", ngn: 1600,  per: "/month", savings: null,       popular: false },
  { id: "yearly",  label: "Yearly",  ngn: 12800, per: "/year",  savings: "Save 33%", popular: true  },
] as const;

type PlanId    = "monthly" | "yearly";
type GatewayId = "paystack" | "flutterwave";

const GATEWAYS: { id: GatewayId; title: string; subtitle: string; color: string; currencies: string[] }[] = [
  { id: "paystack",    title: "Paystack",    subtitle: "Cards, Bank Transfer, USSD",   color: "#00c3f7", currencies: ["NGN"] },
  { id: "flutterwave", title: "Flutterwave", subtitle: "Cards, Bank, Mobile Money — All currencies", color: "#f5a623", currencies: ["NGN","USD","EUR","GBP"] },
];

const PERKS = [
  { icon: "play-circle",            text: "Unlimited movie streaming" },
  { icon: "bookmark",               text: "Unlimited watchlist" },
  { icon: "notifications",          text: "New release alerts" },
  { icon: "eye-off-outline",        text: "Ad-free experience" },
  { icon: "star",                   text: "Exclusive ratings & reviews" },
  { icon: "cloud-download-outline", text: "Offline watchlist sync" },
];

const fmt = (ngn: number, cur: string) => {
  const n = ngn * NGN_TO[cur];
  return cur === "NGN" ? `${SYM[cur]}${n.toLocaleString()}` : `${SYM[cur]}${n.toFixed(2)}`;
};

// ── Open URL — works on web AND mobile ───────────────────────────────────────
const openUrl = (url: string) => {
  if (!url) return;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank");
  } else {
    const { Linking } = require("react-native");
    Linking.openURL(url).catch(() => {});
  }
};

export default function Paywall() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();

  const [plan,     setPlan]     = useState<PlanId>("yearly");
  const [currency, setCurrency] = useState<typeof CURRENCIES[number]>("NGN");
  const [gateway,  setGateway]  = useState<GatewayId>("paystack");

  const isOwner = OWNER_EMAILS.includes((user?.email ?? "").toLowerCase().trim());

  const handleCurrencyChange = (c: typeof CURRENCIES[number]) => {
    setCurrency(c);
    if (c !== "NGN") setGateway("flutterwave");
    else setGateway("paystack");
  };

  const handleSubscribe = () => {
    if (!isLoggedIn) { router.push("/(auth)/sign-in"); return; }
    if (isOwner) {
      Alert.alert("Owner Account", "You have permanent free access.");
      router.back(); return;
    }

    const selectedPlan = PLANS.find(p => p.id === plan)!;
    const baseUrl = gateway === "paystack"
      ? PAYMENT_LINKS.paystack[plan]
      : getFLWUrl(plan, currency);
    const price        = fmt(selectedPlan.ngn, currency);

    if (!baseUrl) {
      Alert.alert("Payment link not set up yet", "Contact support or try another gateway.");
      return;
    }

    const params = new URLSearchParams({
      plan,
      uid:   user?.$id   ?? "",
      email: user?.email ?? "",
      name:  user?.name  ?? "",
    });
    const url = `${baseUrl}?${params.toString()}`;
    openUrl(url);
  };

  const activePlan = PLANS.find(p => p.id === plan)!;

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#12003a","#1a0533","#0f0f12"]} style={StyleSheet.absoluteFill} />
      {/* Bottom nav-bar background patch — kills white gap on Android */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, backgroundColor: "#0f0f12" }} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={S.headerRow}>
            <TouchableOpacity style={S.backBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={S.logoRow}>
              <Ionicons name="film" size={20} color="#AB8BFF" />
              <Text style={S.logoText}>MOVIE<Text style={{ color: "#AB8BFF" }}>TIME</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {isOwner && (
            <View style={S.ownerBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#4ade80" />
              <Text style={S.ownerTxt}>Owner account — Free permanent access</Text>
            </View>
          )}

          {/* Hero */}
          <View style={S.heroSection}>
            <LinearGradient colors={["rgba(171,139,255,0.2)","rgba(171,139,255,0.05)"]} style={S.heroIcon}>
              <Ionicons name="diamond" size={32} color="#AB8BFF" />
            </LinearGradient>
            <Text style={S.headline}>Unlock Full Access</Text>
            <Text style={S.subheadline}>
              Stream unlimited movies for just{"\n"}
              <Text style={{ color: "#AB8BFF", fontWeight: "900" }}>₦1,600/month</Text>
            </Text>
          </View>

          {/* Perks */}
          <View style={S.perksBox}>
            {PERKS.map(p => (
              <View key={p.text} style={S.perkRow}>
                <View style={S.perkIcon}>
                  <Ionicons name={p.icon as any} size={15} color="#AB8BFF" />
                </View>
                <Text style={S.perkText}>{p.text}</Text>
                <Ionicons name="checkmark" size={14} color="#4ade80" />
              </View>
            ))}
          </View>

          {/* Currency */}
          <Text style={S.sectionLabel}>SELECT CURRENCY</Text>
          <View style={S.currencyRow}>
            {CURRENCIES.map(c => (
              <TouchableOpacity key={c} onPress={() => handleCurrencyChange(c)}
                style={[S.currencyChip, currency === c && S.currencyChipActive]} activeOpacity={0.8}>
                <Text style={[S.currencyTxt, currency === c && S.currencyTxtActive]}>
                  {SYM[c]}{c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Plans */}
          <Text style={S.sectionLabel}>SELECT PLAN</Text>
          <View style={S.planRow}>
            {PLANS.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setPlan(p.id)}
                style={[S.planCard, plan === p.id && S.planCardActive]} activeOpacity={0.85}>
                {p.popular && (
                  <View style={S.popularBadge}><Text style={S.popularText}>BEST VALUE</Text></View>
                )}
                {plan === p.id && (
                  <View style={S.checkMark}>
                    <Ionicons name="checkmark-circle" size={18} color="#AB8BFF" />
                  </View>
                )}
                <Text style={S.planLabel}>{p.label}</Text>
                <Text style={S.planPrice}>{fmt(p.ngn, currency)}</Text>
                <Text style={S.planPer}>{p.per}</Text>
                {p.savings && (
                  <View style={S.savingsBadge}><Text style={S.savingsText}>{p.savings}</Text></View>
                )}
                {currency !== "NGN" && (
                  <Text style={S.ngnNote}>≈ ₦{p.ngn.toLocaleString()}{p.per}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment gateway */}
          <Text style={S.sectionLabel}>PAYMENT METHOD</Text>
          <View style={S.gatewayBox}>
            {GATEWAYS.map((g, idx) => {
              const isDisabled = g.id === "paystack" && currency !== "NGN";
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    S.gatewayRow,
                    gateway === g.id && S.gatewayRowActive,
                    isDisabled && { opacity: 0.3 },
                    idx === GATEWAYS.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => !isDisabled && setGateway(g.id)}
                  activeOpacity={isDisabled ? 1 : 0.8}>
                  <View style={[S.gatewayDot, { backgroundColor: g.color + "22" }]}>
                    <View style={[S.gatewayDotInner, { backgroundColor: g.color }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={S.gatewayTitle}>{g.title}</Text>
                      {g.id === "flutterwave" && currency !== "NGN" && (
                        <View style={S.stripeBadge}>
                          <Text style={S.stripeBadgeTxt}>{currency}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={S.gatewaySubtitle}>{g.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={gateway === g.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={gateway === g.id ? "#AB8BFF" : "rgba(255,255,255,0.25)"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA — directly opens payment page, no Alert */}
          <TouchableOpacity style={S.ctaBtn} onPress={handleSubscribe} activeOpacity={0.88}>
            <LinearGradient
              colors={isOwner ? ["#4ade80","#22c55e"] : ["#c4a8ff","#AB8BFF","#7c3aed"]}
              start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={S.ctaBtnGradient}>
              <Ionicons name={isOwner ? "shield-checkmark" : "diamond"} size={18} color="#0f0f12" />
              <Text style={S.ctaBtnText}>
                {isOwner
                  ? "Owner — Free Access"
                  : isLoggedIn
                    ? `Subscribe — ${fmt(activePlan.ngn, currency)}${activePlan.per}`
                    : "Sign In to Subscribe"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={S.cancelNote}>Cancel anytime. Managed by Chidi via admin panel.</Text>
          <Text style={S.legalText}>
            By subscribing you agree to MovieTime's Terms of Service.{"\n"}
            Payment processed securely by Paystack or Flutterwave.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const S = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#0f0f12", paddingBottom: 0 },
  scroll:            { flexGrow: 1, padding: 20, paddingBottom: 80 },
  headerRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  logoRow:           { flexDirection: "row", alignItems: "center", gap: 7 },
  logoText:          { color: "#fff", fontSize: 18, fontWeight: "900", fontStyle: "italic" },
  ownerBadge:        { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", backgroundColor: "rgba(74,222,128,0.1)", borderWidth: 1, borderColor: "rgba(74,222,128,0.3)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16 },
  ownerTxt:          { color: "#4ade80", fontSize: 13, fontWeight: "700" },
  heroSection:       { alignItems: "center", marginBottom: 24 },
  heroIcon:          { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  headline:          { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center", letterSpacing: -0.5, marginBottom: 8 },
  subheadline:       { color: "rgba(255,255,255,0.5)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  perksBox:          { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 16, marginBottom: 22, gap: 12 },
  perkRow:           { flexDirection: "row", alignItems: "center", gap: 12 },
  perkIcon:          { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.12)", alignItems: "center", justifyContent: "center" },
  perkText:          { flex: 1, color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" },
  sectionLabel:      { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 },
  currencyRow:       { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  currencyChip:      { borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.04)" },
  currencyChipActive:{ borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.15)" },
  currencyTxt:       { color: "rgba(255,255,255,0.5)", fontWeight: "700", fontSize: 13 },
  currencyTxtActive: { color: "#AB8BFF" },
  planRow:           { flexDirection: "row", gap: 12, marginBottom: 20 },
  planCard:          { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", padding: 16, alignItems: "center", gap: 4, overflow: "hidden", minHeight: 140 },
  planCardActive:    { borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.1)" },
  popularBadge:      { backgroundColor: "#AB8BFF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  popularText:       { color: "#0f0f12", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  checkMark:         { position: "absolute", top: 8, right: 8 },
  planLabel:         { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  planPrice:         { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4, textAlign: "center" },
  planPer:           { color: "rgba(255,255,255,0.35)", fontSize: 12 },
  savingsBadge:      { backgroundColor: "rgba(74,222,128,0.15)", borderWidth: 1, borderColor: "rgba(74,222,128,0.3)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  savingsText:       { color: "#4ade80", fontSize: 11, fontWeight: "800" },
  ngnNote:           { color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 2 },
  gatewayBox:        { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 22, overflow: "hidden" },
  gatewayRow:        { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  gatewayRowActive:  { backgroundColor: "rgba(171,139,255,0.08)" },
  gatewayDot:        { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  gatewayDotInner:   { width: 14, height: 14, borderRadius: 7 },
  gatewayTitle:      { color: "#fff", fontSize: 14, fontWeight: "800" },
  gatewaySubtitle:   { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 1 },
  stripeBadge:       { backgroundColor: "rgba(103,114,229,0.2)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stripeBadgeTxt:    { color: "#6772e5", fontSize: 9, fontWeight: "800" },
  ctaBtn:            { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  ctaBtnGradient:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17 },
  ctaBtnText:        { color: "#0f0f12", fontWeight: "900", fontSize: 16 },
  cancelNote:        { color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", marginBottom: 8 },
  legalText:         { color: "rgba(255,255,255,0.15)", fontSize: 11, textAlign: "center", lineHeight: 16 },
});