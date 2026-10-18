import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId, listFollowedProviders } from "@/lib/providerFollows";

/**
 * GET /api/follows
 * Lists the provider IDs the authenticated user follows. Only the caller's own
 * relationships are returned.
 */
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json(
    { providerIds: listFollowedProviders(userId) },
    { status: 200 }
  );
}
