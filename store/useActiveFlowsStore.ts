import { create } from "zustand";

/**
 * useActiveFlowsStore
 * ───────────────────
 * Registry of in-progress, network-bound work (#800) — an open trade review,
 * a pending wallet signature — so a network switch can tell the user what
 * would be invalidated and let them cancel it first.
 *
 * Not persisted: flows only exist while the UI that owns them is mounted.
 */

export type ActiveFlowKind = "trade" | "signing";

export interface ActiveFlow {
  id: string;
  kind: ActiveFlowKind;
  /** Short description shown in the switch confirmation, e.g. "XLM → USDC market order". */
  label: string;
  /**
   * Safely abandons the flow. Omit when the flow can't be cancelled from the
   * app (e.g. a signature request waiting in the wallet extension).
   */
  cancel?: () => void;
}

interface ActiveFlowsState {
  flows: ActiveFlow[];
  registerFlow: (flow: ActiveFlow) => void;
  unregisterFlow: (id: string) => void;
  /** Cancels a single flow (if cancellable) and removes it. */
  cancelFlow: (id: string) => void;
}

export const useActiveFlowsStore = create<ActiveFlowsState>()((set, get) => ({
  flows: [],

  registerFlow: (flow) =>
    set((state) => ({
      flows: [...state.flows.filter((f) => f.id !== flow.id), flow],
    })),

  unregisterFlow: (id) =>
    set((state) => ({ flows: state.flows.filter((f) => f.id !== id) })),

  cancelFlow: (id) => {
    const flow = get().flows.find((f) => f.id === id);
    if (!flow?.cancel) return;
    flow.cancel();
    get().unregisterFlow(id);
  },
}));
