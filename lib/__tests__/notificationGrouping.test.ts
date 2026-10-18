import { groupNotifications, isCollapsibleGroup } from "@/lib/notificationGrouping";
import type { Notification } from "@/store/useNotificationStore";

const items: Notification[] = [
  { id: "1", title: "XLM/USDC", message: "BUY", read: false, signalId: "sig-1", href: "/signals/sig-1" },
  { id: "2", title: "Alpha", message: "New post", read: true, providerId: "prov-1", providerName: "Alpha Trades" },
  { id: "3", title: "XLM/USDC", message: "Target hit", read: true, signalId: "sig-1", href: "/signals/sig-1#tp" },
  { id: "4", title: "Alpha", message: "Rating up", read: false, providerId: "prov-1" },
  { id: "5", title: "System", message: "Maintenance", read: false },
];

describe("groupNotifications", () => {
  it("groups by signal and provider with accurate counts", () => {
    const groups = groupNotifications(items);
    expect(groups.map((g) => g.key)).toEqual(["signal:sig-1", "provider:prov-1", "single:5"]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(2);
    expect(groups[1].label).toBe("Alpha Trades");
  });

  it("preserves individual read state and destination links", () => {
    const [signal] = groupNotifications(items);
    expect(signal.items.map((n) => [n.id, n.read, n.href])).toEqual([
      ["1", false, "/signals/sig-1"],
      ["3", true, "/signals/sig-1#tp"],
    ]);
    expect(signal.unreadCount).toBe(1);
  });

  it("updates unread counts when one item in a group is read", () => {
    const updated = items.map((n) => (n.id === "4" ? { ...n, read: true } : n));
    const provider = groupNotifications(updated).find((g) => g.key === "provider:prov-1")!;
    expect(provider.unreadCount).toBe(0);
    expect(provider.items.find((n) => n.id === "2")!.read).toBe(true);
  });

  it("only treats multi-item groups as collapsible", () => {
    const groups = groupNotifications(items);
    expect(groups.map(isCollapsibleGroup)).toEqual([true, true, false]);
  });
});
