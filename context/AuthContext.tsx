// context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ID, OAuthProvider, Query } from "react-native-appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { account, appwriteIds, databases } from "../services/appwriteConfig";

// ── Owner accounts — NEVER charged, always have full access ──────────────────
export const OWNER_EMAILS = ["chidiokwu795@gmail.com"];

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  prefs?: Record<string, any>;
  [key: string]: any;
}

interface AuthCtx {
  user:             AuthUser | null;
  isLoading:        boolean;
  isLoggedIn:       boolean;
  isSubscribed:     boolean;   // true = can watch movies
  isOwner:          boolean;   // true = chidi's account
  trialStartDate:   string | null;
  login:            (email: string, password: string) => Promise<{ username: string }>;
  register:         (email: string, password: string, name: string) => Promise<{ username: string }>;
  loginWithOAuth:   (provider: OAuthProvider) => Promise<void>;
  logout:           () => Promise<void>;
  updateDisplayName:(name: string) => Promise<void>;
  refreshUser:      () => Promise<void>;
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

const safeStorageGet = async (key: string): Promise<string | null> => {
  try { return await withTimeout(AsyncStorage.getItem(key), 1500); } catch { return null; }
};
const safeStorageSet = async (key: string, value: string): Promise<void> => {
  try { await withTimeout(AsyncStorage.setItem(key, value), 1500); } catch {}
};

const initTrial = async (): Promise<string> => {
  const stored = await safeStorageGet(TRIAL_KEY);
  if (stored) return stored;
  const now = new Date().toISOString();
  await safeStorageSet(TRIAL_KEY, now);
  return now;
};

const checkIsOwner = (email: string): boolean =>
  OWNER_EMAILS.includes(email.trim().toLowerCase());

const checkIsSubscribed = (user: AuthUser | null): boolean => {
  if (!user) return false;
  if (checkIsOwner(user.email)) return true;  // Owner always subscribed
  return user.prefs?.subscribed === true;
};

const syncUserToDB = async (userId: string, name: string, email: string) => {
  const { databaseId, usersCollectionId } = appwriteIds;
  if (!databaseId || !usersCollectionId) return;
  const docId = `user-${userId}`;
  const payload = {
    user_id: userId,
    name: (name || "Movie Fan").trim(),
    email: email.trim().toLowerCase(),
    joined_at: new Date().toISOString(),
    plan: "free",
    is_active: true,
  };
  try {
    try { await databases.getDocument(databaseId, usersCollectionId, docId); }
    catch (e: any) {
      if (e?.code === 404) {
        await databases.createDocument(databaseId, usersCollectionId, docId, payload);
      }
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
      const u = (await withTimeout(account.get(), 4000)) as AuthUser;
      return u;
    } catch (e: any) {
      if (!String(e?.message ?? "").includes("__TIMEOUT_") && e?.code !== 401) {
        console.warn("[Auth] boot:", e?.code, e?.message);
      }
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
        const t = await safeStorageGet(TRIAL_KEY);
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
    const u = (await withTimeout(account.get(), 8000)) as AuthUser;
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

  // ── OAuth: build URL manually on web for guaranteed redirect ─────────────
  const loginWithOAuth = async (provider: OAuthProvider) => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://movietimeapp.vercel.app";
    const endpoint  = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT  ?? "https://cloud.appwrite.io/v1";
    const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";

    if (typeof window !== "undefined") {
      const params = new URLSearchParams({
        project: projectId,
        success: `${base}/`,
        failure: `${base}/(auth)/sign-in`,
      });
      window.location.href = `${endpoint}/account/sessions/oauth2/${provider}?${params}`;
    } else {
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

  const isOwner      = checkIsOwner(user?.email ?? "");
  const isSubscribed = checkIsSubscribed(user);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isLoggedIn: !!user,
      isSubscribed, isOwner, trialStartDate: trialStart,
      login, register, loginWithOAuth, logout, updateDisplayName, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);