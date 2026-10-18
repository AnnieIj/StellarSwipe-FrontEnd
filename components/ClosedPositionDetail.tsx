"use client";

/**
 * ClosedPositionDetail — #887
 *
 * Shows how a closed position was opened and closed by listing its entry and
 * exit fills together. Totals are derived from the fills (long position:
 * exit proceeds − entry cost − fees) and checked against the position-level
 * realized P/L:
 *   - reconciled: derived net P/L matches realized P/L within a cent
 *   - mismatch: derived net P/L differs from realized P/L
 *   - incomplete: a fill (or realized P/L) is missing, so totals can't be verified
 *
 * A fill with a missing quantity, price or fee is shown with "—" and excluded
 * from totals. Multiple fills per side represent partial fills.
 */

import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePrivacyStore, PRIVACY_MASK } from "@/store/usePrivacyStore";

export interface PositionFill {
  id: string;
  quantity?: number;
  price?: number;
  fee?: number;
  timestamp?: Date | string;
}

export interface ClosedPosition {
  symbol: string;
  name: string;
  /** Position-level realized P/L; undefined means data not available. */
  realizedPnL?: number;
  entryFills: PositionFill[];
  exitFills: PositionFill[];
}

interface ClosedPositionDetailProps {
  position: ClosedPosition;
  className?: string;
}

type Reconciliation = "reconciled" | "mismatch" | "incomplete";

const RECONCILE_TOLERANCE = 0.01;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isComplete = (fill: PositionFill): boolean =>
  isFiniteNumber(fill.quantity) &&
  isFiniteNumber(fill.price) &&
  isFiniteNumber(fill.fee);

function formatUSD(value: number): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTimestamp(value: Date | string | undefined): string {
  if (value === undefined) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function summarizeFills(fills: PositionFill[]) {
  const complete = fills.filter(isComplete);
  const quantity = complete.reduce((sum, fill) => sum + fill.quantity!, 0);
  const notional = complete.reduce(
    (sum, fill) => sum + fill.quantity! * fill.price!,
    0
  );
  const fees = complete.reduce((sum, fill) => sum + fill.fee!, 0);

  return {
    quantity,
    notional,
    fees,
    averagePrice: quantity > 0 ? notional / quantity : undefined,
    complete: complete.length === fills.length,
  };
}

function reconcile(
  derivedNet: number,
  realizedPnL: number | undefined,
  complete: boolean
): Reconciliation {
  if (!complete || realizedPnL === undefined) return "incomplete";
  return Math.abs(derivedNet - realizedPnL) <= RECONCILE_TOLERANCE
    ? "reconciled"
    : "mismatch";
}

function FillTable({
  caption,
  fills,
  summary,
}: {
  caption: string;
  fills: PositionFill[];
  summary: ReturnType<typeof summarizeFills>;
}) {
  if (fills.length === 0) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        {caption}: No fills recorded
      </div>
    );
  }

  return (
    <table className="mt-2 w-full text-xs font-mono">
      <caption className="mb-1 text-left font-sans text-muted-foreground">
        {caption}
      </caption>
      <thead>
        <tr className="text-muted-foreground font-sans">
          <th scope="col" className="text-left font-normal">
            Time
          </th>
          <th scope="col" className="text-right font-normal">
            Qty
          </th>
          <th scope="col" className="text-right font-normal">
            Price
          </th>
          <th scope="col" className="text-right font-normal">
            Fee
          </th>
        </tr>
      </thead>
      <tbody>
        {fills.map((fill) => (
          <tr key={fill.id} className="text-foreground">
            <td className="text-left">{formatTimestamp(fill.timestamp)}</td>
            <td className="text-right">
              {isFiniteNumber(fill.quantity)
                ? fill.quantity.toLocaleString(undefined, {
                    maximumFractionDigits: 8,
                  })
                : "—"}
            </td>
            <td className="text-right">
              {isFiniteNumber(fill.price)
                ? fill.price.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })
                : "—"}
            </td>
            <td className="text-right">
              {isFiniteNumber(fill.fee) ? formatUSD(fill.fee) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-border text-foreground">
          <td className="text-left font-sans">Total</td>
          <td className="text-right">
            {summary.quantity.toLocaleString(undefined, {
              maximumFractionDigits: 8,
            })}
          </td>
          <td className="text-right">
            {summary.averagePrice !== undefined
              ? `avg ${summary.averagePrice.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}`
              : "—"}
          </td>
          <td className="text-right">{formatUSD(summary.fees)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export function ClosedPositionDetail({
  position,
  className,
}: ClosedPositionDetailProps) {
  const { privacyMode } = usePrivacyStore();
  const mask = (v: string) => (privacyMode ? PRIVACY_MASK : v);

  const entry = summarizeFills(position.entryFills);
  const exit = summarizeFills(position.exitFills);
  const fees = entry.fees + exit.fees;
  const derivedNet = exit.notional - entry.notional - fees;
  const complete = entry.complete && exit.complete;
  const status = reconcile(derivedNet, position.realizedPnL, complete);

  const statusCopy = {
    reconciled: {
      icon: CheckCircle2,
      text: "Matches realized P/L",
      className: "text-green-500",
    },
    mismatch: {
      icon: AlertTriangle,
      text: "Does not match realized P/L",
      className: "text-red-500",
    },
    incomplete: {
      icon: AlertCircle,
      text: "Incomplete fill data",
      className: "text-muted-foreground",
    },
  }[status];
  const StatusIcon = statusCopy.icon;

  return (
    <section
      aria-label={`${position.name} closed position detail`}
      className={cn(
        "rounded-lg border border-border bg-surface p-3 text-sm",
        className
      )}
    >
      {/* Header */}
      <h3 className="mb-3 font-semibold text-foreground leading-tight">
        {position.name}{" "}
        <span className="text-muted-foreground font-normal">
          ({position.symbol})
        </span>
      </h3>

      <FillTable
        caption="Entry fills"
        fills={position.entryFills}
        summary={entry}
      />
      <FillTable
        caption="Exit fills"
        fills={position.exitFills}
        summary={exit}
      />

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {/* Fees */}
        <dt className="text-muted-foreground">Total fees</dt>
        <dd
          className="text-right font-mono text-foreground"
          aria-label={`Total fees: ${mask(formatUSD(fees))}`}
        >
          {mask(formatUSD(fees))}
        </dd>

        {/* Derived net P/L from fills */}
        <dt className="text-muted-foreground">Net P/L from fills</dt>
        <dd
          className="text-right font-mono text-foreground"
          aria-label={`Net P/L from fills: ${mask(formatUSD(derivedNet))}`}
        >
          {mask(formatUSD(derivedNet))}
        </dd>

        {/* Realized P/L */}
        <dt className="text-muted-foreground">Realized P/L</dt>
        {position.realizedPnL !== undefined ? (
          <dd
            className="text-right font-mono text-foreground"
            aria-label={`Realized P/L: ${mask(formatUSD(position.realizedPnL))}`}
          >
            {mask(formatUSD(position.realizedPnL))}
          </dd>
        ) : (
          <dd
            className="text-right font-mono text-muted-foreground text-xs flex items-center justify-end gap-1"
            aria-label="Realized P/L unavailable"
          >
            <AlertCircle size={11} aria-hidden="true" />
            No data
          </dd>
        )}

        {/* Reconciliation */}
        <dt className="text-muted-foreground">Reconciliation</dt>
        <dd
          className={cn(
            "text-right text-xs flex items-center justify-end gap-1",
            statusCopy.className
          )}
          aria-label={`Reconciliation: ${statusCopy.text}`}
        >
          <StatusIcon size={11} aria-hidden="true" />
          {statusCopy.text}
        </dd>
      </dl>
    </section>
  );
}
