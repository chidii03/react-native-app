import React, { useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Linking, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

const PLANS = [
  { id: "monthly", label: "Monthly", usd: 4.99, per: "/month", savings: null, popular: false },
  { id: "yearly", label: "Yearly", usd: 29.99, per: "/year", savings: "Save 50%", popular: true },
];

const FX: Record<string, number> = {
  USD: 1,
  NGN: 1600,
  EUR: 0.93,
  GBP: 0.79,
};

const CURRENCIES = ["USD", "NGN", "EUR", "GBP"] as const;

const GATEWAYS = [
  {
    id: "flutterwave",
    title: "Flutterwave",
    env: "EXPO_PUBLIC_FLUTTERWAVE_CHECKOUT_URL",
    website: "https://dashboard.flutterwave.com",
    note: "Good for African + international cards and multiple currencies.",
  },
  {
    id: "paystack",
    title: "Paystack",
    env: "EXPO_PUBLIC_PAYSTACK_CHECKOUT_URL",
    website: "https://dashboard.paystack.com",
    note: "Simple setup for cards and bank channels in supported markets.",
  },
  {
    id: "stripe",
    title: "Stripe",
    env: "EXPO_PUBLIC_STRIPE_PAYMENT_LINK",
    website: "https://dashboard.stripe.com",
    note: "Global coverage with hosted payment links and subscriptions.",
  },
] as const;

const PERKS = [
  { icon: "bookmark", text: "Unlimited watchlist" },
  { icon: "notifications", text: "New release alerts" },
  { icon: "eye-off-outline", text: "Ad-free experience" },
  { icon: "star", text: "Exclusive ratings & reviews" },
  { icon: "cloud-download-outline", text: "Offline watchlist sync" },
];

export default function Paywall() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [selectedCurrency, setSelectedCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
  const [selectedGateway, setSelectedGateway] = useState<(typeof GATEWAYS)[number]["id"]>("flutterwave");

  const plans = useMemo(
    () =>
      PLANS.map((plan) => {
        const amount = plan.usd * FX[selectedCurrency];
        const rounded = selectedCurrency === "NGN" ? Math.round(amount) : Number(amount.toFixed(2));
        return {
          ...plan,
          price: new Intl.NumberFormat("en", {
            style: "currency",
            currency: selectedCurrency,
            maximumFractionDigits: selectedCurrency === "NGN" ? 0 : 2,
          }).format(rounded),
        };
      }),
    [selectedCurrency]
  );

  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      router.push("/(auth)/sign-in");
      return;
    }

    const gateway = GATEWAYS.find((g) => g.id === selectedGateway);
    if (!gateway) return;

    const base = String(process.env[gateway.env] ?? "").trim();
    if (!base) {
      Alert.alert(
        "Checkout link missing",
        `Set ${gateway.env} in your .env with your hosted payment link.`
      );
      return;
    }

    const separator = base.includes("?") ? "&" : "?";
    const checkoutUrl =
      `${base}${separator}plan=${encodeURIComponent(selectedPlan)}` +
      `&currency=${encodeURIComponent(selectedCurrency)}` +
      `&uid=${encodeURIComponent(String(user?.$id ?? ""))}` +
      `&email=${encodeURIComponent(String(user?.email ?? ""))}`;

    try {
      await Linking.openURL(checkoutUrl);
    } catch (e: any) {
      Alert.alert("Unable to open checkout", e?.message ?? "Please try again.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#12003a", "#1a0533", "#0f0f12"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={{ width: 36 }} />
            <View style={styles.logoRow}>
              <Ionicons name="film" size={22} color="#AB8BFF" />
              <Text style={styles.logoText}>MOVIE<Text style={{ color: "#AB8BFF" }}>TIME</Text></Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.expiredBadge}>
            <Ionicons name="time-outline" size={14} color="#f59e0b" />
            <Text style={styles.expiredText}>Your free trial has ended</Text>
          </View>

          <Text style={styles.headline}>Unlock Full Access</Text>
          <Text style={styles.subheadline}>
            Choose your currency and payment provider, then complete checkout securely.
          </Text>

          <View style={styles.currencyRow}>
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency}
                onPress={() => setSelectedCurrency(currency)}
                style={[styles.currencyChip, selectedCurrency === currency && styles.currencyChipActive]}
              >
                <Text style={[styles.currencyTxt, selectedCurrency === currency && styles.currencyTxtActive]}>
                  {currency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.perksBox}>
            {PERKS.map((p) => (
              <View key={p.text} style={styles.perkRow}>
                <View style={styles.perkIcon}>
                  <Ionicons name={p.icon as any} size={16} color="#AB8BFF" />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planRow}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
                activeOpacity={0.85}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>BEST VALUE</Text>
                  </View>
                )}
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPer}>{plan.per}</Text>
                {plan.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>{plan.savings}</Text>
                  </View>
                )}
                {selectedPlan === plan.id && (
                  <View style={styles.checkMark}>
                    <Ionicons name="checkmark-circle" size={20} color="#AB8BFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.gatewayLabel}>Payment Gateway</Text>
          <View style={styles.gatewayBox}>
            {GATEWAYS.map((gateway) => (
              <TouchableOpacity
                key={gateway.id}
                style={[styles.gatewayRow, selectedGateway === gateway.id && styles.gatewayRowActive]}
                onPress={() => setSelectedGateway(gateway.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.gatewayTitle}>{gateway.title}</Text>
                  <Text style={styles.gatewayNote}>{gateway.note}</Text>
                  <Text style={styles.gatewaySite}>{gateway.website}</Text>
                </View>
                <Ionicons
                  name={selectedGateway === gateway.id ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={selectedGateway === gateway.id ? "#AB8BFF" : "rgba(255,255,255,0.35)"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.ctaBtn} onPress={handleSubscribe} activeOpacity={0.88}>
            <LinearGradient
              colors={["#c4a8ff", "#AB8BFF", "#7c3aed"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaBtnGradient}
            >
              <Ionicons name="diamond" size={18} color="#0f0f12" />
              <Text style={styles.ctaBtnText}>
                {isLoggedIn ? "Continue to Checkout" : "Sign In to Subscribe"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.cancelNote}>
            No monthly platform fee from these gateways. Standard transaction fees still apply.
          </Text>

          <Text style={styles.legalText}>
            Use hosted checkout/payment links from your gateway dashboard so API secret keys stay on the server side.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f12" },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "900", fontStyle: "italic" },
  expiredBadge: {
    flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "center",
    backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 24,
  },
  expiredText: { color: "#f59e0b", fontSize: 13, fontWeight: "700" },
  headline: { color: "#fff", fontSize: 30, fontWeight: "900", textAlign: "center", letterSpacing: -0.5, marginBottom: 10 },
  subheadline: { color: "rgba(255,255,255,0.45)", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 18 },
  currencyRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  currencyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  currencyChipActive: { borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.15)" },
  currencyTxt: { color: "rgba(255,255,255,0.55)", fontWeight: "700", fontSize: 12 },
  currencyTxtActive: { color: "#AB8BFF" },
  perksBox: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    padding: 18, marginBottom: 24, gap: 14,
  },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  perkIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(171,139,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  perkText: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" },
  planRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  planCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 18,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)",
    padding: 16, alignItems: "center", gap: 4, overflow: "hidden",
  },
  planCardActive: {
    borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.1)",
    shadowColor: "#AB8BFF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8,
  },
  popularBadge: {
    backgroundColor: "#AB8BFF", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
  },
  popularText: { color: "#0f0f12", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  planLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  planPrice: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 4, textAlign: "center" },
  planPer: { color: "rgba(255,255,255,0.35)", fontSize: 12 },
  savingsBadge: {
    backgroundColor: "rgba(74,222,128,0.15)", borderWidth: 1, borderColor: "rgba(74,222,128,0.3)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  savingsText: { color: "#4ade80", fontSize: 11, fontWeight: "800" },
  checkMark: { position: "absolute", top: 10, right: 10 },
  gatewayLabel: { color: "rgba(255,255,255,0.5)", fontWeight: "800", fontSize: 12, marginBottom: 8 },
  gatewayBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
    overflow: "hidden",
  },
  gatewayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  gatewayRowActive: { backgroundColor: "rgba(171,139,255,0.12)" },
  gatewayTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  gatewayNote: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 },
  gatewaySite: { color: "#AB8BFF", fontSize: 12, marginTop: 4, fontWeight: "700" },
  ctaBtn: { borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  ctaBtnGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 17,
  },
  ctaBtnText: { color: "#0f0f12", fontWeight: "900", fontSize: 17 },
  cancelNote: { color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", marginBottom: 12 },
  legalText: { color: "rgba(255,255,255,0.15)", fontSize: 11, textAlign: "center", lineHeight: 16 },
});
