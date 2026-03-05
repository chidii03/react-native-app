// services/appwrite.ts
import { ID, Query } from "react-native-appwrite";
import { appwriteIds, databases } from "./appwriteConfig";

export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  [key: string]: any;
}

export interface TrendingMovie {
  id?: number | string;
  searchTerm: string;
  count: number;
  title: string;
  movie_id: number;
  poster_url: string;
  $id: string;
}

const { databaseId, metricsCollectionId, watchlistCollectionId } = appwriteIds;

// ── Search Metrics ────────────────────────────────────────────────────────────
export const updateSearchCount = async (query: string, movie: Movie) => {
  if (!query || !movie || !databaseId || !metricsCollectionId) return;
  try {
    const result = await databases.listDocuments(databaseId, metricsCollectionId, [
      Query.equal("searchTerm", query),
    ]);
    if (result.documents.length > 0) {
      await databases.updateDocument(databaseId, metricsCollectionId, result.documents[0].$id, {
        count: result.documents[0].count + 1,
      });
    } else {
      await databases.createDocument(databaseId, metricsCollectionId, ID.unique(), {
        searchTerm: query,
        count: 1,
        title: movie.title,
        movie_id: Number(movie.id),
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      });
    }
  } catch (e: any) {
    console.error("[appwrite] updateSearchCount error:", e?.code, e?.message);
  }
};

export const getTrendingMovies = async (): Promise<TrendingMovie[] | undefined> => {
  if (!databaseId || !metricsCollectionId) return undefined;
  try {
    const result = await databases.listDocuments(databaseId, metricsCollectionId, [
      Query.limit(10),
      Query.orderDesc("count"),
    ]);
    return result.documents as unknown as TrendingMovie[];
  } catch (e: any) {
    console.error("[appwrite] getTrendingMovies error:", e?.code, e?.message);
    return undefined;
  }
};

// ── Watchlist ─────────────────────────────────────────────────────────────────
export const toggleWatchlist = async (userId: string, movie: any): Promise<boolean> => {
  if (!userId || !movie?.id) return false;
  if (!databaseId || !watchlistCollectionId) {
    console.error("[appwrite] toggleWatchlist: missing databaseId or watchlistCollectionId");
    return false;
  }

  const movieId = Number(movie.id);
  if (Number.isNaN(movieId)) return false;

  try {
    // Check if already saved
    const result = await databases.listDocuments(databaseId, watchlistCollectionId, [
      Query.equal("user_id", userId),
      Query.equal("movie_id", movieId),
    ]);

    if (result.documents.length > 0) {
      // Remove from watchlist
      await databases.deleteDocument(databaseId, watchlistCollectionId, result.documents[0].$id);
      console.log("[appwrite] Removed from watchlist:", movie.title);
      return false;
    }

    // Add to watchlist
    const doc = await databases.createDocument(databaseId, watchlistCollectionId, ID.unique(), {
      user_id:      userId,
      movie_id:     movieId,
      title:        movie.title        ?? "",
      poster_path:  movie.poster_path  ?? "",
      vote_average: movie.vote_average ?? 0,
      release_date: movie.release_date ?? "",
      overview:     (movie.overview    ?? "").substring(0, 500), // limit to avoid exceeding string size
    });
    console.log("[appwrite] Added to watchlist:", movie.title, "docId:", doc.$id);
    return true;
  } catch (e: any) {
    console.error("[appwrite] toggleWatchlist error:", e?.code, e?.message);
    if (e?.code === 401 || e?.code === 403) {
      console.error("  ⚠️  PERMISSIONS ERROR on watchlist collection!");
      console.error("  ⚠️  Fix: Appwrite Console → Database → watchlist → Settings → Permissions");
      console.error("  ⚠️  Add: Users → Create, Read, Update, Delete");
    }
    return false;
  }
};

export const checkIsSaved = async (userId: string, movieId: number): Promise<boolean> => {
  if (!userId || !movieId || !databaseId || !watchlistCollectionId) return false;
  try {
    const result = await databases.listDocuments(databaseId, watchlistCollectionId, [
      Query.equal("user_id", userId),
      Query.equal("movie_id", Number(movieId)),
    ]);
    return result.documents.length > 0;
  } catch {
    return false;
  }
};

export const getSavedMovies = async (userId: string) => {
  if (!userId || !databaseId || !watchlistCollectionId) return [];
  try {
    const result = await databases.listDocuments(databaseId, watchlistCollectionId, [
      Query.equal("user_id", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);
    console.log("[appwrite] getSavedMovies:", result.documents.length, "items for user:", userId);
    return result.documents;
  } catch (e: any) {
    console.error("[appwrite] getSavedMovies error:", e?.code, e?.message);
    if (e?.code === 401 || e?.code === 403) {
      console.error("  ⚠️  PERMISSIONS ERROR: Set Read permission on watchlist collection for Users.");
    }
    return [];
  }
};

export const removeSavedMovie = async (userId: string, movieId: number): Promise<boolean> => {
  if (!userId || !movieId || !databaseId || !watchlistCollectionId) return false;
  try {
    const result = await databases.listDocuments(databaseId, watchlistCollectionId, [
      Query.equal("user_id", userId),
      Query.equal("movie_id", Number(movieId)),
    ]);
    if (result.documents.length > 0) {
      await databases.deleteDocument(databaseId, watchlistCollectionId, result.documents[0].$id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};