import type { CSVColumn } from "@/lib/journalSchema";

/**
 * Local persistence for in-progress CSV import sessions.
 *
 * Only file *metadata* and user choices (mapping, step, validation counts)
 * are persisted — never the parsed CSV rows or cell contents. Restoring a
 * draft still requires the user to re-select the original file so raw
 * transaction data never lives in storage longer than the active session.
 */

const STORAGE_KEY = "csv-import-draft-v1";
const DRAFT_VERSION = 1;

export type CSVImportStep = "mapping" | "preview";

export interface CSVImportDraft {
  version: number;
  savedAt: number;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  headers: string[];
  mapping: Partial<Record<CSVColumn, string>>;
  step: CSVImportStep;
  rowCount: number;
  validSummary?: { valid: number; invalid: number };
}

export function saveCSVImportDraft(
  draft: Omit<CSVImportDraft, "version" | "savedAt">
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CSVImportDraft = {
      ...draft,
      version: DRAFT_VERSION,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable or full — draft persistence is best-effort.
  }
}

export function loadCSVImportDraft(): CSVImportDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== DRAFT_VERSION ||
      typeof parsed.fileName !== "string" ||
      !Array.isArray(parsed.headers) ||
      typeof parsed.mapping !== "object"
    ) {
      return null;
    }
    return parsed as CSVImportDraft;
  } catch {
    return null;
  }
}

export function clearCSVImportDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

/** Whether a re-selected file plausibly matches a saved draft. */
export function fileMatchesDraft(file: File, draft: CSVImportDraft): boolean {
  return (
    file.name === draft.fileName &&
    file.size === draft.fileSize &&
    file.lastModified === draft.fileLastModified
  );
}
