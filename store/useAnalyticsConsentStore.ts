import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AnalyticsConsentState {
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;
}

export const useAnalyticsConsentStore = create<AnalyticsConsentState>()(
  persist(
    (set) => ({
      analyticsEnabled: true,
      setAnalyticsEnabled: (enabled) => set({ analyticsEnabled: enabled }),
    }),
    { name: "analytics-consent" }
  )
);

export function isAnalyticsEnabled(): boolean {
  return useAnalyticsConsentStore.getState().analyticsEnabled;
}
