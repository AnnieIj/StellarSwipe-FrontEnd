import { NextRequest, NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/providerFollows";
import {
  addSignalBookmark,
  isValidSignalId,
  removeSignalBookmark,
} from "@/lib/signalState";

/**
 * POST /api/signals/[signalId]/bookmark
 * Bookmarks the signal for the authenticated user. Idempotent: bookmarking an
 * already-bookmarked signal returns 200 without creating a duplicate.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { signalId: string } }
) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { signalId } = params;

  if (!isValidSignalId(signalId)) {
    return NextResponse.json({ error: "Invalid signal ID" }, { status: 400 });
  }

  addSignalBookmark(userId, signalId);

  return NextResponse.json({ signalId, bookmarked: true }, { status: 200 });
}

/**
 * DELETE /api/signals/[signalId]/bookmark
 * Removes the bookmark for the authenticated user. Idempotent: removing a
 * signal that is not bookmarked returns 200.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { signalId: string } }
) {
  const userId = getRequestUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { signalId } = params;

  if (!isValidSignalId(signalId)) {
    return NextResponse.json({ error: "Invalid signal ID" }, { status: 400 });
  }

  removeSignalBookmark(userId, signalId);

  return NextResponse.json({ signalId, bookmarked: false }, { status: 200 });
}
