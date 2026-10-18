/**
 * Network switch helpers (#800).
 *
 * Wallets like Freighter don't let a dApp change networks programmatically —
 * the user switches inside the extension. The app therefore never changes its
 * own network optimistically: it waits until the wallet reports the
 * destination network and only then updates the view.
 */

export type NetworkSwitchFailure = "rejected" | "timeout";

export class NetworkSwitchError extends Error {
  constructor(
    public readonly reason: NetworkSwitchFailure,
    message: string
  ) {
    super(message);
    this.name = "NetworkSwitchError";
  }
}

export interface WaitForWalletNetworkOptions {
  /** Reads the wallet's current network id (e.g. "TESTNET"). */
  readNetwork: () => Promise<string | null | undefined>;
  /** Give up after this long. Default: 60s. */
  timeoutMs?: number;
  /** Poll interval. Default: 1s. */
  intervalMs?: number;
  /** Abort to stop waiting (treated as a rejection). */
  signal?: AbortSignal;
}

function normalize(network: string | null | undefined): string {
  return (network ?? "").trim().toUpperCase();
}

/**
 * Resolves once the wallet reports `target`; rejects with a
 * {@link NetworkSwitchError} if the user stops waiting or the timeout passes.
 * Read errors are treated as "not switched yet" and polling continues.
 */
export function waitForWalletNetwork(
  target: string,
  {
    readNetwork,
    timeoutMs = 60_000,
    intervalMs = 1_000,
    signal,
  }: WaitForWalletNetworkOptions
): Promise<void> {
  const wanted = normalize(target);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + timeoutMs;

    const finish = (err?: NetworkSwitchError) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve();
    };

    const onAbort = () =>
      finish(
        new NetworkSwitchError("rejected", "The network switch was cancelled.")
      );

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort);

    const check = async () => {
      if (settled) return;
      let current = "";
      try {
        current = normalize(await readNetwork());
      } catch {
        // Wallet busy or unavailable — keep waiting until the deadline.
      }
      if (settled) return;
      if (current === wanted) {
        finish();
        return;
      }
      if (Date.now() >= deadline) {
        finish(
          new NetworkSwitchError(
            "timeout",
            "The wallet didn't switch networks in time."
          )
        );
        return;
      }
      timer = setTimeout(check, intervalMs);
    };

    void check();
  });
}

/** Reads the network currently selected in Freighter. */
export async function readFreighterNetwork(): Promise<string | null> {
  const { getNetworkDetails } = await import("@stellar/freighter-api");
  const details = (await getNetworkDetails()) as { network?: string } | null;
  return details?.network ?? null;
}
