import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileResult = {
  profile: { username: string; display_name: string | null; avatar_url: string | null; bio: string | null };
  visibility: { platforms: boolean; library: boolean; achievements: boolean; online_status: boolean };
  platforms: Array<{ platform: string; display_name: string | null; avatar_url: string | null; profile_url: string | null }>;
  steam_id: string | null;
  is_owner: boolean;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Bu profili görmek için giriş yapmalısın." }, { status: 401 });

  const { username } = await params;
  const { data, error } = await supabase.rpc("get_profile_data_for_viewer", {
    target_username: decodeURIComponent(username).toLowerCase(),
  });

  if (error) {
    console.error("Profile privacy RPC failed:", error.message);
    return NextResponse.json({ error: "Profil bilgileri şu anda alınamıyor." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Oyuncu bulunamadı." }, { status: 404 });

  const result = data as ProfileResult;
  const { data: rewardStats, error: rewardStatsError } = await supabase.rpc("nexora_profile_stats", { target_username: decodeURIComponent(username).toLowerCase() });
  if (rewardStatsError) console.error("Profile game stats unavailable:", rewardStatsError.message);
  let games: Array<{ appid: number; name: string; playtime_forever: number; img_icon_url?: string }> = [];
  let libraryMessage = "";

  if (result.visibility.library) {
    const apiKey = process.env.STEAM_WEB_API_KEY;
    if (result.steam_id && apiKey) {
      const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("steamid", result.steam_id);
      url.searchParams.set("include_appinfo", "true");
      url.searchParams.set("include_played_free_games", "true");
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          if (Array.isArray(payload?.response?.games)) games = payload.response.games;
          else libraryMessage = "Steam oyun detayları gizli veya erişilemiyor.";
        } else libraryMessage = "Steam kütüphanesi şu anda alınamıyor.";
      } catch {
        libraryMessage = "Steam'e bağlanırken ağ hatası oluştu.";
      }
    } else if (!result.steam_id) {
      const hasPlayStation = result.platforms?.some(platform => platform.platform === "playstation");
      libraryMessage = hasPlayStation
        ? "PlayStation hesabı bağlı. PSN oyun listesi, Sony'nin bu hesap için üçüncü taraflara açtığı verilere bağlıdır. Şu anda Nexora'ya erişilebilir bir oyun listesi dönmedi; PSN gizlilik ayarları izin verse bile Sony yetkilendirmesi olmadan oyunları güvenilir biçimde alamıyoruz."
        : "Paylaşılacak oyun kütüphanesi bulunamadı.";
    }
    else libraryMessage = "Steam kütüphanesi henüz yapılandırılmadı.";
  }

  return NextResponse.json({
    profile: result.profile,
    visibility: result.visibility,
    platforms: result.platforms,
    games,
    library_message: libraryMessage,
    achievements: result.visibility.achievements ? [] : null,
    reward_stats: rewardStatsError ? { visible: false } : rewardStats,
    online_status: null,
    is_owner: result.is_owner,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
