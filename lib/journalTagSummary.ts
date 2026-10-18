import type { TransactionHistoryItem } from "@/store/useTransactionStore";

export const UNTAGGED = "__untagged__";

export interface TagSummaryRow {
  tag: string;
  entryCount: number;
  /** Sum of known P&L; null when no entry in the group has P&L. */
  pnl: number | null;
  /** Entries in the group without P&L (excluded from the sum). */
  missingPnl: number;
}

const normalize = (tag: string) => tag.trim().toLowerCase();

/**
 * Group entries by tag. An entry with several tags counts under each of them;
 * entries with no tags go to a separate "untagged" row, and entries without
 * P&L are counted but never contribute a value (no implicit zero).
 */
export function summarizeByTag(
  entries: TransactionHistoryItem[],
  since: number | null,
  selectedTags: string[] = []
): TagSummaryRow[] {
  const groups = new Map<string, TagSummaryRow>();
  const selected = new Set(selectedTags.map(normalize));

  for (const entry of entries) {
    if (since !== null && entry.timestamp < since) continue;
    const tags = Array.from(new Set((entry.tags ?? []).map(normalize).filter(Boolean)));
    const keys = tags.length > 0 ? tags : [UNTAGGED];
    const hasPnl = typeof entry.pnl === "number" && Number.isFinite(entry.pnl);

    for (const key of keys) {
      if (selected.size > 0 && !selected.has(key)) continue;
      const row = groups.get(key) ?? { tag: key, entryCount: 0, pnl: null, missingPnl: 0 };
      row.entryCount += 1;
      if (hasPnl) row.pnl = (row.pnl ?? 0) + (entry.pnl as number);
      else row.missingPnl += 1;
      groups.set(key, row);
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.entryCount - a.entryCount);
}
