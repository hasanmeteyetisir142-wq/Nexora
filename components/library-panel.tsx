"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Gamepad2, LoaderCircle, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DiscordConnection from "@/components/discord-connection";

type PlatformAccount = {
  id: string;
  platform_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  connected_at: string;
};
type SteamGame = { appid: number; name: string; playtime_forever?: number; img_icon_url?: string };

const messages: Record<string, string> = {
  connected: "Steam hesabın Nexora'ya bağlandı.",
  already_linked: "Bu Steam hesabı başka bir Nexora hesabına bağlı.",
  save_failed: "Steam hesabı kaydedilemedi. Tekrar dene.",
  state_error: "Güvenlik doğrulaması başarısız oldu. Yeniden bağlan.",
  cancelled: "Steam bağlantısı iptal edildi.",
  invalid_identity: "Steam kimliği doğrulanamadı.",
  return_url_error: "Güvenli dönüş adresi doğrulanamadı.",
  provider_error: "Steam sağlayıcı doğrulaması başarısız oldu.",
  signature_error: "Steam imza bilgileri eksik.",
  verification_failed: "Steam hesabının doğrulaması başarısız oldu.",
  server_config_missing: "Steam hesap bağlantısı için sunucu ayarı eksik.",
};

export default function LibraryPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<PlatformAccount | null>(null);
  const [games, setGames] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    const { data, error: loadError } = await supabase.from("platform_accounts")
      .select("id,platform_user_id,display_name,avatar_url,profile_url,connected_at")
      .eq("user_id", user.id).eq("platform", "steam").maybeSingle();
    if (loadError) setError(loadError.message);
    setAccount(data as PlatformAccount | null);
    setLoading(false);
  }, [supabase]);

  const loadGames = useCallback(async () => {
    setGamesLoading(true); setError("");
    try {
      const response = await fetch("/api/platforms/steam/games", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Oyunlar yüklenemedi.");
      setGames(payload.games || []);
    } catch (e) {
      setGames([]);
      setError(e instanceof Error ? e.message : "Oyunlar yüklenemedi.");
    } finally { setGamesLoading(false); }
  }, []);

  useEffect(() => {
    void loadAccount();
    const result = new URLSearchParams(window.location.search).get("steam");
    if (result && messages[result]) setNotice(messages[result]);
    if (result === "connected") void loadGames();
  }, [loadAccount, loadGames]);

  async function disconnect() {
    if (!account) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: removeError } = await supabase.from("platform_accounts")
      .delete().eq("user_id", user.id).eq("platform", "steam");
    if (removeError) setError(removeError.message);
    else { setAccount(null); setGames([]); setNotice("Steam hesabının bağlantısı kaldırıldı."); }
  }

  return <main className="social-page">
    <header className="social-top"><Link href="/" className="social-back"><ArrowLeft size={17}/> Nexora'ya dön</Link><span>OYUN KÜTÜPHANEN</span></header>
    <section className="social-wrap">
      <div className="social-heading"><div className="social-icon"><Gamepad2/></div><div><div className="social-eyebrow">TEK MERKEZDE</div><h1>Oyun kütüphanem</h1><p>Bağladığın platformlardaki oyunlarını burada gör.</p></div></div>
      {notice && <div className="social-alert success">{notice}</div>}
      {error && <div className="social-alert error">{error}</div>}
      <section className="social-card platform-connection-card">
        <div className="social-card-head"><h2>Steam hesabı</h2><span>{account ? "Bağlı" : "Bağlı değil"}</span></div>
        {loading ? <p className="social-empty"><LoaderCircle className="spin" size={17}/> Hesap kontrol ediliyor...</p> : account ? <div className="steam-account-row">
          <div className="steam-avatar">{account.avatar_url ? <img src={account.avatar_url} alt=""/> : <Gamepad2 size={22}/>}</div>
          <div className="steam-account-copy"><b>{account.display_name || "Steam oyuncusu"}</b><span>Steam ID: {account.platform_user_id}</span><a href={account.profile_url || `https://steamcommunity.com/profiles/${account.platform_user_id}`} target="_blank" rel="noreferrer">Steam profilini aç <ExternalLink size={13}/></a></div>
          <button className="friend-reject" onClick={disconnect} title="Bağlantıyı kaldır"><Unlink size={16}/></button>
        </div> : <div className="steam-connect-copy"><p>Steam hesabını güvenli Steam giriş ekranı üzerinden bağla. Nexora Steam şifreni görmez veya saklamaz.</p><a className="social-primary steam-connect-button" href="/api/platforms/steam/connect">Steam hesabını bağla <ExternalLink size={16}/></a></div>}
      </section>
      {account && <section className="social-card steam-library-card">
        <div className="social-card-head"><h2>Steam oyunların</h2><button className="text-btn" onClick={loadGames} disabled={gamesLoading}>{gamesLoading ? <LoaderCircle className="spin" size={15}/> : <RefreshCw size={15}/>} Yenile</button></div>
        {gamesLoading && <p className="social-empty"><LoaderCircle className="spin" size={17}/> Oyunların yükleniyor...</p>}
        {!gamesLoading && games.length === 0 && <p className="social-empty">Oyun kütüphanesi henüz yüklenmedi. Steam Web API anahtarı ve Steam profilinde herkese açık Oyun Detayları görünürlüğü gerekebilir.</p>}
        {games.length > 0 && <><p className="social-empty">{games.length} oyun bulundu. Oynama süreleri Steam'den alınır.</p><div className="steam-game-grid">{games.map(game => <article className="steam-game-card" key={game.appid}>{game.img_icon_url ? <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt=""/> : <div className="steam-game-placeholder"><Gamepad2/></div>}<div><b>{game.name}</b><span>{Math.round((game.playtime_forever || 0) / 60)} saat oynandı</span></div></article>)}</div></>}
      </section>}
      <DiscordConnection />
      <section className="social-card upcoming-platforms">
        <div className="social-card-head"><h2>Diğer platformlar</h2><span>Sonraki entegrasyonlar</span></div>
        <div className="platform-coming-grid"><div><b>Xbox</b><span>Microsoft hesabı ve izinli oyun verileri</span></div><div><b>PlayStation</b><span>PSN bağlantısı ve erişilebilir profil verileri</span></div></div>
        <p className="privacy-note"><ShieldCheck size={14}/> Platform bağlantılarını istediğin zaman kaldırabilirsin. Her platformun sunduğu API ve izinler farklıdır.</p>
      </section>
    </section>
  </main>;
}
