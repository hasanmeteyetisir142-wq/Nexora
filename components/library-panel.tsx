"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, LoaderCircle, ShieldCheck, Unlink, ChevronDown, Copy, Check, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DiscordConnection from "@/components/discord-connection";

type PlatformAccount = {
  id: string;
  platform_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  verified_at?: string | null;
};

async function readApiResponse(response: Response) {
  const raw = await response.text();
  let payload: any;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      response.status === 404
        ? "PlayStation bağlantı servisi henüz yayına alınmamış. Birkaç dakika sonra sayfayı yenile."
        : "Sunucudan beklenmeyen bir yanıt geldi. Sayfayı yenileyip tekrar dene."
    );
  }
  if (!response.ok) throw new Error(payload?.error || "PlayStation ID kaydedilemedi.");
  return payload;
}

export default function LibraryPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<PlatformAccount | null>(null);
  const [onlineId, setOnlineId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [username, setUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationInstructions, setVerificationInstructions] = useState("");
  const [verificationProfileUrl, setVerificationProfileUrl] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data: profileData } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      if (active) setUsername(profileData?.username || "");
      const { data, error: queryError } = await supabase
        .from("platform_accounts")
        .select("id,platform_user_id,display_name,avatar_url,profile_url,verified_at")
        .eq("user_id", user.id)
        .eq("platform", "playstation")
        .maybeSingle();
      if (!active) return;
      if (queryError) setError("PlayStation ID bilgisi kontrol edilemedi. Sayfayı yenilemeyi dene.");
      setAccount(data as PlatformAccount | null);
      setExpanded(Boolean(data));
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
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ onlineId: value }),
      });
      const payload = await readApiResponse(response);
      setAccount(payload.account as PlatformAccount);
      setOnlineId("");
      setNotice("PSN Online ID profil bilgine eklendi. Henüz Sony tarafından doğrulanmış değil.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PlayStation ID kaydedilemedi. Tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  async function startVerification() {
    setError(""); setNotice(""); setVerificationBusy(true);
    try {
      const response = await fetch("/api/platforms/playstation/verify/start", { method: "POST", cache: "no-store" });
      const payload = await readApiResponse(response);
      setVerificationCode(payload.code || "");
      setVerificationInstructions(payload.instructions || "");
      setNotice("Doğrulama kodun hazır. PSN profilindeki Hakkımda alanına ekle.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Doğrulama kodu oluşturulamadı.");
    } finally { setVerificationBusy(false); }
  }

  async function confirmVerification() {
    setError(""); setNotice(""); setVerificationBusy(true);
    try {
      const response = await fetch("/api/platforms/playstation/verify/confirm", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, cache: "no-store", body: JSON.stringify({ profileUrl: `https://profile.playstation.com/${encodeURIComponent(verificationProfileUrl.trim())}` }) });
      const payload = await readApiResponse(response);
      if (payload.submitted) {
        setVerificationCode("");
        setNotice(payload.message || "Doğrulama isteğin incelemeye gönderildi.");
      } else if (payload.verified) {
        setAccount(current => current ? { ...current, verified_at: new Date().toISOString() } : current);
        setVerificationCode("");
        setNotice(payload.message || "PSN hesabın doğrulandı.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "PSN hesabı doğrulanamadı.");
    } finally { setVerificationBusy(false); }
  }

  async function copyPsnId() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.platform_user_id);
      setCopied(true);
      setNotice("PSN Online ID panoya kopyalandı.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kopyalama başarısız. ID'ni seçip elle kopyalayabilirsin.");
    }
  }

  async function disconnectPlayStation() {
    if (!account) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: removeError } = await supabase.from("platform_accounts")
      .delete().eq("user_id", user.id).eq("platform", "playstation");
    if (removeError) setError("PlayStation ID kaldırılamadı. Tekrar dene.");
    else {
      setAccount(null);
      setNotice("PSN Online ID profilinden kaldırıldı.");
      setError("");
    }
  }

  return <main className="social-page">
    <section className="social-wrap">
      <div className="social-heading"><div className="social-icon"><Gamepad2/></div><div><div className="social-eyebrow">TEK MERKEZDE</div><h1>Oyun kütüphanem</h1><p>Oyun platformu hesaplarını Nexora profiline ekle.</p></div></div>
      {notice && <div className="social-alert success">{notice}</div>}
      {error && <div className="social-alert error">{error}</div>}

      <section className="social-card platform-connection-card">
        <div className="social-card-head"><h2>Platform bağlantıları</h2><span>Hesapların</span></div>
        <div className="platform-launch-grid">
          <button className={expanded ? "platform-launch active" : "platform-launch"} type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
            <span className="platform-launch-logo ps-logo"><Gamepad2 size={22}/></span>
            <span className="platform-launch-copy"><b>PlayStation</b><small>{loading ? "Kontrol ediliyor..." : account ? "PSN ID eklendi" : "Bağlantı ayarları"}</small></span>
            <ChevronDown className={expanded ? "platform-chevron open" : "platform-chevron"} size={17}/>
          </button>
          <div className="platform-launch disabled" aria-disabled="true">
            <span className="platform-launch-logo steam-logo">S</span>
            <span className="platform-launch-copy"><b>Steam</b><small>Yakında</small></span>
            <span className="coming-soon-mini">YAKINDA</span>
          </div>
          <div className="platform-launch disabled" aria-disabled="true">
            <span className="platform-launch-logo xbox-logo">X</span>
            <span className="platform-launch-copy"><b>Xbox</b><small>Yakında</small></span>
            <span className="coming-soon-mini">YAKINDA</span>
          </div>
        </div>

        {expanded && <div className="platform-details">
          {loading ? <p className="social-empty"><LoaderCircle size={16}/> Hesap bilgisi yükleniyor...</p> : account ? <><div className="steam-account-row">
            <div className="steam-avatar"><Gamepad2 size={22}/></div>
            <div className="steam-account-copy"><b>PSN Online ID: {account.platform_user_id}</b><span>{account.verified_at ? "PSN hesabı sahipliği doğrulandı." : "Henüz doğrulanmadı · Profil ID kaydı"}</span></div>
            {account.verified_at && <span className="psn-verified-badge"><ShieldCheck size={14}/> Doğrulandı</span>}
            <button className="friend-reject" type="button" onClick={copyPsnId} title="PSN ID'yi kopyala">{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
            <button className="friend-reject" type="button" onClick={disconnectPlayStation} title="ID'yi kaldır"><Unlink size={16}/></button>
          </div>
          {!account.verified_at && <div className="psn-verification-box">
            <b><ShieldCheck size={16}/> PSN hesabını doğrula</b>
            <p>Geçici kodu PSN profilindeki Hakkımda alanına ekle. Ardından resmi PlayStation profil bağlantını gönder. Sony profil servisi otomatik erişimi engellediği için isteğin incelemeye alınacak.</p>
            {!verificationCode ? <button className="social-primary" type="button" onClick={startVerification} disabled={verificationBusy}>{verificationBusy ? <LoaderCircle size={15}/> : null} Doğrulama kodu oluştur</button> : <>
              <div className="psn-verification-code"><code>{verificationCode}</code><button type="button" className="friend-action" onClick={() => void navigator.clipboard.writeText(verificationCode)}><Copy size={14}/> Kodu kopyala</button></div>
              <p>{verificationInstructions}</p>
              <label htmlFor="psn-verification-profile">PlayStation Online ID (PSN kullanıcı adın)</label>
              <input
                id="psn-verification-profile"
                type="text"
                inputMode="text"
                autoComplete="off"
                maxLength={16}
                value={verificationProfileUrl}
                onChange={(event) => setVerificationProfileUrl(event.target.value)}
                placeholder="Örn. Oyuncu_123"
                aria-describedby="psn-verification-help"
              />
              <small id="psn-verification-help">Buraya Nexora kullanıcı adını veya gerçek adını değil, PlayStation hesabında görünen Online ID’ni yaz. Nexora profil bağlantısını otomatik oluşturacak.</small>
              <button className="social-primary" type="button" onClick={confirmVerification} disabled={verificationBusy || !verificationProfileUrl.trim()}>{verificationBusy ? <LoaderCircle size={15}/> : <ShieldCheck size={15}/>} Doğrulama isteği gönder</button>
            </>}
            <small>Kod 30 dakika geçerlidir. İstek gönderildikten sonra profil ve kod yetkili kişi tarafından kontrol edilir.</small>
          </div>}</> : <form className="psn-connect-form" onSubmit={connectPlayStation}>
            <p>PSN Online ID'ni buraya yaz. Bu işlem Sony hesabına giriş yapmaz; hesabın sana ait olduğunu doğrulayamaz ve PlayStation oyunlarını getirmez.</p>
            <label htmlFor="psn-online-id">PSN Online ID</label>
            <input id="psn-online-id" name="onlineId" autoComplete="off" maxLength={16} value={onlineId} onChange={(event) => setOnlineId(event.target.value)} placeholder="Örn. Oyuncu_123" />
            <button className="social-primary" type="submit" disabled={saving || !onlineId.trim()}>{saving ? <><LoaderCircle size={16}/> Kaydediliyor...</> : "PSN ID'yi kaydet"}</button>
          </form>}
          {account && <div className="psn-profile-actions">
            <p><ShieldCheck size={14}/> Bu ID, profil gizlilik ayarların izin veriyorsa diğer Nexora oyuncularına görünür.</p>
            {username ? <Link className="social-secondary" href={"/u/" + encodeURIComponent(username)}><ExternalLink size={15}/> Nexora profilimi görüntüle</Link> : <Link className="social-secondary" href="/profile">Profil kullanıcı adını ayarla</Link>}
          </div>}
          <p className="privacy-note"><ShieldCheck size={14}/> Nexora, PSN şifreni veya oturum anahtarını istemez. Sony API erişimi olmadığı için doğrulama isteği manuel incelenir.</p>
        </div>}
      </section>

      <section className="social-card upcoming-platforms">
        <div className="social-card-head"><h2>Discord</h2><span>Bağlantı alanı</span></div>
        <DiscordConnection />
      </section>
    </section>
  </main>;
}
