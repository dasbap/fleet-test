import { NextResponse } from "next/server";

/** Sonde liveness pour Vercel / monitoring. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "esamba-web",
    timestamp: new Date().toISOString(),
  });
}
