"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  AlertTriangle,
  KeyRound,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKey,
} from "@/lib/apiKeys";

// ── One-time token reveal banner ─────────────────────────────────────────────

/** Revealed tokens are automatically masked again after this many seconds. */
export const REVEAL_TIMEOUT_SECONDS = 30;

function maskToken(token: string): string {
  return token.length <= 8
    ? "•".repeat(token.length)
    : `${token.slice(0, 4)}${"•".repeat(token.length - 8)}${token.slice(-4)}`;
}

function NewTokenBanner({
  token,
  onDismiss,
}: {
  token: string;
  onDismiss: () => void;
}) {
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const revealed = secondsLeft > 0;

  // Count down while revealed; reaching zero masks the token again.
  useEffect(() => {
    if (!revealed) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [revealed, secondsLeft]);

  return (
    <div
      role="alert"
      className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
          Copy your API key now — it won&apos;t be shown again.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-background border px-3 py-2">
        <code
          id="new-api-key-value"
          className={cn(
            "flex-1 text-xs font-mono break-all text-foreground",
            revealed ? "select-all" : "select-none"
          )}
          aria-label={revealed ? "API key (revealed)" : "API key (hidden)"}
        >
          {revealed ? token : maskToken(token)}
        </code>
        {revealed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSecondsLeft(0)}
            aria-controls="new-api-key-value"
            className="gap-1.5 shrink-0"
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            Hide
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingReveal(true)}
            disabled={confirmingReveal}
            aria-controls="new-api-key-value"
            className="gap-1.5 shrink-0"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Reveal
          </Button>
        )}
        <CopyButton value={token} label="Copy API key" />
      </div>
      {confirmingReveal && (
        <div
          className="flex flex-wrap items-center gap-2 text-xs"
          data-testid="reveal-confirm"
        >
          <span className="text-foreground">
            Make sure no one can see your screen. Reveal the key for{" "}
            {REVEAL_TIMEOUT_SECONDS} seconds?
          </span>
          <Button
            size="sm"
            autoFocus
            onClick={() => {
              setConfirmingReveal(false);
              setSecondsLeft(REVEAL_TIMEOUT_SECONDS);
            }}
          >
            Confirm reveal
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingReveal(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {/* Announce state changes only, not every countdown tick */}
        <span aria-live="polite">
          {revealed
            ? `Key visible. It will be hidden automatically after ${REVEAL_TIMEOUT_SECONDS} seconds.`
            : "Key hidden. You can copy it without revealing it."}
        </span>
        {revealed && <span aria-hidden="true"> ({secondsLeft}s left)</span>}
      </p>
      <Button variant="outline" size="sm" onClick={onDismiss}>
        I&apos;ve copied it
      </Button>
    </div>
  );
}

// ── Key row ──────────────────────────────────────────────────────────────────

function ApiKeyRow({
  apiKey,
  onRevoke,
  isRevoking,
}: {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  const createdDate = new Date(apiKey.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const lastUsed = apiKey.lastUsedAt
    ? new Date(apiKey.lastUsedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Never";

  function handleRevokeClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onRevoke(apiKey.id);
  }

  function handleCancelConfirm() {
    setConfirming(false);
  }

  return (
    <li className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-sm text-foreground truncate">
          {apiKey.name}
        </p>
        <p className="text-xs font-mono text-muted-foreground">
          {apiKey.maskedToken}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Created {createdDate}</span>
          <span
            className="flex items-center gap-1"
            title={apiKey.lastUsedAt ?? "Never used"}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            Last used: {lastUsed}
          </span>
        </div>
      </div>
      {confirming ? (
        <div
          className="shrink-0 flex items-center gap-1.5 text-xs"
          data-testid={`revoke-confirm-${apiKey.id}`}
        >
          <span className="text-destructive">Revoke this key?</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={isRevoking}
            onClick={handleRevokeClick}
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label={`Confirm revoke API key ${apiKey.name}`}
            data-testid={`revoke-confirm-button-${apiKey.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {isRevoking ? "Revoking…" : "Confirm revoke"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelConfirm}
            aria-label={`Cancel revoke API key ${apiKey.name}`}
            data-testid={`revoke-cancel-button-${apiKey.id}`}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={isRevoking}
          onClick={handleRevokeClick}
          className="shrink-0 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Revoke API key ${apiKey.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Revoke
        </Button>
      )}
    </li>
  );
}

// ── Create form ──────────────────────────────────────────────────────────────

function CreateKeyForm({ onCreated }: { onCreated: (token: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (keyName: string) => createApiKey(keyName),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setName("");
      setSubmitError(null);
      onCreated(created.plainToken);
    },
    onError: (error) => {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to create API key. Please try again."
      );
    },
  });

  const errorMessage = validationError ?? submitError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError("Enter a name for this key before creating it.");
      return;
    }
    setValidationError(null);
    setSubmitError(null);
    mutate(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex gap-2">
        <label htmlFor="api-key-name" className="sr-only">
          Key name
        </label>
        <input
          id="api-key-name"
          type="text"
          placeholder="Key name (e.g. My Trading Bot)"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (validationError) setValidationError(null);
          }}
          maxLength={64}
          aria-invalid={errorMessage ? "true" : undefined}
          aria-describedby={errorMessage ? "api-key-name-error" : undefined}
          className={cn(
            "flex-1 min-w-0 rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            errorMessage &&
              "border-destructive focus-visible:ring-destructive"
          )}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Creating…" : "Create"}
        </Button>
      </div>
      {errorMessage && (
        <p
          id="api-key-name-error"
          role="alert"
          className="mt-1.5 text-xs text-destructive"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * API key / personal access token management panel.
 *
 * Distinct from webhook settings (outbound URLs). This manages inbound
 * authentication tokens for third-party scripts and tools.
 */
export function ApiKeyManager() {
  const queryClient = useQueryClient();
  const [newToken, setNewToken] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const { mutate: revoke, variables: revokingId } = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <div className="space-y-6">
      {/* One-time token banner */}
      {newToken && (
        <NewTokenBanner token={newToken} onDismiss={() => setNewToken(null)} />
      )}

      {/* Create form */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            Create new API key
          </h2>
          <p className="text-xs text-muted-foreground">
            Give the key a descriptive name so you can identify it later.
          </p>
        </CardHeader>
        <CardContent>
          <CreateKeyForm onCreated={(token) => setNewToken(token)} />
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-foreground">
            Your API keys
          </h2>
          <p className="text-xs text-muted-foreground">
            Full token values are never shown after initial creation — only
            masked references.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading keys…
            </p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No API keys yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-2" aria-label="API keys list">
              {keys.map((key) => (
                <ApiKeyRow
                  key={key.id}
                  apiKey={key}
                  onRevoke={(id) => revoke(id)}
                  isRevoking={revokingId === key.id}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
