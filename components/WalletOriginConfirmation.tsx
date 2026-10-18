"use client";

/**
 * WalletOriginConfirmation — #799
 *
 * Displayed before a wallet connection is approved. Shows:
 *  - The requesting origin (hostname) in plain language.
 *  - If the origin cannot be verified (empty / non-standard), it is shown as
 *    "Unavailable" and never guessed.
 *  - The permissions the wallet connection will grant, in plain English.
 *  - Distinct, keyboard-accessible "Cancel" and "Connect" actions.
 *
 * The component is stateless — callers handle the actual connect() call.
 */

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Globe, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WalletPermission {
  /** Short human-readable label, e.g. "Read public key" */
  label: string;
  /** Optional longer description */
  description?: string;
}

export interface WalletOriginConfirmationProps {
  /** Requesting origin, e.g. "https://app.stellarswipe.io". Pass null/undefined
   *  when the origin cannot be determined. */
  origin: string | null | undefined;
  /** Wallet display name, e.g. "Freighter". */
  walletName: string;
  /** List of permissions being requested. Defaults to a sensible set for Freighter. */
  permissions?: WalletPermission[];
  /** Called when the user confirms and wants to proceed with connecting. */
  onConfirm: () => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Whether the confirmation dialog is shown. */
  open: boolean;
  className?: string;
}

const DEFAULT_PERMISSIONS: WalletPermission[] = [
  {
    label: "Read your public key",
    description:
      "The app will see your Stellar public address but never your secret key.",
  },
  {
    label: "Request transaction signatures",
    description:
      "You will be asked to approve each transaction individually in your wallet.",
  },
];

/**
 * Parses a safe, user-visible hostname from an origin string.
 * Returns null if the origin is empty, non-HTTP/HTTPS, or otherwise unparsable.
 */
function safeHostname(origin: string | null | undefined): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

export function WalletOriginConfirmation({
  origin,
  walletName,
  permissions = DEFAULT_PERMISSIONS,
  onConfirm,
  onCancel,
  open,
  className,
}: WalletOriginConfirmationProps) {
  const focusTrapRef = useFocusTrap({
    isActive: open,
    initialFocus: "[data-cancel-btn]",
  });

  if (!open) return null;

  const hostname = safeHostname(origin);
  const originVerified = hostname !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="woc-title"
      aria-describedby="woc-desc"
      ref={focusTrapRef}
      className={cn(
        "rounded-xl border border-border bg-surface p-5 shadow-xl w-full max-w-sm",
        className
      )}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <Lock size={15} className="text-blue-400 shrink-0" aria-hidden="true" />
        <h2 id="woc-title" className="text-base font-semibold text-foreground">
          Connect {walletName}?
        </h2>
      </div>

      {/* Description */}
      <p id="woc-desc" className="text-sm text-muted-foreground mb-4">
        Review the details below before allowing access.
      </p>

      {/* Origin */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg p-3 mb-4 border",
          originVerified
            ? "border-blue-500/30 bg-blue-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        )}
        aria-label={
          originVerified
            ? `Requesting origin: ${hostname}`
            : "Requesting origin unavailable"
        }
      >
        {originVerified ? (
          <Globe
            size={16}
            className="text-blue-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <ShieldAlert
            size={16}
            className="text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Requesting site
          </p>
          {originVerified ? (
            <p className="text-sm font-semibold text-foreground break-all">
              {hostname}
            </p>
          ) : (
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                size={12}
                className="text-amber-400 shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-amber-400">
                Unavailable
              </p>
            </div>
          )}
          {!originVerified && (
            <p className="mt-1 text-xs text-muted-foreground">
              The requesting origin could not be verified. Proceed only if you
              initiated this connection yourself.
            </p>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          This connection will allow:
        </p>
        <ul
          className="space-y-2"
          aria-label="Requested permissions"
        >
          {permissions.map((perm) => (
            <li key={perm.label} className="flex items-start gap-2">
              <CheckCircle2
                size={13}
                className="text-green-500 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm text-foreground">{perm.label}</p>
                {perm.description && (
                  <p className="text-xs text-muted-foreground">
                    {perm.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-cancel-btn
          className="flex-1"
          aria-label="Cancel wallet connection"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          className="flex-1"
          aria-label={`Confirm and connect ${walletName}`}
        >
          Connect
        </Button>
      </div>
    </div>
  );
}
