"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, LoaderCircle, ExternalLink } from "lucide-react";

type RequestItem = {
  id: string;
  user_id: string;
  platform_user_id: string;
  verification_code: string | null;
  verification_profile_url: string | null;
  verification_submitted_at: string | null;
  verification_expires_at: string | null;
};

export default function PlayStationVerificationReview() {
  const router = useRouter();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/playstation-verifications", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "İstekler alınamadı.");
      setItems(payload.requests || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Bir hata oluştu."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function checkAdminLogin() {
      if (sessionStorage.getItem("nexora-admin-login") !== "1") {
        router.replace("/admin/login");
        return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user?.email?.toLowerCase() !== "hasanmeteyetisir142@gmail.com") {
        sessionStorage.removeItem("nexora-admin-login");
        router.replace("/admin/login");
        return;
      }
      void load();
    }
    void checkAdminLogin();
    return () => { active = false; };
  }, [router]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusy(id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/playstation-verifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id, decision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "İşlem kaydedilemedi.");
      setItems(current => current.filter(item => item.id !== id));
      setMessage(decision === "approve" ? "PSN hesabı doğrulandı." : "Doğrulama isteği reddedildi.");
    } catch (e) { setError(e instanceof Error ? e.message : "İşlem başarısız."); }
    finally { setBusy(""); }
  }

  return <main className="social-page"><section className="social-wrap">
    <div className="social-heading"><div className="social-icon"><ShieldCheck/></div><div><div className="social-eyebrow">NEXORA YÖNETİM</div><h1>PSN doğrulama incelemeleri</h1><p>Profildeki kodu kontrol edip hesabı onayla veya reddet.</p></div><button className="social-secondary" onClick={async () => { sessionStorage.removeItem("nexora-admin-login"); await createClient().auth.signOut(); router.replace("/admin/login"); }}>Çıkış yap</button></div>
    {error && <div className="social-alert error">{error}</div>}
    {message && <div className="social-alert success">{message}</div>}
    {loading ? <div className="social-card social-empty"><LoaderCircle/> Yükleniyor...</div> : items.length === 0 ? <div className="social-card social-empty">Bekleyen doğrulama isteği yok.</div> : items.map(item => <article className="social-card" key={item.id}>
      <div className="social-card-head"><h2>{item.platform_user_id}</h2><span>Bekliyor</span></div>
      <p>Kullanıcı kaydı: {item.user_id}</p>
      <p>Gönderim: {item.verification_submitted_at ? new Date(item.verification_submitted_at).toLocaleString("tr-TR") : "—"}</p>
      <p>Kontrol edilecek kod: <b>{item.verification_code || "Kod bulunamadı"}</b></p>
      {item.verification_profile_url && <p><a href={item.verification_profile_url} target="_blank" rel="noreferrer">PlayStation profilini aç <ExternalLink size={14}/></a></p>}
      <p className="privacy-note">Profildeki Online ID'nin kayıtlı ID ile aynı olduğunu ve Hakkımda alanında bu kodun bulunduğunu doğrula.</p>
      <div className="platform-details" style={{display:"flex",gap:12}}>
        <button className="social-primary" disabled={busy === item.id} onClick={() => void review(item.id,"approve")}>{busy === item.id ? "Kaydediliyor..." : "Doğrula"}</button>
        <button className="social-secondary" disabled={busy === item.id} onClick={() => void review(item.id,"reject")}>Reddet</button>
      </div>
    </article>)}
  </section></main>;
}
