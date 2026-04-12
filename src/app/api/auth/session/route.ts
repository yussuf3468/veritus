import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function createAuthResponse(request: NextRequest) {
  let response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set(name, value, options);
        },
        remove(name, options) {
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    },
  );

  return { supabase, response };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const accessToken = body?.accessToken;
  const refreshToken = body?.refreshToken;

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing accessToken or refreshToken" },
      { status: 400 },
    );
  }

  const { supabase, response } = createAuthResponse(request);
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}

export async function DELETE(request: NextRequest) {
  const { supabase, response } = createAuthResponse(request);
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}