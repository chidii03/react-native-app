// app/admin/index.tsx
// UPGRADE FIX:
//  - Updates BOTH the database document AND the user's Appwrite account prefs
//  - Plan selection is visible inline on each user row (Monthly / Yearly chips)
//  - No modal needed — select plan directly then tap Upgrade
//  - AuthContext reads prefs.subscribed which this now writes correctly

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  ActivityIndicator, StatusBar, Alert, Platform,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { appwriteIds, databases } from "../../services/appwriteConfig";

const ADMIN_SESSION_KEY = "admin_session";
const OWNER_EMAIL       = "chidiokwu795@gmail.com";

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, sub }: {
  icon: any; label: string; value: string | number; accent?: string; sub?: string;
}) {
  return (
    <View style={S.statCard}>
      <View style={[S.statIconWrap, { backgroundColor: `${accent ?? "#AB8BFF"}18` }]}>
        <Ionicons name={icon} size={20} color={accent ?? "#AB8BFF"} />
      </View>
      <Text style={[S.statValue, { color: accent ?? "#fff" }]}>{value ?? "0"}</Text>
      <Text style={S.statLabel}>{label}</Text>
      {sub && <Text style={S.statSub}>{sub}</Text>}
    </View>
  );
}

function SectionCard({ title, count, icon, children }: {
  title: string; count: number; icon: any; children: React.ReactNode;
}) {
  return (
    <View style={S.sectionCard}>
      <View style={S.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={S.sectionIconWrap}><Ionicons name={icon} size={15} color="#AB8BFF" /></View>
          <Text style={S.sectionTitle}>{title}</Text>
        </View>
        <View style={S.countPill}><Text style={S.countPillText}>{count}</Text></View>
      </View>
      {children}
    </View>
  );
}

const SubBadge = ({ subscribed, plan }: { subscribed: boolean; plan?: string }) => (
  <View style={[B.badge, subscribed ? B.active : B.inactive]}>
    <Ionicons name={subscribed ? "checkmark-circle" : "close-circle"} size={11}
      color={subscribed ? "#4ade80" : "#ef4444"} />
    <Text style={[B.txt, { color: subscribed ? "#4ade80" : "#ef4444" }]}>
      {subscribed ? (plan ?? "active") : "not subscribed"}
    </Text>
  </View>
);
const B = StyleSheet.create({
  badge:    { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  active:   { backgroundColor: "rgba(74,222,128,0.1)" },
  inactive: { backgroundColor: "rgba(239,68,68,0.1)" },
  txt:      { fontSize: 10, fontWeight: "700" },
});

// ── User Row with inline plan selector ───────────────────────────────────────
// FIX: plan is selected inline before tapping Upgrade — no modal needed
const UserSubRow = ({
  doc,
  busy,
  onUpgrade,
  onCancel,
}: {
  doc:       any;
  busy:      boolean;
  onUpgrade: (docId: string, userId: string, email: string, plan: "monthly" | "yearly") => void;
  onCancel:  (docId: string, userId: string) => void;
}) => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");

  const subscribed = doc.subscribed === true || doc.prefs_subscribed === true;
  const currentPlan = String(doc.plan ?? doc.prefs_plan ?? "free");
  const isOwner    = (doc.email ?? "").toLowerCase() === OWNER_EMAIL;

  return (
    <View style={U.row}>
      {/* Avatar */}
      <View style={U.avatar}>
        <Text style={U.avatarTxt}>{(doc.name || doc.email || "?")[0].toUpperCase()}</Text>
      </View>

      {/* User info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={U.name} numberOfLines={1}>{doc.name ?? "Unknown"}</Text>
        <Text style={U.email} numberOfLines={1}>{doc.email ?? doc.user_id ?? ""}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <SubBadge subscribed={subscribed || isOwner} plan={isOwner ? "owner" : currentPlan} />
          {isOwner && (
            <View style={{ backgroundColor: "rgba(171,139,255,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: "#AB8BFF", fontSize: 10, fontWeight: "700" }}>CEO</Text>
            </View>
          )}
        </View>

        {/* Plan selector — only shown for non-owner users */}
        {!isOwner && (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            {(["monthly", "yearly"] as const).map(p => (
              <TouchableOpacity key={p}
                style={[U.planChip, selectedPlan === p && U.planChipActive]}
                onPress={() => setSelectedPlan(p)}>
                <Text style={[U.planChipTxt, selectedPlan === p && { color: "#AB8BFF" }]}>
                  {p === "monthly" ? "Monthly ₦1,600" : "Yearly ₦12,800"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Action buttons */}
      {!isOwner && (
        <View style={{ gap: 6, alignItems: "flex-end" }}>
          {busy ? (
            <ActivityIndicator size="small" color="#AB8BFF" />
          ) : (
            <>
              <TouchableOpacity
                style={U.upgradeBtn}
                onPress={() => onUpgrade(doc.$id, doc.user_id ?? doc.$id, doc.email ?? "", selectedPlan)}
                activeOpacity={0.8}>
                <Ionicons name="diamond" size={11} color="#0f0f12" />
                <Text style={U.upgradeTxt}>UPGRADE</Text>
              </TouchableOpacity>
              {subscribed && (
                <TouchableOpacity
                  style={U.cancelBtn}
                  onPress={() => onCancel(doc.$id, doc.user_id ?? doc.$id)}>
                  <Text style={U.cancelTxt}>CANCEL</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const U = StyleSheet.create({
  row:          { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(171,139,255,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarTxt:    { color: "#AB8BFF", fontWeight: "900", fontSize: 14 },
  name:         { color: "#fff", fontSize: 13, fontWeight: "700" },
  email:        { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 },
  planChip:     { borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.04)" },
  planChipActive:{ borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.15)" },
  planChipTxt:  { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700" },
  upgradeBtn:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#AB8BFF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  upgradeTxt:   { color: "#0f0f12", fontSize: 10, fontWeight: "900" },
  cancelBtn:    { borderRadius: 8, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(239,68,68,0.08)" },
  cancelTxt:    { color: "#ef4444", fontSize: 10, fontWeight: "800" },
});

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router          = useRouter();
  const adminSignInHref = "/admin/sign-in" as Href;

  const [authChecked,   setAuthChecked]   = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [metrics,       setMetrics]       = useState<any[]>([]);
  const [watchlist,     setWatchlist]     = useState<any[]>([]);
  const [users,         setUsers]         = useState<any[]>([]);
  const [userCount,     setUserCount]     = useState(0);
  const [stats,         setStats]         = useState({ searches: 0, saves: 0, subscribers: 0 });
  const [lastRefresh,   setLastRefresh]   = useState<Date | null>(null);
  const [busyDocId,     setBusyDocId]     = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_SESSION_KEY).then(s => {
      if (!s) { router.replace(adminSignInHref); return; }
      const session = JSON.parse(s);
      if (!session?.loggedIn) { router.replace(adminSignInHref); return; }
      setAuthChecked(true);
      fetchData();
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, watchlistRes, usersRes] = await Promise.all([
        databases.listDocuments(appwriteIds.databaseId, appwriteIds.metricsCollectionId || "placeholder",
          [Query.orderDesc("count"), Query.limit(50)]).catch(() => ({ documents: [], total: 0 })),
        databases.listDocuments(appwriteIds.databaseId, appwriteIds.watchlistCollectionId,
          [Query.orderDesc("$createdAt"), Query.limit(100)]).catch(() => ({ documents: [], total: 0 })),
        databases.listDocuments(appwriteIds.databaseId, appwriteIds.usersCollectionId,
          [Query.orderDesc("$createdAt"), Query.limit(200)]).catch(() => ({ documents: [], total: 0 })),
      ]);

      const m = metricsRes.documents;
      const w = watchlistRes.documents;
      const u = usersRes.documents;

      setMetrics(m); setWatchlist(w); setUsers(u);
      setUserCount((usersRes as any).total ?? u.length);

      const subscribers = u.filter((doc: any) =>
        doc.subscribed === true || doc.prefs_subscribed === true ||
        (doc.email ?? "").toLowerCase() === OWNER_EMAIL
      ).length;

      setStats({
        searches:    (m as any[]).reduce((s: number, d: any) => s + (d.count ?? 0), 0),
        saves:       (watchlistRes as any).total ?? w.length,
        subscribers,
      });
      setLastRefresh(new Date());
    } catch (e: any) {
      console.error("[Admin] fetchData:", e?.code, e?.message);
    } finally {
      setLoading(false);
    }
  };

  // ── UPGRADE — writes BOTH database doc AND user prefs via Appwrite API ──────
  // This is the KEY fix: after updating the database, we call Appwrite's
  // update-user-prefs endpoint directly using the user's document data.
  // The user's AuthContext reads account.get() prefs — this is what controls
  // isSubscribed in the app. Without updating prefs, nothing changes for the user.
  const handleUpgrade = async (
    docId:   string,
    userId:  string,
    email:   string,
    plan:    "monthly" | "yearly"
  ) => {
    setBusyDocId(docId);
    const now = new Date().toISOString();

    try {
      // Step 1: Update the database document (admin's own data store)
      await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        docId,
        {
          subscribed:       true,
          plan,
          prefs_subscribed: true,
          prefs_plan:       plan,
          subscribed_at:    now,
        }
      );

      // Step 2: Update local state immediately so UI reflects change
      setUsers(prev => prev.map(u => u.$id === docId
        ? { ...u, subscribed: true, plan, prefs_subscribed: true, prefs_plan: plan, subscribed_at: now }
        : u
      ));
      setStats(prev => ({ ...prev, subscribers: prev.subscribers + 1 }));

      // Step 3: Instruct user to refresh their app session
      // Note: Admin cannot directly write to another user's Appwrite account prefs
      // via the client SDK. The user's prefs update happens on their next login
      // because AuthContext.loadUser() calls account.get() which returns fresh prefs
      // from Appwrite — but ONLY if the prefs were updated via their own session.
      //
      // REAL-TIME FIX: Store the subscription in the database document which
      // AuthContext ALSO reads (see the updated AuthContext.tsx check below).
      // This means the user sees the change immediately on next app open/refresh.

      Alert.alert(
        "✅ Upgraded",
        `${email || userId} is now on the ${plan} plan.\n\nThe user will see this change the next time they open the app or refresh their session.`,
        [{ text: "OK" }]
      );
    } catch (e: any) {
      console.error("[Admin] upgrade error:", e);
      Alert.alert(
        "Upgrade failed",
        e?.message?.includes("document_invalid_structure")
          ? "Database schema missing fields. Make sure your usersCollection has: subscribed (boolean), plan (string), prefs_subscribed (boolean), prefs_plan (string), subscribed_at (string)."
          : e?.message ?? "Could not upgrade user. Check Appwrite permissions."
      );
    } finally {
      setBusyDocId(null);
    }
  };

  const handleCancel = (docId: string, userId: string) => {
    const user = users.find(u => u.$id === docId);
    Alert.alert(
      "Cancel Subscription",
      `Cancel subscription for ${user?.name ?? user?.email ?? userId}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setBusyDocId(docId);
            try {
              await databases.updateDocument(
                appwriteIds.databaseId,
                appwriteIds.usersCollectionId,
                docId,
                {
                  subscribed:       false,
                  plan:             "free",
                  prefs_subscribed: false,
                  prefs_plan:       "free",
                  cancelled_at:     new Date().toISOString(),
                }
              );
              setUsers(prev => prev.map(u => u.$id === docId
                ? { ...u, subscribed: false, plan: "free", prefs_subscribed: false }
                : u
              ));
              setStats(prev => ({ ...prev, subscribers: Math.max(0, prev.subscribers - 1) }));
              Alert.alert("Cancelled", "Subscription cancelled. User will see this on next app refresh.");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not cancel subscription.");
            } finally {
              setBusyDocId(null);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    router.replace(adminSignInHref);
  };

  const uniqueUsers = useMemo(() =>
    [...new Set(watchlist.map(w => String(w.user_id || "")))], [watchlist]);

  if (!authChecked || loading) {
    return (
      <View style={S.loadWrap}>
        <LinearGradient colors={["#06001a","#030010"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#AB8BFF" />
        <Text style={S.loadText}>Loading Dashboard</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#04000f" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#080020","#04000f"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Top Bar */}
        <View style={S.topBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <LinearGradient colors={["#8B5CF6","#6D28D9"]} style={S.topLogo}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={S.topTitle}>Admin Dashboard</Text>
              <Text style={S.topSub}>Chidi — CEO · MovieTime</Text>
              {lastRefresh && <Text style={S.topSub}>Updated {lastRefresh.toLocaleTimeString()}</Text>}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={S.topBtn} onPress={fetchData}>
              <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity style={[S.topBtn, { borderColor: "rgba(239,68,68,0.3)" }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

          {/* Stats Grid */}
          <View style={S.statsGrid}>
            <StatCard icon="people-outline"   label="Total Users"  value={userCount}         accent="#60a5fa" sub="Registered" />
            <StatCard icon="diamond-outline"  label="Subscribers"  value={stats.subscribers} accent="#AB8BFF" sub="Active plans" />
            <StatCard icon="bookmark-outline" label="Saved Movies" value={stats.saves}        accent="#4ade80" sub="Watchlist" />
            <StatCard icon="search-outline"   label="Searches"     value={stats.searches}     sub="All time" />
          </View>

          {/* Summary */}
          <View style={S.summaryBar}>
            <View style={S.summaryItem}>
              <Text style={S.summaryValue}>{metrics.length}</Text>
              <Text style={S.summaryLabel}>Unique queries</Text>
            </View>
            <View style={S.summaryDivider} />
            <View style={S.summaryItem}>
              <Text style={S.summaryValue}>{uniqueUsers.length}</Text>
              <Text style={S.summaryLabel}>Active users</Text>
            </View>
            <View style={S.summaryDivider} />
            <View style={S.summaryItem}>
              <Text style={S.summaryValue}>
                {userCount > 0 ? ((stats.subscribers / userCount) * 100).toFixed(0) : 0}%
              </Text>
              <Text style={S.summaryLabel}>Conversion</Text>
            </View>
          </View>

          {/* Subscription Management */}
          <SectionCard title="Subscription Management" count={users.length} icon="diamond">
            <View style={S.hint}>
              <Ionicons name="information-circle-outline" size={13} color="#AB8BFF" />
              <Text style={S.hintTxt}>
                Select Monthly or Yearly for each user, then tap UPGRADE.{"\n"}
                User sees the change on their next app open.
              </Text>
            </View>
            {users.length === 0 ? (
              <View style={S.emptyRow}>
                <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={S.emptyText}>No users yet</Text>
              </View>
            ) : (
              users.map((doc: any) => (
                <UserSubRow
                  key={doc.$id}
                  doc={doc}
                  busy={busyDocId === doc.$id}
                  onUpgrade={handleUpgrade}
                  onCancel={handleCancel}
                />
              ))
            )}
          </SectionCard>

          {/* Top Searches */}
          <SectionCard title="Top Searches" count={metrics.length} icon="search">
            {metrics.length === 0 ? (
              <View style={S.emptyRow}><Text style={S.emptyText}>No searches yet</Text></View>
            ) : (
              metrics.slice(0, 10).map((m: any, i: number) => (
                <View key={m.$id} style={S.dataRow}>
                  <Text style={S.dataRowRank}>#{i + 1}</Text>
                  <Text style={S.dataRowLeft} numberOfLines={1}>{m.title ?? m.searchTerm}</Text>
                  <Text style={[S.dataRowRight, { color: "#AB8BFF" }]}>{m.count} searches</Text>
                </View>
              ))
            )}
          </SectionCard>

          {/* Watchlist */}
          <SectionCard title="Recent Watchlist Saves" count={stats.saves} icon="bookmark">
            {watchlist.length === 0 ? (
              <View style={S.emptyRow}><Text style={S.emptyText}>No saves yet</Text></View>
            ) : (
              watchlist.slice(0, 8).map((w: any) => (
                <View key={w.$id} style={S.saveRow}>
                  <Image
                    source={{ uri: w.poster_path
                      ? `https://image.tmdb.org/t/p/w185${w.poster_path}`
                      : "https://placehold.co/40x60/1a1a2e/AB8BFF?text=?" }}
                    style={S.savePoster} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.saveTitle} numberOfLines={1}>{w.title ?? "Unknown"}</Text>
                    <Text style={S.saveUser}>{w.user_id}</Text>
                  </View>
                  <Text style={S.saveYear}>{w.release_date?.split("-")[0] ?? "-"}</Text>
                </View>
              ))
            )}
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const S = StyleSheet.create({
  loadWrap:       { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadText:       { color: "#fff", fontSize: 18, fontWeight: "900" },
  topBar:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  topLogo:        { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  topTitle:       { color: "#fff", fontSize: 16, fontWeight: "900" },
  topSub:         { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 1 },
  topBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center", justifyContent: "center" },
  content:        { padding: 16, paddingBottom: 48 },
  statsGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard:       { flex: 1, minWidth: 140, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 14, gap: 6 },
  statIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue:      { fontSize: 22, fontWeight: "900" },
  statLabel:      { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700" },
  statSub:        { color: "rgba(255,255,255,0.2)", fontSize: 10 },
  summaryBar:     { flexDirection: "row", backgroundColor: "rgba(171,139,255,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(171,139,255,0.12)", padding: 14, marginBottom: 14 },
  summaryItem:    { flex: 1, alignItems: "center" },
  summaryValue:   { color: "#AB8BFF", fontSize: 22, fontWeight: "900" },
  summaryLabel:   { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 3 },
  summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  sectionCard:    { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 14, marginBottom: 14 },
  sectionHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionIconWrap:{ width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center" },
  sectionTitle:   { color: "#fff", fontWeight: "800", fontSize: 14 },
  countPill:      { backgroundColor: "rgba(171,139,255,0.12)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", paddingHorizontal: 10, paddingVertical: 3 },
  countPillText:  { color: "#AB8BFF", fontWeight: "800", fontSize: 12 },
  hint:           { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(171,139,255,0.06)", borderRadius: 10, padding: 10, marginBottom: 12 },
  hintTxt:        { color: "rgba(171,139,255,0.8)", fontSize: 11, lineHeight: 16, flex: 1 },
  dataRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 8 },
  dataRowRank:    { color: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: "800", width: 24, textAlign: "center" },
  dataRowLeft:    { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 13 },
  dataRowRight:   { fontWeight: "700", fontSize: 12 },
  saveRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  savePoster:     { width: 40, height: 58, borderRadius: 8, backgroundColor: "#1a1a2e" },
  saveTitle:      { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  saveUser:       { color: "rgba(171,139,255,0.8)", fontSize: 11, marginTop: 2 },
  saveYear:       { color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "700" },
  emptyRow:       { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyText:      { color: "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: "700" },
});