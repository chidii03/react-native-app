import {
  StyleSheet,
  Image,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import React, { useEffect, useState } from "react";
import { images } from "../../constants/images";
import useFetch from "../../services/useFetch";
import MovieCard from "../../components/MovieCard";
import { fetchMovies } from "../../services/api";
import { icons } from "../../constants/icons";
import SearchBar from "../../components/SearchBar";
import { updateSearchCount, Movie } from "../../services/appwrite";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocale } from "../../context/LocaleContext";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { locale, t } = useLocale();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const desktopCols = width >= 1700 ? 7 : width >= 1450 ? 6 : width >= 1200 ? 5 : width >= 900 ? 4 : 3;
  const numColumns = isWeb ? desktopCols : 3;
  const maxGridWidth = isWeb ? 1560 : width;
  const sidePadding = 40;
  const columnGap = isWeb ? 18 : 16;
  const cardWidth = Math.floor(
    (Math.min(width, maxGridWidth) - sidePadding - columnGap * (numColumns - 1)) / numColumns
  );

  const {
    data: movies,
    loading,
    error,
    refetch: loadMovies,
    reset,
  } = useFetch<Movie[]>(() => fetchMovies({ query: searchQuery }), false, [locale]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        await loadMovies();
      } else {
        reset();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (!loading && movies && movies.length > 0 && searchQuery.trim()) {
      updateSearchCount(searchQuery, movies[0]);
    }
  }, [movies, loading]);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <Image source={images.bg} style={styles.bg} resizeMode="cover" />

      <FlatList
        key={`search-grid-${numColumns}`}
        data={movies ?? []}
        renderItem={({ item }) => (
          <MovieCard
            adult={false}
            backdrop_path={""}
            genre_ids={[]}
            original_language={""}
            original_title={""}
            overview={""}
            popularity={0}
            release_date={""}
            video={false}
            vote_average={0}
            vote_count={0}
            desktopWidthOverride={isWeb ? cardWidth : undefined}
            {...item}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        className="px-5"
        numColumns={numColumns}
        columnWrapperStyle={{
          justifyContent: isWeb ? "flex-start" : "center",
          gap: columnGap,
          marginVertical: 16,
        }}
        contentContainerStyle={{
          paddingBottom: 100,
          alignSelf: "center",
          width: "100%",
          maxWidth: maxGridWidth,
        }}
        ListHeaderComponent={
          <>
            <View className="w-full flex-row justify-center mt-10 mb-4 items-center">
              <Image source={icons.logo} className="w-12 h-10" />
            </View>

            <View className="my-1">
              <SearchBar
                placeholder={t("search_placeholder", "Search through 300+ movies online")}
                value={searchQuery}
                onChangeText={(text: string) => setSearchQuery(text)}
              />
            </View>

            {loading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                className="mt-10 self-center"
              />
            )}

            {error && (
              <Text className="text-red-500 text-2xl text-center justify-center px-5 my-3">
                {t("error_prefix", "Error")}: {error.message} {t("try_wifi", "try connecting to wifi")}
              </Text>
            )}

            {!loading &&
              !error &&
              searchQuery.trim() &&
              movies &&
              movies.length > 0 && (
                <Text className="text-xl text-white font-bold">
                  {t("search_results_for", "Search Results for")}{" "}
                  <Text className="text-accent">{searchQuery}</Text>
                </Text>
              )}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View className="mt-10 px-5">
              <Text className="text-center text-white">
                {searchQuery.trim()
                  ? t("search_empty", "No movies found")
                  : t("search_start_typing", "Start typing to search for movies")}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default Search;

const styles = StyleSheet.create({
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
});
