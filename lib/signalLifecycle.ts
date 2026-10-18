/**
 * Signal lifecycle state machine. This module is the single source of truth
 * for which signal state changes are allowed.
 *
 * Allowed transitions:
 * - draft   → active                       (publish)
 * - active  → updated | closed | expired
 * - updated → active | closed | expired    (edit applied, or ended)
 * - closed  and expired are terminal
 */

export type SignalLifecycleState =
  | "draft"
  | "active"
  | "updated"
  | "closed"
  | "expired";

export const SIGNAL_TRANSITIONS: Record<
  SignalLifecycleState,
  readonly SignalLifecycleState[]
> = {
  draft: ["active"],
  active: ["updated", "closed", "expired"],
  updated: ["active", "closed", "expired"],
  closed: [],
  expired: [],
};

export interface SignalTransition {
  from: SignalLifecycleState;
  to: SignalLifecycleState;
  /** ISO timestamp the transition was applied */
  at: string;
  /** Identifier of the authenticated actor that caused the transition */
  actor: string;
}

export interface SignalLifecycle {
  state: SignalLifecycleState;
  /** Append-only record of every applied transition, oldest first */
  transitions: SignalTransition[];
}

/** Thrown when a requested transition is not in {@link SIGNAL_TRANSITIONS} */
export class SignalTransitionConflictError extends Error {
  constructor(
    public readonly from: SignalLifecycleState,
    public readonly to: SignalLifecycleState
  ) {
    super(`Signal cannot transition from "${from}" to "${to}"`);
    this.name = "SignalTransitionConflictError";
  }
}

export function canTransitionSignal(
  from: SignalLifecycleState,
  to: SignalLifecycleState
): boolean {
  return SIGNAL_TRANSITIONS[from].includes(to);
}

/**
 * Applies a transition and returns a new lifecycle. The input is not mutated.
 * Throws {@link SignalTransitionConflictError} for any transition outside the
 * matrix, including self-transitions.
 */
export function transitionSignal(
  lifecycle: SignalLifecycle,
  to: SignalLifecycleState,
  actor: string,
  now: Date = new Date()
): SignalLifecycle {
  if (!canTransitionSignal(lifecycle.state, to)) {
    throw new SignalTransitionConflictError(lifecycle.state, to);
  }

  return {
    state: to,
    transitions: [
      ...lifecycle.transitions,
      {
        from: lifecycle.state,
        to,
        at: now.toISOString(),
        actor,
      },
    ],
  };
}
