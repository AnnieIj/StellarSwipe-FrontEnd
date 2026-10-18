/**
 * Stellar asset metadata cache (#962)
 * - Entries are served only within `ttlMs`; expired entries are fetched again.
 * - Storage is capped at `maxEntries`; the least recently used entry is evicted.
 * - Missing or failed source data resolves to `null` and is never cached, so a
 *   description is never invented and a stale one is not kept once the source
 *   stops returning it.
 */

export interface StellarAssetMetadata {
  /** Asset code, e.g. "USDC". */
  code: string;
  /** Issuer account ID (G...). */
  issuer: string;
  /** Description from the source. Left undefined when the source has none. */
  description?: string;
}

export type StellarAssetMetadataFetcher = (
  assetKey: string
) => Promise<StellarAssetMetadata | null>;

export interface StellarAssetMetadataCacheOptions {
  /** Maximum age of a cached entry in milliseconds. Defaults to 10 minutes. */
  ttlMs?: number;
  /** Maximum number of cached assets. Defaults to 200. */
  maxEntries?: number;
}

export const DEFAULT_ASSET_METADATA_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_ASSET_METADATA_MAX_ENTRIES = 200;

interface CacheEntry {
  value: StellarAssetMetadata;
  expiresAt: number;
}

export class StellarAssetMetadataCache {
  private readonly fetcher: StellarAssetMetadataFetcher;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<
    string,
    Promise<StellarAssetMetadata | null>
  >();

  constructor(
    fetcher: StellarAssetMetadataFetcher,
    options: StellarAssetMetadataCacheOptions = {}
  ) {
    this.fetcher = fetcher;
    this.ttlMs = options.ttlMs ?? DEFAULT_ASSET_METADATA_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_ASSET_METADATA_MAX_ENTRIES;

    if (!(this.ttlMs > 0) || !(this.maxEntries >= 1)) {
      throw new RangeError("ttlMs must be > 0 and maxEntries must be >= 1");
    }
  }

  /** Returns cached metadata while fresh, otherwise fetches it. */
  get(assetKey: string): Promise<StellarAssetMetadata | null> {
    const entry = this.entries.get(assetKey);
    if (entry && Date.now() < entry.expiresAt) {
      // Re-insert so this entry becomes the most recently used
      this.entries.delete(assetKey);
      this.entries.set(assetKey, entry);
      return Promise.resolve(entry.value);
    }

    this.entries.delete(assetKey);
    return this.load(assetKey);
  }

  /** Bypasses the cached entry and fetches again. A failed refresh leaves nothing cached. */
  refresh(assetKey: string): Promise<StellarAssetMetadata | null> {
    this.entries.delete(assetKey);
    return this.load(assetKey);
  }

  /** Drops one cached asset. */
  invalidate(assetKey: string) {
    this.entries.delete(assetKey);
  }

  /** Drops every cached asset. */
  clear() {
    this.entries.clear();
  }

  private load(assetKey: string): Promise<StellarAssetMetadata | null> {
    const pending = this.inFlight.get(assetKey);
    if (pending) return pending;

    const request = Promise.resolve()
      .then(() => this.fetcher(assetKey))
      .then((value) => {
        if (value) this.store(assetKey, value);
        return value;
      })
      .catch(() => null)
      .finally(() => this.inFlight.delete(assetKey));

    this.inFlight.set(assetKey, request);
    return request;
  }

  private store(assetKey: string, value: StellarAssetMetadata) {
    this.entries.delete(assetKey);
    this.entries.set(assetKey, { value, expiresAt: Date.now() + this.ttlMs });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
