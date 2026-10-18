"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import {
  useNotificationStore,
  type Notification,
} from "@/store/useNotificationStore";
import {
  groupNotifications,
  isCollapsibleGroup,
  type NotificationGroup,
} from "@/lib/notificationGrouping";
import { EmptyState } from "@/components/ui/empty-state";
import { useFocusReturn } from "@/hooks/useFocusReturn";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const notifications = useNotificationStore((s) => s.notifications);
  const isMarkingAllRead = useNotificationStore((s) => s.isMarkingAllRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const unreadCount = useNotificationStore((s) => s.unreadCount());

  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // #898 Group related notifications by signal / provider
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  // Restore focus to the bell button when the panel closes.
  useFocusReturn(open);

  const hasUnread = unreadCount > 0;

  const handleMarkAllAsRead = () => {
    if (!hasUnread || isMarkingAllRead) return;
    // No backend yet — purely local optimistic update.
    markAllAsRead().catch(() => {
      // rollback already handled inside the store; future error UI can hook here
    });
  };

  return (
    <div className="relative">
      <button
        aria-label={
          hasUnread
            ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
            : "No unread notifications"
        }
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        <AnimatePresence>
          {hasUnread && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-label="Notifications"
              className="absolute right-0 z-20 mt-2 w-80 rounded-xl border bg-card shadow-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="text-sm font-semibold">
                  Notifications
                  {hasUnread && (
                    <span
                      className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                      aria-hidden="true"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  {/* Mark all as read — visible only when at least one unread exists */}
                  {hasUnread && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={isMarkingAllRead}
                      aria-label="Mark all notifications as read"
                      className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isMarkingAllRead ? "Marking…" : "Mark all read"}
                    </button>
                  )}

                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      aria-label="Clear all notifications"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <ul
                className="max-h-72 overflow-y-auto divide-y"
                role="list"
                aria-label="Notifications list"
              >
                {notifications.length === 0 ? (
                  <li className="p-3">
                    <EmptyState
                      title="No notifications"
                      description="You are all caught up. New alerts will appear here."
                      className="rounded-xl bg-transparent py-8"
                      contentClassName="max-w-xs"
                    />
                  </li>
                ) : (
                  groups.map((group) =>
                    isCollapsibleGroup(group) ? (
                      <NotificationGroupRow
                        key={group.key}
                        group={group}
                        expanded={expandedGroups.includes(group.key)}
                        onToggle={() => toggleGroup(group.key)}
                        onMarkAsRead={markAsRead}
                      />
                    ) : (
                      <NotificationItem
                        key={group.key}
                        notification={group.items[0]}
                        onMarkAsRead={markAsRead}
                      />
                    )
                  )
                )}
              </ul>

              {/* Footer hint */}
              {notifications.length > 0 && (
                <div className="border-t px-4 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    Hover a notification and click{" "}
                    <Check
                      size={10}
                      className="inline"
                      aria-hidden="true"
                    />{" "}
                    to mark it as read individually.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  nested?: boolean;
}

function NotificationItem({ notification: n, onMarkAsRead, nested }: NotificationItemProps) {
  return (
    <li
      data-testid={`notification-${n.id}`}
      data-read={n.read ? "true" : "false"}
      className={cn(
        "group flex items-start gap-3 py-3 transition-colors",
        nested ? "pl-8 pr-4" : "px-4",
        !n.read && "bg-blue-500/5"
      )}
    >
      {/* Unread dot */}
      <span
        className={cn(
          "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full transition-colors",
          n.read ? "bg-transparent" : "bg-red-500"
        )}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {n.href ? (
          <a
            href={n.href}
            onClick={() => {
              if (!n.read) onMarkAsRead(n.id);
            }}
            className="text-sm font-medium leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {n.title}
          </a>
        ) : (
          <p className="text-sm font-medium leading-snug">{n.title}</p>
        )}
        <p className="text-xs text-muted-foreground">{n.message}</p>
        {/* Read-state label for screen readers */}
        {!n.read && <span className="sr-only">(unread)</span>}
      </div>

      {/* Per-notification mark-as-read button */}
      {!n.read && (
        <button
          type="button"
          onClick={() => onMarkAsRead(n.id)}
          aria-label={`Mark "${n.title}" as read`}
          title="Mark as read"
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Check size={12} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

interface NotificationGroupRowProps {
  group: NotificationGroup;
  expanded: boolean;
  onToggle: () => void;
  onMarkAsRead: (id: string) => void;
}

export function NotificationGroupRow({
  group,
  expanded,
  onToggle,
  onMarkAsRead,
}: NotificationGroupRowProps) {
  const count = group.items.length;
  const panelId = `notification-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const kindLabel = group.kind === "provider" ? "provider" : "signal";

  // Enter/Space toggle natively; arrow keys follow the disclosure pattern.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" && !expanded) {
      e.preventDefault();
      onToggle();
    } else if (e.key === "ArrowLeft" && expanded) {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <li data-testid={`notification-group-${group.key}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-label={`${group.label}: ${count} ${kindLabel} updates${
          group.unreadCount > 0 ? `, ${group.unreadCount} unread` : ""
        }`}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          group.unreadCount > 0 && "bg-blue-500/5"
        )}
      >
        {expanded ? (
          <ChevronDown size={14} className="mt-1 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight size={14} className="mt-1 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug">{group.label}</span>
          <span className="block text-xs text-muted-foreground">
            {count} updates
            {group.unreadCount > 0 && ` · ${group.unreadCount} unread`}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold"
        >
          {count}
        </span>
      </button>
      {expanded && (
        <ul id={panelId} role="list" aria-label={`${group.label} updates`} className="divide-y">
          {group.items.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkAsRead={onMarkAsRead} nested />
          ))}
        </ul>
      )}
    </li>
  );
}
