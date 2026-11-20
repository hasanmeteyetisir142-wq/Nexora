"use client";

import Link from "next/link";
import { ArrowRight, Compass, Gamepad2, Globe2, MessageCircle, ShieldCheck, Sparkles, Trophy, Users, Zap } from "lucide-react";

const games = [
  { name: "VALORANT", genre: "Taktiksel FPS", mark: "V", tone: "red" },
  { name: "Minecraft", genre: "Sandbox · Macera", mark: "M", tone: "green" },
  { name: "Fortnite", genre: "Battle Royale", mark: "F", tone: "blue" },
  { name: "Rocket League", genre: "Spor · Yarış", mark: "R", tone: "orange" },
];

export default function PublicHome() {
  return (
    <main className="public-shell">
      <header className="public-header">
        <Link href="/" className="public-brand"><span><Sparkles size={19}/></span>NEXORA <small>BETA</small></Link>
        <nav className="public-nav"><a href="#kesfet">Keşfet</a><a href="#ozellikler">Özellikler</a></nav>
        <div className="public-actions"><Link className="public-login" href="/login">Giriş yap</Link><Link className="public-signup" href="/signup">Ücretsiz katıl <ArrowRight size={15}/></Link></div>
      </header>
      <section className="public-hero">
        <div className="public-hero-copy">
          <div className="public-eyebrow"><i/> OYUNCULARIN YENİ BULUŞMA NOKTASI</div>
          <h1>Oyun dünyan.<br/><em>Tek bir yerde.</em></h1>
          <p>Arkadaşlarını bul, oyun topluluklarını keşfet ve tüm oyun hesaplarını tek bir merkezde bir araya getir. Nexora'ya göz atmak için hesap gerekmez.</p>
          <div className="public-hero-buttons"><Link className="public-signup big" href="/signup">Hemen ücretsiz hesap oluştur <ArrowRight size={17}/></Link><a className="public-explore" href="#kesfet"><Compass size={17}/> Siteyi keşfet</a></div>
          <div className="public-proof"><span><Users size={15}/> Arkadaşlarınla buluş</span><span><ShieldCheck size={15}/> Hesabın güvende</span></div>
        </div>
        <div className="public-visual" aria-hidden="true"><div className="public-ring ring-a"/><div className="public-ring ring-b"/><div className="public-core"><Gamepad2 size={48}/></div><div className="public-float float-a"><Users size={16}/> FRIENDS</div><div className="public-float float-b"><Trophy size={16}/> ACHIEVEMENTS</div><div className="public-float float-c"><Zap size={16}/> PLAY</div></div>
      </section>
      <section className="public-games" id="kesfet">
        <div className="public-section-title"><div><div className="public-eyebrow">OYUN EVRENİ</div><h2>Neler oynuyorsun?</h2><p>Sevdiğin oyunları keşfet. Kişisel özellikleri kullanmak için ücretsiz hesap oluştur.</p></div><Link href="/signup">Nexora'ya katıl <ArrowRight size={15}/></Link></div>
        <div className="public-game-grid">{games.map(g => <article className="public-game-card" key={g.name}><div className={`public-game-mark ${g.tone}`}>{g.mark}</div><div><b>{g.name}</b><span>{g.genre}</span></div><Link href="/signup" aria-label={g.name + " için hesap oluştur"}><ArrowRight size={17}/></Link></article>)}</div>
      </section>
      <section className="public-features" id="ozellikler">
        <div className="public-feature"><Users/><h3>Arkadaşların</h3><p>Oyuncu arkadaşlarını bul ve birlikte oynamak için bağlantıda kal.</p></div>
        <div className="public-feature"><Globe2/><h3>Topluluklar</h3><p>İlgi duyduğun oyunların topluluklarını keşfet.</p></div>
        <div className="public-feature"><MessageCircle/><h3>Sohbet ve mesajlar</h3><p>Arkadaşlarınla iletişim kur. Bu özellikler için giriş yapman gerekir.</p></div>
      </section>
      <footer className="public-footer"><span>© 2026 NEXORA</span><span>OYUNUN, SENİN DÜNYAN.</span><span>Başlamak ücretsiz.</span></footer>
    </main>
  );
}
