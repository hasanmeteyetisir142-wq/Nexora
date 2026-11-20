import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });

  const { data: account, error } = await supabase
    .from("platform_accounts")
    .select("platform_user_id")
    .eq("user_id", user.id)
    .eq("platform", "steam")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Steam bağlantısı okunamadı." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Steam hesabı bağlı değil." }, { status: 404 });

  const apiKey = process.env.STEAM_WEB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Steam Web API anahtarı sunucuya eklenmedi. Steam hesabın bağlı; oyun kütüphanesini göstermek için STEAM_WEB_API_KEY gerekiyor." }, { status: 503 });
  }

  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", account.platform_user_id);
  url.searchParams.set("include_appinfo", "true");
  url.searchParams.set("include_played_free_games", "true");

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Steam oyun kütüphanesi şu anda alınamadı." }, { status: 502 });
    const payload = await response.json();
    const games = payload?.response?.games;
    if (!Array.isArray(games)) {
      return NextResponse.json({ error: "Steam kütüphanesi boş veya gizli. Steam profilindeki Oyun Detayları görünürlüğünü kontrol et." }, { status: 403 });
    }
    return NextResponse.json({ games, game_count: payload.response.game_count ?? games.length });
  } catch {
    return NextResponse.json({ error: "Steam'e bağlanırken ağ hatası oluştu." }, { status: 502 });
  }
}
