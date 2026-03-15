// context/TrialContext.tsx 

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_KEY   = "app_trial_start";
const TRIAL_DAYS  = 14;
const OWNER_EMAIL = "chidiokwu795@gmail.com";

const PLAN_DAYS: Record<string, number> = {
  monthly: 30,
  yearly:  365,
  free:    TRIAL_DAYS,
};

interface TrialCtx {
  daysRemaining: number;
  trialExpired:  boolean;
  trialLoading:  boolean;
  trialActive:   boolean;
  planName:      string;       // "free" | "monthly" | "yearly"
  isSubscribed:  boolean;      // true if user has an active paid plan
}

const TrialContext = createContext<TrialCtx>({
  daysRemaining: TRIAL_DAYS,
  trialExpired:  false,
  trialLoading:  true,
  trialActive:   true,
  planName:      "free",
  isSubscribed:  false,
});

const getItemWithTimeout = (key: string, ms = 2000): Promise<string | null> =>
  Promise.race([
    AsyncStorage.getItem(key),
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);

export const TrialProvider = ({ children }: { children: ReactNode }) => {
  const [startDate,   setStartDate]   = useState<Date | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [planName,    setPlanName]    = useState("free");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // ── 1. Load trial start date ──────────────────────────────────────────
        let stored = await getItemWithTimeout(TRIAL_KEY);
        if (!stored) {
          stored = new Date().toISOString();
          AsyncStorage.setItem(TRIAL_KEY, stored).catch(() => {});
        }
        setStartDate(new Date(stored));

        // ── 2. Load subscription from Appwrite account prefs ─────────────────
        // We dynamically import to avoid circular deps — account is available
        // after AuthContext initialises (which happens after TrialProvider).
        try {
          const { account } = require("../services/appwriteConfig");
          const user = await Promise.race([
            account.get(),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
          ]) as any;

          const email = String(user?.email ?? "").toLowerCase().trim();

          // Owner always subscribed, never expires
          if (email === OWNER_EMAIL) {
            setPlanName("owner");
            setIsSubscribed(true);
            setStartDate(new Date(0)); // epoch — 0% elapsed, never expires
            setLoading(false);
            return;
          }

          const prefs = user?.prefs ?? {};
          if (prefs.subscribed === true) {
            const plan = String(prefs.plan ?? "monthly");
            setPlanName(plan);
            setIsSubscribed(true);

            // Use subscription start date from prefs or account creation
            const subStart = prefs.subscribed_at ?? user?.registration ?? stored;
            setStartDate(new Date(subStart));
          }
        } catch {
          // Auth not ready yet or no session — use trial defaults
        }
      } catch {
        setStartDate(new Date());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalDays    = PLAN_DAYS[planName] ?? TRIAL_DAYS;
  const elapsed      = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86_400_000) : 0;
  const daysRemaining = planName === "owner" ? 9999 : Math.max(0, totalDays - elapsed);
  const trialExpired  = planName !== "owner" && daysRemaining === 0;

  return (
    <TrialContext.Provider value={{
      daysRemaining,
      trialExpired,
      trialLoading: loading,
      trialActive:  daysRemaining > 0,
      planName,
      isSubscribed,
    }}>
      {children}
    </TrialContext.Provider>
  );
};

export const useTrial = () => useContext(TrialContext);