import {
  DEFAULT_TOAST_DURATION_MS,
  MAX_TOAST_DURATION_MS,
  MAX_VISIBLE_TOASTS,
  MIN_TOAST_DURATION_MS,
  type QueuedToast,
  type ToastTone,
  dismissToast,
  enqueueToast,
  normalizeToastDuration,
  orderToasts,
  priorityForTone,
} from "@/lib/toastQueue";

function build(
  entries: Array<{ id: string; tone: ToastTone; dedupeKey?: string }>,
): QueuedToast[] {
  let queue: QueuedToast[] = [];
  for (const entry of entries) {
    queue = enqueueToast(queue, entry).toasts;
  }
  return queue;
}

function ids(toasts: ReadonlyArray<{ id: string }>): string[] {
  return toasts.map((toast) => toast.id);
}

describe("priority – important toasts survive a crowded stack", () => {
  it("ranks error and warning above success above info", () => {
    expect(priorityForTone("error")).toBe("high");
    expect(priorityForTone("warning")).toBe("high");
    expect(priorityForTone("success")).toBe("normal");
    expect(priorityForTone("info")).toBe("low");
  });

  it("shows the most important toast first", () => {
    const queue = build([
      { id: "a", tone: "info" },
      { id: "b", tone: "error" },
      { id: "c", tone: "success" },
    ]);
    expect(ids(orderToasts(queue))).toEqual(["b", "c", "a"]);
  });

  it("keeps arrival order within one priority", () => {
    const queue = build([
      { id: "a", tone: "error" },
      { id: "b", tone: "error" },
    ]);
    expect(ids(queue)).toEqual(["a", "b"]);
  });
});

describe("normalizeToastDuration – timings are always sane", () => {
  it("defaults when no duration is given", () => {
    expect(normalizeToastDuration("info")).toBe(DEFAULT_TOAST_DURATION_MS);
  });

  it("honours an explicit duration", () => {
    expect(normalizeToastDuration("info", 7_000)).toBe(7_000);
  });

  it("clamps to the supported range", () => {
    expect(normalizeToastDuration("info", 10)).toBe(MIN_TOAST_DURATION_MS);
    expect(normalizeToastDuration("info", 10 * MAX_TOAST_DURATION_MS)).toBe(
      MAX_TOAST_DURATION_MS,
    );
  });

  it("falls back to the default for a nonsense duration", () => {
    expect(normalizeToastDuration("info", Number.NaN)).toBe(
      DEFAULT_TOAST_DURATION_MS,
    );
  });

  it("stores the normalized duration on the queued toast", () => {
    const result = enqueueToast([], { id: "a", tone: "error", durationMs: 1 });
    expect(result.toasts[0].durationMs).toBe(MIN_TOAST_DURATION_MS);
  });
});

describe("enqueueToast – the stack never grows without bound", () => {
  it("adds a toast", () => {
    const result = enqueueToast([], { id: "a", tone: "success" });
    expect(result.added).not.toBeNull();
    expect(result.replaced).toBeNull();
    expect(ids(result.toasts)).toEqual(["a"]);
  });

  it("never shows more than the maximum", () => {
    let queue: QueuedToast[] = [];
    for (let index = 0; index < 7; index += 1) {
      queue = enqueueToast(queue, { id: `t${index}`, tone: "info" }).toasts;
    }
    expect(queue).toHaveLength(MAX_VISIBLE_TOASTS);
  });

  it("evicts the oldest low-priority toast first", () => {
    const base = build([
      { id: "keep-error", tone: "error" },
      { id: "old-info", tone: "info" },
      { id: "other-info", tone: "info" },
      { id: "more-info", tone: "info" },
    ]);
    const result = enqueueToast(base, { id: "new", tone: "success" });
    expect(ids(result.evicted)).toEqual(["old-info"]);
    expect(ids(result.toasts)).toEqual([
      "keep-error",
      "new",
      "other-info",
      "more-info",
    ]);
  });

  it("replaces a duplicate instead of showing it twice", () => {
    const base = build([{ id: "first", tone: "info", dedupeKey: "save:sig-1" }]);
    const result = enqueueToast(base, {
      id: "second",
      tone: "error",
      dedupeKey: "save:sig-1",
    });
    expect(result.added).toBeNull();
    expect(result.replaced?.id).toBe("first");
    expect(ids(result.toasts)).toEqual(["second"]);
    expect(result.toasts[0].tone).toBe("error");
  });

  it("treats the same id as a duplicate", () => {
    const base = build([{ id: "same", tone: "info" }]);
    const result = enqueueToast(base, { id: "same", tone: "warning" });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].tone).toBe("warning");
  });

  it("does not mutate the queue it was given", () => {
    const base = build([{ id: "a", tone: "info" }]);
    const before = ids(base);
    enqueueToast(base, { id: "b", tone: "info" });
    expect(ids(base)).toEqual(before);
  });
});

describe("dismissToast – dismissing twice is harmless", () => {
  it("removes the requested toast", () => {
    const queue = build([
      { id: "a", tone: "info" },
      { id: "b", tone: "info" },
    ]);
    expect(ids(dismissToast(queue, "a"))).toEqual(["b"]);
  });

  it("returns the queue unchanged for an unknown id", () => {
    const queue = build([{ id: "a", tone: "info" }]);
    expect(ids(dismissToast(queue, "gone"))).toEqual(["a"]);
  });
});
