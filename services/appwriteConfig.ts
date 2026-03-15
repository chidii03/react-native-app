// services/appwriteConfig.ts
import { Account, Client, Databases, Functions, OAuthProvider } from "react-native-appwrite";

const ENDPOINT   = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "699381200024b709931f";

export const appwriteIds = {
  databaseId:            process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID    ?? "6993828d00292694ff2f",
  metricsCollectionId:   process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID  ?? "699383bc003c8f42c29a",
  usersCollectionId:     process.env.EXPO_PUBLIC_APPWRITE_USERS_ID       ?? "6998723f003a3e0bfb03",
  watchlistCollectionId: process.env.EXPO_PUBLIC_APPWRITE_WATCHLIST_ID   ?? "699798ce0022a06aad54",
  streamsCollectionId:   process.env.EXPO_PUBLIC_APPWRITE_STREAMS_ID     ?? "",
  playbackCollectionId:  process.env.EXPO_PUBLIC_APPWRITE_PLAYBACK_ID    ?? "",
  supportFunctionId:     process.env.EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID ?? "69b688f20036184f0e7f",
};

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  // ── THIS LINE FIXES "User (role: guests) missing scopes" ──────────────────
  // It registers movietimeapp.vercel.app as an allowed platform for this project.
  // Must exactly match what you add in Appwrite Console → Settings → Platforms.
  .setPlatform("movietimeapp.vercel.app");

export const appwriteClient = client;
export const account        = new Account(client);
export const databases      = new Databases(client);
export const functions      = new Functions(client);   // ← used by supportService.ts

export const supportedOAuthProviders = [
  OAuthProvider.Google,
  OAuthProvider.Facebook,
] as const;

export const debugConfig = () =>
  console.log("[Appwrite]", { ENDPOINT, PROJECT_ID, ...appwriteIds });