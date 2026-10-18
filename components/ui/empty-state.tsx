"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  contentClassName?: string;
  role?: "status" | "region";
  ariaLabel?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  contentClassName,
  role = "status",
  ariaLabel,
}: EmptyStateProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel ?? title}
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-800/80"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <div className={cn("max-w-md", contentClassName)}>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 text-sm text-foreground-muted">{description}</p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
