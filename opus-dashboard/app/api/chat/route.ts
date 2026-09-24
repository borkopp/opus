import { NextResponse } from "next/server";

// The old, unauthenticated web-chat transport has been retired. Instagram now
// enters through signed Convex webhooks; setup previews require owner auth.
function retired() {
  return NextResponse.json(
    { error: "Web chat is no longer available." },
    { status: 410 },
  );
}
export const GET = retired;
export const POST = retired;
