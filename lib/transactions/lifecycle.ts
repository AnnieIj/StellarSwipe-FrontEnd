import type { Transaction, TransactionStatus } from "../types/transaction";

export type LifecycleStage =
  | "submitted"
  | "pending"
  | "confirmed"
  | "failed"
  | "unresolved";

export interface LifecycleEvent {
  stage: LifecycleStage;
  status: TransactionStatus;
  timestamp: string | null;
  label: string;
  description: string;
  isFailure: boolean;
  isUnresolved: boolean;
}

const STAGE_ORDER: Record<LifecycleStage, number> = {
  submitted: 0,
  pending: 1,
  confirmed: 2,
  failed: 2,
  unresolved: 2,
};

const STAGE_LABELS: Record<LifecycleStage, string> = {
  submitted: "Submitted",
  pending: "Pending",
  confirmed: "Confirmed on ledger",
  failed: "Failed",
  unresolved: "Unresolved",
};

const STAGE_DESCRIPTIONS: Record<LifecycleStage, string> = {
  submitted: "Transaction was submitted to the network.",
  pending: "Waiting for ledger confirmation.",
  confirmed: "Transaction was confirmed on the ledger.",
  failed: "Transaction failed and was not applied.",
  unresolved: "Transaction status could not be resolved.",
};

function stageForStatus(status: TransactionStatus): LifecycleStage {
  switch (status) {
    case "success":
    case "confirmed":
      return "confirmed";
    case "failed":
    case "error":
      return "failed";
    case "pending":
      return "pending";
    case "submitted":
      return "submitted";
    default:
      return "unresolved";
  }
}

function toTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

interface RawEvent {
  status?: TransactionStatus;
  stage?: LifecycleStage;
  timestamp?: string | Date | null;
  createdAt?: string | Date | null;
}

function buildEvent(raw: RawEvent): LifecycleEvent | null {
  const stage = raw.stage ?? (raw.status ? stageForStatus(raw.status) : null);
  if (!stage) return null;
  const status = raw.status ?? (stage as unknown as TransactionStatus);
  return {
    stage,
    status,
    timestamp: toTimestamp(raw.timestamp ?? raw.createdAt),
    label: STAGE_LABELS[stage],
    description: STAGE_DESCRIPTIONS[stage],
    isFailure: stage === "failed",
    isUnresolved: stage === "unresolved",
  };
}

/**
 * Build a chronological lifecycle timeline for a transaction receipt.
 * Falls back to a single event derived from the final status when no
 * explicit history is available, so receipts always render something useful.
 */
export function buildLifecycleTimeline(
  transaction: Pick<Transaction, "status"> & {
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    events?: RawEvent[] | null;
  },
): LifecycleEvent[] {
  const rawEvents = Array.isArray(transaction.events)
    ? transaction.events
    : [];

  const events = rawEvents
    .map(buildEvent)
    .filter((event): event is LifecycleEvent => event !== null);

  if (events.length === 0) {
    const fallback = buildEvent({
      status: transaction.status,
      timestamp: transaction.updatedAt ?? transaction.createdAt ?? null,
    });
    return fallback ? [fallback] : [];
  }

  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const aTime = a.event.timestamp ? Date.parse(a.event.timestamp) : NaN;
      const bTime = b.event.timestamp ? Date.parse(b.event.timestamp) : NaN;
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
        return aTime - bTime;
      }
      if (!Number.isNaN(aTime) && Number.isNaN(bTime)) return -1;
      if (Number.isNaN(aTime) && !Number.isNaN(bTime)) return 1;
      const stageDiff = STAGE_ORDER[a.event.stage] - STAGE_ORDER[b.event.stage];
      if (stageDiff !== 0) return stageDiff;
      return a.index - b.index;
    })
    .map(({ event }) => event);
}
