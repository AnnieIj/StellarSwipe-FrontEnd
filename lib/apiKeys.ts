/**
 * API key / personal access token types and a mock in-memory service.
 *
 * In production, replace the mock functions with real API calls.
 */

export interface ApiKey {
  /** Unique key identifier (never the token itself) */
  id: string;
  /** User-supplied name to identify this key */
  name: string;
  /** Masked display value shown after initial creation, e.g. "sk_•••••••••abc" */
  maskedToken: string;
  createdAt: string; // ISO-8601
  /** ISO-8601 or null if the key has never been used */
  lastUsedAt: string | null;
}

/** Returned once at creation — full token is not retrievable afterwards */
export interface CreatedApiKey extends ApiKey {
  plainToken: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

let mockKeys: ApiKey[] = [
  {
    id: "key-1",
    name: "My Trading Bot",
    maskedToken: "sk_•••••••••f3a2",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "key-2",
    name: "Analytics Script",
    maskedToken: "sk_•••••••••9d71",
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsedAt: null,
  },
];

// ── Mock service functions ───────────────────────────────────────────────────

export async function fetchApiKeys(): Promise<ApiKey[]> {
  return [...mockKeys];
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
  const randomHex = () => Math.random().toString(16).slice(2, 18);
  const plainToken = `sk_live_${randomHex()}${randomHex()}`;
  const suffix = plainToken.slice(-4);

  const newKey: ApiKey = {
    id: `key-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    maskedToken: `sk_•••••••••${suffix}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  mockKeys = [...mockKeys, newKey];
  return { ...newKey, plainToken };
}

export async function revokeApiKey(id: string): Promise<void> {
  mockKeys = mockKeys.filter((k) => k.id !== id);
}
