import { NextResponse } from "next/server";
import {
  buildSignalCursorPage,
  buildSignalPage,
  buildActivitySummary,
  decodeSignalCursor,
  parseSignalFeedFilters,
} from "@/lib/signals";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import { getRequestUserId } from "@/lib/providerFollows";
import { dismissSignal, isSignalDismissalReason } from "@/lib/signalState";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
  const view = url.searchParams.get("view");
  const signalId = url.searchParams.get("signalId");

  if (
    Number.isNaN(page) ||
    page < 1 ||
    Number.isNaN(pageSize) ||
    pageSize < 1
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid pagination parameters. page and pageSize must be positive integers.",
      },
      { status: 400 }
    );
  }

  if (view === "activity") {
    const activity = await traceWorker(
      "worker:signals:activity",
      async () => buildActivitySummary(page, pageSize),
      { page, pageSize }
    );

    return NextResponse.json(activity, { status: 200 });
  }

  if (view === "confidence-history") {
    if (!signalId) {
      return NextResponse.json(
        { error: "signalId is required to load confidence history." },
        { status: 400 }
      );
    }

    const history = await traceWorker(
      "worker:signals:confidence-history",
      async () => buildConfidenceHistory(signalId),
      { signalId }
    );

    return NextResponse.json(history, { status: 200 });
  }

  const filters = parseSignalFeedFilters(url.searchParams);
  if (!filters) {
    return NextResponse.json(
      { error: "Invalid filter parameters. action and status must be known values." },
      { status: 400 }
    );
  }

  // Presence of `cursor` selects cursor mode; an empty value requests the first page.
  if (url.searchParams.has("cursor")) {
    if (url.searchParams.has("page")) {
      return NextResponse.json(
        { error: "Use either cursor or page, not both." },
        { status: 400 }
      );
    }

    const cursor = url.searchParams.get("cursor") ?? "";
    const after = cursor ? decodeSignalCursor(cursor) : null;
    if (cursor && !after) {
      return NextResponse.json(
        { error: "Invalid cursor." },
        { status: 400 }
      );
    }

    const cursorFeed = await traceWorker(
      "worker:signals:fetch",
      async () => buildSignalCursorPage(after, pageSize, filters),
      { pageSize, filters }
    );

    return NextResponse.json(cursorFeed, { status: 200 });
  }

  const feed = await traceWorker(
    "worker:signals:fetch",
    async () => buildSignalPage(page, pageSize, filters),
    { page, pageSize, filters }
  );

  return NextResponse.json(feed, { status: 200 });
}

export async function POST(request: Request) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const payload = (body ?? {}) as {
    signalId?: unknown;
    reason?: unknown;
  };

  const signalId =
    typeof payload.signalId === "string" ? payload.signalId.trim() : "";

  if (!signalId) {
    return NextResponse.json(
      { error: "signalId is required to dismiss a recommendation." },
      { status: 400 }
    );
  }

  // Feedback is optional: skipping the reason must not block dismissal.
  const reason = isSignalDismissalReason(payload.reason) ? payload.reason : null;

  // Idempotent: re-dismissing returns the original dismissal record.
  const dismissal = await traceWorker(
    "worker:signals:dismiss",
    async () => {
      const stored = dismissSignal(userId, signalId, reason);

      return {
        signalId,
        dismissed: true,
        reason: stored.reason,
      };
    },
    { signalId, reason }
  );

  return NextResponse.json(dismissal, { status: 200 });
}
