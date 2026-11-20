"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DiscordAccount = {
  id: string;
  platform_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
};

const messages: Record<string, string> = {
  connected: "Discord hesabın Nexora'ya bağlandı.",
  already_linked: "Bu Discord hesabı başka bir Nexora hesabına bağlı.",
  save_failed: "Discord hesabı kaydedilemedi. Tekrar dene.",
  state_error: "Güvenlik doğrulaması başarısız oldu. Yeniden bağlan.",
  cancelled: "Discord bağlantısı iptal edildi.",
  missing_code: "Discord yetkilendirme kodu alınamadı.",
  token_exchange_failed: "Discord giriş doğrulaması tamamlanamadı.",
  profile_fetch_failed: "Discord profil bilgileri alınamadı.",
  provider_unavailable: "Discord'a şu anda ulaşılamıyor.",
  invalid_identity: "Discord kimliği doğrulanamadı.",
  server_config_missing: "Discord bağlantısı için sunucu ayarları henüz yapılmadı.",
};

export default function DiscordConnection() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<DiscordAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error: queryError } = await supabase.from("platform_accounts")
      .select("id,platform_user_id,display_name,avatar_url,profile_url")
      .eq("user_id", user.id).eq("platform", "discord").maybeSingle();
    if (queryError) setError(queryError.message);
    setAccount(data as DiscordAccount | null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadAccount();
    const result = new URLSearchParams(window.location.search).get("discord");
    if (result && messages[result]) setNotice(messages[result]);
  }, [loadAccount]);

  async function disconnect() {
    if (!account) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: removeError } = await supabase.from("platform_accounts")
      .delete().eq("user_id", user.id).eq("platform", "discord");
    if (removeError) setError(removeError.message);
    else { setAccount(null); setNotice("Discord hesabının bağlantısı kaldırıldı."); }
  }

  return <section className="social-card platform-connection-card">
    <div className="social-card-head"><h2>Discord hesabı</h2><span>{account ? "Bağlı" : "Bağlı değil"}</span></div>
    {notice && <div className="social-alert success">{notice}</div>}
    {error && <div className="social-alert error">{error}</div>}
    {loading ? <p className="social-empty"><LoaderCircle className="spin" size={17}/> Hesap kontrol ediliyor...</p> : account ? <div className="steam-account-row">
      <div className="steam-avatar">{account.avatar_url ? <img src={account.avatar_url} alt=""/> : <span>◉</span>}</div>
      <div className="steam-account-copy"><b>{account.display_name || "Discord kullanıcısı"}</b><span>Discord ID: {account.platform_user_id}</span><a href={account.profile_url || `https://discord.com/users/${account.platform_user_id}`} target="_blank" rel="noreferrer">Discord profilini aç <ExternalLink size={13}/></a></div>
      <button className="friend-reject" onClick={disconnect} title="Bağlantıyı kaldır"><Unlink size={16}/></button>
    </div> : <div className="steam-connect-copy">
      <p>Discord hesabını güvenli Discord izin ekranı üzerinden bağla. Nexora yalnızca temel profil bilgilerini ister; şifreni görmez.</p>
      <a className="social-primary steam-connect-button" href="/api/platforms/discord/connect">Discord hesabını bağla <ExternalLink size={16}/></a>
    </div>}
  </section>;
}
