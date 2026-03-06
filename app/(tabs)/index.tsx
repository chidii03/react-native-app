import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView, FlatList, Image, Text, View, StyleSheet,
  ActivityIndicator, Platform, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { images } from "../../constants/images";
import SearchBar from "../../components/SearchBar";
import HeroSlider from "../../components/HeroSlider";
import SectionHeader from "../../components/SectionHeader";
import HorizontalPosterRow from "../../components/HorizontalPosterRow";
import LargeLandscapeCardRow from "../../components/LargeLandscapeCard";
import BentoGrid from "../../components/BentoGrid";
import GenreChipRow from "../../components/GenreChipRow";
import ComingSoonCardRow from "../../components/ComingSoonCard";
import TrendingCard from "../../components/TrendingCard";
import MovieCard from "../../components/MovieCard";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import useFetch from "../../services/useFetch";
import { getTrendingMovies } from "../../services/appwrite";
import { useLocale } from "../../context/LocaleContext";
import {
  fetchNowPlayingMovies, fetchTopRatedMovies, fetchUpcomingMovies,
  fetchActionMovies, fetchComedyMovies, fetchThrillerMovies, fetchRomanceMovies,
  fetchSciFiMovies, fetchHorrorMovies, fetchAnimationMovies, fetchPopularMovies,
  fetchDramaMovies, fetchCrimeMovies, fetchAdventureMovies, fetchMoviesByGenre,
  fetchNigerianMovies, fetchIndianMovies, fetchUkMovies,
} from "../../services/api";

// Inject web scrollbar CSS once
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    html, body, #root { height: 100%; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f0f12; }
    ::-webkit-scrollbar-thumb { background: rgba(171,139,255,0.35); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(171,139,255,0.6); }
    * { scrollbar-width: thin; scrollbar-color: rgba(171,139,255,0.35) #0f0f12; }
  `;
  document.head.appendChild(style);
}

export default function Index() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;
  const isTablet = width >= 768 && width < 1100;
  const [activeGenre, setActiveGenre] = useState("action");
  const fetchingRef = useRef<Set<string>>(new Set());

  const { data: trendingMovies, loading: trendingLoading } = useFetch(getTrendingMovies, true, [locale]);
  const { data: nowPlaying,     loading: nowPlayingLoading } = useFetch(fetchNowPlayingMovies, true, [locale]);
  const { data: nowPlayingP2 }  = useFetch(() => fetchNowPlayingMovies(2), true, [locale]);
  const { data: topRated }    = useFetch(fetchTopRatedMovies, true, [locale]);
  const { data: topRatedP2 }  = useFetch(() => fetchTopRatedMovies(2), true, [locale]);
  const { data: upcoming }    = useFetch(fetchUpcomingMovies, true, [locale]);
  const { data: upcomingP2 }  = useFetch(() => fetchUpcomingMovies(2), true, [locale]);
  const { data: popular }     = useFetch(fetchPopularMovies, true, [locale]);
  const { data: popularP2 }   = useFetch(() => fetchPopularMovies(2), true, [locale]);
  const { data: actionMovies }    = useFetch(fetchActionMovies, true, [locale]);
  const { data: actionMoviesP2 }  = useFetch(() => fetchMoviesByGenre("action", 2), true, [locale]);
  const { data: comedyMovies }    = useFetch(fetchComedyMovies, true, [locale]);
  const { data: thrillerMovies }  = useFetch(fetchThrillerMovies, true, [locale]);
  const { data: romanceMovies }   = useFetch(fetchRomanceMovies, true, [locale]);
  const { data: scifiMovies }     = useFetch(fetchSciFiMovies, true, [locale]);
  const { data: horrorMovies }    = useFetch(fetchHorrorMovies, true, [locale]);
  const { data: animationMovies } = useFetch(fetchAnimationMovies, true, [locale]);
  const { data: dramaMovies }     = useFetch(fetchDramaMovies, true, [locale]);
  const { data: dramaMoviesP2 }   = useFetch(() => fetchMoviesByGenre("drama", 2), true, [locale]);
  const { data: crimeMovies }     = useFetch(fetchCrimeMovies, true, [locale]);
  const { data: crimeMoviesP2 }   = useFetch(() => fetchMoviesByGenre("crime", 2), true, [locale]);
  const { data: adventureMovies } = useFetch(fetchAdventureMovies, true, [locale]);
  const { data: adventureMoviesP2 } = useFetch(() => fetchMoviesByGenre("adventure", 2), true, [locale]);
  const { data: nigerianMovies }  = useFetch(fetchNigerianMovies, true, [locale]);
  const { data: indianMovies }    = useFetch(fetchIndianMovies, true, [locale]);
  const { data: ukMovies }        = useFetch(fetchUkMovies, true, [locale]);

  const [genreCache, setGenreCache]     = useState<Record<string, any[]>>({});
  const [genreFetching, setGenreFetching] = useState<Set<string>>(new Set());

  // Sync pre-fetched genres into cache
  useEffect(() => {
    const updates: Record<string, any[]> = {};
    if (actionMovies?.length || actionMoviesP2?.length) {
      const seen = new Set<number>();
      updates.action = [...(actionMovies ?? []), ...(actionMoviesP2 ?? [])].filter((m: any) => {
        if (!m?.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    }
    if (comedyMovies?.length)    updates.comedy    = comedyMovies;
    if (thrillerMovies?.length)  updates.thriller  = thrillerMovies;
    if (romanceMovies?.length)   updates.romance   = romanceMovies;
    if (scifiMovies?.length)     updates.scifi     = scifiMovies;
    if (horrorMovies?.length)    updates.horror    = horrorMovies;
    if (animationMovies?.length) updates.animation = animationMovies;
    if (dramaMovies?.length)     updates.drama     = dramaMovies;
    if (crimeMovies?.length)     updates.crime     = crimeMovies;
    if (adventureMovies?.length) updates.adventure = adventureMovies;
    if (Object.keys(updates).length > 0) {
      setGenreCache(prev => ({ ...prev, ...updates }));
    }
  }, [actionMovies, actionMoviesP2, comedyMovies, thrillerMovies, romanceMovies, scifiMovies,
      horrorMovies, animationMovies, dramaMovies, crimeMovies, adventureMovies]);

  const handleGenreSelect = (genre: string) => {
    setActiveGenre(genre);
    if (genreCache[genre]?.length || fetchingRef.current.has(genre)) return;
    fetchingRef.current.add(genre);
    setGenreFetching(prev => new Set(prev).add(genre));
    fetchMoviesByGenre(genre as any)
      .then(data => { if (data?.length) setGenreCache(prev => ({ ...prev, [genre]: data })); })
      .finally(() => {
        fetchingRef.current.delete(genre);
        setGenreFetching(prev => { const s = new Set(prev); s.delete(genre); return s; });
      });
  };

  // Pre-load extra genres silently
  useEffect(() => {
    const t = setTimeout(async () => {
      const extras = ["fantasy", "family", "documentary", "mystery"];
      await Promise.all(extras.map(async (g) => {
        if (genreCache[g]?.length || fetchingRef.current.has(g)) return;
        fetchingRef.current.add(g);
        try {
          const data = await fetchMoviesByGenre(g as any);
          if (data?.length) setGenreCache(prev => ({ ...prev, [g]: data }));
        } finally { fetchingRef.current.delete(g); }
      }));
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const activeGenreMovies = useMemo(() => genreCache[activeGenre] ?? [], [activeGenre, genreCache]);
  const isFetchingActive  = genreFetching.has(activeGenre);
  const isLoading = trendingLoading || nowPlayingLoading;

  const curated = useMemo(() => {
    const hasPoster = (m: any) =>
      typeof m?.poster_path === "string" && m.poster_path.trim().length > 0;

    const uniqueList = (list: any[] = []) => {
      const local = new Set<number>();
      return list.filter((m: any) => {
        if (!m?.id || local.has(m.id) || !hasPoster(m)) return false;
        local.add(m.id);
        return true;
      });
    };

    const reserve = (
      primary: any[] | undefined,
      count: number,
      used: Set<number>,
      backup: any[]
    ) => {
      const out: any[] = [];

      for (const m of uniqueList(primary ?? [])) {
        if (used.has(m.id)) continue;
        used.add(m.id);
        out.push(m);
        if (out.length >= count) return out;
      }

      for (const m of backup) {
        if (!m?.id || used.has(m.id) || !hasPoster(m)) continue;
        used.add(m.id);
        out.push(m);
        if (out.length >= count) return out;
      }

      return out;
    };

    const masterPool = uniqueList([
      ...(nowPlaying ?? []), ...(nowPlayingP2 ?? []),
      ...(topRated ?? []), ...(topRatedP2 ?? []),
      ...(upcoming ?? []), ...(upcomingP2 ?? []),
      ...(popular ?? []), ...(popularP2 ?? []),
      ...(actionMovies ?? []), ...(actionMoviesP2 ?? []),
      ...(comedyMovies ?? []), ...(thrillerMovies ?? []), ...(romanceMovies ?? []),
      ...(scifiMovies ?? []), ...(horrorMovies ?? []), ...(animationMovies ?? []),
      ...(dramaMovies ?? []), ...(dramaMoviesP2 ?? []), ...(crimeMovies ?? []),
      ...(crimeMoviesP2 ?? []), ...(adventureMovies ?? []), ...(adventureMoviesP2 ?? []),
      ...(nigerianMovies ?? []), ...(indianMovies ?? []), ...(ukMovies ?? []),
      ...(genreCache.fantasy ?? []), ...(genreCache.family ?? []), ...(activeGenreMovies ?? []),
    ]);

    const usedIds = new Set<number>();
    return {
      hero: reserve([...(nowPlaying ?? []), ...(nowPlayingP2 ?? [])], 12, usedIds, masterPool),
      topRated: reserve([...(topRated ?? []), ...(topRatedP2 ?? [])], 12, usedIds, masterPool),
      action: reserve([...(actionMovies ?? []), ...(actionMoviesP2 ?? [])], 20, usedIds, masterPool),
      popular: reserve([...(popular ?? []), ...(popularP2 ?? [])], 28, usedIds, masterPool),
      activeGenre: reserve(activeGenreMovies, 28, usedIds, masterPool),
      fantasy: reserve(genreCache.fantasy, 10, usedIds, masterPool),
      family: reserve(genreCache.family, 10, usedIds, masterPool),
      drama: reserve([...(dramaMovies ?? []), ...(dramaMoviesP2 ?? [])], 16, usedIds, masterPool),
      crime: reserve([...(crimeMovies ?? []), ...(crimeMoviesP2 ?? [])], 16, usedIds, masterPool),
      adventure: reserve([...(adventureMovies ?? []), ...(adventureMoviesP2 ?? [])], 16, usedIds, masterPool),
      nigeria: reserve(nigerianMovies, 10, usedIds, masterPool),
      india: reserve(indianMovies, 10, usedIds, masterPool),
      uk: reserve(ukMovies, 10, usedIds, masterPool),
      upcoming: reserve([...(upcoming ?? []), ...(upcomingP2 ?? [])], 14, usedIds, masterPool),
      nowTheatres: reserve([...(nowPlaying ?? []), ...(nowPlayingP2 ?? [])], isDesktop ? 18 : 9, usedIds, masterPool),
    };
  }, [
    nowPlaying, nowPlayingP2, topRated, topRatedP2, actionMovies, actionMoviesP2, popular, popularP2, activeGenreMovies,
    genreCache.fantasy, genreCache.family, upcoming, upcomingP2, dramaMovies, dramaMoviesP2, crimeMovies,
    crimeMoviesP2, adventureMovies, adventureMoviesP2, scifiMovies, horrorMovies, animationMovies,
    nigerianMovies, indianMovies, ukMovies, isDesktop,
  ]);

  return (
    <View style={styles.root}>
      <Image source={images.bg} style={styles.bg} resizeMode="cover" />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#AB8BFF" />
          <Text style={styles.loaderTxt}>{t("loading_movies", "Loading movies...")}</Text>
        </View>
      ) : (
        <ScrollView
          // showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <Header />
          <View style={styles.searchWrap}>
            <SearchBar placeholder={t("search_placeholder_short", "Search 300+ movies...")} onPress={() => router.push("/search")} />
          </View>

          {!!curated.hero.length && (
            <View style={{ marginTop: 14 }}>
              <HeroSlider movies={curated.hero} />
            </View>
          )}

          {!!trendingMovies?.length && (
            <>
              <SectionHeader title={t("trending_now", "Trending Now")} subtitle={t("updated_daily", "Updated daily")} />
              <FlatList
                horizontal showsHorizontalScrollIndicator={false}
                data={trendingMovies}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 20 }}
                keyExtractor={(item) => (item.movie_id ?? item.id).toString()}
                renderItem={({ item, index }) => <TrendingCard movie={item} index={index} />}
              />
            </>
          )}

          {!!curated.topRated.length && (
            <>
              <SectionHeader title={t("top_rated", "Top Rated")} subtitle="IMDB 8.0+" onSeeAll={() => router.push("/search")} />
              <LargeLandscapeCardRow data={curated.topRated} />
            </>
          )}

          {!!curated.action.length && (
            <>
              <SectionHeader title={t("action_picks", "Action Picks")} subtitle={t("action_picks_sub", "High-octane cinema")} />
              <BentoGrid movies={curated.action} />
            </>
          )}

          {!!curated.popular.length && (
            <>
              <SectionHeader title={t("popular_right_now", "Popular Right Now")} subtitle={t("most_watched", "Most watched")} onSeeAll={() => router.push("/search")} />
              <HorizontalPosterRow data={curated.popular} />
            </>
          )}

          <SectionHeader title={t("browse_by_genre", "Browse by Genre")} />
          <GenreChipRow activeGenre={activeGenre} onSelect={handleGenreSelect} />

          {curated.activeGenre.length > 0 ? (
            <View style={{ marginTop: 14 }}>
              <HorizontalPosterRow data={curated.activeGenre} />
            </View>
          ) : isFetchingActive ? (
            <View style={{ marginTop: 14, alignItems: "center", paddingVertical: 12 }}>
              <ActivityIndicator size="small" color="#AB8BFF" />
            </View>
          ) : null}

          {curated.fantasy.length > 0 && (
            <>
              <SectionHeader title={t("fantasy", "Fantasy")} subtitle={t("fantasy_sub", "Magic & wonder")} />
              <HorizontalPosterRow data={curated.fantasy} />
            </>
          )}

          {curated.family.length > 0 && (
            <>
              <SectionHeader title={t("family", "Family")} subtitle={t("family_sub", "Watch together")} />
              <HorizontalPosterRow data={curated.family} />
            </>
          )}

          {curated.drama.length > 0 && (
            <>
              <SectionHeader title={t("drama_spotlight", "Drama Spotlight")} subtitle={t("drama_spotlight_sub", "Powerful stories")} />
              <HorizontalPosterRow data={curated.drama} />
            </>
          )}

          {curated.crime.length > 0 && (
            <>
              <SectionHeader title={t("crime_files", "Crime Files")} subtitle={t("crime_files_sub", "Dark investigations")} />
              <HorizontalPosterRow data={curated.crime} />
            </>
          )}

          {curated.adventure.length > 0 && (
            <>
              <SectionHeader title={t("adventure_world", "Adventure World")} subtitle={t("adventure_world_sub", "Epic journeys")} />
              <HorizontalPosterRow data={curated.adventure} />
            </>
          )}

          {curated.nigeria.length > 0 && (
            <>
              <SectionHeader title={t("top_in_nigeria", "Top in Nigeria")} subtitle={t("top_in_nigeria_sub", "Local audience favorites")} />
              <HorizontalPosterRow data={curated.nigeria} />
            </>
          )}

          {curated.india.length > 0 && (
            <>
              <SectionHeader title={t("india_picks", "India Picks")} subtitle={t("india_picks_sub", "Popular regional hits")} />
              <HorizontalPosterRow data={curated.india} />
            </>
          )}

          {curated.uk.length > 0 && (
            <>
              <SectionHeader title={t("uk_highlights", "UK Highlights")} subtitle={t("uk_highlights_sub", "Trending in Great Britain")} />
              <HorizontalPosterRow data={curated.uk} />
            </>
          )}

          {curated.upcoming.length > 0 && (
            <>
              <SectionHeader title={t("coming_soon", "Coming Soon")} subtitle={t("coming_soon_sub", "Mark your calendar")} />
              <ComingSoonCardRow data={curated.upcoming} />
            </>
          )}

          {curated.nowTheatres.length > 0 && (
            <>
              <SectionHeader title={t("now_in_theatres", "Now In Theatres")} subtitle={t("book_your_tickets", "Book your tickets")} />
              <View style={[styles.gridWrap, isDesktop && styles.gridWrapDesktop, isTablet && styles.gridWrapTablet]}>
                {curated.nowTheatres.map((item: any) => (
                  <MovieCard key={item.id} {...item} />
                ))}
              </View>
            </>
          )}

          <Footer />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#0f0f12" },
  bg:         { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  loader:     { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderTxt:  { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  searchWrap: { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  gridWrap:   { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 14, marginTop: 4, justifyContent: "flex-start", alignItems: "flex-start" },
  gridWrapDesktop: { alignSelf: "center", width: "100%", maxWidth: 1240, justifyContent: "flex-start" },
  gridWrapTablet:  { maxWidth: 980 },
});
