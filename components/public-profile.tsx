"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, ShieldCheck, Trophy, UserRound } from "lucide-react";

type Data = {
  profile: { username: string; display_name: string | null; avatar_url: string | null; bio: string | null };
  visibility: { platforms: boolean; library: boolean; achievements: boolean; online_status: boolean };
  platforms: Array<{ platform: string; display_name: string | null; avatar_url: string | null; profile_url: string | null; verified?: boolean }>;
  games: Array<{ appid: number; name: string; playtime_forever?: number; img_icon_url?: string }>;
  library_message: string;
  is_owner: boolean;
};

const platformName: Record<string, string> = {
  playstation: "PlayStation",
  steam: "Steam",
  xbox: "Xbox",
  discord: "Discord",
};

export default function PublicProfile({ username }: { username: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/profiles/${encodeURIComponent(username)}`, { cache: "no-store" })
      .then(async response => {
        const raw = await response.text();
        let payload: any;
        try { payload = raw ? JSON.parse(raw) : {}; }
        catch { throw new Error("Profil servisi beklenmeyen bir yanıt verdi. Yeniden dene."); }
        if (!response.ok) throw new Error(payload.error || "Profil yüklenemedi.");
        return payload as Data;
      })
      .then(payload => { if (active) setData(payload); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Profil yüklenemedi."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username]);

  return <main className="social-page">
    <header className="social-top"><Link href="/" className="social-back"><ArrowLeft size={17}/> Nexora'ya dön</Link><span>OYUNCU PROFİLİ</span></header>
    <section className="social-wrap">
      {loading && <div className="social-card social-empty">Profil yükleniyor...</div>}
      {error && <div className="social-alert error">{error}</div>}
      {data && <>
        <section className="social-card public-profile-hero">
          <div className="public-profile-avatar">{data.profile.avatar_url ? <img src={data.profile.avatar_url} alt=""/> : <UserRound size={32}/>}</div>
          <div><div className="social-eyebrow">NEXORA OYUNCUSU</div><h1>{data.profile.display_name || data.profile.username}</h1><p>@{data.profile.username}</p>{data.profile.bio && <p className="public-profile-bio">{data.profile.bio}</p>}</div>
          {data.is_owner && <Link href="/profile" className="text-btn">Profili düzenle</Link>}
        </section>
        <section className="social-card">
          <div className="social-card-head"><h2><ShieldCheck size={17}/> Bağlı platformlar</h2></div>
          {!data.visibility.platforms ? <p className="social-empty">Bu oyuncu platform bilgilerini gizlemiştir.</p> : data.platforms.length ? <div className="public-platform-list">{data.platforms.map(p => <div key={p.platform}><b>{platformName[p.platform] || p.platform}</b><span>{p.platform === "playstation" ? `PSN Online ID: ${p.display_name || "Belirtilmemiş"}` : p.display_name || "Bağlı"}</span>{p.platform === "playstation" && (p.verified ? <small className="psn-public-verified"><ShieldCheck size={12}/> Hesap sahipliği doğrulandı</small> : <small className="psn-public-unverified">Hesap henüz doğrulanmadı</small>)}{p.profile_url && <a href={p.profile_url} target="_blank" rel="noreferrer">Profili aç</a>}</div>)}</div> : <p className="social-empty">Henüz bağlı platform yok.</p>}
        </section>
        <section className="social-card">
          <div className="social-card-head"><h2><Gamepad2 size={17}/> Oyun kütüphanesi</h2></div>
          {!data.visibility.library ? <p className="social-empty">Bu oyuncu oyun kütüphanesini gizlemiştir.</p> : data.games.length ? <div className="steam-game-grid">{data.games.map(game => <article className="steam-game-card" key={game.appid}>{game.img_icon_url ? <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt=""/> : <div className="steam-game-placeholder"><Gamepad2/></div>}<div><b>{game.name}</b><span>{Math.round((game.playtime_forever || 0)/60)} saat oynandı</span></div></article>)}</div> : <p className="social-empty">{data.library_message || (data.platforms.some(platform => platform.platform === "playstation") ? "PSN hesabı bağlı; ancak Sony herkese açık oyun kütüphanesi verisi sağlamadığı için PlayStation oyunları şu anda otomatik listelenemiyor." : "Paylaşılacak oyun bulunamadı.")}</p>}
        </section>
        <section className="social-card">
          <div className="social-card-head"><h2><Trophy size={17}/> Başarımlar ve çevrim içi durumu</h2></div>
          <p className="social-empty">{!data.visibility.achievements ? "Başarımlar bu oyuncu tarafından gizlenmiştir." : "Başarım entegrasyonu henüz etkin değil; veri uydurulmaz."}</p>
          <p className="social-empty">{!data.visibility.online_status ? "Çevrim içi durumu gizlenmiştir." : "Gerçek zamanlı platform durumu henüz desteklenmiyor."}</p>
        </section>
      </>}
    </section>
  </main>;
}
