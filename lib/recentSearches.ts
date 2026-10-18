/**
 * Helpers for the command palette's recent-search history.
 *
 * History is persisted to localStorage, so anything that could identify a
 * wallet, unlock one, or otherwise be a credential must never be stored.
 */

/** Maximum number of recent searches shown in the command palette. */
export const MAX_VISIBLE_RECENT_SEARCHES = 5;

/** Maximum number of recent searches kept in storage. */
export const MAX_STORED_RECENT_SEARCHES = 10;

const MAX_QUERY_LENGTH = 64;

const SENSITIVE_PATTERNS: RegExp[] = [
  // Stellar secret seeds (S…) and account / public keys (G…, M… muxed).
  /\b[SGM][A-Z2-7]{55}\b/i,
  // Long hex strings: transaction hashes, API keys, private keys.
  /\b(?:0x)?[0-9a-f]{32,}\b/i,
  // Long base64 / token-like strings.
  /[A-Za-z0-9+/_-]{40,}={0,2}/,
  // Email addresses.
  /[^\s@]+@[^\s@]+\.[^\s@]+/,
  // Long digit runs: OTP / 2FA codes, card or phone numbers.
  /\d{6,}/,
  // Explicit credential keywords.
  /\b(?:password|passphrase|passwd|secret|seed|mnemonic|private\s*key|api[\s_-]?key|token|otp)\b/i,
];

/** A 12+ word phrase is treated as a possible recovery phrase. */
function looksLikeMnemonic(query: string): boolean {
  return query.split(/\s+/).filter(Boolean).length >= 12;
}

export function isSensitiveQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;
  return looksLikeMnemonic(trimmed) || SENSITIVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Returns the query in a form that is safe to persist, or an empty string if
 * the query is empty or may contain a sensitive value.
 */
export function sanitizeRecentQuery(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (!trimmed || isSensitiveQuery(trimmed)) return "";
  return trimmed.slice(0, MAX_QUERY_LENGTH);
}

/**
 * Strips a destination down to its path and a sanitized query string so that
 * sensitive URL parameters never reach the history.
 */
export function sanitizeRecentHref(href: string): string {
  const [pathAndSearch] = href.split("#");
  const [path, search = ""] = pathAndSearch.split("?");
  if (!search) return path;

  const params = new URLSearchParams(search);
  const safe = new URLSearchParams();
  params.forEach((value, key) => {
    if (!isSensitiveQuery(key) && !isSensitiveQuery(value)) safe.append(key, value);
  });
  const safeSearch = safe.toString();
  return safeSearch ? `${path}?${safeSearch}` : path;
}
