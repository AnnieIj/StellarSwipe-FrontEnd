export type StellarNetwork = "mainnet" | "testnet";

export interface TransactionReceipt {
  hash?: string | null;
  asset?: string | null;
  amount?: string | null;
  time?: string | Date | null;
  status?: string | null;
  network?: StellarNetwork | string | null;
}

export interface ReceiptField {
  label: string;
  value: string;
  available: boolean;
}

const EXPLORER_BASE: Record<StellarNetwork, string> = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
};

/**
 * Normalize an arbitrary network value to a supported Stellar network.
 * Defaults to mainnet when the value is missing or unrecognized.
 */
export function normalizeNetwork(network?: string | null): StellarNetwork {
  const value = (network ?? "").toLowerCase();
  if (value === "testnet" || value === "test") {
    return "testnet";
  }
  return "mainnet";
}

/**
 * Build a network-correct Stellar explorer link for a transaction hash.
 * Returns null when no usable hash is provided so callers can omit the link.
 */
export function getExplorerTxUrl(
  hash?: string | null,
  network?: string | null,
): string | null {
  const trimmed = (hash ?? "").trim();
  if (!trimmed) {
    return null;
  }
  const base = EXPLORER_BASE[normalizeNetwork(network)];
  return `${base}/tx/${encodeURIComponent(trimmed)}`;
}

function formatTime(time?: string | Date | null): string | null {
  if (time === null || time === undefined || time === "") {
    return null;
  }
  const date = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Produce the receipt fields for display. Missing values are labeled
 * "Unavailable" and flagged so the view can style them distinctly.
 */
export function buildReceiptFields(receipt: TransactionReceipt): ReceiptField[] {
  const hash = (receipt.hash ?? "").trim();
  const asset = (receipt.asset ?? "").trim();
  const amount = (receipt.amount ?? "").trim();
  const status = (receipt.status ?? "").trim();
  const time = formatTime(receipt.time);

  const field = (label: string, value: string | null): ReceiptField =>
    value
      ? { label, value, available: true }
      : { label, value: "Unavailable", available: false };

  return [
    field("Transaction hash", hash || null),
    field("Asset", asset || null),
    field("Amount", amount || null),
    field("Time", time),
    field("Status", status || null),
  ];
}
