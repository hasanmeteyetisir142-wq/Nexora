"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Compass, Gamepad2, Gift, Globe2, Home, Menu, MessageCircle, Settings, Sparkles, UserRound, Users, X, LogOut, ChevronDown } from "lucide-react";
import NotificationBell from "@/components/notification-bell";
import { createClient } from "@/lib/supabase/client";

const sections = [
  { label: "ANA SAYFA", items: [
    { label: "Genel Bakış", href: "/", icon: Home },
    { label: "Oyunları Keşfet", href: "/?view=games", icon: Compass },
  ]},
  { label: "OYUN", items: [
    { label: "Oyun Merkezi", href: "/play", icon: Gift },
    { label: "Günlük Görevler", href: "/play/tasks", icon: Gift },
    { label: "Birlikte Oyna", href: "/play/sessions", icon: Users },
    { label: "Mini Oyunlar", href: "/play/mini-games", icon: Activity },
    { label: "Etkinlikler", href: "/play/events", icon: Globe2 },
    { label: "Oyun İstek Listesi", href: "/play/wishlist", icon: Gamepad2 },
  ]},
  { label: "SOSYAL", items: [
    { label: "Oyuncu Akışı", href: "/play/feed", icon: MessageCircle },
    { label: "Arkadaşlar", href: "/friends", icon: Users },
    { label: "Mesajlar", href: "/messages", icon: MessageCircle },
    { label: "Topluluk", href: "/community", icon: Globe2 },
  ]},
  { label: "HESABIM", items: [
    { label: "Profilim", href: "/profile", icon: UserRound },
    { label: "Oyun kütüphanem", href: "/library", icon: Gamepad2 },
  ]},
];
const items = sections.flatMap(section => section.items);
function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/?")) return false;
  if (href === "/play") return pathname === "/play";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    window.location.href = "/login";
  }
  return <div className="shell workspace-shell">
    <aside className={`sidebar workspace-sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>NEXORA</span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"><X size={19}/></button></div>
      <div className="side-label">MENÜ</div>
      <nav className="workspace-nav">{sections.map(section => {
        const activeSection = section.items.some(item => isActive(item.href, pathname));
        return <div key={section.label} className={`nav-section ${activeSection ? "has-active" : ""}`}>
          <button type="button" aria-expanded={openSection === section.label} className={`nav-section-trigger ${activeSection ? "active" : ""}`} onClick={() => setOpenSection(current => current === section.label ? null : section.label)}>{section.label}<ChevronDown size={14}/></button>
          <div className={`nav-section-links ${openSection === section.label ? "is-open" : ""}`}>{section.items.map(item => {
            const active = isActive(item.href, pathname);
            return <Link key={item.label} href={item.href} onClick={() => {setMobileOpen(false);setOpenSection(null);}} className={`nav-item ${active ? "active" : ""}`}><item.icon size={18}/><span>{item.label}</span></Link>;
          })}</div>
        </div>;
      })}</nav>
      <div className="sidebar-bottom"><Link href="/settings" className={`sidebar-settings ${pathname.startsWith("/settings") ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Settings size={17}/><span>Ayarlar</span></Link><div className="profile-mini"><div className="avatar avatar-user"><UserRound size={16}/></div><div className="profile-text"><b>Nexora</b><span>Oyuncu hesabın</span></div><button className="logout-mini" onClick={signOut} disabled={signingOut} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={16}/><span>{signingOut ? "Çıkılıyor..." : "Çıkış"}</span></button></div></div>
    </aside>
    <section className="main-area workspace-main">
      <header className="topbar workspace-topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç"><Menu size={21}/></button><div className="breadcrumb">NEXORA <span>/</span> <b>{items.find(item => isActive(item.href, pathname))?.label?.toUpperCase() || "OYUNCU ALANI"}</b></div><div className="top-actions"><NotificationBell/><Link className="workspace-home-link" href="/">Genel bakış</Link></div></header>
      {children}
    </section>
  </div>;
}
