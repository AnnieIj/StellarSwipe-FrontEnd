/**
 * GET /api/qr-pair?session=<id>
 *
 * Stub endpoint for QR wallet pairing.
 *
 * In production this would be backed by a relay/signalling server (e.g. a
 * Redis-backed pub-sub store) that a mobile wallet app pushes its publicKey
 * to once it scans the QR code.
 *
 * Currently returns 404 (pending) so the client poll loop stays in
 * "pending" state — the full UX flow is present and functional for
 * the browser-side pairing UI. Wire up the real relay here to complete
 * end-to-end mobile pairing.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get("session");

  if (!session) {
    return NextResponse.json(
      { error: "Missing session parameter" },
      { status: 400 }
    );
  }

  // TODO: look up session in your signalling store (e.g. Redis / Upstash)
  // const record = await getSession(session);
  // if (!record) return NextResponse.json({ status: "pending" }, { status: 404 });
  // if (record.status === "paired") return NextResponse.json({ status: "paired", publicKey: record.publicKey });
  // if (record.status === "rejected") return NextResponse.json({ status: "rejected" });
  // return NextResponse.json({ status: "scanning" });

  // Stub: always pending
  return NextResponse.json({ status: "pending" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  /**
   * POST /api/qr-pair
   * Body: { session: string; publicKey: string; status: "paired" | "rejected" }
   *
   * Called by the mobile wallet app after scanning the QR code.
   * In production, persist the record so GET poll picks it up.
   */
  const body = (await req.json().catch(() => null)) as {
    session?: string;
    publicKey?: string;
    status?: "paired" | "rejected";
  } | null;

  if (!body?.session || !body?.status) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: persist to your signalling store
  // await setSession(body.session, { status: body.status, publicKey: body.publicKey });

  return NextResponse.json({ ok: true });
}
