/**
 * worker-tracing.service.ts
 *
 * Lightweight tracing for asynchronous worker execution paths.
 * Captures span lifecycle (start / end / error) for:
 *   - API route handlers  (signal feed, etc.)
 *   - TanStack Query fetch workers
 *   - Wallet / transaction async operations
 *
 * No external dependency is required — traces are emitted to the
 * console in development and can be forwarded to any observability
 * backend by replacing `emit`.
 */

export type SpanStatus = "ok" | "error";

export interface Span {
  traceId: string;
  spanId: string;
  /** Human-readable name, e.g. "worker:signals:fetch" */
  name: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: SpanStatus;
  /** Arbitrary key/value metadata attached to the span */
  attributes: Record<string, unknown>;
  error?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emit(span: Span): void {
  if (process.env.NODE_ENV === "development") {
    const tag = span.status === "error" ? "❌" : "✅";
    // eslint-disable-next-line no-console
    console.debug(
      `[trace] ${tag} ${span.name} | ${span.durationMs ?? "?"}ms`,
      span
    );
  }

  if (typeof window !== "undefined") {
    import("@/services/performanceMonitoring")
      .then(({ recordTracingSpan }) => recordTracingSpan(span))
      .catch(() => {
        // Performance monitoring not available
      });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start a new span.  Returns a finish function that must be called when the
 * async work completes (or throws).
 *
 * @example
 * const finish = startSpan("worker:signals:fetch", { page: 1 });
 * try {
 *   const data = await fetchSignals(1);
 *   finish("ok");
 * } catch (err) {
 *   finish("error", err as Error);
 * }
 */
export function startSpan(
  name: string,
  attributes: Record<string, unknown> = {}
): (status: SpanStatus, error?: Error) => Span {
  const span: Span = {
    traceId: uid(),
    spanId: uid(),
    name,
    startedAt: Date.now(),
    status: "ok",
    attributes,
  };

  return (status: SpanStatus, error?: Error): Span => {
    span.endedAt = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.status = status;
    if (error) span.error = error.message;
    emit(span);
    return span;
  };
}

/**
 * Convenience wrapper — automatically traces an async function and returns
 * its result.  Preserves the original error so callers can still handle it.
 *
 * @example
 * const data = await traceWorker("worker:wallet:connect", connectWallet, { userId });
 */
export async function traceWorker<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, unknown> = {}
): Promise<T> {
  const finish = startSpan(name, attributes);
  try {
    const result = await fn();
    finish("ok");
    return result;
  } catch (err) {
    finish("error", err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}
