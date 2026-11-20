import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type DiscordUser = {
  id: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
};

function back(request: NextRequest, result: string) {
  return NextResponse.redirect(new URL(`/library?discord=${encodeURIComponent(result)}`, request.url));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("nexora_discord_state")?.value;
  const clearState = (response: NextResponse) => {
    response.cookies.set("nexora_discord_state", "", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/platforms/discord/callback",
      maxAge: 0,
    });
    return response;
  };

  if (!state || !expectedState || state !== expectedState) return clearState(back(request, "state_error"));
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return clearState(back(request, "cancelled"));

  const code = request.nextUrl.searchParams.get("code");
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!code) return clearState(back(request, "missing_code"));
  if (!clientId || !clientSecret) return clearState(back(request, "server_config_missing"));

  const redirectUri = new URL("/api/platforms/discord/callback", request.nextUrl.origin).toString();
  let discordUser: DiscordUser;
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return clearState(back(request, "token_exchange_failed"));
    const token = await tokenResponse.json();
    const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    if (!userResponse.ok) return clearState(back(request, "profile_fetch_failed"));
    discordUser = await userResponse.json();
  } catch {
    return clearState(back(request, "provider_unavailable"));
  }

  if (!/^\d{17,20}$/.test(discordUser.id)) return clearState(back(request, "invalid_identity"));
  const displayName = (discordUser.global_name || discordUser.username || "Discord kullanıcısı").slice(0, 100);
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : null;

  let admin;
  try { admin = createAdminClient(); } catch {
    return clearState(back(request, "server_config_missing"));
  }
  const { error } = await admin.from("platform_accounts").upsert({
    user_id: user.id,
    platform: "discord",
    platform_user_id: discordUser.id,
    display_name: displayName,
    avatar_url: avatarUrl,
    profile_url: `https://discord.com/users/${discordUser.id}`,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  if (error) {
    return clearState(back(request, error.code === "23505" ? "already_linked" : "save_failed"));
  }
  return clearState(back(request, "connected"));
}
