"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PublicHome from "@/components/public-home";
import {
  Activity, ArrowRight, Bell, ChevronDown, Compass, Gamepad2, Headphones,
  Home, MessageCircle, Plus, Search, Settings, ShieldCheck, Sparkles,
  Swords, Trophy, Users, Wallet, Zap, Menu, X, MoreHorizontal, Play,
  Radio, Globe2, CircleDot, LogOut, UserRound
} from "lucide-react";

const nav = [
  { label: "Genel Bakış", icon: Home },
  { label: "Oyunları Keşfet", icon: Compass },
  { label: "Arkadaşlar", icon: Users, href: "/friends" },
  { label: "Mesajlar", icon: MessageCircle, href: "/messages" },
  { label: "Topluluk", icon: Globe2 },
  { label: "Profilim", icon: UserRound, href: "/profile" },
  { label: "Oyun kütüphanem", icon: Gamepad2, href: "/library" },
  { label: "Ayarlar", icon: Settings, href: "/settings" },
];
const games = [
  { name: "VALORANT", genre: "Taktiksel FPS", tone: "red", mark: "V" },
  { name: "Minecraft", genre: "Sandbox · Macera", tone: "green", mark: "M" },
  { name: "Fortnite", genre: "Battle Royale", tone: "blue", mark: "F" },
  { name: "Rocket League", genre: "Spor · Yarış", tone: "orange", mark: "R" },
];
const platforms = [
  { name: "Steam", detail: "PC oyun kütüphanen", color: "steam", symbol: "S" },
  { name: "PlayStation", detail: "PSN hesabın", color: "ps", symbol: "P" },
  { name: "Xbox", detail: "Xbox profilin", color: "xbox", symbol: "X" },
  { name: "Discord", detail: "Toplulukların ve sohbetlerin", color: "discord", symbol: "D" },
];

type FriendSummary = { id: string; name: string; username: string | null; avatar_url: string | null };

export default function Dashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [accountName, setAccountName] = useState("Oyuncu");
  const [accountInitial, setAccountInitial] = useState("N");
  const [signingOut, setSigningOut] = useState(false);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setAuthenticated(Boolean(user));
      setAuthChecked(true);
      if (!user) { setFriends([]); setFriendsLoaded(true); return; }
      const { data } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle();
      const name = data?.display_name || data?.username || user.email?.split("@")[0] || "Oyuncu";
      if (active) { setAccountName(name); setAccountInitial(name.slice(0, 1).toUpperCase()); }
      const { data: links } = await supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const friendIds = [...new Set((links || []).map(link => link.requester_id === user.id ? link.addressee_id : link.requester_id))];
      if (friendIds.length) {
        const { data: people } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", friendIds);
        if (active) setFriends((people || []).map(person => ({ id: person.id, name: person.display_name || person.username || "Oyuncu", username: person.username, avatar_url: person.avatar_url })));
      } else if (active) setFriends([]);
      if (active) setFriendsLoaded(true);
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

  const select = (label: string) => { const target = nav.find(item => item.label === label); if (target?.href) { router.push(target.href); return; } setActive(label); setMobileOpen(false); };
  return (
    <main className="shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>NEXORA</span><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={19}/></button></div>
        <div className="side-label">MENÜ</div>
        <nav className="nav-list">{nav.map(item => <button key={item.label} onClick={() => select(item.label)} className={`nav-item ${active === item.label ? "active" : ""}`}><item.icon size={18}/><span>{item.label}</span></button>)}</nav>
        <div className="side-label spaces-label">KÜTÜPHANEM</div>
        <button className="nav-item" onClick={() => router.push("/library")}><Gamepad2 size={18}/><span>Oyunlarım</span></button>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><div className="upgrade-icon"><Zap size={17}/></div><strong>Nexora'yı keşfet.</strong><p>Oyun dünyanı tek bir yerde birleştir.</p><button onClick={() => router.push("/library")}>Hesaplarını bağla <ArrowRight size={14}/></button></div>
          
          <div className="profile-mini"><div className="avatar avatar-user">{accountInitial}</div><div className="profile-text"><b>{accountName}</b><span>Nexora oyuncusu</span></div><button className="logout-mini" onClick={handleSignOut} disabled={signingOut} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={16}/><span>{signingOut ? "Çıkılıyor..." : "Çıkış yap"}</span></button></div>
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
          <div className="hero-card"><div className="hero-glow"/><div className="hero-copy"><div className="hero-tag"><Sparkles size={13}/> NEXORA'NIN DÜNYASI</div><h2>Oyun sadece<br/>başlangıç.</h2><p>Arkadaşlarınla buluş, topluluğunu keşfet,<br/>oyun dünyanı tek yerden yönet.</p><button onClick={() => router.push("/library")}>Hesaplarını bağla <ArrowRight size={15}/></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orb-core"><Sparkles size={42}/></div><div className="float-chip chip-one"><Gamepad2 size={16}/> PLAY</div><div className="float-chip chip-two"><Users size={16}/> CONNECT</div><div className="float-chip chip-three"><Trophy size={16}/> WIN</div></div><div className="hero-index">01 <span>/ 03</span></div></div>

          <div className="section-heading"><div><div className="eyebrow">CANLI AKIŞ</div><h3>Oyun dünyanda neler oluyor?</h3></div><button className="text-btn" onClick={() => select("Topluluk")}>Tümünü gör <ArrowRight size={15}/></button></div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon purple"><Users size={18}/></div><span>Arkadaşların</span><strong>{friends.length}</strong><p>Gerçek arkadaşlık listen</p></div><div className="stat-card"><div className="stat-icon cyan"><Gamepad2 size={18}/></div><span>Oyun hesapları</span><strong>Yakında</strong><p>Platform bağlantıları henüz etkin değil</p></div><div className="stat-card"><div className="stat-icon gold"><Trophy size={18}/></div><span>Başarımlar</span><strong>Yakında</strong><p>Başarım sistemi hazırlanıyor</p></div><div className="stat-card"><div className="stat-icon pink"><Activity size={18}/></div><span>Oyun aktivitesi</span><strong>—</strong><p>Henüz aktivite verisi toplanmıyor</p></div></div>

          <div className="two-column"><div className="panel games-panel"><div className="panel-head"><div><div className="eyebrow">SANA ÖZEL</div><h3>Popüler oyunlar</h3></div><button className="round-arrow" onClick={() => select("Oyunları Keşfet")}><ArrowRight size={17}/></button></div><div className="game-list">{filteredGames.map(game => <div className="game-row" key={game.name}><div className={`game-cover ${game.tone}`}>{game.mark}</div><div className="game-info"><b>{game.name}</b><span>{game.genre}</span></div><button className="game-add" onClick={() => setJoined(old => old.includes(game.name) ? old.filter(x => x !== game.name) : [...old,game.name])}>{joined.includes(game.name) ? "Eklendi" : <Plus size={17}/>}</button></div>)}{filteredGames.length === 0 && <p className="empty-state">Bu isimde oyun bulamadık.</p>}</div></div>
          <div className="panel friends-panel"><div className="panel-head"><div><div className="eyebrow">EKİBİN</div><h3>Arkadaşların</h3></div><button className="text-btn" onClick={() => select("Arkadaşlar")}>Tümü <ArrowRight size={14}/></button></div><div className="friend-list">{!friendsLoaded ? <p className="empty-state">Arkadaşların yükleniyor…</p> : friends.length === 0 ? <p className="empty-state">Henüz arkadaşın yok. Oyuncu bulmak için Arkadaşlar bölümüne git.</p> : friends.map(friend => <div className="friend-row" key={friend.id}><div className="avatar friend-avatar">{friend.avatar_url ? <img src={friend.avatar_url} alt="" /> : friend.name.slice(0, 1).toUpperCase()}</div><div className="friend-info"><b>{friend.name}</b><span>{friend.username ? `@${friend.username}` : "Nexora oyuncusu"}</span></div></div>)}</div><button className="invite-btn" onClick={() => select("Arkadaşlar")}><Plus size={16}/> Arkadaş bul</button></div></div>

          <div className="section-heading accounts-heading"><div><div className="eyebrow">OYUN KÜTÜPHANEN</div><h3>Platform hesapların</h3><p>Bağlantılarını ve oyunlarını ayrı kütüphane alanından yönet.</p></div><button className="text-btn" onClick={() => router.push("/library")}>Kütüphaneye git <ArrowRight size={15}/></button></div>
          <footer><span>© 2026 NEXORA</span><span>OYUNUN, SENİN DÜNYAN.</span><span><ShieldCheck size={13}/> Güvenli bağlantı hedefi</span></footer>
        </div> : <div className="content subpage"><div className="eyebrow">NEXORA / ALAN</div><h1>{active}</h1><p className="subheading">Bu bölüm Nexora'nın ilk sürümünde hazırlanıyor.</p><div className="coming-card"><div className="coming-icon"><Sparkles size={26}/></div><h2>Çok yakında burada.</h2><p>Bu alanı sıradaki geliştirme adımlarında gerçek özelliklerle dolduracağız.</p><button className="primary-btn" onClick={() => select("Genel Bakış")}>Genel bakışa dön <ArrowRight size={16}/></button></div></div>}
      </section>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
    </main>
  );
}
