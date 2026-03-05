import { getTMDBLanguage } from "./locale";

// services/api.ts

export const TMDB_CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  API_KEY: process.env.EXPO_PUBLIC_MOVIE_API_KEY,
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
  },
};

// ── REAL TMDB Genre IDs (verified from https://api.themoviedb.org/3/genre/movie/list)
export const GENRE_IDS = {
  action:      28,
  adventure:   12,
  animation:   16,
  comedy:      35,
  crime:       80,
  documentary: 99,
  drama:       18,
  family:      10751,
  fantasy:     14,
  history:     36,
  horror:      27,
  music:       10402,
  mystery:     9648,
  romance:     10749,
  scifi:       878,
  thriller:    53,
  war:         10752,
  western:     37,
};

export type GenreKey = keyof typeof GENRE_IDS;

// ── Core Fetcher
const fetchFromTMDB = async (endpoint: string) => {
  const response = await fetch(`${TMDB_CONFIG.BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: TMDB_CONFIG.headers,
  });
  if (!response.ok) throw new Error(`TMDB fetch failed: ${response.status}`);
  return response.json();
};

const withLanguage = (endpoint: string) => {
  const lang = getTMDBLanguage();
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}language=${encodeURIComponent(lang)}`;
};

// ── Image Helper
export const TMDB_IMAGE = (path?: string | null, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

// ── Search & Discover
export const fetchMovies = async ({ query }: { query: string }) => {
  const endpoint = query
    ? withLanguage(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false`)
    : withLanguage(`/discover/movie?sort_by=popularity.desc&include_adult=true`);
  const data = await fetchFromTMDB(endpoint);
  return data.results;
};

// ── Movie Details (all parallel)
export const fetchMovieDetails = async (movieId: string) => {
  const [details, credits, videos, similar, reviews] = await Promise.all([
    fetchFromTMDB(withLanguage(`/movie/${movieId}`)),
    fetchFromTMDB(withLanguage(`/movie/${movieId}/credits`)),
    fetchFromTMDB(withLanguage(`/movie/${movieId}/videos`)),
    fetchFromTMDB(withLanguage(`/movie/${movieId}/similar?page=1`)),
    fetchFromTMDB(withLanguage(`/movie/${movieId}/reviews?page=1`)),
  ]);

  return {
    ...details,
    cast: credits.cast.slice(0, 15),
    crew: credits.crew.filter((c: any) =>
      ['Director', 'Writer', 'Screenplay', 'Story'].includes(c.job)
    ),
    videos: videos.results,
    similar: similar.results,
    reviews: reviews.results?.slice(0, 5),
  };
};

// ── Curated Lists
export const fetchUpcomingMovies = async (page = 1) => {
  const data = await fetchFromTMDB(withLanguage(`/movie/upcoming?page=${page}`));
  return data.results;
};
export const fetchTopRatedMovies = async (page = 1) => {
  const data = await fetchFromTMDB(withLanguage(`/movie/top_rated?page=${page}`));
  return data.results;
};
export const fetchNowPlayingMovies = async (page = 1) => {
  const data = await fetchFromTMDB(withLanguage(`/movie/now_playing?page=${page}`));
  return data.results;
};
export const fetchPopularMovies = async (page = 1) => {
  const data = await fetchFromTMDB(withLanguage(`/movie/popular?page=${page}`));
  return data.results;
};

// ── Trending
export const fetchTrendingToday = async () => {
  const data = await fetchFromTMDB(withLanguage('/trending/movie/day'));
  return data.results;
};
export const fetchTrendingWeek = async () => {
  const data = await fetchFromTMDB(withLanguage('/trending/movie/week'));
  return data.results;
};

// ── By Genre
export const fetchMoviesByGenre = async (genreKey: GenreKey, page = 1) => {
  const genreId = GENRE_IDS[genreKey];
  const data = await fetchFromTMDB(
    withLanguage(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&include_adult=false&page=${page}`)
  );
  return data.results;
};

export const fetchRegionalMovies = async (region: string, page = 1) => {
  const data = await fetchFromTMDB(
    withLanguage(`/discover/movie?region=${encodeURIComponent(region)}&sort_by=popularity.desc&include_adult=false&page=${page}`)
  );
  return data.results;
};

export const fetchActionMovies      = () => fetchMoviesByGenre('action');
export const fetchComedyMovies      = () => fetchMoviesByGenre('comedy');
export const fetchRomanceMovies     = () => fetchMoviesByGenre('romance');
export const fetchThrillerMovies    = () => fetchMoviesByGenre('thriller');
export const fetchHorrorMovies      = () => fetchMoviesByGenre('horror');
export const fetchAnimationMovies   = () => fetchMoviesByGenre('animation');
export const fetchSciFiMovies       = () => fetchMoviesByGenre('scifi');
export const fetchCrimeMovies       = () => fetchMoviesByGenre('crime');
export const fetchDramaMovies       = () => fetchMoviesByGenre('drama');
export const fetchFantasyMovies     = () => fetchMoviesByGenre('fantasy');
export const fetchDocumentaryMovies = () => fetchMoviesByGenre('documentary');
export const fetchFamilyMovies      = () => fetchMoviesByGenre('family');
export const fetchAdventureMovies   = () => fetchMoviesByGenre('adventure');
export const fetchMysteryMovies     = () => fetchMoviesByGenre('mystery');
export const fetchWarMovies         = () => fetchMoviesByGenre('war');
export const fetchWesternMovies     = () => fetchMoviesByGenre('western');
export const fetchNigerianMovies    = () => fetchRegionalMovies('NG');
export const fetchIndianMovies      = () => fetchRegionalMovies('IN');
export const fetchUkMovies          = () => fetchRegionalMovies('GB');

// ── All Home Data (one parallel call)
export const fetchHomeData = async () => {
  const [
    trending, nowPlaying, topRated, upcoming, popular,
    action, comedy, thriller, romance, scifi,
    horror, animation, drama, crime, adventure,
  ] = await Promise.all([
    fetchTrendingWeek(), fetchNowPlayingMovies(), fetchTopRatedMovies(),
    fetchUpcomingMovies(), fetchPopularMovies(),
    fetchActionMovies(), fetchComedyMovies(), fetchThrillerMovies(),
    fetchRomanceMovies(), fetchSciFiMovies(), fetchHorrorMovies(),
    fetchAnimationMovies(), fetchDramaMovies(), fetchCrimeMovies(),
    fetchAdventureMovies(),
  ]);
  return {
    trending, nowPlaying, topRated, upcoming, popular,
    genres: { action, comedy, thriller, romance, scifi, horror, animation, drama, crime, adventure },
  };
};

// ── Genre List
export const fetchGenreList = async () => {
  const data = await fetchFromTMDB(withLanguage('/genre/movie/list'));
  return data.genres as { id: number; name: string }[];
};

// ── Person / Cast
export const fetchPersonDetails = async (personId: string) => {
  const [details, credits] = await Promise.all([
    fetchFromTMDB(withLanguage(`/person/${personId}`)),
    fetchFromTMDB(withLanguage(`/person/${personId}/movie_credits`)),
  ]);
  return { ...details, known_for: credits.cast.slice(0, 10) };
};

// ── Movie Reviews
export const fetchMovieReviews = async (movieId: string) => {
  const data = await fetchFromTMDB(withLanguage(`/movie/${movieId}/reviews?page=1`));
  return data.results;
};

// ── Keyword Search
export const fetchMoviesByKeyword = async (keywordId: number) => {
  const data = await fetchFromTMDB(
    `/discover/movie?with_keywords=${keywordId}&sort_by=popularity.desc`
  );
  return data.results;
};

// ── Collections
export const fetchCollection = async (collectionId: number) =>
  fetchFromTMDB(withLanguage(`/collection/${collectionId}`));
