"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Gamepad2, LoaderCircle, ShieldCheck, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DiscordConnection from "@/components/discord-connection";

type PlatformAccount = {
  id: string;
  platform_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
};

export default function LibraryPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<PlatformAccount | null>(null);
  const [onlineId, setOnlineId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data, error: queryError } = await supabase
        .from("platform_accounts")
        .select("id,platform_user_id,display_name,avatar_url,profile_url")
        .eq("user_id", user.id)
        .eq("platform", "playstation")
        .maybeSingle();
      if (!active) return;
      if (queryError) setError("PlayStation bağlantısı kontrol edilemedi. Sayfayı yenilemeyi dene.");
      setAccount(data as PlatformAccount | null);
      setLoading(false);
    }
    void loadAccount();
    return () => { active = false; };
  }, [supabase]);

  async function connectPlayStation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const value = onlineId.trim();
    if (!/^[A-Za-z][A-Za-z0-9_-]{2,15}$/.test(value)) {
      setError("PSN Online ID 3-16 karakter olmalı; harfle başlamalı ve yalnızca harf, rakam, tire veya alt çizgi içermeli.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/platforms/playstation/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlineId: value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "PlayStation ID kaydedilemedi.");
      setAccount(payload.account as PlatformAccount);
      setOnlineId("");
      setNotice("PSN Online ID Nexora profiline eklendi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PlayStation ID kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnectPlayStation() {
    if (!account) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: removeError } = await supabase.from("platform_accounts")
      .delete().eq("user_id", user.id).eq("platform", "playstation");
    if (removeError) setError("PlayStation bağlantısı kaldırılamadı. Tekrar dene.");
    else {
      setAccount(null);
      setNotice("PlayStation ID profilinden kaldırıldı.");
      setError("");
    }
  }

  return <main className="social-page">
    <header className="social-top"><Link href="/" className="social-back"><ArrowLeft size={17}/> Nexora'ya dön</Link><span>OYUN KÜTÜPHANEN</span></header>
    <section className="social-wrap">
      <div className="social-heading"><div className="social-icon"><Gamepad2/></div><div><div className="social-eyebrow">TEK MERKEZDE</div><h1>Oyun kütüphanem</h1><p>Oyun platformu hesaplarını Nexora profiline ekle.</p></div></div>
      {notice && <div className="social-alert success">{notice}</div>}
      {error && <div className="social-alert error">{error}</div>}

      <section className="social-card platform-connection-card">
        <div className="social-card-head"><h2>PlayStation hesabı</h2><span>{account ? "Profilde gösteriliyor" : "Bağlı değil"}</span></div>
        {loading ? <p className="social-empty"><LoaderCircle className="spin" size={17}/> Hesap kontrol ediliyor...</p> : account ? <div className="steam-account-row">
          <div className="steam-avatar"><Gamepad2 size={22}/></div>
          <div className="steam-account-copy"><b>{account.display_name || account.platform_user_id}</b><span>PSN Online ID: {account.platform_user_id}</span><small>Bu bilgi kullanıcı tarafından girildi; Sony üzerinden hesap sahipliği doğrulanmadı.</small></div>
          <button className="friend-reject" onClick={disconnectPlayStation} title="Profilinden kaldır"><Unlink size={16}/></button>
        </div> : <form className="psn-connect-form" onSubmit={connectPlayStation}>
          <p>PSN Online ID'ni girerek PlayStation hesabını profilinde gösterebilirsin. Bu işlem Sony hesabına giriş yapmaz ve oyun listesini otomatik getirmez.</p>
          <label htmlFor="psn-online-id">PSN Online ID</label>
          <input id="psn-online-id" name="onlineId" autoComplete="off" maxLength={16} value={onlineId} onChange={(event) => setOnlineId(event.target.value)} placeholder="Örn. Oyuncu_123" />
          <button className="social-primary" type="submit" disabled={saving || !onlineId.trim()}>{saving ? <><LoaderCircle className="spin" size={16}/> Kaydediliyor...</> : "PlayStation ID'yi ekle"}</button>
        </form>}
      </section>

      <section className="social-card upcoming-platforms">
        <div className="social-card-head"><h2>Diğer platformlar</h2><span>Yakında</span></div>
        <div className="platform-coming-grid">
          <div><b>Steam</b><span>Steam hesabı ve oyun kütüphanesi entegrasyonu yakında.</span></div>
          <div><b>Xbox</b><span>Microsoft / Xbox hesabı entegrasyonu yakında.</span></div>
        </div>
        <p className="privacy-note"><ShieldCheck size={14}/> Platform bilgilerini istediğin zaman profilinden kaldırabilirsin. PlayStation ID şu anda manuel olarak eklenir; doğrulanmış hesap bağlantısı değildir.</p>
      </section>
      <DiscordConnection />
    </section>
  </main>;
}
