"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Save, LoaderCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Visibility = "public" | "friends" | "selected" | "private";
const sections = [
  { key: "platforms", label: "Bağlı platformlar", description: "Steam, Xbox, PlayStation ve diğer hesap bağlantıların." },
  { key: "library", label: "Oyun kütüphanesi", description: "Sahip olduğun oyunlar ve oyun listelerin." },
  { key: "achievements", label: "Başarımlar ve liderlik", description: "Oyun başarımların, derecelerin ve sıralamaların." },
  { key: "online_status", label: "Çevrim içi durum", description: "Bağlı platformlardaki çevrim içi ve oynuyor durumun." },
] as const;
const choices: { value: Visibility; label: string }[] = [
  { value: "public", label: "Herkese açık" },
  { value: "friends", label: "Arkadaşlara özel" },
  { value: "selected", label: "Seçilen kişilere özel" },
  { value: "private", label: "Kimseye gösterme" },
];

export default function SettingsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [settings, setSettings] = useState<Record<string, Visibility>>({ platforms: "friends", library: "friends", achievements: "friends", online_status: "friends" });
  const [friends, setFriends] = useState<{id:string;name:string}[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("profiles").select("privacy_settings").eq("id", user.id).maybeSingle();
      const { data: links } = await supabase.from("friendships").select("requester_id,addressee_id").eq("status","accepted").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const ids = [...new Set((links || []).map(x => x.requester_id === user.id ? x.addressee_id : x.requester_id))];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id,display_name,username").in("id",ids) : { data: [] as any[] };
      if (!live) return;
      setUserId(user.id);
      const saved = profile?.privacy_settings || {};
      setSettings(s => ({ ...s, ...saved }));
      setSelected(Array.isArray(saved.selected_users) ? saved.selected_users : []);
      setFriends((people || []).map(p => ({ id:p.id, name:p.display_name || p.username || "Oyuncu" })));
    })();
    return () => { live = false; };
  }, [supabase]);

  async function save() {
    setBusy(true); setError(""); setNotice("");
    const { error: saveError } = await supabase.from("profiles").update({ privacy_settings: { ...settings, selected_users: selected } }).eq("id", userId);
    if (saveError) setError(saveError.message);
    else setNotice("Gizlilik ayarların kaydedildi.");
    setBusy(false);
  }

  return <main className="social-page">
    <header className="social-top"><Link href="/" className="social-back"><ArrowLeft size={17}/> Nexora'ya dön</Link><span>GİZLİLİK VE GÜVENLİK</span></header>
    <section className="social-wrap">
      <div className="social-heading"><div className="social-icon"><Shield/></div><div><div className="social-eyebrow">KONTROL SENDE</div><h1>Gizlilik ayarları</h1><p>Profilinde hangi bilgileri kimlerin görebileceğini seç.</p></div></div>
      {sections.map(section => <div className="social-card privacy-card" key={section.key}>
        <div className="privacy-copy"><b>{section.label}</b><p>{section.description}</p></div>
        <select aria-label={section.label + " görünürlüğü"} value={settings[section.key] || "friends"} onChange={e => setSettings(s => ({...s,[section.key]:e.target.value as Visibility}))}>
          {choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>)}
      <div className="social-card">
        <div className="social-card-head"><h2><Users size={17}/> Seçilen kişiler</h2><span>{selected.length}</span></div>
        <p className="social-empty">Yukarıdaki seçeneklerden “Seçilen kişilere özel” olanlar için erişim vereceğin arkadaşlarını işaretle.</p>
        {friends.length ? <div className="privacy-friend-list">{friends.map(f => <label key={f.id}><input type="checkbox" checked={selected.includes(f.id)} onChange={e => setSelected(old => e.target.checked ? [...old,f.id] : old.filter(id => id !== f.id))}/><span>{f.name}</span></label>)}</div> : <p className="social-empty">Henüz kabul edilmiş arkadaşın yok.</p>}
      </div>
      {error && <div className="social-alert error">{error}</div>}{notice && <div className="social-alert success">{notice}</div>}
      <button className="social-primary" onClick={save} disabled={busy || !userId}>{busy ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} Ayarları kaydet</button>
      <p className="privacy-note">Not: Çevrim içi durumun gerçek platformlardan alınabilmesi, ilgili platformun resmi API ve izinlerine bağlıdır. Bağlantı kurulmadan çevrim içi bilgisi uydurulmaz.</p>
    </section>
  </main>;
}
