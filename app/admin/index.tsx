// app/admin/index.tsx
// KEY ADDITION: Subscription Management section
// Admin (Chidi) can upgrade or cancel any user's subscription
// Updates user's Appwrite prefs: subscribed = true/false, plan = "monthly"|"yearly"|"free"

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  ActivityIndicator, StatusBar, Modal, TextInput, Alert, Platform,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { appwriteIds, databases, account } from "../../services/appwriteConfig";

const ADMIN_SESSION_KEY = "admin_session";
const OWNER_EMAIL       = "chidiokwu795@gmail.com";

// ── Helpers ────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, sub }: {
  icon: any; label: string; value: string | number; accent?: string; sub?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent ?? "#AB8BFF"}18` }]}>
        <Ionicons name={icon} size={20} color={accent ?? "#AB8BFF"} />
      </View>
      <Text style={[styles.statValue, { color: accent ?? "#fff" }]}>{value ?? "0"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

function SectionCard({ title, count, icon, children }: {
  title: string; count: number; icon: any; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={styles.sectionIconWrap}><Ionicons name={icon} size={15} color="#AB8BFF" /></View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.countPill}><Text style={styles.countPillText}>{count}</Text></View>
      </View>
      {children}
    </View>
  );
}

// ── Subscription badge ─────────────────────────────────────────────────────────
const SubBadge = ({ subscribed, plan }: { subscribed: boolean; plan?: string }) => (
  <View style={[subS.badge, subscribed ? subS.active : subS.inactive]}>
    <Ionicons name={subscribed ? "checkmark-circle" : "close-circle"} size={11}
      color={subscribed ? "#4ade80" : "#ef4444"} />
    <Text style={[subS.txt, { color: subscribed ? "#4ade80" : "#ef4444" }]}>
      {subscribed ? (plan ?? "active") : "not subscribed"}
    </Text>
  </View>
);
const subS = StyleSheet.create({
  badge:    { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  active:   { backgroundColor: "rgba(74,222,128,0.1)" },
  inactive: { backgroundColor: "rgba(239,68,68,0.1)" },
  txt:      { fontSize: 10, fontWeight: "700" },
});

// ── User Subscription Row ──────────────────────────────────────────────────────
const UserSubRow = ({
  doc,
  onUpgrade,
  onCancel,
}: {
  doc: any;
  onUpgrade: (docId: string, userId: string, plan: "monthly" | "yearly") => void;
  onCancel:  (docId: string, userId: string) => void;
}) => {
  const subscribed = doc.subscribed === true || doc.prefs_subscribed === true;
  const plan       = String(doc.plan ?? doc.prefs_plan ?? "free");
  const isOwner    = (doc.email ?? "").toLowerCase() === OWNER_EMAIL;

  return (
    <View style={uS.row}>
      <View style={uS.avatar}>
        <Text style={uS.avatarTxt}>{(doc.name || doc.email || "?")[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={uS.name} numberOfLines={1}>{doc.name ?? "Unknown"}</Text>
        <Text style={uS.email} numberOfLines={1}>{doc.email ?? doc.user_id ?? ""}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <SubBadge subscribed={subscribed || isOwner} plan={isOwner ? "owner" : plan} />
          {isOwner && (
            <View style={{ backgroundColor: "rgba(171,139,255,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: "#AB8BFF", fontSize: 10, fontWeight: "700" }}>CEO</Text>
            </View>
          )}
        </View>
      </View>
      {!isOwner && (
        <View style={{ gap: 6 }}>
          <TouchableOpacity
            style={[uS.actionBtn, { backgroundColor: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.3)" }]}
            onPress={() => onUpgrade(doc.$id, doc.user_id ?? doc.$id, "monthly")}>
            <Text style={{ color: "#4ade80", fontSize: 10, fontWeight: "800" }}>UPGRADE</Text>
          </TouchableOpacity>
          {subscribed && (
            <TouchableOpacity
              style={[uS.actionBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }]}
              onPress={() => onCancel(doc.$id, doc.user_id ?? doc.$id)}>
              <Text style={{ color: "#ef4444", fontSize: 10, fontWeight: "800" }}>CANCEL</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const uS = StyleSheet.create({
  row:       { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  avatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(171,139,255,0.2)", alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#AB8BFF", fontWeight: "900", fontSize: 14 },
  name:      { color: "#fff", fontSize: 13, fontWeight: "700" },
  email:     { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 },
  actionBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center" },
});

// ── Upgrade Plan Modal ─────────────────────────────────────────────────────────
const UpgradeModal = ({
  visible,
  userName,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: (plan: "monthly" | "yearly") => void;
}) => {
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={mS.overlay}>
        <View style={mS.box}>
          <Text style={mS.title}>Upgrade User</Text>
          <Text style={mS.sub}>Upgrading: <Text style={{ color: "#AB8BFF" }}>{userName}</Text></Text>
          <View style={{ flexDirection: "row", gap: 10, marginVertical: 16 }}>
            {(["monthly","yearly"] as const).map(p => (
              <TouchableOpacity key={p}
                style={[mS.planChip, plan === p && mS.planChipActive]}
                onPress={() => setPlan(p)}>
                <Text style={[mS.planTxt, plan === p && { color: "#AB8BFF" }]}>
                  {p === "monthly" ? "Monthly ₦1,600" : "Yearly ₦12,800"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={mS.btns}>
            <TouchableOpacity style={mS.cancel} onPress={onClose}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mS.confirm} onPress={() => onConfirm(plan)}>
              <Text style={{ color: "#0f0f12", fontWeight: "900" }}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const mS = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  box:           { width: "100%", maxWidth: 360, backgroundColor: "#1a0a2e", borderRadius: 20, padding: 22, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)" },
  title:         { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  sub:           { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  planChip:      { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", padding: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  planChipActive:{ borderColor: "#AB8BFF", backgroundColor: "rgba(171,139,255,0.12)" },
  planTxt:       { color: "rgba(255,255,255,0.5)", fontWeight: "700", fontSize: 12 },
  btns:          { flexDirection: "row", gap: 10, marginTop: 8 },
  cancel:        { flex: 1, padding: 12, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  confirm:       { flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: "#AB8BFF" },
});

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router           = useRouter();
  const adminSignInHref  = "/admin/sign-in" as Href;

  const [authChecked,    setAuthChecked]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [metrics,        setMetrics]        = useState<any[]>([]);
  const [watchlist,      setWatchlist]      = useState<any[]>([]);
  const [users,          setUsers]          = useState<any[]>([]);
  const [userCount,      setUserCount]      = useState(0);
  const [stats,          setStats]          = useState({ searches: 0, saves: 0, topMovie: "—", subscribers: 0 });
  const [lastRefresh,    setLastRefresh]    = useState<Date | null>(null);
  const [upgradeModal,   setUpgradeModal]   = useState<{ docId: string; userId: string; name: string } | null>(null);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null); // docId being updated

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

      setMetrics(m);
      setWatchlist(w);
      setUsers(u);
      setUserCount((usersRes as any).total ?? u.length);

      const subscribers = u.filter((doc: any) =>
        doc.subscribed === true || doc.prefs_subscribed === true ||
        (doc.email ?? "").toLowerCase() === OWNER_EMAIL
      ).length;

      setStats({
        searches:    (m as any[]).reduce((s: number, d: any) => s + (d.count ?? 0), 0),
        saves:       (watchlistRes as any).total ?? w.length,
        topMovie:    m[0]?.title ?? "—",
        subscribers,
      });
      setLastRefresh(new Date());
    } catch (e: any) {
      console.error("[Admin] fetchData:", e?.code, e?.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Upgrade user subscription ──────────────────────────────────────────────
  const handleUpgrade = async (docId: string, userId: string, plan: "monthly" | "yearly") => {
    setUpgradeModal(null);
    setActionLoading(docId);
    try {
      await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        docId,
        {
          subscribed:      true,
          plan,
          prefs_subscribed: true,
          prefs_plan:       plan,
          subscribed_at:    new Date().toISOString(),
        }
      );
      setUsers(prev => prev.map(u => u.$id === docId
        ? { ...u, subscribed: true, plan, prefs_subscribed: true, prefs_plan: plan }
        : u
      ));
      setStats(prev => ({ ...prev, subscribers: prev.subscribers + 1 }));
      Alert.alert("✅ Upgraded", `User upgraded to ${plan} plan.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not upgrade user.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Cancel user subscription ───────────────────────────────────────────────
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
            setActionLoading(docId);
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
              Alert.alert("Cancelled", "Subscription has been cancelled.");
            } catch (e: any) {
              Alert.alert("Error", e?.message ?? "Could not cancel subscription.");
            } finally {
              setActionLoading(null);
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
      <View style={styles.loadWrap}>
        <LinearGradient colors={["#06001a","#030010"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#AB8BFF" />
        <Text style={styles.loadText}>Loading Dashboard</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#04000f" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#080020","#04000f"]} style={StyleSheet.absoluteFill} />

      {/* Upgrade Modal */}
      {upgradeModal && (
        <UpgradeModal
          visible={!!upgradeModal}
          userName={upgradeModal.name}
          onClose={() => setUpgradeModal(null)}
          onConfirm={plan => handleUpgrade(upgradeModal.docId, upgradeModal.userId, plan)}
        />
      )}

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <LinearGradient colors={["#8B5CF6","#6D28D9"]} style={styles.topLogo}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.topTitle}>Admin Dashboard</Text>
              <Text style={styles.topSub}>Chidi — CEO · MovieTime</Text>
              {lastRefresh && <Text style={styles.topSub}>Updated {lastRefresh.toLocaleTimeString()}</Text>}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.topBtn} onPress={fetchData}>
              <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topBtn, { borderColor: "rgba(239,68,68,0.3)" }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="people-outline"   label="Total Users"   value={userCount}         accent="#60a5fa" sub="Registered" />
            <StatCard icon="diamond-outline"  label="Subscribers"   value={stats.subscribers} accent="#AB8BFF" sub="Active plans" />
            <StatCard icon="bookmark-outline" label="Saved Movies"  value={stats.saves}       accent="#4ade80" sub="Watchlist entries" />
            <StatCard icon="search-outline"   label="Searches"      value={stats.searches}    sub="All time" />
          </View>

          {/* Summary */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{metrics.length}</Text>
              <Text style={styles.summaryLabel}>Unique queries</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{uniqueUsers.length}</Text>
              <Text style={styles.summaryLabel}>Active users</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {userCount > 0 ? ((stats.subscribers / userCount) * 100).toFixed(0) : 0}%
              </Text>
              <Text style={styles.summaryLabel}>Conversion</Text>
            </View>
          </View>

          {/* ── Subscription Management ── */}
          <SectionCard title="Subscription Management" count={users.length} icon="diamond">
            <Text style={styles.subMgmtHint}>
              Tap UPGRADE to activate a user's subscription. Tap CANCEL to revoke it.{"\n"}
              Changes take effect immediately when the user refreshes.
            </Text>
            {users.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No users yet</Text>
              </View>
            ) : (
              users.map((doc: any) => (
                <View key={doc.$id}>
                  {actionLoading === doc.$id && (
                    <View style={{ position: "absolute", right: 10, top: 14, zIndex: 10 }}>
                      <ActivityIndicator size="small" color="#AB8BFF" />
                    </View>
                  )}
                  <UserSubRow
                    doc={doc}
                    onUpgrade={(docId, userId) =>
                      setUpgradeModal({ docId, userId, name: doc.name ?? doc.email ?? userId })
                    }
                    onCancel={handleCancel}
                  />
                </View>
              ))
            )}
          </SectionCard>

          {/* Top Searches */}
          <SectionCard title="Top Searches" count={metrics.length} icon="search">
            {metrics.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No searches yet</Text>
              </View>
            ) : (
              metrics.slice(0, 10).map((m: any, i: number) => (
                <View key={m.$id} style={styles.dataRow}>
                  <Text style={styles.dataRowRank}>#{i + 1}</Text>
                  <Text style={styles.dataRowLeft} numberOfLines={1}>{m.title ?? m.searchTerm}</Text>
                  <Text style={[styles.dataRowRight, { color: "#AB8BFF" }]}>{m.count} searches</Text>
                </View>
              ))
            )}
          </SectionCard>

          {/* Watchlist */}
          <SectionCard title="Recent Watchlist Saves" count={stats.saves} icon="bookmark">
            {watchlist.length === 0 ? (
              <View style={styles.emptyRow}><Text style={styles.emptyText}>No saves yet</Text></View>
            ) : (
              watchlist.slice(0, 8).map((w: any) => (
                <View key={w.$id} style={styles.saveRow}>
                  <Image
                    source={{ uri: w.poster_path ? `https://image.tmdb.org/t/p/w185${w.poster_path}` : "https://placehold.co/40x60/1a1a2e/AB8BFF?text=?" }}
                    style={styles.savePoster} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saveTitle} numberOfLines={1}>{w.title ?? "Unknown"}</Text>
                    <Text style={styles.saveUser}>{w.user_id}</Text>
                  </View>
                  <Text style={styles.saveYear}>{w.release_date?.split("-")[0] ?? "-"}</Text>
                </View>
              ))
            )}
          </SectionCard>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  subMgmtHint:    { color: "rgba(255,255,255,0.35)", fontSize: 11, lineHeight: 16, marginBottom: 12 },
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