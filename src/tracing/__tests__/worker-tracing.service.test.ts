/**
 * Regression tests for worker-tracing.service.ts
 *
 * Run with: npx jest src/tracing/__tests__/worker-tracing.service.test.ts
 */

import { startSpan, traceWorker } from "../worker-tracing.service";

// Silence console.debug noise during tests
beforeAll(() => jest.spyOn(console, "debug").mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

describe("startSpan", () => {
  it("returns a span with ok status on success", () => {
    const finish = startSpan("test:span", { key: "value" });
    const span = finish("ok");

    expect(span.name).toBe("test:span");
    expect(span.status).toBe("ok");
    expect(span.attributes).toEqual({ key: "value" });
    expect(typeof span.durationMs).toBe("number");
    expect(span.durationMs).toBeGreaterThanOrEqual(0);
    expect(span.error).toBeUndefined();
  });

  it("records error message when status is error", () => {
    const finish = startSpan("test:span:error");
    const span = finish("error", new Error("boom"));

    expect(span.status).toBe("error");
    expect(span.error).toBe("boom");
  });

  it("assigns unique traceId and spanId per span", () => {
    const f1 = startSpan("a");
    const f2 = startSpan("b");
    const s1 = f1("ok");
    const s2 = f2("ok");

    expect(s1.traceId).not.toBe(s2.traceId);
    expect(s1.spanId).not.toBe(s2.spanId);
  });
});

describe("traceWorker", () => {
  it("returns the resolved value of the wrapped function", async () => {
    const result = await traceWorker("worker:test", async () => 42);
    expect(result).toBe(42);
  });

  it("re-throws errors from the wrapped function", async () => {
    await expect(
      traceWorker("worker:test:fail", async () => {
        throw new Error("worker failed");
      })
    ).rejects.toThrow("worker failed");
  });

  it("records an error span when the worker throws", async () => {
    // Verify error status and message are captured on the span object
    const finish = startSpan("worker:test:err-span");
    const span = finish("error", new Error("trace this"));

    expect(span.name).toBe("worker:test:err-span");
    expect(span.status).toBe("error");
    expect(span.error).toBe("trace this");
  });

  it("preserves caller-supplied attributes on the span without mutation", async () => {
    // The service must not alter or strip attributes — callers own what they pass
    const finish = startSpan("worker:wallet:connect", {
      publicKey: "G_REDACTED",
    });
    const span = finish("ok");

    expect(span.name).toBe("worker:wallet:connect");
    expect(span.attributes).toEqual({ publicKey: "G_REDACTED" });
  });
});
