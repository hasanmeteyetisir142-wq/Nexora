import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/library?discord=server_config_missing", request.url));

  const state = crypto.randomUUID();
  const callback = new URL("/api/platforms/discord/callback", request.nextUrl.origin);
  const authorization = new URL("https://discord.com/oauth2/authorize");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("redirect_uri", callback.toString());
  authorization.searchParams.set("scope", "identify");
  authorization.searchParams.set("state", state);

  const response = NextResponse.redirect(authorization);
  response.cookies.set("nexora_discord_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/platforms/discord/callback",
    maxAge: 600,
  });
  return response;
}
