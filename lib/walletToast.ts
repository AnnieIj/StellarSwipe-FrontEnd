/**
 * Wallet-specific toast helpers.
 * Each event gets a distinct title + description so users always know
 * exactly what happened with their wallet.
 */
import { toast } from "@/lib/toast";

export const walletToast = {
  connected: (address: string) =>
    toast.success("Wallet connected", {
      description: `${address.slice(0, 6)}…${address.slice(-4)} is now active.`,
    }),

  disconnected: () =>
    toast.info("Wallet disconnected", {
      description: "Your wallet has been safely disconnected.",
    }),

  denied: () =>
    toast.info("Connection declined", {
      description: "You cancelled the wallet connection request.",
    }),

  signingDenied: () =>
    toast.info("Transaction declined", {
      description: "You rejected the signing request in your wallet.",
    }),

  notFound: () =>
    toast.error("Wallet not found", {
      description:
        "Freighter extension is not installed. Please add it to your browser.",
    }),

  connectError: () =>
    toast.error("Connection failed", {
      description: "Could not connect to your wallet. Please try again.",
    }),

  timeout: () =>
    toast.error("Connection timed out", {
      description:
        "Your wallet didn't respond in time. Check for a pending approval popup, then try again.",
    }),

  signError: () =>
    toast.error("Signing failed", {
      description: "An error occurred while signing the transaction.",
    }),
};
