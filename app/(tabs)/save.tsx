// app/(tabs)/save.tsx
// KEY FIX: loading never gets stuck, proper empty states for guest/empty/error
import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getSavedMovies, removeSavedMovie } from "../../services/appwrite";
import { useLocale } from "../../context/LocaleContext";

// ── Saved Card ─────────────────────────────────────────────────────────────────
const SavedCard = ({
  item,
  onRemove,
  t,
}: {
  item: any;
  onRemove: () => Promise<void>;
  t: (k: string, fb?: string) => string;
}) => {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/movies/${item.movie_id}`)}
      activeOpacity={0.85}
      style={styles.card}
    >
      <Image
        source={{ uri: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : "https://placehold.co/85x125/1a1a2e/AB8BFF?text=?" }}
        style={styles.poster}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardYear}>{item.release_date?.split("-")[0] || "—"}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color="#f5c518" />
          <Text style={styles.rating}>{((item.vote_average ?? 0) / 2).toFixed(1)}</Text>
          <Text style={styles.ratingMax}> / 5</Text>
        </View>
        <TouchableOpacity onPress={() => router.push(`/movies/${item.movie_id}`)} style={styles.watchBtn} activeOpacity={0.8}>
          <Ionicons name="play-circle" size={14} color="#0f0f12" />
          <Text style={styles.watchBtnText}>{t("watch_now", "Watch Now")}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={async () => { setRemoving(true); await onRemove(); setRemoving(false); }}
        style={styles.removeBtn}
        disabled={removing}
      >
        {removing ? <ActivityIndicator size="small" color="rgba(239,68,68,0.6)" /> : <Ionicons name="trash-outline" size={17} color="rgba(239,68,68,0.6)" />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ── Guest View ─────────────────────────────────────────────────────────────────
const GuestView = () => {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <View style={styles.center}>
      {/* Bookmark icon with lock badge */}
      <View style={styles.bigIconWrap}>
        <LinearGradient colors={["rgba(171,139,255,0.2)", "rgba(171,139,255,0.05)"]} style={styles.bigIconGrad}>
          <Ionicons name="bookmark" size={52} color="#AB8BFF" />
        </LinearGradient>
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color="#fff" />
        </View>
      </View>

      <Text style={styles.emptyTitle}>{t("your_watchlist", "Your Watchlist")}</Text>
      <Text style={styles.emptyMsg}>
        {t("watchlist_guest_desc", "Save movies to watch later.")}{"\n"}
        {t("sign_in_sync_devices", "Sign in to sync across all your devices.")}
      </Text>

      {/* Auth card */}
      <View style={styles.authCard}>
        <View style={styles.authCardIcon}>
          <Ionicons name="person-circle-outline" size={22} color="#AB8BFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authCardTitle}>{t("sign_in_required", "Sign in required")}</Text>
          <Text style={styles.authCardSub}>{t("create_account_save_watchlist", "Create a free account to save your watchlist")}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.solidBtn} onPress={() => router.push("/(auth)/sign-in")} activeOpacity={0.85}>
        <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.solidBtnInner}>
          <Ionicons name="log-in-outline" size={17} color="#0f0f12" />
          <Text style={styles.solidBtnText}>{t("sign_in", "Sign In")}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/(auth)/sign-up")} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={16} color="#AB8BFF" />
        <Text style={styles.outlineBtnText}>{t("create_free_account", "Create Free Account")}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/")} style={{ marginTop: 8 }}>
        <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>{t("explore_movies_arrow", "Explore movies →")}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Empty Watchlist View ───────────────────────────────────────────────────────
const EmptyView = () => {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <View style={styles.center}>
      <View style={styles.bigIconWrap}>
        <LinearGradient colors={["rgba(171,139,255,0.12)", "rgba(171,139,255,0.03)"]} style={styles.bigIconGrad}>
          <Ionicons name="bookmark-outline" size={52} color="#AB8BFF" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>{t("nothing_saved_yet", "Nothing saved yet")}</Text>
      <Text style={styles.emptyMsg}>
        {t("tap_bookmark_save_movie", "Tap the bookmark icon on any movie")}{"\n"}
        {t("add_to_watchlist", "to add it to your watchlist.")}
      </Text>
      <TouchableOpacity style={[styles.solidBtn, { marginTop: 8 }]} onPress={() => router.push("/")} activeOpacity={0.85}>
        <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.solidBtnInner}>
          <Ionicons name="film-outline" size={17} color="#0f0f12" />
          <Text style={styles.solidBtnText}>{t("explore_movies", "Explore Movies")}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Saved() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { t } = useLocale();

  const [list, setList]         = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchList = useCallback(async () => {
    if (!user?.$id) return;
    setFetching(true);
    setFetchError("");
    try {
      const docs = await getSavedMovies(user.$id);
      setList(docs as any[]);
    } catch (e: any) {
      setFetchError(e?.message ?? "Failed to load watchlist.");
      toast.error("Failed to load watchlist", "Pull down to retry.");
    } finally {
      setFetching(false);
      setHasFetched(true);
    }
  }, [user?.$id]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!isLoggedIn) {
      // Not logged in → immediately show guest view, don't spin
      setHasFetched(true);
      return;
    }

    // Logged in → fetch watchlist
    fetchList();
  }, [authLoading, isLoggedIn]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchList();
    setRefreshing(false);
  };

  const handleRemove = async (item: any) => {
    if (!user?.$id) return;
    // Optimistic remove
    setList(prev => prev.filter(m => m.$id !== item.$id));
    const ok = await removeSavedMovie(user.$id, Number(item.movie_id));
    if (ok) {
      toast.success("Removed from watchlist");
    } else {
      // Revert
      toast.error("Could not remove movie");
      fetchList();
    }
  };

  // ── Auth still loading ────────────────────────────────────────────
  if (authLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("my_watchlist", "My Watchlist")}</Text>
        </View>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#AB8BFF" />
          <Text style={styles.loaderText}>{t("loading", "Loading…")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Fetching watchlist for logged-in user (first time only) ──────
  if (isLoggedIn && !hasFetched) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("my_watchlist", "My Watchlist")}</Text>
        </View>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#AB8BFF" />
          <Text style={styles.loaderText}>{t("loading_watchlist", "Loading your watchlist…")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t("my_watchlist", "My Watchlist")}</Text>
          <Text style={styles.headerSub}>
            {isLoggedIn
              ? list.length > 0
                ? `${list.length} ${t("movies_saved_suffix", `movie${list.length !== 1 ? "s" : ""} saved`)}`
                : t("your_saved_movies", "Your saved movies")
              : t("sign_in_view_list", "Sign in to view your list")}
          </Text>
        </View>
        {isLoggedIn && list.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{list.length}</Text>
          </View>
        )}
      </View>

      {/* DB error banner */}
      {!!fetchError && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
          <Text style={styles.errorBarText} numberOfLines={2}>{fetchError}</Text>
          <TouchableOpacity onPress={fetchList}>
            <Text style={{ color: "#AB8BFF", fontSize: 12, fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!isLoggedIn ? (
        <GuestView />
      ) : list.length === 0 ? (
        <EmptyView />
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => item.$id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB8BFF" />
          }
          renderItem={({ item }) => (
            <SavedCard item={item} onRemove={() => handleRemove(item)} t={t} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0f0f12" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle:    { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  headerSub:      { color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 2 },
  countBadge:     { backgroundColor: "rgba(171,139,255,0.15)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(171,139,255,0.3)", paddingHorizontal: 12, paddingVertical: 6 },
  countBadgeText: { color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
  loaderWrap:     { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText:     { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  errorBar:       { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 10, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", padding: 10 },
  errorBarText:   { flex: 1, color: "#ef4444", fontSize: 12 },
  card:           { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  poster:         { width: 85, height: 125 },
  cardBody:       { flex: 1, padding: 14, justifyContent: "center" },
  cardTitle:      { color: "#fff", fontSize: 15, fontWeight: "800", lineHeight: 20 },
  cardYear:       { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 4 },
  ratingRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  rating:         { color: "#f5c518", fontSize: 12, fontWeight: "800" },
  ratingMax:      { color: "rgba(255,255,255,0.3)", fontSize: 11 },
  watchBtn:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#AB8BFF", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, marginTop: 10 },
  watchBtnText:   { color: "#0f0f12", fontWeight: "900", fontSize: 12 },
  removeBtn:      { padding: 14, justifyContent: "center", alignItems: "center" },
  center:         { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  bigIconWrap:    { position: "relative", marginBottom: 4 },
  bigIconGrad:    { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
  lockBadge:      { position: "absolute", bottom: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: "#AB8BFF", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0f0f12" },
  emptyTitle:     { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center" },
  emptyMsg:       { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 21 },
  authCard:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(171,139,255,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", padding: 14, width: "100%" },
  authCardIcon:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(171,139,255,0.15)", alignItems: "center", justifyContent: "center" },
  authCardTitle:  { color: "#fff", fontWeight: "800", fontSize: 14 },
  authCardSub:    { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  solidBtn:       { width: "100%", borderRadius: 14, overflow: "hidden" },
  solidBtnInner:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  solidBtnText:   { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  outlineBtn:     { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 13, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)" },
  outlineBtnText: { color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
});
