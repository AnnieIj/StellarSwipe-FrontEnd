export type ScopeImpact = "read" | "write";

export interface ApiKeyScope {
  id: string;
  label: string;
  description: string;
  impact: ScopeImpact;
  leastPrivilege?: boolean;
}

/**
 * Canonical list of API key scopes with human-readable descriptions and
 * explicit read/write impact. The least-privilege scope is flagged so the UI
 * can highlight it without preselecting broader access.
 */
export const API_KEY_SCOPES: ApiKeyScope[] = [
  {
    id: "read:invoices",
    label: "Read invoices",
    description: "View invoice details and download invoice documents.",
    impact: "read",
    leastPrivilege: true,
  },
  {
    id: "write:invoices",
    label: "Write invoices",
    description: "Create, update, and void invoices.",
    impact: "write",
  },
  {
    id: "read:customers",
    label: "Read customers",
    description: "View customer profiles and contact information.",
    impact: "read",
  },
  {
    id: "write:customers",
    label: "Write customers",
    description: "Create and update customer profiles.",
    impact: "write",
  },
  {
    id: "read:reports",
    label: "Read reports",
    description: "View tax and financial reports.",
    impact: "read",
  },
  {
    id: "write:reports",
    label: "Write reports",
    description: "Generate and export tax and financial reports.",
    impact: "write",
  },
];

const SCOPE_BY_ID: Record<string, ApiKeyScope> = API_KEY_SCOPES.reduce(
  (acc, scope) => {
    acc[scope.id] = scope;
    return acc;
  },
  {} as Record<string, ApiKeyScope>,
);

export function getScope(id: string): ApiKeyScope | undefined {
  return SCOPE_BY_ID[id];
}

export function getLeastPrivilegeScope(): ApiKeyScope | undefined {
  return API_KEY_SCOPES.find((scope) => scope.leastPrivilege);
}

export interface ScopeReviewSummary {
  selected: ApiKeyScope[];
  readCount: number;
  writeCount: number;
  hasWriteAccess: boolean;
  summary: string;
}

/**
 * Build an accurate review summary of the selected scopes so the user can
 * confirm permissions before the key is created.
 */
export function buildScopeReviewSummary(
  selectedIds: string[],
): ScopeReviewSummary {
  const selected = selectedIds
    .map((id) => getScope(id))
    .filter((scope): scope is ApiKeyScope => Boolean(scope));

  const readCount = selected.filter((scope) => scope.impact === "read").length;
  const writeCount = selected.filter(
    (scope) => scope.impact === "write",
  ).length;
  const hasWriteAccess = writeCount > 0;

  let summary: string;
  if (selected.length === 0) {
    summary = "No permissions selected. This key will not be able to access any data.";
  } else {
    const parts: string[] = [];
    if (readCount > 0) {
      parts.push(`${readCount} read`);
    }
    if (writeCount > 0) {
      parts.push(`${writeCount} write`);
    }
    summary = `${selected.length} permission${
      selected.length === 1 ? "" : "s"
    } selected (${parts.join(", ")}).`;
    if (hasWriteAccess) {
      summary += " This key can modify data.";
    } else {
      summary += " This key is read-only.";
    }
  }

  return { selected, readCount, writeCount, hasWriteAccess, summary };
}
