"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";

interface AccessibleChartProps {
  title: string;
  description?: string;
  summary: string;
  children: ReactNode;
  className?: string;
}

export function AccessibleChart({
  title,
  description,
  summary,
  children,
  className = "",
}: AccessibleChartProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `chart-details-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={`relative ${className}`}>
      <div
        role="img"
        aria-label={title}
        aria-describedby={detailsId}
      >
        {children}
      </div>

      <div className="sr-only" id={detailsId}>
        <p>{description ? `${description}. ` : ""}{summary}</p>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-2 flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
        aria-expanded={expanded}
        aria-controls={detailsId}
      >
        <Eye size={14} aria-hidden="true" />
        <span>Chart data summary</span>
        {expanded ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="mt-1 rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground-muted">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1">{summary}</p>
        </div>
      )}
    </div>
  );
}
