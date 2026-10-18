/**
 * Helpers for presenting Stellar asset identity (code + issuer + network) in
 * trade review (#806). Asset codes are not unique on Stellar — anyone can
 * issue "USDC" — so the issuer account is what actually identifies an asset.
 */

export type StellarNetworkId = "PUBLIC" | "TESTNET" | "FUTURENET";

export const NETWORK_LABELS: Record<StellarNetworkId, string> = {
  PUBLIC: "Mainnet (Public)",
  TESTNET: "Testnet",
  FUTURENET: "Futurenet",
};

/** Human-readable label for a network id; unknown ids are shown verbatim. */
export function getNetworkLabel(network: string | null | undefined): string {
  if (!network) return "Unknown network";
  const key = network.toUpperCase() as StellarNetworkId;
  return NETWORK_LABELS[key] ?? network;
}

export interface TradeAssetInfo {
  /** Asset code, e.g. "USDC" or "XLM". */
  code: string;
  /** Issuer account (G…). Omitted/null for native XLM or when unknown. */
  issuer?: string | null;
  /** Optional home domain published by the issuer, e.g. "centre.io". */
  homeDomain?: string | null;
}

/**
 * - `native`  — XLM, which has no issuer
 * - `known`   — a well-formed issuer address is present
 * - `missing` — non-native asset without issuer metadata
 * - `invalid` — issuer present but not a valid Stellar account id
 */
export type IssuerStatus = "native" | "known" | "missing" | "invalid";

const STELLAR_ACCOUNT_RE = /^G[A-Z2-7]{55}$/;

export function isValidIssuerAddress(address: string): boolean {
  return STELLAR_ACCOUNT_RE.test(address);
}

export function isNativeAsset(asset: TradeAssetInfo): boolean {
  return asset.code.toUpperCase() === "XLM" && !asset.issuer;
}

export function getIssuerStatus(asset: TradeAssetInfo): IssuerStatus {
  if (isNativeAsset(asset)) return "native";
  const issuer = asset.issuer?.trim();
  if (!issuer) return "missing";
  return isValidIssuerAddress(issuer) ? "known" : "invalid";
}

/**
 * Shortens a long address to `GABCDE…WXYZ12` so it stays readable while still
 * showing enough characters on both ends to compare against a wallet.
 * Strings already short enough are returned unchanged.
 */
export function shortenAddress(address: string, lead = 6, tail = 6): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/**
 * Splits an address into groups of 4 characters, e.g. for screen readers or a
 * full-address display that is easier to compare by eye.
 */
export function groupAddress(address: string, size = 4): string {
  return address.match(new RegExp(`.{1,${size}}`, "g"))?.join(" ") ?? address;
}
