import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * useDataSaverStore
 * ─────────────────
 * Manual "Data Saver" mode (issue #408). When enabled the app reduces its
 * network / rendering footprint for users on limited or expensive data plans:
 *
 *  - SignalCard mini sparkline charts are replaced with a static placeholder
 *    (no chart rendering work).
 *  - Non-essential decorative animations are skipped, in addition to — not
 *    instead of — the automatic OS-level `prefers-reduced-motion` handling.
 *  - Images load at a lower quality variant where the image pipeline supports
 *    it (Next.js `quality` prop).
 *
 * This is a manual, user-controlled setting distinct from the automatic,
 * motion-only `prefers-reduced-motion` support. The preference is persisted to
 * localStorage so it survives across sessions.
 */
interface DataSaverState {
  dataSaverEnabled: boolean;
  setDataSaverEnabled: (enabled: boolean) => void;
  toggleDataSaver: () => void;
}

export const useDataSaverStore = create<DataSaverState>()(
  persist(
    (set) => ({
      dataSaverEnabled: false,
      setDataSaverEnabled: (enabled) => set({ dataSaverEnabled: enabled }),
      toggleDataSaver: () =>
        set((state) => ({ dataSaverEnabled: !state.dataSaverEnabled })),
    }),
    { name: "data-saver-store" }
  )
);

/** Non-hook accessor for use outside of React render (helpers, tests). */
export function isDataSaverEnabled(): boolean {
  return useDataSaverStore.getState().dataSaverEnabled;
}
