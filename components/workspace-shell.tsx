"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Compass, Gamepad2, Globe2, Home, Menu, MessageCircle, Settings, Sparkles, UserRound, Users, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const items = [
  { label: "Genel Bakış", href: "/" , icon: Home },
  { label: "Oyunları Keşfet", href: "/?view=games", icon: Compass },
  { label: "Arkadaşlar", href: "/friends", icon: Users },
  { label: "Mesajlar", href: "/messages", icon: MessageCircle },
  { label: "Topluluk", href: "/?view=community", icon: Globe2 },
  { label: "Profilim", href: "/profile", icon: UserRound },
  { label: "Oyun kütüphanem", href: "/library", icon: Gamepad2 },
  { label: "Ayarlar", href: "/settings", icon: Settings },
];

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    window.location.href = "/login";
  }
  return <main className="shell workspace-shell">
    <aside className={`sidebar workspace-sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>NEXORA</span><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"><X size={19}/></button></div>
      <div className="side-label">MENÜ</div>
      <nav className="nav-list">{items.map(item => {
        const active = item.href === "/" ? pathname === "/" : item.href.startsWith("/?") ? false : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
        return <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-item ${active ? "active" : ""}`}><item.icon size={18}/><span>{item.label}</span></Link>;
      })}</nav>
      <div className="side-label spaces-label">HESABIN</div>
      <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar avatar-user"><UserRound size={16}/></div><div className="profile-text"><b>Nexora</b><span>Oyuncu hesabın</span></div><button className="logout-mini" onClick={signOut} disabled={signingOut} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={16}/><span>{signingOut ? "Çıkılıyor..." : "Çıkış"}</span></button></div></div>
    </aside>
    <section className="main-area workspace-main">
      <header className="topbar workspace-topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç"><Menu size={21}/></button><div className="breadcrumb">NEXORA <span>/</span> <b>{items.find(item => item.href === pathname)?.label?.toUpperCase() || "OYUNCU ALANI"}</b></div><div className="top-actions"><Link className="workspace-home-link" href="/">Genel bakış</Link></div></header>
      {children}
    </section>
  </main>;
}
