const DEFAULT_RATIO = 0.5;
const MIN_RATIO = 0.3;
const MAX_RATIO = 0.7;

export const SIGNAL_FEED_SPLIT_STORAGE_KEY = "signal-feed-split-ratio";

export function clampSplitRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

export function computeSplitRatioFromClientX(
  clientX: number,
  containerLeft: number,
  containerWidth: number,
  minLeftWidth: number,
  minRightWidth: number
): number {
  if (containerWidth <= 0) return DEFAULT_RATIO;

  const minLeft = Math.max(0, minLeftWidth);
  const maxLeft = Math.max(
    minLeft,
    containerWidth - Math.max(0, minRightWidth)
  );

  const desiredLeft = clientX - containerLeft;
  const clampedLeft = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
  return clampSplitRatio(clampedLeft / containerWidth);
}

export function readPersistedSplitRatio(
  storage: Pick<Storage, "getItem"> | null,
  key: string = SIGNAL_FEED_SPLIT_STORAGE_KEY
): number {
  if (!storage) return DEFAULT_RATIO;

  const raw = storage.getItem(key);
  if (!raw) return DEFAULT_RATIO;

  const parsed = Number.parseFloat(raw);
  return clampSplitRatio(parsed);
}

export function persistSplitRatio(
  storage: Pick<Storage, "setItem"> | null,
  ratio: number,
  key: string = SIGNAL_FEED_SPLIT_STORAGE_KEY
): number {
  const clamped = clampSplitRatio(ratio);
  if (!storage) return clamped;

  storage.setItem(key, clamped.toFixed(4));
  return clamped;
}
