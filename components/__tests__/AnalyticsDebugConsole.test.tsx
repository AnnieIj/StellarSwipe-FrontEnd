/**
 * @jest-environment jsdom
 *
 * Tests for AnalyticsDebugConsole component
 */

import { render, screen } from "@testing-library/react";
import { AnalyticsDebugConsole } from "@/components/AnalyticsDebugConsole";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe("AnalyticsDebugConsole", () => {
  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: ORIGINAL_NODE_ENV,
      configurable: true,
    });
  });

  it("does not render when the build environment is production", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });

    const { container } = render(<AnalyticsDebugConsole />);
    expect(container.firstChild).toBeNull();
  });

  it("renders in development mode", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });

    render(<AnalyticsDebugConsole />);
    expect(
      screen.getByLabelText("Analytics debug console (dev mode only)")
    ).toBeTruthy();
  });
});
