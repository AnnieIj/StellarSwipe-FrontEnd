"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANNOTATION_MAX_LENGTH, type ChartAnnotation } from "@/hooks/useChartAnnotations";

export function formatAnnotationDate(day: number): string {
  return new Date(day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface AnnotationMarkerProps {
  x: number;
  y: number;
  annotation: ChartAnnotation;
  metricLabel: string;
  color: string;
  isActive: boolean;
  onActivate: (annotation: ChartAnnotation) => void;
}

/**
 * Focusable SVG marker for an annotated point (#783). Rendered inside the
 * chart's SVG so it tracks the plotted coordinates exactly.
 */
export function AnnotationMarker({
  x,
  y,
  annotation,
  metricLabel,
  color,
  isActive,
  onActivate,
}: AnnotationMarkerProps) {
  const preview =
    annotation.note.length > 60 ? `${annotation.note.slice(0, 60)}…` : annotation.note;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Note on ${metricLabel} for ${formatAnnotationDate(annotation.day)}: ${preview}. Press Enter to edit.`}
      aria-pressed={isActive}
      onClick={(e) => {
        e.stopPropagation();
        onActivate(annotation);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onActivate(annotation);
        }
      }}
      className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-[3]"
      style={{ pointerEvents: "all" }}
    >
      <line x1={x} x2={x} y1={y - 6} y2={y - 16} stroke={color} strokeWidth={1.5} />
      <circle
        cx={x}
        cy={y - 20}
        r={isActive ? 6 : 5}
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth={1.5}
      />
      {/* Enlarged invisible hit area for touch */}
      <circle cx={x} cy={y - 20} r={11} fill="transparent" />
    </g>
  );
}

interface AnnotationEditorProps {
  mode: "create" | "edit";
  dateLabel: string;
  metricLabel: string;
  initialNote?: string;
  onSave: (note: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

/**
 * Inline editor rendered below the chart so long notes never cover the
 * plotted data.
 */
export function AnnotationEditor({
  mode,
  dateLabel,
  metricLabel,
  initialNote = "",
  onSave,
  onDelete,
  onCancel,
}: AnnotationEditorProps) {
  const [note, setNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const counterId = useId();

  useEffect(() => {
    setNote(initialNote);
    textareaRef.current?.focus();
  }, [initialNote, dateLabel]);

  const trimmed = note.trim();

  return (
    <form
      className="mt-3 rounded-md border border-border bg-background/60 p-3"
      aria-label={`${mode === "create" ? "Add" : "Edit"} note for ${metricLabel} on ${dateLabel}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSave(trimmed);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <label htmlFor={fieldId} className="text-xs font-medium text-foreground">
        {mode === "create" ? "Add a note" : "Edit note"} · {metricLabel}, {dateLabel}
      </label>
      <textarea
        id={fieldId}
        ref={textareaRef}
        value={note}
        maxLength={ANNOTATION_MAX_LENGTH}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        aria-describedby={counterId}
        className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
        placeholder="What happened here?"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span id={counterId} className="text-[10px] text-foreground-muted">
          {note.length}/{ANNOTATION_MAX_LENGTH} characters
        </span>
        <div className="flex flex-wrap gap-2">
          {mode === "edit" && onDelete && (
            <Button type="button" size="sm" variant="ghost" onClick={onDelete} className="gap-1 text-red-400">
              <Trash2 size={12} aria-hidden="true" />
              Remove
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!trimmed}>
            Save note
          </Button>
        </div>
      </div>
    </form>
  );
}

interface AnnotationListProps {
  annotations: ChartAnnotation[];
  metricLabel: (metric: string) => string;
  isInRange: (annotation: ChartAnnotation) => boolean;
  activeId: string | null;
  onEdit: (annotation: ChartAnnotation) => void;
  onRemove: (annotation: ChartAnnotation) => void;
}

export function AnnotationList({
  annotations,
  metricLabel,
  isInRange,
  activeId,
  onEdit,
  onRemove,
}: AnnotationListProps) {
  if (annotations.length === 0) return null;
  const sorted = [...annotations].sort((a, b) => a.day - b.day);
  const hiddenCount = sorted.filter((a) => !isInRange(a)).length;

  return (
    <div className="mt-3">
      <h3 className="text-xs font-semibold text-foreground">Notes</h3>
      <ul className="mt-1.5 space-y-1.5">
        {sorted.filter(isInRange).map((a) => (
          <li
            key={a.id}
            className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs ${
              a.id === activeId ? "border-amber-400/60 bg-amber-400/10" : "border-border"
            }`}
          >
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-foreground-muted">
                {formatAnnotationDate(a.day)} · {metricLabel(a.metric)}
              </p>
              <p className="whitespace-pre-wrap break-words text-foreground">{a.note}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onEdit(a)}
                aria-label={`Edit note for ${formatAnnotationDate(a.day)}`}
                className="rounded p-1 text-foreground-muted hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(a)}
                aria-label={`Remove note for ${formatAnnotationDate(a.day)}`}
                className="rounded p-1 text-foreground-muted hover:bg-accent hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-1.5 text-[10px] text-foreground-muted">
          {hiddenCount} {hiddenCount === 1 ? "note is" : "notes are"} outside the selected range.
        </p>
      )}
    </div>
  );
}

export function AddAnnotationButton({
  disabled,
  dateLabel,
  onClick,
}: {
  disabled: boolean;
  dateLabel: string | null;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="h-7 gap-1 px-2 text-[11px]"
      aria-label={
        dateLabel ? `Add note to point on ${dateLabel}` : "Add note (select a chart point first)"
      }
      title={dateLabel ? undefined : "Hover, tap or use arrow keys to select a point first"}
    >
      <MessageSquarePlus size={12} aria-hidden="true" />
      Add note
    </Button>
  );
}
