import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ID, OAuthProvider, Query } from "react-native-appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { account, appwriteIds, databases } from "../services/appwriteConfig";

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  [key: string]: any;
}

interface AuthCtx {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  trialStartDate: string | null;
  login: (email: string, password: string) => Promise<{ username: string }>;
  register: (email: string, password: string, name: string) => Promise<{ username: string }>;
  loginWithOAuth: (provider: OAuthProvider.Google | OAuthProvider.Facebook) => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  trialStartDate: null,
  login: async () => ({ username: "" }),
  register: async () => ({ username: "" }),
  loginWithOAuth: async () => {},
  logout: async () => {},
  updateDisplayName: async () => {},
});

const TRIAL_KEY = "movietime_trial_start";

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`__TIMEOUT_${ms}__`)), ms)),
  ]);

const safeStorageGet = async (key: string, timeoutMs = 1500): Promise<string | null> => {
  try {
    return await withTimeout(AsyncStorage.getItem(key), timeoutMs);
  } catch {
    return null;
  }
};

const safeStorageSet = async (key: string, value: string, timeoutMs = 1500): Promise<void> => {
  try {
    await withTimeout(AsyncStorage.setItem(key, value), timeoutMs);
  } catch {
    // Ignore storage failure so auth flow is never blocked.
  }
};

const initTrial = async (): Promise<string> => {
  const stored = await safeStorageGet(TRIAL_KEY);
  if (stored) return stored;

  const now = new Date().toISOString();
  await safeStorageSet(TRIAL_KEY, now);
  return now;
};

const syncUserToDB = async (userId: string, name: string, email: string) => {
  const { databaseId, usersCollectionId } = appwriteIds;
  if (!databaseId || !usersCollectionId) return;

  const normalizedName = (name || "Movie Fan").trim();
  const normalizedEmail = email.trim().toLowerCase();
  const docId = `user-${userId}`;

  const fullPayload = {
    user_id: userId,
    name: normalizedName,
    email: normalizedEmail,
    joined_at: new Date().toISOString(),
    plan: "free",
    is_active: true,
  };

  const minimalPayload = {
    name: normalizedName,
    email: normalizedEmail,
    joined_at: new Date().toISOString(),
    plan: "free",
  };

  const createOrUpdateByDocId = async (payload: Record<string, any>) => {
    try {
      await databases.getDocument(databaseId, usersCollectionId, docId);
      await databases.updateDocument(databaseId, usersCollectionId, docId, payload);
      return "updated";
    } catch (e: any) {
      if (e?.code !== 404) throw e;
      await databases.createDocument(databaseId, usersCollectionId, docId, payload);
      return "created";
    }
  };

  const updateByUserIdQuery = async (payload: Record<string, any>) => {
    const existing = await databases.listDocuments(databaseId, usersCollectionId, [
      Query.equal("user_id", userId),
      Query.limit(1),
    ]);
    if (existing.documents.length === 0) return false;
    await databases.updateDocument(databaseId, usersCollectionId, existing.documents[0].$id, payload);
    return true;
  };

  try {
    try {
      const updated = await updateByUserIdQuery(fullPayload);
      if (updated) {
        console.log("[Auth] user row updated in DB by user_id");
        return;
      }
    } catch (queryErr: any) {
      const msg = String(queryErr?.message ?? "").toLowerCase();
      if (!(queryErr?.code === 400 || msg.includes("attribute") || msg.includes("index"))) {
        throw queryErr;
      }
    }

    const result = await createOrUpdateByDocId(fullPayload);
    console.log(`[Auth] user row ${result} in DB`);
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    const isSchemaMismatch =
      e?.code === 400 || msg.includes("attribute") || msg.includes("invalid document structure");

    if (isSchemaMismatch) {
      try {
        const result = await createOrUpdateByDocId(minimalPayload);
        console.log(`[Auth] user row ${result} in DB with minimal schema payload`);
        return;
      } catch (fallbackErr: any) {
        console.error("[Auth] syncUserToDB fallback error:", fallbackErr?.code, fallbackErr?.message);
      }
    }

    if (e?.code === 401 || e?.code === 403) {
      console.error("[Auth] Permission error on users collection.");
      console.error("  Fix: Appwrite Console -> Database -> users -> Settings -> Permissions -> Users: Create, Read, Update, Delete");
    } else {
      console.error("[Auth] syncUserToDB error:", e?.code, e?.message);
    }
  }
};

const pickOAuthAvatar = (u: AuthUser | null | undefined): string => {
  if (!u) return "";
  const candidates = [
    u?.prefs?.avatar_url,
    u?.prefs?.picture,
    u?.prefs?.avatar,
    u?.picture,
    u?.avatar,
    u?.avatarUrl,
    u?.profilePicture,
  ];
  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
  }
  return "";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [trialStart, setTrialStart] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const u = (await withTimeout(account.get(), 3000)) as AuthUser;
        if (!alive) return;

        const oauthAvatar = pickOAuthAvatar(u);
        if (!u?.prefs?.avatar_url && oauthAvatar) {
          try {
            await account.updatePrefs({ ...(u.prefs ?? {}), avatar_url: oauthAvatar } as any);
            u.prefs = { ...(u.prefs ?? {}), avatar_url: oauthAvatar };
          } catch {
            // Non-blocking: auth should continue even if prefs update fails.
          }
        }

        setUser(u);
        const t = await initTrial();
        setTrialStart(t);
        syncUserToDB(u.$id, u.name, u.email).catch(() => {});
      } catch (e: any) {
        if (!alive) return;
        const msg = String(e?.message ?? "");

        if (msg.includes("__TIMEOUT_")) {
          console.warn("[Auth] Timeout during account.get(). Treating as guest.");
        } else if (e?.code === 401) {
          console.log("[Auth] No active session. Guest mode.");
        } else {
          console.warn("[Auth] Boot error:", e?.code, e?.message);
        }

        setUser(null);
        const t = await safeStorageGet(TRIAL_KEY);
        setTrialStart(t);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ username: string }> => {
    const em = email.trim().toLowerCase();

    try {
      await account.deleteSession("current");
    } catch {}

    await account.createEmailPasswordSession(em, password);

    const u = (await withTimeout(account.get(), 8000)) as AuthUser;
    setUser(u);

    const t = await initTrial();
    setTrialStart(t);
    syncUserToDB(u.$id, u.name, u.email).catch(() => {});

    return { username: (u.name || em.split("@")[0]).trim() };
  };

  const register = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ username: string }> => {
    const em = email.trim().toLowerCase();
    const n = (name || "Movie Fan").trim();

    await account.create(ID.unique(), em, password, n);

    await account.createEmailPasswordSession(em, password);

    const u = (await withTimeout(account.get(), 8000)) as AuthUser;
    setUser(u);

    const t = await initTrial();
    setTrialStart(t);

    await syncUserToDB(u.$id, n, em);

    return { username: n };
  };

  const loginWithOAuth = async (provider: OAuthProvider.Google | OAuthProvider.Facebook) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    await account.createOAuth2Session(
      provider,
      base ? `${base}/` : undefined,
      base ? `${base}/(auth)/sign-in` : undefined,
    );
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
    } catch {}
    setUser(null);
  };

  const updateDisplayName = async (name: string) => {
    const n = (name || "").trim();
    if (!n || !user) return;
    await account.updateName(n);
    setUser((prev) => (prev ? { ...prev, name: n } : prev));
    syncUserToDB(user.$id, n, user.email).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        trialStartDate: trialStart,
        login,
        register,
        loginWithOAuth,
        logout,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
