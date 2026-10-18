/**
 * @deprecated GET /api/signals/v1 is a compatibility shim.
 * Migrate to GET /api/signals which accepts `pageSize` instead of `limit`.
 */
import { NextResponse } from "next/server";
import { buildSignalPage } from "@/lib/signals";
import { traceWorker } from "@/src/tracing/worker-tracing.service";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Legacy callers used `limit`; map it to `pageSize`
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(
    url.searchParams.get("limit") ?? url.searchParams.get("pageSize") ?? "10"
  );

  if (Number.isNaN(page) || page < 1 || Number.isNaN(pageSize) || pageSize < 1) {
    return NextResponse.json(
      { error: "Invalid pagination parameters." },
      { status: 400 }
    );
  }

  const feed = await traceWorker(
    "worker:signals:fetch",
    async () => buildSignalPage(page, pageSize),
    { page, pageSize, shimVersion: "v1" }
  );

  return NextResponse.json(feed, {
    status: 200,
    headers: {
      Deprecation: "true",
      Link: '</api/signals>; rel="successor-version"',
      "X-Deprecation-Notice":
        "This endpoint is deprecated. Use /api/signals with pageSize instead of limit.",
    },
  });
}
