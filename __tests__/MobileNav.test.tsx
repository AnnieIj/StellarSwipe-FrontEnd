/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { MobileNav } from "@/components/MobileNav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/journal/entry-1",
}));

describe("MobileNav", () => {
  it("exposes core destinations and marks nested current routes", () => {
    render(<MobileNav />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /signals/i })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: /journal/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /compare/i })).not.toHaveAttribute("aria-current");
  });
});