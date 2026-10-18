/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { SettingsBreadcrumb } from "@/components/SettingsBreadcrumb";

// Mock next/navigation
let mockPathname = "/security";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock next/link so hrefs are accessible in jsdom
jest.mock("next/link", () => {
  const Link = ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  Link.displayName = "Link";
  return Link;
});

describe("SettingsBreadcrumb", () => {
  describe("route-derived breadcrumbs", () => {
    it("renders the correct trail for /security (2-segment path)", () => {
      mockPathname = "/security";
      render(<SettingsBreadcrumb />);

      const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(nav).toBeTruthy();

      // 'Settings' should be a link
      const settingsLink = screen.getByRole("link", { name: "Settings" });
      expect(settingsLink.getAttribute("href")).toBe("/settings");

      // 'Security' is the current page — not a link
      const currentPage = screen.getByText("Security");
      expect(currentPage.getAttribute("aria-current")).toBe("page");
      expect(screen.queryByRole("link", { name: "Security" })).toBeNull();
    });

    it("renders the correct trail for /security/active-sessions (3-segment path)", () => {
      mockPathname = "/security/active-sessions";
      render(<SettingsBreadcrumb />);

      // Two links: Settings and Security
      const settingsLink = screen.getByRole("link", { name: "Settings" });
      expect(settingsLink.getAttribute("href")).toBe("/settings");

      const securityLink = screen.getByRole("link", { name: "Security" });
      expect(securityLink.getAttribute("href")).toBe("/security");

      // 'Active Sessions' is the current page
      const currentPage = screen.getByText("Active Sessions");
      expect(currentPage.getAttribute("aria-current")).toBe("page");
    });
  });

  describe("custom segments prop", () => {
    it("renders segments passed via prop instead of route lookup", () => {
      mockPathname = "/some/unregistered/route";
      render(
        <SettingsBreadcrumb
          segments={[
            { label: "Settings", href: "/settings" },
            { label: "Profile", href: "/settings/profile" },
          ]}
        />
      );

      expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
      const current = screen.getByText("Profile");
      expect(current.getAttribute("aria-current")).toBe("page");
    });
  });

  describe("edge cases", () => {
    it("renders nothing when the pathname is not in the route map", () => {
      mockPathname = "/unknown-page";
      const { container } = render(<SettingsBreadcrumb />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing for a single-segment trail", () => {
      const { container } = render(
        <SettingsBreadcrumb
          segments={[{ label: "Settings", href: "/settings" }]}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("uses an ordered list with correct ARIA structure", () => {
      mockPathname = "/security";
      render(<SettingsBreadcrumb />);
      const list = screen.getByRole("list");
      expect(list.tagName).toBe("OL");
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(2);
    });
  });
});
