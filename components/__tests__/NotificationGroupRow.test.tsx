/** @jest-environment jsdom */
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationGroupRow } from "@/components/NotificationBell";
import { groupNotifications } from "@/lib/notificationGrouping";
import type { Notification } from "@/store/useNotificationStore";

const initial: Notification[] = [
  { id: "1", title: "XLM/USDC", message: "BUY", read: false, signalId: "sig-1", href: "/signals/sig-1" },
  { id: "2", title: "XLM/USDC", message: "Target hit", read: false, signalId: "sig-1", href: "/signals/sig-1#tp" },
];

function Harness() {
  const [notifications, setNotifications] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [group] = groupNotifications(notifications);
  return (
    <ul>
      <NotificationGroupRow
        group={group}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        onMarkAsRead={(id) =>
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        }
      />
    </ul>
  );
}

describe("NotificationGroupRow", () => {
  it("shows an accurate count and expands with the keyboard", () => {
    render(<Harness />);
    const toggle = screen.getByRole("button", { name: /2 signal updates, 2 unread/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(toggle, { key: "ArrowRight" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("notification-1")).toBeInTheDocument();
    expect(screen.getByTestId("notification-2")).toBeInTheDocument();

    fireEvent.keyDown(toggle, { key: "ArrowLeft" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("notification-1")).not.toBeInTheDocument();
  });

  it("keeps individual read state and destination links", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /signal updates/ }));

    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/signals/sig-1", "/signals/sig-1#tp"]);

    fireEvent.click(screen.getAllByRole("button", { name: 'Mark "XLM/USDC" as read' })[0]);
    expect(screen.getByTestId("notification-1")).toHaveAttribute("data-read", "true");
    expect(screen.getByTestId("notification-2")).toHaveAttribute("data-read", "false");
    expect(screen.getByRole("button", { name: /2 signal updates, 1 unread/ })).toBeInTheDocument();
  });
});
