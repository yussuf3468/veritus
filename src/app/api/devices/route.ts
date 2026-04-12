import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DeviceSchema } from "@/lib/validators";
import { headers } from "next/headers";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

function getClientIP(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get("x-real-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}

export async function GET() {
  const { user, supabase } = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [devices, logs] = await Promise.all([
    supabase
      .from("devices")
      .select("*")
      .eq("user_id", user.id)
      .order("last_seen", { ascending: false }),
    supabase
      .from("device_activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    data: { devices: devices.data ?? [], logs: logs.data ?? [] },
  });
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const headersList = await headers();
  const clientIP = getClientIP(headersList);
  const body = await request.json();

  const { action, ...rest } = body;

  // Heartbeat: update last_seen + is_online for a session_token
  if (action === "heartbeat") {
    const { session_token } = body;
    if (!session_token)
      return NextResponse.json(
        { error: "session_token required" },
        { status: 400 },
      );

    await supabase
      .from("devices")
      .update({
        is_online: true,
        last_seen: new Date().toISOString(),
        ip_address: clientIP,
      })
      .eq("session_token", session_token)
      .eq("user_id", user.id);

    return NextResponse.json({ data: { ok: true } });
  }

  // Register / upsert device
  const parse = DeviceSchema.safeParse({ ...rest, ip_address: clientIP });
  if (!parse.success)
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });

  const { session_token, ...deviceData } = parse.data;

  // Check if device already exists by session_token
  if (session_token) {
    const { data: existing } = await supabase
      .from("devices")
      .select("id")
      .eq("session_token", session_token)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const { data } = await supabase
        .from("devices")
        .update({
          ...deviceData,
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      return NextResponse.json({ data });
    }
  }

  // New device — insert and log alert
  const { data, error } = await supabase
    .from("devices")
    .insert({ ...deviceData, session_token, user_id: user.id, is_online: true })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Log new device activity
  await supabase.from("device_activity_logs").insert({
    device_id: data.id,
    user_id: user.id,
    action: "new_device_registered",
    details: { name: data.name, os: data.os, browser: data.browser },
    ip_address: clientIP,
  });

  return NextResponse.json({ data, isNew: true }, { status: 201 });
}
