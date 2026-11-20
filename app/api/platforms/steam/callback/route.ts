import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";

function back(request: NextRequest, result: string) {
  return NextResponse.redirect(new URL(`/library?steam=${encodeURIComponent(result)}`, request.url));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const expectedState = request.cookies.get("nexora_steam_state")?.value;
  const clearState = (response: NextResponse) => {
    response.cookies.set("nexora_steam_state", "", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/platforms/steam/callback",
      maxAge: 0,
    });
    return response;
  };

  if (!state || !expectedState || state !== expectedState) return clearState(back(request, "state_error"));
  if (params.get("openid.mode") !== "id_res") return clearState(back(request, "cancelled"));

  const claimedId = params.get("openid.claimed_id") || "";
  const identity = params.get("openid.identity") || "";
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!match || identity !== claimedId) return clearState(back(request, "invalid_identity"));

  const callback = new URL("/api/platforms/steam/callback", request.nextUrl.origin);
  callback.searchParams.set("state", state);
  if (params.get("openid.return_to") !== callback.toString()) return clearState(back(request, "return_url_error"));
  if (params.get("openid.op_endpoint") !== STEAM_OPENID) return clearState(back(request, "provider_error"));

  const signed = (params.get("openid.signed") || "").split(",");
  if (!["op_endpoint", "claimed_id", "identity", "return_to", "response_nonce"].every((key) => signed.includes(key))) {
    return clearState(back(request, "signature_error"));
  }

  const verification = new URLSearchParams();
  params.forEach((value, key) => {
    if (key.startsWith("openid.")) verification.set(key, value);
  });
  verification.set("openid.mode", "check_authentication");

  let verificationText = "";
  try {
    const verified = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verification.toString(),
      cache: "no-store",
    });
    if (!verified.ok) return clearState(back(request, "verification_failed"));
    verificationText = await verified.text();
  } catch {
    return clearState(back(request, "verification_failed"));
  }
  if (!/^is_valid:true\s*$/m.test(verificationText)) return clearState(back(request, "verification_failed"));

  const steamId = match[1];
  let displayName = `Steam ${steamId}`;
  let avatarUrl: string | null = null;
  const apiKey = process.env.STEAM_WEB_API_KEY;

  if (apiKey) {
    try {
      const summaryUrl = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
      summaryUrl.searchParams.set("key", apiKey);
      summaryUrl.searchParams.set("steamids", steamId);
      const summaryResponse = await fetch(summaryUrl, { cache: "no-store" });
      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        const player = summary?.response?.players?.[0];
        if (player?.personaname) displayName = String(player.personaname).slice(0, 100);
        if (player?.avatarfull) avatarUrl = String(player.avatarfull);
      }
    } catch {
      // Steam identity is already verified; profile decoration is optional.
    }
  }

  let admin;
  try { admin = createAdminClient(); } catch {
    return clearState(back(request, "server_config_missing"));
  }
  const { error } = await admin.from("platform_accounts").upsert({
    user_id: user.id,
    platform: "steam",
    platform_user_id: steamId,
    display_name: displayName,
    avatar_url: avatarUrl,
    profile_url: `https://steamcommunity.com/profiles/${steamId}`,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform" });

  if (error) {
    const code = error.code === "23505" ? "already_linked" : "save_failed";
    return clearState(back(request, code));
  }
  return clearState(back(request, "connected"));
}
