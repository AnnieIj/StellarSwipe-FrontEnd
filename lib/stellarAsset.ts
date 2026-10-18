import { StrKey } from "@stellar/stellar-sdk";

/** Networks the app can be configured for (NEXT_PUBLIC_STELLAR_NETWORK). */
export const STELLAR_NETWORKS = ["TESTNET", "PUBLIC"] as const;
export type StellarNetwork = (typeof STELLAR_NETWORKS)[number];

/** Canonical identifier for the native asset (XLM). */
export const NATIVE_ASSET_ID = "native";

export interface StellarAsset {
  /** Upper-cased asset code, e.g. `XLM`, `USDC` */
  code: string;
  /** Issuer account ID (G...), or `null` for the native asset */
  issuer: string | null;
  network: StellarNetwork;
  /** Canonical identifier: `native` or `CODE:ISSUER` */
  id: string;
}

export type StellarAssetResult =
  | { ok: true; asset: StellarAsset }
  | { ok: false; error: string };

/** Classic asset codes are 1–12 alphanumeric characters (SEP-11). */
const ASSET_CODE_PATTERN = /^[A-Z0-9]{1,12}$/;

function isStellarNetwork(value: string): value is StellarNetwork {
  return (STELLAR_NETWORKS as readonly string[]).includes(value);
}

/**
 * Normalizes an asset reference and verifies it against the configured network.
 *
 * Accepted references:
 * - `native` or `XLM` → the native asset (canonical id `native`)
 * - `CODE:ISSUER` → an issued asset; code is upper-cased, issuer must be a valid G... key
 *
 * Rejected: unknown networks, bare issued codes without an issuer, malformed codes,
 * invalid or non-public issuer keys (e.g. secret S... keys), and `XLM`/`native` with an issuer.
 *
 * @example
 * parseStellarAsset("xlm", "testnet")  // { ok: true, asset: { id: "native", ... } }
 * parseStellarAsset("usdc", "testnet") // { ok: false, error: "Issued asset USDC needs an issuer (CODE:ISSUER)" }
 */
export function parseStellarAsset(
  reference: string,
  network: string
): StellarAssetResult {
  const normalizedNetwork = network.trim().toUpperCase();
  if (!isStellarNetwork(normalizedNetwork)) {
    return { ok: false, error: `Unsupported Stellar network: ${network}` };
  }

  const trimmed = reference.trim();
  if (!trimmed) {
    return { ok: false, error: "Asset reference is required" };
  }

  const parts = trimmed.split(":").map((part) => part.trim());
  if (parts.length > 2) {
    return { ok: false, error: "Asset reference must be CODE:ISSUER" };
  }

  const code = parts[0].toUpperCase();
  const issuer = parts[1];

  if (parts.length === 1 && (code === "XLM" || code === "NATIVE")) {
    return {
      ok: true,
      asset: {
        code: "XLM",
        issuer: null,
        network: normalizedNetwork,
        id: NATIVE_ASSET_ID,
      },
    };
  }

  if (code === "XLM" || code === "NATIVE") {
    return { ok: false, error: "XLM is the native asset and cannot have an issuer" };
  }

  if (!ASSET_CODE_PATTERN.test(code)) {
    return { ok: false, error: `Invalid asset code: ${parts[0]}` };
  }

  if (issuer === undefined) {
    return {
      ok: false,
      error: `Issued asset ${code} needs an issuer (CODE:ISSUER)`,
    };
  }

  if (!StrKey.isValidEd25519PublicKey(issuer)) {
    return { ok: false, error: `Invalid issuer account ID: ${issuer}` };
  }

  return {
    ok: true,
    asset: {
      code,
      issuer,
      network: normalizedNetwork,
      id: `${code}:${issuer}`,
    },
  };
}
