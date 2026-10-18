import { NextRequest, NextResponse } from "next/server";
import {
  followProvider,
  getRequestUserId,
  isValidProviderId,
  unfollowProvider,
} from "@/lib/providerFollows";

/**
 * POST /api/providers/[providerId]/follow
 * Follows the provider for the authenticated user. Idempotent: following an
 * already-followed provider returns 200 without creating a duplicate.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { providerId: string } }
) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { providerId } = params;

  if (!isValidProviderId(providerId)) {
    return NextResponse.json({ error: "Invalid provider ID" }, { status: 400 });
  }

  followProvider(userId, providerId);

  return NextResponse.json({ providerId, following: true }, { status: 200 });
}

/**
 * DELETE /api/providers/[providerId]/follow
 * Unfollows the provider for the authenticated user. Idempotent: unfollowing a
 * provider that is not followed returns 200.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { providerId: string } }
) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { providerId } = params;

  if (!isValidProviderId(providerId)) {
    return NextResponse.json({ error: "Invalid provider ID" }, { status: 400 });
  }

  unfollowProvider(userId, providerId);

  return NextResponse.json({ providerId, following: false }, { status: 200 });
}
