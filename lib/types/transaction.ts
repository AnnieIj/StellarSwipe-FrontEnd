export type TransactionStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired"
  | "cancelled";

export type StellarNetwork = "mainnet" | "testnet";

export interface Transaction {
  id: string;
  hash?: string | null;
  asset?: string | null;
  amount?: string | number | null;
  createdAt?: string | null;
  status?: TransactionStatus | null;
  network?: StellarNetwork | null;
}

const STELLAR_EXPLORER_BASE: Record<StellarNetwork, string> = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
};

/**
 * Resolve the Stellar network for a transaction, defaulting to mainnet when
 * the network is not explicitly provided.
 */
export function resolveNetwork(
  network?: StellarNetwork | null,
): StellarNetwork {
  return network === "testnet" ? "testnet" : "mainnet";
}

/**
 * Build a network-correct Stellar explorer link for a transaction hash.
 * Returns null when there is no usable hash so callers can omit the link
 * rather than render a misleading URL.
 */
export function getExplorerLink(
  hash?: string | null,
  network?: StellarNetwork | null,
): string | null {
  const trimmed = typeof hash === "string" ? hash.trim() : "";
  if (!trimmed) {
    return null;
  }
  const base = STELLAR_EXPLORER_BASE[resolveNetwork(network)];
  return `${base}/tx/${encodeURIComponent(trimmed)}`;
}

export interface ReceiptField {
  label: string;
  value: string;
  available: boolean;
}

function formatAmount(amount?: string | number | null): string | null {
  if (amount === null || amount === undefined) {
    return null;
  }
  const text = typeof amount === "number" ? String(amount) : amount.trim();
  return text ? text : null;
}

function formatTime(createdAt?: string | null): string | null {
  if (!createdAt) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Normalize a transaction into receipt fields, marking missing values as
 * unavailable instead of rendering misleading placeholders.
 */
export function buildReceiptFields(tx: Transaction): ReceiptField[] {
  const hash = typeof tx.hash === "string" ? tx.hash.trim() : "";
  const asset = typeof tx.asset === "string" ? tx.asset.trim() : "";
  const amount = formatAmount(tx.amount);
  const time = formatTime(tx.createdAt);
  const status = tx.status ?? null;

  return [
    { label: "Transaction hash", value: hash, available: Boolean(hash) },
    { label: "Asset", value: asset, available: Boolean(asset) },
    { label: "Amount", value: amount ?? "", available: amount !== null },
    { label: "Time", value: time ?? "", available: time !== null },
    { label: "Status", value: status ?? "", available: status !== null },
  ];
}
