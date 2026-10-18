import { z } from "zod";

/**
 * Normalizes journal tags: trims, lowercases, collapses inner whitespace,
 * drops empty values and removes duplicates while keeping first-seen order.
 */
export function normalizeJournalTags(tags: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ").toLowerCase();
    if (tag) unique.add(tag);
  }
  return Array.from(unique);
}

/**
 * Zod schema for validating a single trade entry.
 * This is used for both manual entry and CSV bulk import.
 */
export const journalEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use YYYY-MM-DD.",
  }),
  assetPair: z.string().min(1, "Asset pair is required (e.g. XLM/USDC)"),
  type: z.enum(["COPY_TRADE", "SWAP", "MANUAL"]),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
  fee: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Fee must be a non-negative number",
  }),
  token: z.string().min(1, "Token symbol is required (e.g. XLM)"),
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED"]),
  outcome: z.enum(["WIN", "LOSS", "PENDING"]),
  notes: z.string().optional(),
  tags: z.array(z.string()).transform(normalizeJournalTags).optional(),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;

/**
 * Expected CSV column names for mapping.
 */
export const CSV_COLUMNS = [
  "Date",
  "Asset Pair",
  "Type",
  "Amount",
  "Price",
  "Fee",
  "Token",
  "Status",
  "Outcome",
  "Notes",
] as const;

export type CSVColumn = (typeof CSV_COLUMNS)[number];
