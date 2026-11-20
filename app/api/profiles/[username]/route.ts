import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Visibility = "public" | "friends" | "selected" | "private";
function canView(value: unknown, ownerId: string, viewerId: string, selected: unknown, friends: Set<string>) {
  const mode = (["public", "friends", "selected", "private"].includes(String(value)) ? value : "friends") as Visibility;
  if (ownerId === viewerId) return true;
  if (mode === "public") return true;
  if (mode === "friends") return friends.has(ownerId);
  if (mode === "selected") return friends.has(ownerId) && Array.isArray(selected) && selected.includes(viewerId);
  return false;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bu profili görmek için giriş yapmalısın." }, { status: 401 });

  const { username } = await params;
  const { data: profile, error } = await supabase.from("profiles")
    .select("id,username,display_name,avatar_url,bio,privacy_settings")
    .eq("username", decodeURIComponent(username).toLowerCase()).maybeSingle();

  if (error) return NextResponse.json({ error: "Profil bilgileri alınamadı." }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Oyuncu bulunamadı." }, { status: 404 });

  const ownerId = profile.id as string;
  const settings = (profile.privacy_settings || {}) as Record<string, unknown>;
  const selected = settings.selected_users;
  const { data: friendshipRows } = await supabase.from("friendships")
    .select("requester_id,addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  const friends = new Set((friendshipRows || []).map((row) => row.requester_id === user.id ? row.addressee_id : row.requester_id));

  const own = ownerId === user.id;
  const platformsVisible = canView(settings.platforms, ownerId, user.id, selected, friends);
  const libraryVisible = canView(settings.library, ownerId, user.id, selected, friends);
  const achievementsVisible = canView(settings.achievements, ownerId, user.id, selected, friends);
  const onlineVisible = canView(settings.online_status, ownerId, user.id, selected, friends);

  let platforms: Array<{ platform: string; display_name: string | null; avatar_url: string | null; profile_url: string | null }> = [];
  if (platformsVisible) {
    const { data } = await supabase.from("platform_accounts")
      .select("platform,display_name,avatar_url,profile_url")
      .eq("user_id", ownerId);
    platforms = data || [];
  }

  let games: Array<{ appid: number; name: string; playtime_forever: number; img_icon_url?: string }> = [];
  let libraryMessage = "";
  if (libraryVisible) {
    try {
      const admin = createAdminClient();
      const { data: steam } = await admin.from("platform_accounts")
        .select("platform_user_id")
        .eq("user_id", ownerId).eq("platform", "steam").maybeSingle();
      const apiKey = process.env.STEAM_WEB_API_KEY;
      if (steam && apiKey) {
        const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
        url.searchParams.set("key", apiKey);
        url.searchParams.set("steamid", steam.platform_user_id);
        url.searchParams.set("include_appinfo", "true");
        url.searchParams.set("include_played_free_games", "true");
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          if (Array.isArray(payload?.response?.games)) games = payload.response.games;
          else libraryMessage = "Steam oyun detayları gizli veya erişilemiyor.";
        } else libraryMessage = "Steam kütüphanesi şu anda alınamıyor.";
      } else if (!steam) libraryMessage = "Steam hesabı bağlı değil.";
      else libraryMessage = "Steam kütüphanesi henüz yapılandırılmadı.";
    } catch {
      libraryMessage = "Oyun kütüphanesi şu anda alınamıyor.";
    }
  }

  return NextResponse.json({
    profile: { username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url, bio: profile.bio },
    visibility: { platforms: platformsVisible, library: libraryVisible, achievements: achievementsVisible, online_status: onlineVisible },
    platforms,
    games,
    library_message: libraryMessage,
    achievements: achievementsVisible ? [] : null,
    online_status: onlineVisible ? null : null,
    is_owner: own,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
