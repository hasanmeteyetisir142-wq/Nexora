"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Activity, ArrowRight, Bell, ChevronDown, Compass, Gamepad2, Headphones,
  Home, MessageCircle, Plus, Search, Settings, ShieldCheck, Sparkles,
  Swords, Trophy, Users, Wallet, Zap, Menu, X, MoreHorizontal, Play,
  Radio, Globe2, CircleDot, LogOut
} from "lucide-react";

const nav = [
  { label: "Genel Bakış", icon: Home },
  { label: "Oyunları Keşfet", icon: Compass },
  { label: "Arkadaşlar", icon: Users, count: "3" },
  { label: "Mesajlar", icon: MessageCircle, count: "2" },
  { label: "Topluluk", icon: Globe2 },
];
const games = [
  { name: "VALORANT", genre: "Taktiksel FPS", players: "128,4 B", tone: "red", mark: "V" },
  { name: "Minecraft", genre: "Sandbox · Macera", players: "84,2 B", tone: "green", mark: "M" },
  { name: "Fortnite", genre: "Battle Royale", players: "96,8 B", tone: "blue", mark: "F" },
  { name: "Rocket League", genre: "Spor · Yarış", players: "32,1 B", tone: "orange", mark: "R" },
];
const friends = [
  { name: "pixelkaan", game: "Minecraft", status: "Oyunda", color: "mint", initials: "PK" },
  { name: "Luna.exe", game: "VALORANT", status: "Oyunda", color: "violet", initials: "L" },
  { name: "MertCan", game: "Çevrimiçi", status: "Boşta", color: "amber", initials: "MC" },
];
const platforms = [
  { name: "Steam", detail: "PC oyun kütüphanen", color: "steam", symbol: "S" },
  { name: "PlayStation", detail: "PSN hesabın", color: "ps", symbol: "P" },
  { name: "Xbox", detail: "Xbox profilin", color: "xbox", symbol: "X" },
  { name: "Discord", detail: "Toplulukların ve sohbetlerin", color: "discord", symbol: "D" },
];

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [accountName, setAccountName] = useState("Oyuncu");
  const [accountInitial, setAccountInitial] = useState("N");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle();
      const name = data?.display_name || data?.username || user.email?.split("@")[0] || "Oyuncu";
      if (active) { setAccountName(name); setAccountInitial(name.slice(0, 1).toUpperCase()); }
    };
    void loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void loadProfile(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };
  const [active, setActive] = useState("Genel Bakış");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [joined, setJoined] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const filteredGames = games.filter(g => g.name.toLowerCase().includes(query.toLowerCase()));

  const select = (label: string) => { setActive(label); setMobileOpen(false); };
  return (
    <main className="shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>NEXORA</span><span className="brand-beta">BETA</span><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={19}/></button></div>
        <div className="side-label">MENÜ</div>
        <nav className="nav-list">{nav.map(item => <button key={item.label} onClick={() => select(item.label)} className={`nav-item ${active === item.label ? "active" : ""}`}><item.icon size={18}/><span>{item.label}</span>{item.count && <small>{item.count}</small>}</button>)}</nav>
        <div className="side-label spaces-label">KÜTÜPHANEM</div>
        <button className="nav-item" onClick={() => select("Oyunlarım")}><Gamepad2 size={18}/><span>Oyunlarım</span></button>
        <button className="nav-item" onClick={() => select("Başarımlar")}><Trophy size={18}/><span>Başarımlarım</span></button>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Zap size={17}/></div><strong>Nexora'yı keşfet.</strong><p>Oyun dünyanı tek bir yerde birleştir.</p><button onClick={() => select("Hesaplarım")}>Hesaplarını bağla <ArrowRight size={14}/></button></div>
          <button className="nav-item settings" onClick={() => select("Ayarlar")}><Settings size={18}/><span>Ayarlar</span></button>
          <div className="profile-mini"><div className="avatar avatar-user">{accountInitial}</div><div className="profile-text"><b>{accountName}</b><span>Nexora oyuncusu</span></div><button className="logout-mini" onClick={handleSignOut} disabled={signingOut} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={17}/></button></div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21}/></button>
          <div className="breadcrumb">NEXORA <span>/</span> <b>{active.toUpperCase()}</b></div>
          <div className="top-actions"><label className="searchbox"><Search size={17}/><input placeholder="Oyun, oyuncu veya topluluk ara..." value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></label><button className="icon-btn notification" aria-label="Bildirimler"><Bell size={18}/><i/></button><div className="top-avatar">{accountInitial}</div></div>
        </header>

        {active === "Genel Bakış" ? <div className="content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> OYUN DÜNYAN HAZIR</div><h1>Tekrar hoş geldin, <em>{accountName}.</em></h1><p className="subheading">Bugün hangi maceraya atılıyoruz?</p></div><button className="primary-btn" onClick={() => select("Oyunları Keşfet")}><Compass size={17}/> Oyun keşfet <ArrowRight size={16}/></button></div>
          <div className="hero-card"><div className="hero-glow"/><div className="hero-copy"><div className="hero-tag"><Sparkles size={13}/> NEXORA'NIN DÜNYASI</div><h2>Oyun sadece<br/>başlangıç.</h2><p>Arkadaşlarınla buluş, topluluğunu keşfet,<br/>oyun dünyanı tek yerden yönet.</p><button onClick={() => select("Hesaplarım")}>Hesaplarını bağla <ArrowRight size={15}/></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orb-core"><Sparkles size={42}/></div><div className="float-chip chip-one"><Gamepad2 size={16}/> PLAY</div><div className="float-chip chip-two"><Users size={16}/> CONNECT</div><div className="float-chip chip-three"><Trophy size={16}/> WIN</div></div><div className="hero-index">01 <span>/ 03</span></div></div>

          <div className="section-heading"><div><div className="eyebrow">CANLI AKIŞ</div><h3>Oyun dünyanda neler oluyor?</h3></div><button className="text-btn" onClick={() => select("Topluluk")}>Tümünü gör <ArrowRight size={15}/></button></div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon purple"><Users size={18}/></div><span>Arkadaşların</span><strong>3 <small>/ 12</small></strong><p><i className="tiny-green"/> 2 kişi şu an oyunda</p></div><div className="stat-card"><div className="stat-icon cyan"><Gamepad2 size={18}/></div><span>Takip ettiğin oyunlar</span><strong>08</strong><p>Keşfedilecek çok şey var</p></div><div className="stat-card"><div className="stat-icon gold"><Trophy size={18}/></div><span>Toplam başarım</span><strong>24</strong><p>Sonraki seviye yakında</p></div><div className="stat-card"><div className="stat-icon pink"><Activity size={18}/></div><span>Bu haftaki aktivite</span><strong>12<small> saat</small></strong><p>Geçen haftaya göre +%18</p></div></div>

          <div className="two-column"><div className="panel games-panel"><div className="panel-head"><div><div className="eyebrow">SANA ÖZEL</div><h3>Popüler oyunlar</h3></div><button className="round-arrow" onClick={() => select("Oyunları Keşfet")}><ArrowRight size={17}/></button></div><div className="game-list">{filteredGames.map(game => <div className="game-row" key={game.name}><div className={`game-cover ${game.tone}`}>{game.mark}</div><div className="game-info"><b>{game.name}</b><span>{game.genre}</span></div><div className="player-count"><i className="tiny-green"/>{game.players}</div><button className="game-add" onClick={() => setJoined(old => old.includes(game.name) ? old.filter(x => x !== game.name) : [...old,game.name])}>{joined.includes(game.name) ? "Eklendi" : <Plus size={17}/>}</button></div>)}{filteredGames.length === 0 && <p className="empty-state">Bu isimde oyun bulamadık.</p>}</div></div>
          <div className="panel friends-panel"><div className="panel-head"><div><div className="eyebrow">EKİBİN</div><h3>Arkadaşların</h3></div><button className="text-btn" onClick={() => select("Arkadaşlar")}>Tümü <ArrowRight size={14}/></button></div><div className="friend-list">{friends.map(friend => <div className="friend-row" key={friend.name}><div className={`avatar friend-avatar ${friend.color}`}>{friend.initials}<i/></div><div className="friend-info"><b>{friend.name}</b><span>{friend.game}</span></div><span className={`status ${friend.status === "Oyunda" ? "playing" : ""}`}>{friend.status}</span></div>)}</div><button className="invite-btn" onClick={() => setNotice("Davet bağlantısı yakında kullanılabilecek.")}><Plus size={16}/> Arkadaş davet et</button></div></div>

          <div className="section-heading accounts-heading"><div><div className="eyebrow">TEK MERKEZ</div><h3>Hesaplarını bağla</h3><p>Oyun platformlarını Nexora ile bir araya getir.</p></div><button className="text-btn" onClick={() => select("Hesaplarım")}>Tüm platformlar <ArrowRight size={15}/></button></div>
          <div className="platform-grid">{platforms.map(p => <button className="platform-card" key={p.name} onClick={() => {setActive("Hesaplarım");setNotice(p.name + " bağlantısı için resmi giriş entegrasyonu hazırlanıyor.");}}><div className={`platform-logo ${p.color}`}>{p.symbol}</div><div><b>{p.name}</b><span>{p.detail}</span></div><span className="connect-plus"><Plus size={17}/></span></button>)}</div>
          <footer><span>© 2026 NEXORA</span><span>OYUNUN, SENİN DÜNYAN.</span><span><ShieldCheck size={13}/> Güvenli bağlantı hedefi</span></footer>
        </div> : <div className="content subpage"><div className="eyebrow">NEXORA / ALAN</div><h1>{active}</h1><p className="subheading">Bu bölüm Nexora'nın ilk sürümünde hazırlanıyor.</p><div className="coming-card"><div className="coming-icon"><Sparkles size={26}/></div><h2>Çok yakında burada.</h2><p>Bu alanı sıradaki geliştirme adımlarında gerçek özelliklerle dolduracağız.</p><button className="primary-btn" onClick={() => select("Genel Bakış")}>Genel bakışa dön <ArrowRight size={16}/></button></div></div>}
      </section>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
    </main>
  );
}
