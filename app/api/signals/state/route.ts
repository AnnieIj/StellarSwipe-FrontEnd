import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import { getUserSignalState } from "@/lib/signalState";

/**
 * GET /api/signals/state
 * Lists the bookmarked signal IDs and dismissals for the authenticated user.
 * Only the caller's own state is returned.
 */
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json(getUserSignalState(userId), { status: 200 });
}
