"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Short notes attached to chart points (#783). Annotations are keyed by the
 * calendar day and metric rather than by point index, so they stay attached
 * to the right data when the visible range changes.
 */
export interface ChartAnnotation {
  id: string;
  chartId: string;
  metric: string;
  /** Start of the annotated day (local time), epoch ms. */
  day: number;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export const ANNOTATION_MAX_LENGTH = 280;

const STORAGE_KEY = "stellarswipe:chart-annotations";

export function toDayKey(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function readAll(): ChartAnnotation[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(all: ChartAnnotation[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable (private mode, quota) — keep in-memory state only.
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChartAnnotations(chartId: string) {
  const [all, setAll] = useState<ChartAnnotation[]>([]);

  useEffect(() => {
    setAll(readAll());
  }, []);

  const persist = useCallback((updater: (prev: ChartAnnotation[]) => ChartAnnotation[]) => {
    setAll((prev) => {
      const next = updater(prev);
      writeAll(next);
      return next;
    });
  }, []);

  const annotations = all.filter((a) => a.chartId === chartId);

  const addAnnotation = useCallback(
    (metric: string, timestamp: number, note: string) => {
      const trimmed = note.trim().slice(0, ANNOTATION_MAX_LENGTH);
      if (!trimmed) return null;
      const now = Date.now();
      const annotation: ChartAnnotation = {
        id: createId(),
        chartId,
        metric,
        day: toDayKey(timestamp),
        note: trimmed,
        createdAt: now,
        updatedAt: now,
      };
      persist((prev) => [...prev, annotation]);
      return annotation;
    },
    [chartId, persist]
  );

  const updateAnnotation = useCallback(
    (id: string, note: string) => {
      const trimmed = note.trim().slice(0, ANNOTATION_MAX_LENGTH);
      if (!trimmed) return;
      persist((prev) =>
        prev.map((a) => (a.id === id ? { ...a, note: trimmed, updatedAt: Date.now() } : a))
      );
    },
    [persist]
  );

  const removeAnnotation = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((a) => a.id !== id));
    },
    [persist]
  );

  /** Annotations for `metric` that fall on the given day. */
  const annotationsForPoint = useCallback(
    (metric: string, timestamp: number) => {
      const day = toDayKey(timestamp);
      return annotations.filter((a) => a.metric === metric && a.day === day);
    },
    [annotations]
  );

  return {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    annotationsForPoint,
  };
}
