"use client";

import { useEffect, useId, useRef } from "react";
import {
  useActiveFlowsStore,
  type ActiveFlow,
} from "@/store/useActiveFlowsStore";

/**
 * Registers a network-bound flow (#800) for as long as `active` is true, so
 * the network switch confirmation can list it and offer to cancel it.
 *
 * `cancel` is read through a ref, so passing a new closure each render does
 * not re-register the flow.
 */
export function useRegisterActiveFlow(
  active: boolean,
  flow: Omit<ActiveFlow, "id">
) {
  const id = useId();
  const cancelRef = useRef(flow.cancel);
  cancelRef.current = flow.cancel;
  const cancellable = Boolean(flow.cancel);
  const { kind, label } = flow;

  useEffect(() => {
    if (!active) return;
    const { registerFlow, unregisterFlow } = useActiveFlowsStore.getState();
    registerFlow({
      id,
      kind,
      label,
      cancel: cancellable ? () => cancelRef.current?.() : undefined,
    });
    return () => unregisterFlow(id);
  }, [active, id, kind, label, cancellable]);
}
