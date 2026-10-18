/**
 * Unit tests for useNotificationStore
 *
 * Covers:
 *  - initial state and unreadCount selector
 *  - markAsRead (single notification)
 *  - markAllAsRead — optimistic update
 *  - markAllAsRead — rollback on persist failure
 *  - markAllAsRead — isMarkingAllRead flag lifecycle
 *  - markAllAsRead is a no-op / safe when already all-read
 *  - badge count reaches 0 after markAllAsRead
 *  - category preference toggles are unaffected
 *  - clearAll
 *  - setNotifications
 */

import { useNotificationStore } from "@/store/useNotificationStore";

const INITIAL_NOTIFICATIONS = [
  {
    id: "1",
    title: "XLM/USDC",
    message: "New BUY signal — high confidence",
    read: false,
  },
  {
    id: "2",
    title: "BTC/XLM",
    message: "New SELL signal — momentum reversal",
    read: false,
  },
];

/** Reset store state before each test to prevent cross-test pollution. */
beforeEach(() => {
  useNotificationStore.setState({
    notifications: INITIAL_NOTIFICATIONS.map((n) => ({ ...n })),
    isMarkingAllRead: false,
  });
});

describe("useNotificationStore — initial state", () => {
  it("starts with the seeded notifications", () => {
    const { notifications } = useNotificationStore.getState();
    expect(notifications).toHaveLength(2);
  });

  it("unreadCount returns 2 when both notifications are unread", () => {
    const { unreadCount } = useNotificationStore.getState();
    expect(unreadCount()).toBe(2);
  });

  it("isMarkingAllRead is false initially", () => {
    expect(useNotificationStore.getState().isMarkingAllRead).toBe(false);
  });
});

describe("useNotificationStore — markAsRead (single)", () => {
  it("marks only the targeted notification as read", () => {
    useNotificationStore.getState().markAsRead("1");
    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications.find((n) => n.id === "1")!.read).toBe(true);
    expect(notifications.find((n) => n.id === "2")!.read).toBe(false);
    expect(unreadCount()).toBe(1);
  });

  it("is idempotent — marking an already-read notification has no effect", () => {
    useNotificationStore.setState({
      notifications: [{ id: "1", title: "T", message: "M", read: true }],
    });
    useNotificationStore.getState().markAsRead("1");
    expect(useNotificationStore.getState().notifications[0].read).toBe(true);
  });
});

describe("useNotificationStore — markAllAsRead (no persist callback)", () => {
  it("marks every notification as read", async () => {
    await useNotificationStore.getState().markAllAsRead();
    const { notifications } = useNotificationStore.getState();
    expect(notifications.every((n) => n.read)).toBe(true);
  });

  it("reduces unreadCount to 0", async () => {
    await useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });

  it("resets isMarkingAllRead to false after completion", async () => {
    await useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().isMarkingAllRead).toBe(false);
  });

  it("does not remove any notifications from the list", async () => {
    await useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().notifications).toHaveLength(2);
  });

  it("is safe to call when already all-read", async () => {
    useNotificationStore.setState({
      notifications: INITIAL_NOTIFICATIONS.map((n) => ({ ...n, read: true })),
    });
    await expect(
      useNotificationStore.getState().markAllAsRead()
    ).resolves.toBeUndefined();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});

describe("useNotificationStore — markAllAsRead with persist callback", () => {
  it("calls the persist callback", async () => {
    const persist = jest.fn().mockResolvedValue(undefined);
    await useNotificationStore.getState().markAllAsRead(persist);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("keeps all notifications read when persist succeeds", async () => {
    const persist = jest.fn().mockResolvedValue(undefined);
    await useNotificationStore.getState().markAllAsRead(persist);
    expect(
      useNotificationStore.getState().notifications.every((n) => n.read)
    ).toBe(true);
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });

  it("rolls back notifications when persist rejects", async () => {
    const persist = jest.fn().mockRejectedValue(new Error("network error"));
    await expect(
      useNotificationStore.getState().markAllAsRead(persist)
    ).rejects.toThrow("network error");

    const { notifications, unreadCount } = useNotificationStore.getState();
    // Notifications are restored to pre-call state
    expect(notifications.every((n) => !n.read)).toBe(true);
    expect(unreadCount()).toBe(2);
  });

  it("resets isMarkingAllRead to false after rollback", async () => {
    const persist = jest.fn().mockRejectedValue(new Error("fail"));
    await useNotificationStore
      .getState()
      .markAllAsRead(persist)
      .catch(() => {});
    expect(useNotificationStore.getState().isMarkingAllRead).toBe(false);
  });
});

describe("useNotificationStore — badge state", () => {
  it("badge count equals number of unread notifications", () => {
    useNotificationStore.setState({
      notifications: [
        { id: "1", title: "A", message: "M", read: false },
        { id: "2", title: "B", message: "M", read: true },
        { id: "3", title: "C", message: "M", read: false },
      ],
    });
    expect(useNotificationStore.getState().unreadCount()).toBe(2);
  });

  it("badge count drops to 0 immediately after markAllAsRead (optimistic)", async () => {
    // Capture count right after the synchronous optimistic update.
    // Because markAllAsRead is async but the optimistic set() is synchronous,
    // we start the call and check state before it resolves.
    const slowPersist = () =>
      new Promise<void>((resolve) => setTimeout(resolve, 50));
    const promise = useNotificationStore.getState().markAllAsRead(slowPersist);

    // The optimistic update is synchronous — unreadCount is already 0.
    expect(useNotificationStore.getState().unreadCount()).toBe(0);

    await promise;
  });
});

describe("useNotificationStore — clearAll", () => {
  it("empties the notification list", () => {
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it("unreadCount is 0 after clearAll", () => {
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().unreadCount()).toBe(0);
  });
});

describe("useNotificationStore — setNotifications", () => {
  it("replaces the notification list", () => {
    const newNotifications = [
      { id: "99", title: "New", message: "Msg", read: false },
    ];
    useNotificationStore.getState().setNotifications(newNotifications);
    expect(useNotificationStore.getState().notifications).toEqual(
      newNotifications
    );
  });

  it("updates unreadCount after replacement", () => {
    useNotificationStore.getState().setNotifications([
      { id: "a", title: "A", message: "M", read: true },
      { id: "b", title: "B", message: "M", read: false },
    ]);
    expect(useNotificationStore.getState().unreadCount()).toBe(1);
  });
});

describe("useNotificationStore — notification preferences isolation", () => {
  it("markAllAsRead does not alter the notification objects beyond the read flag", async () => {
    await useNotificationStore.getState().markAllAsRead();
    const { notifications } = useNotificationStore.getState();

    // Titles, messages, and ids must be untouched
    expect(notifications[0]).toMatchObject({ id: "1", title: "XLM/USDC" });
    expect(notifications[1]).toMatchObject({ id: "2", title: "BTC/XLM" });
  });
});
