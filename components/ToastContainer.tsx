"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToastStore, type ToastMessage, type ToastTone } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

const TONE_CONFIG: Record<ToastTone, { icon: React.ElementType; className: string }> = {
  success: {
    icon: CheckCircle,
    className: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  info: {
    icon: Info,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct > 0) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast.duration]);

  const { icon: Icon, className } = TONE_CONFIG[toast.tone];

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-lg border shadow-lg transition-all",
        "animate-in slide-in-from-right-full fade-in duration-300",
        className
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-xs opacity-80">{toast.description}</p>
          )}
          {toast.link && (
            <a
              href={toast.link.href}
              className="mt-2 inline-block text-xs font-medium underline underline-offset-2 hover:opacity-80"
            >
              {toast.link.label}
            </a>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 inline-flex items-center rounded-md bg-foreground/10 px-2 py-0.5 text-xs font-medium hover:bg-foreground/20 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md p-1 text-foreground-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-foreground/10">
        <div
          className="h-full bg-foreground/30 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
