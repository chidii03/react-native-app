import AsyncStorage from "@react-native-async-storage/async-storage";
import { appwriteIds, databases } from "./appwriteConfig";

const LINKS_KEY = "movietime_full_movie_links";
const PROGRESS_KEY = "movietime_playback_progress";

const { databaseId, streamsCollectionId, playbackCollectionId } = appwriteIds as any;

const loadJson = async (key: string): Promise<Record<string, any>> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveJson = async (key: string, value: Record<string, any>) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

const linkKey = (userId: string, movieId: number) => `${userId}:${movieId}`;

export const getFullMovieLink = async (userId: string, movieId: number): Promise<string | null> => {
  if (!userId || !movieId) return null;

  // Appwrite (if configured)
  if (databaseId && streamsCollectionId) {
    try {
      const docId = `link-${userId}-${movieId}`;
      const doc = await databases.getDocument(databaseId, streamsCollectionId, docId);
      return (doc as any)?.url ?? null;
    } catch {
      // fall through
    }
  }

  // Local fallback
  const data = await loadJson(LINKS_KEY);
  return data[linkKey(userId, movieId)] ?? null;
};

export const setFullMovieLink = async (userId: string, movieId: number, url: string) => {
  if (!userId || !movieId || !url) return;

  // Appwrite (if configured)
  if (databaseId && streamsCollectionId) {
    try {
      const docId = `link-${userId}-${movieId}`;
      try {
        await databases.getDocument(databaseId, streamsCollectionId, docId);
        await databases.updateDocument(databaseId, streamsCollectionId, docId, { url });
      } catch (e: any) {
        if (e?.code === 404) {
          await databases.createDocument(databaseId, streamsCollectionId, docId, { user_id: userId, movie_id: movieId, url });
        } else {
          throw e;
        }
      }
      return;
    } catch {
      // fall through
    }
  }

  const data = await loadJson(LINKS_KEY);
  data[linkKey(userId, movieId)] = url;
  await saveJson(LINKS_KEY, data);
};

export const getPlaybackProgress = async (userId: string, movieId: number): Promise<number> => {
  if (!userId || !movieId) return 0;

  if (databaseId && playbackCollectionId) {
    try {
      const docId = `play-${userId}-${movieId}`;
      const doc = await databases.getDocument(databaseId, playbackCollectionId, docId);
      return Number((doc as any)?.position ?? 0);
    } catch {
      // fall through
    }
  }

  const data = await loadJson(PROGRESS_KEY);
  return Number(data[linkKey(userId, movieId)] ?? 0);
};

export const setPlaybackProgress = async (userId: string, movieId: number, position: number) => {
  if (!userId || !movieId) return;
  const pos = Math.max(0, Math.floor(position || 0));

  if (databaseId && playbackCollectionId) {
    try {
      const docId = `play-${userId}-${movieId}`;
      try {
        await databases.getDocument(databaseId, playbackCollectionId, docId);
        await databases.updateDocument(databaseId, playbackCollectionId, docId, {
          position: pos,
          updated_at: new Date().toISOString(),
        });
      } catch (e: any) {
        if (e?.code === 404) {
          await databases.createDocument(databaseId, playbackCollectionId, docId, {
            user_id: userId,
            movie_id: movieId,
            position: pos,
            updated_at: new Date().toISOString(),
          });
        } else {
          throw e;
        }
      }
      return;
    } catch {
      // fall through
    }
  }

  const data = await loadJson(PROGRESS_KEY);
  data[linkKey(userId, movieId)] = pos;
  await saveJson(PROGRESS_KEY, data);
};
