"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "hasanmeteyetisir142@gmail.com";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        throw new Error("Bu e-posta yönetici hesabı olarak yetkilendirilmemiş.");
      }
      sessionStorage.setItem("nexora-admin-login", "1");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı. Bilgilerini kontrol et.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <Link href="/" className="auth-brand"><span className="auth-brand-icon"><Sparkles size={19} /></span>NEXORA</Link>
      <section className="auth-card">
        <div className="auth-symbol"><ShieldCheck size={24} /></div>
        <div className="auth-eyebrow">GÜVENLİ YÖNETİCİ GİRİŞİ</div>
        <h1>Yönetici paneli.</h1>
        <p className="auth-description">PSN doğrulama isteklerini incelemek için yönetici hesabınla giriş yap.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>E-posta<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="E-posta adresini gir" required autoComplete="username" /></label>
          <label>Şifre<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Yönetici hesabının şifresi" required autoComplete="current-password" /></label>
          {error && <div className="auth-alert auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <><LockKeyhole size={17} /> Yönetici olarak giriş yap <ArrowRight size={17} /></>}</button>
        </form>
        <p className="auth-description" style={{marginTop:18,fontSize:12}}>Yönetici erişimi yalnızca yetkili hesapla sağlanır.</p>
      </section>
      <div className="auth-foot">© 2026 NEXORA · YÖNETİCİ ERİŞİMİ</div>
    </main>
  );
}
