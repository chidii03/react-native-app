// context/TrialContext.tsx — MUST live at ROOT level (not inside app/)
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_KEY  = "app_trial_start";
const TRIAL_DAYS = 14;

interface TrialCtx {
  daysRemaining: number;
  trialExpired:  boolean;
  trialLoading:  boolean;
  trialActive:   boolean;
}

const TrialContext = createContext<TrialCtx>({
  daysRemaining: TRIAL_DAYS,
  trialExpired:  false,
  trialLoading:  true,
  trialActive:   true,
});

// Safety timeout — if AsyncStorage hangs on web, don't block AppGuard
const getItemWithTimeout = (key: string, ms = 2000): Promise<string | null> =>
  Promise.race([
    AsyncStorage.getItem(key),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

export const TrialProvider = ({ children }: { children: ReactNode }) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let stored = await getItemWithTimeout(TRIAL_KEY);
        if (!stored) {
          stored = new Date().toISOString();
          // Fire-and-forget write — don't block on it
          AsyncStorage.setItem(TRIAL_KEY, stored).catch(() => {});
        }
        setStartDate(new Date(stored));
      } catch {
        setStartDate(new Date());
      } finally {
        // ✅ Always fires — trialLoading always becomes false
        setLoading(false);
      }
    })();
  }, []);

  const elapsed       = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86_400_000) : 0;
  const daysRemaining = Math.max(0, TRIAL_DAYS - elapsed);

  return (
    <TrialContext.Provider value={{
      daysRemaining,
      trialExpired: daysRemaining === 0,
      trialLoading: loading,
      trialActive:  daysRemaining > 0,
    }}>
      {children}
    </TrialContext.Provider>
  );
};

export const useTrial = () => useContext(TrialContext);