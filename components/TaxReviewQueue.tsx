"use client";

import { useState } from "react";
import { CheckCircle2, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TaxableTransaction } from "@/lib/taxUtils";
import {
  TAX_CATEGORIES,
  TAX_CATEGORY_LABELS,
  buildReviewQueue,
  getManuallyResolved,
  isTaxCategory,
  type CategoryAssignment,
  type CategoryAssignments,
} from "@/lib/taxCategorization";

interface TaxReviewQueueProps {
  transactions: TaxableTransaction[];
  assignments: CategoryAssignments;
  onAssign: (id: string, assignment: CategoryAssignment) => void;
}

/**
 * #894 Focused workflow for transactions that could not be categorized
 * automatically. Assigning a category removes the record from the queue;
 * it stays listed under "Resolved in this review" and in the trade breakdown.
 */
export function TaxReviewQueue({ transactions, assignments, onAssign }: TaxReviewQueueProps) {
  const queue = buildReviewQueue(transactions, assignments);
  const resolved = getManuallyResolved(transactions, assignments);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (queue.length === 0 && resolved.length === 0) return null;

  return (
    <Card data-testid="tax-review-queue">
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks size={14} aria-hidden="true" />
          Uncategorized transactions ({queue.length})
        </h3>
        <p className="text-xs text-foreground-muted">
          These records could not be categorized automatically. Assign a
          category, or leave them unresolved to revisit later.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {queue.length === 0 ? (
          <p role="status" className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 size={14} aria-hidden="true" />
            All transactions are categorized.
          </p>
        ) : (
          <ul aria-label="Uncategorized transactions" className="space-y-2">
            {queue.map(({ transaction: tx, leftUnresolved }) => {
              const selectId = `tax-category-${tx.id}`;
              const draft = drafts[tx.id] ?? "";
              return (
                <li
                  key={tx.id}
                  data-testid={`review-item-${tx.id}`}
                  className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 text-xs">
                    <p className="font-mono text-sm font-medium text-foreground">
                      {tx.assetPair || "Unknown asset"}
                    </p>
                    <p className="text-foreground-muted">
                      {new Date(tx.timestamp).toISOString().split("T")[0]} · {tx.amount}{" "}
                      units · ID {tx.id}
                    </p>
                    <p className="text-foreground-muted">
                      Source: {tx.source?.type ?? "Unknown"}
                      {tx.source?.hash && (
                        <span className="font-mono"> · {tx.source.hash.slice(0, 12)}…</span>
                      )}
                    </p>
                    {leftUnresolved && (
                      <p className="mt-1 text-amber-400">Left unresolved</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={selectId} className="text-[11px] text-foreground-muted">
                        Category
                      </label>
                      <select
                        id={selectId}
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [tx.id]: e.target.value }))}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select a category</option>
                        {TAX_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {TAX_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      size="sm"
                      disabled={!isTaxCategory(draft)}
                      onClick={() => {
                        if (isTaxCategory(draft)) onAssign(tx.id, draft);
                      }}
                    >
                      Assign
                    </Button>
                    {!leftUnresolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAssign(tx.id, "unresolved")}
                      >
                        Leave unresolved
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {resolved.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-medium text-foreground-muted">
              Resolved in this review ({resolved.length})
            </h4>
            <ul aria-label="Resolved transactions" className="space-y-1 text-xs">
              {resolved.map(({ transaction: tx, category }) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-foreground/5 px-2 py-1"
                >
                  <span className="font-mono text-foreground">
                    {tx.assetPair} · {tx.id}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-foreground-muted">{TAX_CATEGORY_LABELS[category]}</span>
                    <button
                      type="button"
                      onClick={() => onAssign(tx.id, "unresolved")}
                      aria-label={`Return ${tx.id} to the review queue`}
                      className="text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      Undo
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
