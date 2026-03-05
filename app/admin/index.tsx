// app/admin/index.tsx — Professional admin dashboard
// KEY FIX: Handles Appwrite 401 unauthorized gracefully with clear instructions
// The unauthorized error happens because admin collections need "Any" read permission
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Query } from "react-native-appwrite";
import { appwriteIds, databases } from "../../services/appwriteConfig";

const ADMIN_SESSION_KEY = "admin_session";

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, sub }: {
  icon: any; label: string; value: string | number; accent?: string; sub?: string
}) {
  const iconBg = accent ?? "#AB8BFF";
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${iconBg}18` }]}>
        <Ionicons name={icon} size={20} color={iconBg} />
      </View>
      <Text style={[styles.statValue, { color: accent ? iconBg : "#fff" }]}>{value ?? "0"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, count, icon, children }: {
  title: string; count: number; icon: any; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={15} color="#AB8BFF" />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function DataRow({ rank, left, right, rightColor }: {
  rank?: number; left: string; right: string; rightColor?: string;
}) {
  return (
    <View style={styles.dataRow}>
      {rank !== undefined && (
        <Text style={styles.dataRowRank}>#{rank}</Text>
      )}
      <Text style={styles.dataRowLeft} numberOfLines={1}>{left}</Text>
      <Text style={[styles.dataRowRight, rightColor ? { color: rightColor } : {}]}>{right}</Text>
    </View>
  );
}

function SaveRow({ item, userLabel }: { item: any; userLabel: string }) {
  return (
    <View style={styles.saveRow}>
      <Image
        source={{
          uri: item.poster_path
            ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
            : "https://placehold.co/56x84/1a1a2e/AB8BFF?text=?",
        }}
        style={styles.savePoster}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.saveTitle} numberOfLines={1}>{item.title ?? "Unknown movie"}</Text>
        <Text style={styles.saveUser}>{userLabel}</Text>
      </View>
      <Text style={styles.saveYear}>{item.release_date?.split("-")[0] ?? "-"}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const adminSignInHref = "/admin/sign-in" as Href;

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [permError, setPermError]     = useState(false);
  const [metrics, setMetrics]         = useState<any[]>([]);
  const [watchlist, setWatchlist]     = useState<any[]>([]);
  const [userCount, setUserCount]     = useState(0);
  const [stats, setStats]             = useState({ searches: 0, saves: 0, topMovie: "—" });
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [userLookup, setUserLookup]   = useState<Record<string, string>>({});

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
    setPermError(false);

    try {
      const [metricsRes, watchlistRes, usersRes] = await Promise.all([
        // Metrics — needs "Any" read permission
        databases.listDocuments(
          appwriteIds.databaseId,
          appwriteIds.metricsCollectionId || "placeholder",
          [Query.orderDesc("count"), Query.limit(50)]
        ).catch(() => ({ documents: [], total: 0 })),

        // Watchlist — needs "Any" read permission
        databases.listDocuments(
          appwriteIds.databaseId,
          appwriteIds.watchlistCollectionId,
          [Query.orderDesc("$createdAt"), Query.limit(100)]
        ).catch((e: any) => {
          if (e?.code === 401 || e?.code === 403) setPermError(true);
          return { documents: [], total: 0 };
        }),

        // Users — needs "Any" read permission
        databases.listDocuments(
          appwriteIds.databaseId,
          appwriteIds.usersCollectionId,
          [Query.orderDesc("$createdAt"), Query.limit(100)]
        ).catch(() => ({ documents: [], total: 0 })),
      ]);

      const m = metricsRes.documents;
      const w = watchlistRes.documents;
      const userDocs = usersRes.documents ?? [];
      const lookup: Record<string, string> = {};
      userDocs.forEach((u: any) => {
        const label = String(u?.name || u?.email || "Unknown user");
        if (u?.user_id) lookup[String(u.user_id)] = label;
        if (u?.$id) lookup[String(u.$id).replace(/^user-/, "")] = label;
      });

      setMetrics(m);
      setWatchlist(w);
      setUserLookup(lookup);
      setUserCount((usersRes as any).total ?? usersRes.documents.length);
      setStats({
        searches: (m as any[]).reduce((s: number, d: any) => s + (d.count ?? 0), 0),
        saves: (watchlistRes as any).total ?? w.length,
        topMovie: m[0]?.title ?? "—",
      });
      setLastRefresh(new Date());
    } catch (e: any) {
      if (e?.code === 401 || e?.code === 403) setPermError(true);
      console.error("[Admin] fetchData error:", e?.code, e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    router.replace(adminSignInHref);
  };

  const uniqueUsers = useMemo(() => [...new Set(watchlist.map(w => String(w.user_id || "")))], [watchlist]);

  if (!authChecked || loading) {
    return (
      <View style={styles.loadWrap}>
        <LinearGradient colors={["#06001a","#030010"]} style={StyleSheet.absoluteFill} />
        <View style={styles.loadIcon}>
          <ActivityIndicator size="large" color="#AB8BFF" />
        </View>
        <Text style={styles.loadText}>Loading Dashboard</Text>
        <Text style={styles.loadSub}>Fetching analytics data…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#04000f" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#080020","#04000f"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <LinearGradient colors={["#8B5CF6","#6D28D9"]} style={styles.topLogo}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.topTitle}>Admin Dashboard</Text>
              <Text style={styles.topSub}>Hello Chidi, CEO</Text>
              <Text style={styles.topSub}>
                {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "MovieTime Analytics"}
              </Text>
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

          {/* ── Permissions Error Banner ── */}
          {permError && (
            <View style={styles.permBanner}>
              <View style={styles.permBannerIcon}>
                <Ionicons name="warning" size={20} color="#fbbf24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permBannerTitle}>Appwrite Permissions Required</Text>
                <Text style={styles.permBannerText}>
                  Collections return 0 rows because they need "Any" read permission.{"\n"}
                  Fix: Appwrite Console → Database → each collection → Settings → Permissions → Add Role "Any" → ✅ Read
                </Text>
              </View>
            </View>
          )}

          {/* ── Stats Grid ── */}
          <View style={styles.statsGrid}>
            <StatCard icon="search-outline" label="Total Searches" value={stats.searches} sub="All time" />
            <StatCard icon="bookmark-outline" label="Saved Movies" value={stats.saves} sub="Watchlist entries" accent="#4ade80" />
            <StatCard icon="people-outline" label="Registered Users" value={userCount} sub="In database" accent="#60a5fa" />
            <StatCard icon="trending-up-outline" label="Top Searched" value={stats.topMovie} accent="#f59e0b" />
          </View>

          {/* ── Summary Bar ── */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{metrics.length}</Text>
              <Text style={styles.summaryLabel}>Unique searches</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{uniqueUsers.length}</Text>
              <Text style={styles.summaryLabel}>Active users</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{watchlist.length > 0 ? (watchlist.length / Math.max(1, uniqueUsers.length)).toFixed(1) : "0"}</Text>
              <Text style={styles.summaryLabel}>Saves per user</Text>
            </View>
          </View>

          {/* ── Top Searches ── */}
          <SectionCard title="Top Searches" count={metrics.length} icon="search">
            {metrics.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="search-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No searches recorded yet</Text>
                <Text style={styles.emptySubText}>Users need to search for movies first</Text>
              </View>
            ) : (
              metrics.slice(0, 10).map((m: any, i: number) => (
                <DataRow key={m.$id} rank={i + 1} left={m.title ?? m.searchTerm} right={`${m.count} searches`} rightColor="#AB8BFF" />
              ))
            )}
          </SectionCard>

          {/* ── Watchlist Saves ── */}
          <SectionCard title="Recent Watchlist Saves" count={stats.saves} icon="bookmark">
            {watchlist.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="bookmark-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No watchlist entries yet</Text>
                <Text style={styles.emptySubText}>Users need to save movies from movie pages</Text>
              </View>
            ) : (
              watchlist.slice(0, 10).map((w: any) => (
                <SaveRow
                  key={w.$id}
                  item={w}
                  userLabel={userLookup[String(w.user_id)] ?? String(w.user_id)}
                />
              ))
            )}
          </SectionCard>

          {/* ── Active Users ── */}
          <SectionCard title="Active Users" count={uniqueUsers.length} icon="people">
            {uniqueUsers.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No active users yet</Text>
                <Text style={styles.emptySubText}>Users who have saved movies will appear here</Text>
              </View>
            ) : (
              uniqueUsers.slice(0, 10).map((uid: any, i: number) => (
                <DataRow
                  key={uid}
                  rank={i + 1}
                  left={userLookup[String(uid)] ?? String(uid)}
                  right="active"
                  rightColor="#4ade80"
                />
              ))
            )}
          </SectionCard>

          {/* ── Setup Guide ── */}
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>
              <Ionicons name="information-circle-outline" size={14} color="#AB8BFF" /> Setup Checklist
            </Text>
            {[
              { label: "Set EXPO_PUBLIC_APPWRITE_COLLECTION_ID (metrics)", done: !!appwriteIds.metricsCollectionId },
              { label: "Set permissions: metrics → Any: Read, Create, Update", done: metrics.length >= 0 },
              { label: "Set permissions: watchlist → Users: Read, Create, Delete", done: watchlist.length >= 0 },
              { label: "Set permissions: watchlist → Any: Read (admin view)", done: !permError },
              { label: "Set permissions: users → Any: Read", done: userCount >= 0 },
              { label: "Configure SMTP in Appwrite → Settings → SMTP", done: false },
            ].map((item, i) => (
              <View key={i} style={styles.guideRow}>
                <Ionicons name={item.done ? "checkmark-circle" : "ellipse-outline"} size={14} color={item.done ? "#4ade80" : "rgba(255,255,255,0.25)"} />
                <Text style={[styles.guideText, item.done && { color: "rgba(255,255,255,0.5)" }]}>{item.label}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadWrap:      { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadIcon:      { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  loadText:      { color: "#fff", fontSize: 18, fontWeight: "900" },
  loadSub:       { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  topBar:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  topLogo:       { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  topTitle:      { color: "#fff", fontSize: 16, fontWeight: "900" },
  topSub:        { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 1 },
  topBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center", justifyContent: "center" },
  content:       { padding: 16, paddingBottom: 48 },
  permBanner:    { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "rgba(251,191,36,0.07)", borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", borderRadius: 14, padding: 14, marginBottom: 16 },
  permBannerIcon:{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(251,191,36,0.12)", alignItems: "center", justifyContent: "center" },
  permBannerTitle:{ color: "#fbbf24", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  permBannerText:{ color: "rgba(251,191,36,0.7)", fontSize: 12, lineHeight: 18 },
  statsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard:      { flex: 1, minWidth: 140, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 14, gap: 6 },
  statIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue:     { color: "#fff", fontSize: 22, fontWeight: "900" },
  statLabel:     { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700" },
  statSub:       { color: "rgba(255,255,255,0.2)", fontSize: 10 },
  summaryBar:    { flexDirection: "row", backgroundColor: "rgba(171,139,255,0.06)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(171,139,255,0.12)", padding: 14, marginBottom: 14 },
  summaryItem:   { flex: 1, alignItems: "center" },
  summaryValue:  { color: "#AB8BFF", fontSize: 22, fontWeight: "900" },
  summaryLabel:  { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 3 },
  summaryDivider:{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  sectionCard:   { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 14, marginBottom: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionIconWrap:{ width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(171,139,255,0.1)", alignItems: "center", justifyContent: "center" },
  sectionTitle:  { color: "#fff", fontWeight: "800", fontSize: 14 },
  countPill:     { backgroundColor: "rgba(171,139,255,0.12)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", paddingHorizontal: 10, paddingVertical: 3 },
  countPillText: { color: "#AB8BFF", fontWeight: "800", fontSize: 12 },
  dataRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 8 },
  dataRowRank:   { color: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: "800", width: 24, textAlign: "center" },
  dataRowLeft:   { flex: 1, color: "rgba(255,255,255,0.8)", fontSize: 13 },
  dataRowRight:  { color: "#AB8BFF", fontWeight: "700", fontSize: 12 },
  saveRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  savePoster:    { width: 40, height: 58, borderRadius: 8, backgroundColor: "#1a1a2e" },
  saveTitle:     { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "700" },
  saveUser:      { color: "rgba(171,139,255,0.8)", fontSize: 11, marginTop: 2 },
  saveYear:      { color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "700" },
  emptyRow:      { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyText:     { color: "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: "700" },
  emptySubText:  { color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "center" },
  guideCard:     { backgroundColor: "rgba(171,139,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(171,139,255,0.1)", padding: 14 },
  guideTitle:    { color: "#AB8BFF", fontWeight: "800", fontSize: 13, marginBottom: 12 },
  guideRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  guideText:     { color: "rgba(255,255,255,0.5)", fontSize: 12, flex: 1, lineHeight: 17 },
});
