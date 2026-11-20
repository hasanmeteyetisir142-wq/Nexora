"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Gamepad2, LoaderCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = { mode: "login" | "signup" };

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isSignup = mode === "signup";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignup && !acceptedTerms) { setError("Devam etmek için Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmelisin."); return; }
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim(), terms_accepted: true, terms_version: "2026-11-20", privacy_version: "2026-11-20" },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Hesabın oluşturuldu. E-posta adresine gönderdiğimiz doğrulama bağlantısına tıkla; sonra giriş yapabilirsin.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.replace("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu. Lütfen tekrar dene.");
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
        <div className="auth-symbol"><Gamepad2 size={24} /></div>
        <div className="auth-eyebrow">{isSignup ? "OYUN DÜNYANA KATIL" : "TEKRAR HOŞ GELDİN"}</div>
        <h1>{isSignup ? "Hesabını oluştur." : "Macera seni bekliyor."}</h1>
        <p className="auth-description">{isSignup ? "Arkadaşlarını bul, oyunlarını bağla ve Nexora dünyanı kur." : "Nexora hesabına giriş yap ve kaldığın yerden devam et."}</p>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && <label>Görünen ad<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Oyuncu adın" minLength={2} maxLength={32} required autoComplete="nickname" /></label>}
          <label>E-posta<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@eposta.com" required autoComplete="email" /></label>
          <label>Şifre<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 8 karakter" minLength={8} required autoComplete={isSignup ? "new-password" : "current-password"} /></label>
          {isSignup && <label className="auth-terms"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required /> <span><Link href="/terms" target="_blank">Kullanım Koşulları</Link> ve <Link href="/privacy" target="_blank">Gizlilik Politikası</Link>'nı okudum ve kabul ediyorum.</span></label>}
          {error && <div className="auth-alert auth-error" role="alert">{error}</div>}
          {message && <div className="auth-alert auth-success" role="status">{message}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <>{isSignup ? "Ücretsiz hesap oluştur" : "Giriş yap"} <ArrowRight size={17} /></>}</button>
        </form>
        <div className="auth-switch">{isSignup ? "Zaten hesabın var mı?" : "Nexora'da yeni misin?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Giriş yap" : "Hesap oluştur"}</Link></div>
      </section>
      <div className="auth-foot">© 2026 NEXORA · OYUNUN, SENİN DÜNYAN.</div>
    </main>
  );
}
