/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PortfolioEmptyState } from "@/components/PortfolioEmptyState";

// next/link needs a router context in tests — stub it out simply
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("PortfolioEmptyState", () => {
  describe("allocation variant", () => {
    it("renders the default heading", () => {
      render(<PortfolioEmptyState variant="allocation" />);
      expect(screen.getByText("No portfolio data available")).toBeTruthy();
    });

    it("renders the default body copy", () => {
      render(<PortfolioEmptyState variant="allocation" />);
      expect(
        screen.getByText(
          "Your allocation chart will appear once you make your first trade."
        )
      ).toBeTruthy();
    });

    it("renders a CTA link pointing to /app", () => {
      render(<PortfolioEmptyState variant="allocation" />);
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe("/app");
    });
  });

  describe("pnl variant", () => {
    it("renders the default heading", () => {
      render(<PortfolioEmptyState variant="pnl" />);
      expect(screen.getByText("No P&L data yet")).toBeTruthy();
    });

    it("renders a CTA link", () => {
      render(<PortfolioEmptyState variant="pnl" />);
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe("/app");
    });
  });

  describe("summary variant", () => {
    it("renders the default heading", () => {
      render(<PortfolioEmptyState variant="summary" />);
      expect(screen.getByText("Portfolio is empty")).toBeTruthy();
    });
  });

  describe("full variant", () => {
    it("renders the default heading", () => {
      render(<PortfolioEmptyState variant="full" />);
      expect(screen.getByText("Your portfolio is empty")).toBeTruthy();
    });

    it("uses larger layout classes (not compact)", () => {
      const { container } = render(<PortfolioEmptyState variant="full" />);
      // The outer wrapper should have py-12 for the full variant
      expect(container.querySelector('[role="region"]')?.className).toContain("py-12");
    });
  });

  describe("prop overrides", () => {
    it("uses custom heading when provided", () => {
      render(<PortfolioEmptyState heading="Custom heading" />);
      expect(screen.getByText("Custom heading")).toBeTruthy();
    });

    it("uses custom body when provided", () => {
      render(<PortfolioEmptyState body="Custom body text" />);
      expect(screen.getByText("Custom body text")).toBeTruthy();
    });

    it("uses custom ctaLabel and ctaHref when provided", () => {
      render(
        <PortfolioEmptyState ctaLabel="Go trade" ctaHref="/signals" />
      );
      const link = screen.getByRole("link");
      expect(link.textContent).toContain("Go trade");
      expect(link.getAttribute("href")).toBe("/signals");
    });
  });

  describe("accessibility", () => {
    it("renders a region landmark with an aria-label", () => {
      render(<PortfolioEmptyState variant="full" />);
      const region = screen.getByRole("region");
      expect(region.getAttribute("aria-label")).toBe("Your portfolio is empty");
    });

    it("CTA link has a descriptive aria-label", () => {
      render(<PortfolioEmptyState variant="full" />);
      const link = screen.getByRole("link");
      expect(link.getAttribute("aria-label")).toContain("start building your portfolio");
    });
  });
});
