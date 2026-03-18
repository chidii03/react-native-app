// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ID, OAuthProvider, Query } from "react-native-appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { account, appwriteIds, databases } from "../services/appwriteConfig";

export const OWNER_EMAILS = ["chidiokwu795@gmail.com"];

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  registration?: string;
  prefs?: Record<string, any>;
  [key: string]: any;
}

interface AuthCtx {
  user:              AuthUser | null;
  isLoading:         boolean;
  isLoggedIn:        boolean;
  isSubscribed:      boolean;
  isOwner:           boolean;
  trialStartDate:    string | null;
  login:             (email: string, password: string) => Promise<{ username: string }>;
  register:          (email: string, password: string, name: string) => Promise<{ username: string }>;
  loginWithOAuth:    (provider: OAuthProvider) => Promise<void>;
  logout:            () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  refreshUser:       () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, isLoading: true, isLoggedIn: false,
  isSubscribed: false, isOwner: false, trialStartDate: null,
  login: async () => ({ username: "" }),
  register: async () => ({ username: "" }),
  loginWithOAuth: async () => {},
  logout: async () => {},
  updateDisplayName: async () => {},
  refreshUser: async () => {},
});

const TRIAL_KEY = "movietime_trial_start";

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`__TIMEOUT_${ms}__`)), ms)
    ),
  ]);

const safeGet = async (key: string): Promise<string | null> => {
  try { return await withTimeout(AsyncStorage.getItem(key), 1500); } catch { return null; }
};
const safeSet = async (key: string, value: string): Promise<void> => {
  try { await withTimeout(AsyncStorage.setItem(key, value), 1500); } catch {}
};
const initTrial = async (): Promise<string> => {
  const stored = await safeGet(TRIAL_KEY);
  if (stored) return stored;
  const now = new Date().toISOString();
  await safeSet(TRIAL_KEY, now);
  return now;
};

const checkIsOwner      = (email: string) => OWNER_EMAILS.includes(email.trim().toLowerCase());
const checkIsSubscribed = (user: AuthUser | null, dbSubscribed?: boolean) => {
  if (!user) return false;
  if (checkIsOwner(user.email)) return true;
  // Check both Appwrite account prefs AND database document (admin may have upgraded via DB)
  if (dbSubscribed === true) return true;
  return user.prefs?.subscribed === true;
};

// ── Fetch Google profile picture from Appwrite OAuth identities ───────────────
// FIX TS2339: cast the result to `any` so TypeScript doesn't complain about
// `identities` not existing on `unknown`. The Appwrite SDK types this as
// a generic response object but the property IS there at runtime.
const fetchGoogleAvatar = async (): Promise<string | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await withTimeout((account as any).listIdentities(), 3000) as any;
    const identities: any[] = result?.identities ?? [];
    const google = identities.find((id: any) => id.provider === "google");
    if (!google?.providerAccessToken) return null;

    const res = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${google.providerAccessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    return (data?.picture as string) ?? null;
  } catch {
    return null;
  }
};

// ── Sync Google avatar to Appwrite prefs ──────────────────────────────────────
const syncGoogleAvatar = async (u: AuthUser): Promise<AuthUser> => {
  if (u.prefs?.avatar_url) return u; // already has a photo, skip
  const googlePic = await fetchGoogleAvatar();
  if (!googlePic) return u;
  try {
    const merged = { ...(u.prefs ?? {}), avatar_url: googlePic };
    await withTimeout(account.updatePrefs(merged as any), 4000);
    return { ...u, prefs: merged };
  } catch {
    return { ...u, prefs: { ...(u.prefs ?? {}), avatar_url: googlePic } };
  }
};

const syncUserToDB = async (userId: string, name: string, email: string) => {
  const { databaseId, usersCollectionId } = appwriteIds;
  if (!databaseId || !usersCollectionId) return;
  const docId  = `user-${userId}`;
  const payload = {
    user_id:    userId,
    name:       (name || "Movie Fan").trim(),
    email:      email.trim().toLowerCase(),
    joined_at:  new Date().toISOString(),
    plan:       "free",
    is_active:  true,
  };
  try {
    try { await databases.getDocument(databaseId, usersCollectionId, docId); }
    catch (e: any) {
      if (e?.code === 404) await databases.createDocument(databaseId, usersCollectionId, docId, payload);
    }
  } catch (e: any) {
    console.error("[Auth] syncUserToDB:", e?.code, e?.message);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,       setUser]       = useState<AuthUser | null>(null);
  const [isLoading,  setLoading]    = useState(true);
  const [trialStart, setTrialStart] = useState<string | null>(null);

  const loadUser = async (): Promise<AuthUser | null> => {
    try {
      let u = (await withTimeout(account.get(), 4000)) as AuthUser;
      u = await syncGoogleAvatar(u); // auto-pull Google pic on boot

      // ── Also check database document for subscription status ──────────────
      // Admin upgrades via DB (databases.updateDocument) not via account.updatePrefs,
      // so we must merge DB subscription state into the user object.
      try {
        const { databaseId, usersCollectionId } = appwriteIds;
        if (databaseId && usersCollectionId) {
          const { Query } = await import("react-native-appwrite");
          const res = await withTimeout(
            databases.listDocuments(databaseId, usersCollectionId, [
              Query.equal("user_id", u.$id),
              Query.limit(1),
            ]),
            3000
          );
          const doc = (res as any).documents?.[0];
          if (doc) {
            const dbSubscribed = doc.subscribed === true || doc.prefs_subscribed === true;
            const dbPlan       = String(doc.plan ?? doc.prefs_plan ?? "free");
            // Merge DB subscription into prefs so the rest of the app sees it
            if (dbSubscribed && !u.prefs?.subscribed) {
              u = { ...u, prefs: { ...(u.prefs ?? {}), subscribed: true, plan: dbPlan } };
              // Persist back to account prefs silently
              account.updatePrefs({ ...(u.prefs ?? {}), subscribed: true, plan: dbPlan }).catch(() => {});
            }
          }
        }
      } catch {} // non-fatal — subscription still works via account.prefs

      return u;
    } catch (e: any) {
      if (!String(e?.message ?? "").includes("__TIMEOUT_") && e?.code !== 401)
        console.warn("[Auth] boot:", e?.code, e?.message);
      return null;
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await loadUser();
      if (!alive) return;
      setUser(u);
      if (u) {
        const t = await initTrial();
        setTrialStart(t);
        syncUserToDB(u.$id, u.name, u.email).catch(() => {});
      } else {
        const t = await safeGet(TRIAL_KEY);
        setTrialStart(t);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const refreshUser = async () => {
    const u = await loadUser();
    setUser(u);
  };

  const login = async (email: string, password: string): Promise<{ username: string }> => {
    const em = email.trim().toLowerCase();
    try { await account.deleteSession("current"); } catch {}
    await account.createEmailPasswordSession(em, password);
    let u = (await withTimeout(account.get(), 8000)) as AuthUser;
    u = await syncGoogleAvatar(u);
    setUser(u);
    const t = await initTrial();
    setTrialStart(t);
    syncUserToDB(u.$id, u.name, u.email).catch(() => {});
    return { username: (u.name || em.split("@")[0]).trim() };
  };

  const register = async (email: string, password: string, name: string): Promise<{ username: string }> => {
    const em = email.trim().toLowerCase();
    const n  = (name || "Movie Fan").trim();
    await account.create(ID.unique(), em, password, n);
    await account.createEmailPasswordSession(em, password);
    const u = (await withTimeout(account.get(), 8000)) as AuthUser;
    setUser(u);
    const t = await initTrial();
    setTrialStart(t);
    await syncUserToDB(u.$id, n, em);
    return { username: n };
  };

  const loginWithOAuth = async (provider: OAuthProvider) => {
    const endpoint  = "https://fra.cloud.appwrite.io/v1";
    const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "699381200024b709931f";
    if (typeof window !== "undefined") {
      const base   = window.location.origin;
      const params = new URLSearchParams({ project: projectId, success: `${base}/`, failure: `${base}/(auth)/sign-in` });
      window.location.href = `${endpoint}/account/sessions/oauth2/${provider}?${params}`;
    } else {
      const base = "https://movietimeapp.vercel.app";
      await account.createOAuth2Session(provider, `${base}/`, `${base}/(auth)/sign-in`);
    }
  };

  const logout = async () => {
    try { await account.deleteSession("current"); } catch {}
    setUser(null);
  };

  const updateDisplayName = async (name: string) => {
    const n = (name || "").trim();
    if (!n || !user) return;
    await account.updateName(n);
    setUser(prev => prev ? { ...prev, name: n } : prev);
    syncUserToDB(user.$id, n, user.email).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isLoggedIn: !!user,
      isSubscribed: checkIsSubscribed(user),
      isOwner: checkIsOwner(user?.email ?? ""),
      trialStartDate: trialStart,
      login, register, loginWithOAuth, logout, updateDisplayName, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);