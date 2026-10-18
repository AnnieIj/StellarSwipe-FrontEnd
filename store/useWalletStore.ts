import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ConnectedWallet {
  publicKey: string;
}

interface WalletState {
  wallets: ConnectedWallet[];
  activePublicKey: string | null;
  // Backward-compat fields kept in sync
  publicKey: string | null;
  isConnected: boolean;
  network: string;
  addWallet: (key: string) => void;
  setActiveWallet: (key: string) => void;
  removeWallet: (key: string) => void;
  disconnectAll: () => void;
  /**
   * Updates the app's active network. Call only after the wallet has
   * confirmed the change — see NetworkSwitchDialog (#800).
   */
  setNetwork: (network: string) => void;
  // Backward-compat setters
  setPublicKey: (key: string | null) => void;
  setConnected: (connected: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallets: [],
      activePublicKey: null,
      publicKey: null,
      isConnected: false,
      network: "TESTNET",

      addWallet: (key) =>
        set((state) => {
          if (state.wallets.some((w) => w.publicKey === key)) {
            return { activePublicKey: key, publicKey: key, isConnected: true };
          }
          const wallets = [...state.wallets, { publicKey: key }];
          return {
            wallets,
            activePublicKey: key,
            publicKey: key,
            isConnected: true,
          };
        }),

      setActiveWallet: (key) =>
        set((state) => {
          if (!state.wallets.some((w) => w.publicKey === key)) return {};
          return { activePublicKey: key, publicKey: key };
        }),

      removeWallet: (key) =>
        set((state) => {
          const wallets = state.wallets.filter((w) => w.publicKey !== key);
          const activePublicKey =
            state.activePublicKey === key
              ? wallets[0]?.publicKey ?? null
              : state.activePublicKey;
          return {
            wallets,
            activePublicKey,
            publicKey: activePublicKey,
            isConnected: wallets.length > 0,
          };
        }),

      disconnectAll: () =>
        set({
          wallets: [],
          activePublicKey: null,
          publicKey: null,
          isConnected: false,
        }),

      setNetwork: (network) => set({ network: network.toUpperCase() }),

      // Backward compat: setPublicKey adds wallet and makes it active
      setPublicKey: (key) => {
        if (key === null) {
          get().disconnect();
        } else {
          get().addWallet(key);
        }
      },

      // Backward compat: setConnected(false) disconnects active
      setConnected: (connected) => {
        if (!connected) get().disconnect();
      },

      // Backward compat: disconnect removes the active wallet
      disconnect: () =>
        set((state) => {
          const key = state.activePublicKey;
          if (!key) return {};
          const wallets = state.wallets.filter((w) => w.publicKey !== key);
          const activePublicKey = wallets[0]?.publicKey ?? null;
          return {
            wallets,
            activePublicKey,
            publicKey: activePublicKey,
            isConnected: wallets.length > 0,
          };
        }),
    }),
    { name: "wallet-store" }
  )
);
