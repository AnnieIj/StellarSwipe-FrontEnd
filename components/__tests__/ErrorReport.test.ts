/**
 * Tests for the "report this error" action present on error fallback UIs.
 * Covers that the mailto href is built with the correct error id and Sentry
 * event id, and that no sensitive data beyond those identifiers is included.
 */

const SUPPORT_EMAIL = "support@stellarswipe.io";

function buildReportHref(
  digest: string | undefined,
  eventId: string | null
): string {
  const subject = encodeURIComponent("Error Report – StellarSwipe");
  const body = encodeURIComponent(
    [
      `Error ID: ${digest ?? "n/a"}`,
      `Sentry Event ID: ${eventId ?? "n/a"}`,
      "",
      "Please describe what you were doing when the error occurred:",
      "",
    ].join("\n")
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

describe("buildReportHref – mailto link for error reporting", () => {
  it("targets the support email address", () => {
    const href = buildReportHref("abc123", "evt-456");
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}`)).toBe(true);
  });

  it("includes the error digest in the body", () => {
    const href = buildReportHref("digest-xyz", "evt-001");
    expect(decodeURIComponent(href)).toContain("Error ID: digest-xyz");
  });

  it("includes the Sentry event id in the body", () => {
    const href = buildReportHref("digest-xyz", "evt-001");
    expect(decodeURIComponent(href)).toContain("Sentry Event ID: evt-001");
  });

  it("falls back to 'n/a' when digest is undefined", () => {
    const href = buildReportHref(undefined, "evt-001");
    expect(decodeURIComponent(href)).toContain("Error ID: n/a");
  });

  it("falls back to 'n/a' when Sentry event id is null", () => {
    const href = buildReportHref("digest-xyz", null);
    expect(decodeURIComponent(href)).toContain("Sentry Event ID: n/a");
  });

  it("does not include stack traces or component stacks", () => {
    const href = buildReportHref("digest-xyz", "evt-001");
    const decoded = decodeURIComponent(href);
    // Stack trace lines start with "    at Object." / "    at Function." etc.
    expect(decoded).not.toMatch(/\s+at (Object|Function|Array)\./);
    expect(decoded).not.toContain("componentStack");
    // "Error:" with uppercase E is the stringified error message prefix
    expect(decoded).not.toContain("Error:");
  });

  it("includes both ids when both are provided", () => {
    const href = buildReportHref("d-999", "e-888");
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain("Error ID: d-999");
    expect(decoded).toContain("Sentry Event ID: e-888");
  });
});
