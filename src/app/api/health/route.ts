import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "veritus",
    ts: new Date().toISOString(),
  });
}
