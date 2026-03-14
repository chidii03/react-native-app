// app/movies/[id].tsx
// CHANGES: 
//  1. ScrollView gets style={{ backgroundColor:"#0f0f12" }} so no white shows on overscroll
//  2. paddingBottom reduced to 90 (enough to clear tab bar, no huge gap)
//  3. root backgroundColor matches

import React, { useState, useEffect } from "react";
import {
  ScrollView, Image, Text, View, TouchableOpacity,
  ImageBackground, StatusBar, ActivityIndicator, Modal,
  StyleSheet, useWindowDimensions, Platform, Alert, Linking,
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

const fmtMoney = (v: number) => {
  if (!v) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  }).format(v);
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

const VIDSRC = "https://vidsrc.to/embed/movie/";

const StreamPlayer = ({ movieId, playerH }: { movieId: number; playerH: number }) => {
  const url = `${VIDSRC}${movieId}`;
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamTimeout, setStreamTimeout] = useState(false);

  useEffect(() => {
    setStreamLoading(true);
    setStreamTimeout(false);
    const t = setTimeout(() => { setStreamTimeout(true); setStreamLoading(false); }, 9000);
    return () => clearTimeout(t);
  }, [movieId]);

  return (
    <View style={SP.wrap}>
      <View style={SP.bar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={SP.dot} />
          <Text style={SP.live}>STREAMING</Text>
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
                <Text style={SP.fallTxt}>Install react-native-webview to stream</Text>
                <Text style={SP.fallSub}>npx expo install react-native-webview</Text>
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
        <TouchableOpacity style={SP.timeoutBanner} onPress={() => Linking.openURL(url).catch(() => {})} activeOpacity={0.85}>
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
  fallSub:        { color: "rgba(255,255,255,0.3)", fontSize: 11 },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 40, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(0,0,0,0.45)" },
  loadingTxt:     { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  timeoutBanner:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(15,15,18,0.95)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  timeoutTxt:     { color: "#AB8BFF", fontSize: 12, fontWeight: "700" },
  disclaimer:     { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: "rgba(0,0,0,0.6)" },
  disclaimerTxt:  { color: "rgba(255,255,255,0.25)", fontSize: 10, flex: 1, lineHeight: 14 },
});

const StatsGrid = ({ movie, width }: { movie: any; width: number }) => {
  const cols  = width >= 768 ? 4 : width >= 600 ? 3 : 2;
  const cellW = (width - 40 - (cols - 1) * 10) / cols;
  const stats = [
    { label: "IMDB Rating", value: `${movie.vote_average?.toFixed(1) ?? "N/A"}/10`, accent: true },
    { label: "Votes",       value: movie.vote_count?.toLocaleString() ?? "N/A" },
    { label: "Runtime",     value: fmtTime(movie.runtime) },
    { label: "Release",     value: movie.release_date ?? "N/A" },
    { label: "Budget",      value: fmtMoney(movie.budget) },
    { label: "Revenue",     value: fmtMoney(movie.revenue), accent: true },
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
  const cols  = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  const gap   = 12;
  const cellW = (width - 40 - (cols - 1) * gap) / cols;
  const photoW = Math.round(cellW * 0.65);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
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
  const cols  = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  const gap   = 12;
  const cellW = (width - 40 - (cols - 1) * gap) / cols;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {movies.filter((m: any) => m.poster_path).slice(0, 12).map((sim: any) => (
        <TouchableOpacity key={sim.id}
          onPress={() => router.push(`/movies/${sim.id}`)}
          activeOpacity={0.85} style={{ width: cellW }}>
          <View>
            <Image source={{ uri: TMDB_IMAGE(sim.poster_path, "w342") ?? "" }}
              style={{ width: cellW, height: cellW * 1.5, borderRadius: 12, backgroundColor: "#1a1a2e" }}
              resizeMode="cover" />
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
  const [activeTab,   setActiveTab]   = useState<"info"|"cast"|"similar">("info");

  const { data: movie, loading } = useFetch(() => fetchMovieDetails(id as string));

  const isTablet = width >= 768;
  const playerW = Math.min(width - (isTablet ? 52 : 14), 1180);
  const playerH = Math.min(height * 0.72, isTablet ? 760 : 560);
  const closeTop = Math.max(insets.top + (isTablet ? 12 : 6), isTablet ? 24 : 8);

  useEffect(() => {
    if (movie && isLoggedIn && user?.$id) {
      checkIsSaved(user.$id, movie.id).then(setIsSaved).catch(() => {});
    }
  }, [movie?.id, isLoggedIn, user?.$id]);

  useEffect(() => {
    if (!authLoading && isLoggedIn && autoPlay === "true" && movie) {
      setShowStream(true);
    }
  }, [authLoading, isLoggedIn, autoPlay, movie?.id]);

  const handleWatch = () => {
    if (authLoading) return;
    if (isLoggedIn) { setShowStream(p => !p); return; }
    const returnTo = `/movies/${id}`;
    router.push(`/(auth)/sign-in?returnTo=${encodeURIComponent(returnTo)}&autoPlay=true` as any);
  };

  const handleSave = async () => {
    if (!movie || authLoading) return;
    if (!isLoggedIn || !user?.$id) {
      const returnTo = `/movies/${id}`;
      Alert.alert("Sign in required", "Create a free account to save movies to your watchlist.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push(`/(auth)/sign-in?returnTo=${encodeURIComponent(returnTo)}` as any) },
        { text: "Sign Up", onPress: () => router.push(`/(auth)/sign-up?returnTo=${encodeURIComponent(returnTo)}` as any) },
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
                  return (
                    <YT height={300} width={width} play videoId={trailer.key}
                      onChangeState={(e: string) => e === "ended" && setPlayTrailer(false)} />
                  );
                } catch {
                  return (
                    <View style={S.noTrailer}>
                      <Text style={S.noTrailerTxt}>Install react-native-youtube-iframe to play trailers</Text>
                    </View>
                  );
                }
              })()
            ) : (
              <View style={{ width: "100%", maxWidth: 800, height: 450 }}>
                {/* @ts-ignore */}
                <iframe width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                  frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen
                  style={{ borderRadius: 12 }} />
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

      {/* Watch Movie Modal */}
      <Modal visible={showStream && isLoggedIn} transparent animationType="fade" statusBarTranslucent>
        <View style={S.modalBg}>
          <TouchableOpacity style={[S.streamCloseEdge, { top: closeTop }]} onPress={() => setShowStream(false)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={[S.streamModalShell, { width: playerW, maxWidth: playerW }]}>
            <StreamPlayer movieId={movie.id} playerH={playerH} />
          </View>
        </View>
      </Modal>

      {/* ── KEY FIX: style on ScrollView sets background so overscroll shows dark ── */}
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        style={S.scrollView}
        contentContainerStyle={S.scrollContent}
      >
        {/* Hero */}
        <View style={{ height: 480 }}>
          <ImageBackground
            source={{ uri: `https://image.tmdb.org/t/p/original${movie.backdrop_path || movie.poster_path}` }}
            style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.3)","rgba(0,0,0,0.05)","#0f0f12"]}
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
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.watchBtnIn}>
                  {authLoading
                    ? <ActivityIndicator size="small" color="#0f0f12" />
                    : <>
                        <Ionicons name={showStream ? "stop-circle" : "play"} size={17} color="#0f0f12" />
                        <Text style={S.watchBtnTxt}>
                          {showStream ? "Close Player" : isLoggedIn ? "Watch Movie" : "Sign In to Watch"}
                        </Text>
                      </>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={S.trailerBtn} onPress={() => setPlayTrailer(true)} activeOpacity={0.85}>
                <Ionicons name="film-outline" size={17} color="#fff" />
                <Text style={S.trailerBtnTxt}>Trailer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.saveBtn, isSaved && S.saveBtnActive]}
                onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving
                  ? <ActivityIndicator size="small" color="#AB8BFF" />
                  : <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20}
                      color={isSaved ? "#AB8BFF" : "#fff"} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!authLoading && !isLoggedIn && (
          <View style={S.signInBar}>
            <Ionicons name="lock-closed-outline" size={14} color="#AB8BFF" />
            <Text style={S.signInBarTxt}>Sign in to stream movies & save to watchlist</Text>
            <TouchableOpacity onPress={() => router.push(
              `/(auth)/sign-in?returnTo=${encodeURIComponent(`/movies/${id}`)}&autoPlay=true` as any)}>
              <Text style={S.signInBarCta}>Sign In →</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.genreRow}>
          {movie.genres?.map((g: any) => (
            <View key={g.id} style={S.genrePill}>
              <Text style={S.genrePillTxt}>{g.name}</Text>
            </View>
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
                  <Image
                    source={{ uri: TMDB_IMAGE(director.profile_path, "w185") ?? "https://placehold.co/44x44/1a1a2e/fff" }}
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
                      <View style={S.reviewAvatar}>
                        <Text style={S.reviewAvatarTxt}>{r.author?.[0]?.toUpperCase() ?? "?"}</Text>
                      </View>
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
  // ── KEY FIX: scrollView background prevents white on overscroll ──────────
  scrollView:       { flex: 1, backgroundColor: "#0f0f12" },
  scrollContent:    { paddingBottom: 90 },  // enough to clear tab bar, no huge gap
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