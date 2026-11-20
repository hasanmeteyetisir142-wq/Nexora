import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = crypto.randomUUID();
  const callback = new URL("/api/platforms/steam/callback", request.nextUrl.origin);
  callback.searchParams.set("state", state);

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callback.toString(),
    "openid.realm": request.nextUrl.origin + "/",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  const response = NextResponse.redirect(`${STEAM_OPENID}?${params.toString()}`);
  response.cookies.set("nexora_steam_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/platforms/steam/callback",
    maxAge: 600,
  });
  return response;
}
