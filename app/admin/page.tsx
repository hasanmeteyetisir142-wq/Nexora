"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Users, Globe2, MessageSquare, Gamepad2, CalendarDays, Link2, RefreshCw, Trash2, LogOut, Eye, LockKeyhole, Activity } from "lucide-react";

type Overview = {
 stats: Record<string, number>;
 users: {id:string;username:string|null;display_name:string|null;avatar_url:string|null;created_at:string}[];
 communities: {id:string;name:string;description:string|null;owner_id:string;created_at:string;member_count:number;post_count:number}[];
 recent_activity: {id:string;user_id:string;body:string;created_at:string;username:string|null;display_name:string|null}[];
 recent_community_posts: {id:string;community_id:string;community_name:string|null;author_id:string;body:string;created_at:string;username:string|null;display_name:string|null}[];
 psn_requests: {id:string;user_id:string;platform_user_id:string;verification_status:string;verification_profile_url:string|null;verification_submitted_at:string|null}[];
};
const sections = [
 {id:"overview",label:"Genel Bakış",icon:Activity},
 {id:"users",label:"Kullanıcılar",icon:Users},
 {id:"communities",label:"Topluluklar",icon:Globe2},
 {id:"content",label:"İçerikler",icon:MessageSquare},
 {id:"platforms",label:"Platformlar",icon:Gamepad2},
 {id:"privacy",label:"Gizlilik ve Yetki",icon:LockKeyhole}
] as const;
type Section = typeof sections[number]["id"];

export default function AdminDashboard(){
 const router=useRouter();
 const [data,setData]=useState<Overview|null>(null);
 const [section,setSection]=useState<Section>("overview");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/admin/overview",{cache:"no-store"});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload.error||"Yönetim verileri alınamadı.");
   setData(payload as Overview);
  }catch(e){setError(e instanceof Error?e.message:"Bir hata oluştu.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{
  let alive=true;
  (async()=>{
   const supabase=createClient();
   const {data:{user}}=await supabase.auth.getUser();
   if(!alive)return;
   if(user?.email?.toLowerCase()!=="hasanmeteyetisir142@gmail.com"){router.replace("/admin/login");return;}
   await load();
  })();
  return()=>{alive=false;};
 },[router]);
 async function remove(type:"community_post"|"activity_post"|"community",id:string){
  const label=type==="community"?"topluluğu":"gönderiyi";
  if(!window.confirm("Bu "+label+" silinsin mi? Bu işlem geri alınamaz."))return;
  setBusy(id);setError("");setNotice("");
  try{
   const response=await fetch("/api/admin/overview",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,id})});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload.error||"Silinemedi.");
   setNotice("İçerik silindi.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Silme işlemi başarısız.");}
  finally{setBusy("");}
 }
 async function logout(){
  await createClient().auth.signOut();
  router.replace("/admin/login");
 }
 const stats=data?.stats||{};
 const statItems=[
  ["Kullanıcılar",stats.users,Users],["Topluluklar",stats.communities,Globe2],["Topluluk gönderileri",stats.community_posts,MessageSquare],
  ["Açık oyun ilanları",stats.active_sessions,Gamepad2],["Etkinlikler",stats.events,CalendarDays],["Arkadaşlıklar",stats.friendships,Users],
  ["Platform bağlantıları",stats.platform_connections,Link2],["Bekleyen PSN",stats.pending_psn,ShieldCheck]
 ] as const;
 return <main className="admin-dashboard">
  <aside className="admin-sidebar">
   <a className="admin-brand" href="/"><span>N</span>NEXORA <small>ADMIN</small></a>
   <div className="admin-nav-label">YÖNETİM</div>
   {sections.map(item=>{const Icon=item.icon;return <button key={item.id} className={section===item.id?"active":""} onClick={()=>setSection(item.id)}><Icon size={17}/>{item.label}</button>;})}
   <div className="admin-sidebar-bottom"><div><ShieldCheck size={15}/> Yönetici erişimi</div><button onClick={()=>void logout()}><LogOut size={16}/> Çıkış yap</button></div>
  </aside>
  <section className="admin-main">
   <header className="admin-topbar"><div><span className="admin-eyebrow">NEXORA CONTROL CENTER</span><h1>{sections.find(s=>s.id===section)?.label}</h1></div><button className="admin-refresh" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Yenile</button></header>
   <div className="admin-privacy-banner"><Eye size={17}/><span><b>Gizlilik odaklı yönetim</b> — Yalnızca yönetim için gerekli hesap ve topluluk verileri gösterilir. Özel mesaj içerikleri, parolalar, oturum belirteçleri ve özel profil alanları gösterilmez.</span></div>
   {error&&<div className="admin-alert error">{error}</div>}{notice&&<div className="admin-alert success">{notice}</div>}
   {loading?<div className="admin-panel">Yönetim verileri yükleniyor…</div>:!data?<div className="admin-panel">Veri bulunamadı.</div>:<>
    {section==="overview"&&<><div className="admin-stats">{statItems.map(([label,value,Icon])=><article className="admin-stat" key={label}><span><Icon size={17}/>{label}</span><b>{Number(value||0).toLocaleString("tr-TR")}</b></article>)}</div><article className="admin-panel"><h2>Son herkese açık oyuncu paylaşımları</h2>{data.recent_activity.length?data.recent_activity.slice(0,8).map(p=><div className="admin-row" key={p.id}><div><b>{p.display_name||p.username||"Oyuncu"}</b><p>{p.body}</p><small>{new Date(p.created_at).toLocaleString("tr-TR")}</small></div><button className="admin-delete" disabled={busy===p.id} onClick={()=>void remove("activity_post",p.id)}><Trash2 size={15}/></button></div>):<p className="admin-muted">Henüz herkese açık paylaşım yok.</p>}</article></>}
    {section==="users"&&<article className="admin-panel"><h2>Kullanıcı kayıtları ({data.users.length} son kayıt)</h2><p className="admin-muted">Güvenlik için e-posta, özel mesajlar, parola ve özel profil bilgileri listelenmez.</p>{data.users.map(u=><div className="admin-row" key={u.id}><div><b>{u.display_name||u.username||"İsimsiz oyuncu"}</b><p>@{u.username||"kullanıcı adı yok"}</p><small>Kayıt: {new Date(u.created_at).toLocaleDateString("tr-TR")}</small></div></div>)}</article>}
    {section==="communities"&&<article className="admin-panel"><h2>Topluluklar ({data.communities.length})</h2>{data.communities.map(c=><div className="admin-row" key={c.id}><div><b>{c.name}</b><p>{c.description||"Açıklama yok"}</p><small>{c.member_count} üye · {c.post_count} gönderi</small></div><button className="admin-delete" disabled={busy===c.id} onClick={()=>void remove("community",c.id)}><Trash2 size={15}/></button></div>)}</article>}
    {section==="content"&&<article className="admin-panel"><h2>Topluluk gönderileri ({data.recent_community_posts.length} son kayıt)</h2>{data.recent_community_posts.map(p=><div className="admin-row" key={p.id}><div><b>{p.community_name||"Topluluk"} · {p.display_name||p.username||"Oyuncu"}</b><p>{p.body}</p><small>{new Date(p.created_at).toLocaleString("tr-TR")}</small></div><button className="admin-delete" disabled={busy===p.id} onClick={()=>void remove("community_post",p.id)}><Trash2 size={15}/></button></div>)}</article>}
    {section==="platforms"&&<article className="admin-panel"><h2>PSN doğrulama istekleri</h2><p className="admin-muted">Onaylama ve reddetme işlemleri ayrı doğrulama ekranında yapılır.</p><a className="admin-link" href="/admin/playstation-verifications">PSN inceleme ekranını aç →</a>{data.psn_requests.map(p=><div className="admin-row" key={p.id}><div><b>{p.platform_user_id}</b><p>Bekleyen doğrulama</p><small>{p.verification_submitted_at?new Date(p.verification_submitted_at).toLocaleString("tr-TR"):"—"}</small></div>{p.verification_profile_url&&<a href={p.verification_profile_url} target="_blank" rel="noreferrer">Profili aç</a>}</div>)}</article>}
    {section==="privacy"&&<article className="admin-panel"><h2>Yönetici erişimi ve gizlilik</h2><div className="admin-policy-row"><ShieldCheck/><div><b>Yalnızca yetkili yönetici</b><p>Yönetim API'si her istekte oturum açmış hesabın e-posta yetkisini sunucuda doğrular.</p></div></div><div className="admin-policy-row"><LockKeyhole/><div><b>Özel mesajlar açılmaz</b><p>Kullanıcılar arasındaki özel mesaj içerikleri bu panelde listelenmez veya aranmaz.</p></div></div><div className="admin-policy-row"><Eye/><div><b>Gerektiği kadar veri</b><p>Panel kullanıcı adı, görünen ad, kayıt tarihi, herkese açık gönderiler ve topluluk yönetim özetleriyle sınırlıdır.</p></div></div><div className="admin-policy-row"><Activity/><div><b>Yönetim denetim kaydı</b><p>Panel açılışı ve moderasyon silme işlemleri denetim tablosuna kaydedilir.</p></div></div><p className="admin-muted">Bu panel gizli mesajlara, parolalara, özel hesap bağlantılarına veya kullanıcıların gizlediği oyun bilgilerine erişim sağlamaz. Her kullanıcı için gizlilik tercihleri ve geçerli yasal talepler gözetilmelidir.</p></article>}
   </>}
  </section>
 </main>;
}
