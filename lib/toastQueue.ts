export const MAX_VISIBLE_TOASTS = 4;
export const MIN_TOAST_DURATION_MS = 1_000;
export const MAX_TOAST_DURATION_MS = 30_000;
export const DEFAULT_TOAST_DURATION_MS = 5_000;

export type ToastTone = "info" | "success" | "warning" | "error";
export type ToastPriority = "low" | "normal" | "high";

export interface ToastInput {
  id: string;
  tone: ToastTone;
  durationMs?: number;
  dedupeKey?: string;
}

export interface QueuedToast {
  id: string;
  tone: ToastTone;
  priority: ToastPriority;
  durationMs: number;
  dedupeKey: string | null;
  sequence: number;
}

export interface ToastEnqueueResult {
  toasts: QueuedToast[];
  added: QueuedToast | null;
  replaced: QueuedToast | null;
  evicted: QueuedToast[];
}

const PRIORITY_BY_TONE: Readonly<Record<ToastTone, ToastPriority>> = {
  info: "low",
  success: "normal",
  warning: "high",
  error: "high",
};

const PRIORITY_WEIGHT: Readonly<Record<ToastPriority, number>> = {
  low: 0,
  normal: 1,
  high: 2,
};

export function priorityForTone(tone: ToastTone): ToastPriority {
  return PRIORITY_BY_TONE[tone];
}

export function normalizeToastDuration(
  tone: ToastTone,
  durationMs?: number,
): number {
  const requested = durationMs ?? DEFAULT_TOAST_DURATION_MS;
  if (!Number.isFinite(requested)) return DEFAULT_TOAST_DURATION_MS;
  return Math.min(MAX_TOAST_DURATION_MS, Math.max(MIN_TOAST_DURATION_MS, requested));
}

function dedupeKeyOf(toast: ToastInput): string {
  return toast.dedupeKey ?? `id:${toast.id}`;
}

function keyOfQueued(toast: QueuedToast): string {
  return toast.dedupeKey ?? `id:${toast.id}`;
}

function compareForDisplay(a: QueuedToast, b: QueuedToast): number {
  const byPriority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  return byPriority !== 0 ? byPriority : a.sequence - b.sequence;
}

function compareForEviction(a: QueuedToast, b: QueuedToast): number {
  const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  return byPriority !== 0 ? byPriority : a.sequence - b.sequence;
}

export function orderToasts(toasts: readonly QueuedToast[]): QueuedToast[] {
  return [...toasts].sort(compareForDisplay);
}

export function enqueueToast(
  existing: readonly QueuedToast[],
  input: ToastInput,
): ToastEnqueueResult {
  const key = dedupeKeyOf(input);
  const index = existing.findIndex((toast) => keyOfQueued(toast) === key);

  const next: QueuedToast = {
    id: input.id,
    tone: input.tone,
    priority: priorityForTone(input.tone),
    durationMs: normalizeToastDuration(input.tone, input.durationMs),
    dedupeKey: input.dedupeKey ?? null,
    sequence: index === -1 ? existing.length : existing[index].sequence,
  };

  const replaced = index === -1 ? null : existing[index];
  const withoutDuplicate = existing.filter(
    (toast, position) => position !== index,
  );
  const kept = [...withoutDuplicate, next];

  const overflow = kept.length - MAX_VISIBLE_TOASTS;
  let evicted: QueuedToast[] = [];
  let survivors = kept;
  if (overflow > 0) {
    const ranked = [...kept].sort(compareForEviction);
    const evictedIds = new Set(
      ranked.slice(0, overflow).map((toast) => `${toast.sequence}:${toast.id}`),
    );
    evicted = kept.filter((toast) =>
      evictedIds.has(`${toast.sequence}:${toast.id}`),
    );
    survivors = kept.filter(
      (toast) => !evictedIds.has(`${toast.sequence}:${toast.id}`),
    );
  }

  return {
    toasts: orderToasts(survivors),
    added: index === -1 ? next : null,
    replaced,
    evicted,
  };
}

export function dismissToast(
  toasts: readonly QueuedToast[],
  id: string,
): QueuedToast[] {
  return toasts.filter((toast) => toast.id !== id);
}
