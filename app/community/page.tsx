"use client";
import { useEffect,useMemo,useState } from "react";
import { Users,Plus,LogIn,LogOut,Send,LoaderCircle,Globe2,Trash2,Edit3,Shield,Save,X,Video,Settings,MoreVertical } from "lucide-react";
import WorkspaceShell from "@/components/workspace-shell";
import CommunityCall from "@/components/community-call";
import { createClient } from "@/lib/supabase/client";

type Community={id:string;name:string;slug:string;description:string;owner_id:string};
type Post={id:string;community_id:string;author_id:string;body:string;created_at:string;edited_at?:string|null};
type Member={community_id:string;user_id:string;role:"owner"|"admin"|"moderator"|"member"};

export default function CommunityPage(){
 const supabase=useMemo(()=>createClient(),[]);
 const [uid,setUid]=useState("");const [items,setItems]=useState<Community[]>([]);const [joined,setJoined]=useState<string[]>([]);const [selected,setSelected]=useState("");const [posts,setPosts]=useState<Post[]>([]);const [members,setMembers]=useState<Member[]>([]);
 const [name,setName]=useState("");const [description,setDescription]=useState("");const [draft,setDraft]=useState("");const [creating,setCreating]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [editingCommunity,setEditingCommunity]=useState(false);const [editName,setEditName]=useState("");const [editDescription,setEditDescription]=useState("");
 const [editingPost,setEditingPost]=useState("");const [editBody,setEditBody]=useState("");
 const [settingsOpen,setSettingsOpen]=useState(false);const [postMenu,setPostMenu]=useState("");const [communityMenu,setCommunityMenu]=useState("");
 async function load(id:string){
  const [{data:c,error:ce},{data:m,error:me}]=await Promise.all([
   supabase.from("communities").select("id,name,slug,description,owner_id").order("created_at",{ascending:false}),
   supabase.from("community_members").select("community_id,user_id,role").eq("user_id",id)
  ]);
  if(ce||me){setError(ce?.message||me?.message||"Topluluklar yüklenemedi.");return;}
  setItems((c||[]) as Community[]);setJoined((m||[]).map(x=>x.community_id));
 }
 async function loadMembers(id:string){
  const {data,error:e}=await supabase.from("community_members").select("community_id,user_id,role").eq("community_id",id);
  if(e)setError(e.message);else setMembers((data||[]) as Member[]);
 }
 useEffect(()=>{let alive=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/login";return;}if(!alive)return;setUid(user.id);await load(user.id);})();return()=>{alive=false;};},[supabase]);
 async function loadPosts(id:string){
  const {data,error:e}=await supabase.from("community_posts").select("id,community_id,author_id,body,created_at,edited_at").eq("community_id",id).order("created_at",{ascending:false}).limit(50);
  if(e)setError(e.message);else setPosts((data||[]) as Post[]);
 }
 async function openCommunity(id:string){
  setSelected(id);setEditingCommunity(false);setEditingPost("");setSettingsOpen(false);setPostMenu("");await Promise.all([loadPosts(id),loadMembers(id)]);
 }
 async function openCommunitySettings(id:string){setCommunityMenu("");await openCommunity(id);setSettingsOpen(true);}
 async function createCommunity(e:React.FormEvent){
  e.preventDefault();if(!name.trim()||creating)return;setCreating(true);setError("");setNotice("");
  const slug=name.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,42)+"-"+Math.random().toString(36).slice(2,6);
  const {data,error:e1}=await supabase.from("communities").insert({name:name.trim(),slug,description:description.trim(),owner_id:uid}).select("id").single();
  if(e1){setError(e1.message);setCreating(false);return;}
  const {error:e2}=await supabase.from("community_members").insert({community_id:data.id,user_id:uid,role:"owner"});
  if(e2)setError(e2.message);else{setName("");setDescription("");setNotice("Topluluk oluşturuldu.");await load(uid);await openCommunity(data.id);}
  setCreating(false);
 }
 async function join(id:string){
  setBusy(true);const {error:e}=await supabase.from("community_members").insert({community_id:id,user_id:uid});
  if(e)setError(e.message);else{setNotice("Topluluğa katıldın.");await load(uid);await openCommunity(id);}setBusy(false);
 }
 async function leave(id:string){
  setBusy(true);const {error:e}=await supabase.from("community_members").delete().eq("community_id",id).eq("user_id",uid);
  if(e)setError(e.message);else{setJoined(old=>old.filter(x=>x!==id));if(selected===id){setSelected("");setPosts([]);setMembers([]);}setNotice("Topluluktan ayrıldın.");}setBusy(false);
 }
 async function publish(e:React.FormEvent){
  e.preventDefault();if(!draft.trim()||!selected)return;setBusy(true);
  const {error:e1}=await supabase.from("community_posts").insert({community_id:selected,author_id:uid,body:draft.trim()});
  if(e1)setError(e1.message);else{setDraft("");setNotice("Gönderi paylaşıldı.");await loadPosts(selected);}setBusy(false);
 }
 async function saveCommunity(){
  if(!current)return;setBusy(true);
  const {error:e}=await supabase.from("communities").update({name:editName.trim(),description:editDescription.trim()}).eq("id",current.id);
  if(e)setError(e.message);else{setItems(old=>old.map(x=>x.id===current.id?{...x,name:editName.trim(),description:editDescription.trim()}:x));setEditingCommunity(false);setNotice("Topluluk bilgileri güncellendi.");}
  setBusy(false);
 }
 async function deleteCommunity(){
  if(!current||!window.confirm("Bu topluluğu ve tüm gönderilerini silmek istediğine emin misin? Bu işlem geri alınamaz."))return;
  setBusy(true);const {error:e}=await supabase.from("communities").delete().eq("id",current.id);
  if(e)setError(e.message);else{setItems(old=>old.filter(x=>x.id!==current.id));setJoined(old=>old.filter(x=>x!==current.id));setSelected("");setPosts([]);setMembers([]);setNotice("Topluluk silindi.");}
  setBusy(false);
 }
 async function savePost(postId:string){
  if(!editBody.trim())return;setBusy(true);
  const {error:e}=await supabase.from("community_posts").update({body:editBody.trim(),edited_at:new Date().toISOString()}).eq("id",postId);
  if(e)setError(e.message);else{setPosts(old=>old.map(p=>p.id===postId?{...p,body:editBody.trim(),edited_at:new Date().toISOString()}:p));setEditingPost("");setNotice("Gönderi güncellendi.");}
  setBusy(false);
 }
 async function deletePost(postId:string){
  if(!window.confirm("Bu gönderiyi silmek istiyor musun?"))return;setBusy(true);
  const {error:e}=await supabase.from("community_posts").delete().eq("id",postId);
  if(e)setError(e.message);else{setPosts(old=>old.filter(p=>p.id!==postId));setNotice("Gönderi silindi.");}
  setBusy(false);
 }
 async function changeRole(member:Member,role:Member["role"]){
  if(!current||role==="owner")return;setBusy(true);
  const {error:e}=await supabase.from("community_members").update({role}).eq("community_id",current.id).eq("user_id",member.user_id);
  if(e)setError(e.message);else{setMembers(old=>old.map(m=>m.user_id===member.user_id?{...m,role}:m));setNotice("Üye rütbesi güncellendi.");}
  setBusy(false);
 }
 const current=items.find(x=>x.id===selected);
 const myRole=members.find(m=>m.user_id===uid)?.role|| (current?.owner_id===uid?"owner":null);
 const canManage=myRole==="owner"||myRole==="admin"||myRole==="moderator";
 const roleLabel=(role:string)=>({owner:"Kurucu",admin:"Yönetici",moderator:"Moderatör",member:"Üye"} as Record<string,string>)[role]||"Üye";
 return <WorkspaceShell><main className="social-page"><section className="social-wrap">
  <div className="social-heading"><div className="social-icon"><Globe2/></div><div><div className="social-eyebrow">OYUNCULARI BİR ARAYA GETİR</div><h1>Topluluk</h1><p>Topluluk oluştur, katıl, sohbet et ve topluluğunu yönet.</p></div></div>
  {error&&<div className="social-alert error">{error}</div>}{notice&&<div className="social-alert success">{notice}</div>}
  <form className="social-card community-create" onSubmit={createCommunity}><div className="social-card-head"><h2><Plus size={17}/> Topluluk oluştur</h2></div><input value={name} onChange={e=>setName(e.target.value)} minLength={3} maxLength={48} required placeholder="Topluluk adı (ör. Minecraft Türkiye)"/><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} placeholder="Topluluğunu kısaca tanıt..."/><button className="friend-action" disabled={creating||name.trim().length<3}>{creating?<LoaderCircle className="spin" size={16}/>:<Plus size={16}/>} Oluştur</button></form>
  <div className="community-layout">
   <section className="social-card"><div className="social-card-head"><h2>Keşfedilecek topluluklar</h2><span>{items.length}</span></div>
    {items.length===0?<p className="social-empty">Henüz topluluk yok. İlk topluluğu sen oluştur!</p>:items.map(c=><article className={`community-row ${selected===c.id?"selected":""}`} key={c.id}><button className="community-select" onClick={()=>void openCommunity(c.id)}><b>{c.name}</b><small>{c.description||"Açıklama eklenmemiş."}</small></button><div className="community-actions">{joined.includes(c.id)?<><button onClick={()=>void openCommunity(c.id)}>Aç</button>{c.owner_id!==uid&&<button onClick={()=>void leave(c.id)} disabled={busy}><LogOut size={14}/></button>}</>:<button onClick={()=>void join(c.id)} disabled={busy}><LogIn size={14}/> Katıl</button>}<div className="community-row-menu-wrap"><button className="community-post-more" aria-label="Topluluk seçenekleri" onClick={()=>setCommunityMenu(v=>v===c.id?"":c.id)}><MoreVertical size={17}/></button>{communityMenu===c.id&&<div className="community-post-menu"><button onClick={()=>void openCommunitySettings(c.id)}><Settings size={13}/> Grup ayarları</button></div>}</div></div></article>)}
   </section>
   <section className="social-card community-feed">
    <div className="social-card-head"><h2>{current?current.name:"Topluluk alanı"}</h2>{current&&<span><Users size={14}/> {members.length} üye</span>}</div>
    {!current?<p className="social-empty">Gönderileri ve sohbeti görmek için bir topluluk seç.</p>:!joined.includes(current.id)?<p className="social-empty">Bu topluluğun alanını açmak için önce katıl.</p>:<>
     <div className="community-toolbar">
      <span className="community-role-chip"><Shield size={14}/> {roleLabel(myRole||"member")}</span>
      <div className="community-settings-wrap">
       <button className="community-settings-btn" onClick={()=>setSettingsOpen(v=>!v)} aria-label="Topluluk ayarları"><Settings size={16}/> Ayarlar</button>
       {settingsOpen&&<div className="community-settings-panel">
        <div className="community-settings-title"><b>Topluluk ayarları</b><button onClick={()=>setSettingsOpen(false)} aria-label="Kapat"><X size={15}/></button></div>
        <div className="community-settings-section"><small>BENİM RÜTBEM</small><b>{roleLabel(myRole||"member")}</b></div>
        {myRole==="owner"&&<>
         <div className="community-settings-section"><small>TOPLULUK BİLGİLERİ</small>
          {!editingCommunity?<button className="community-setting-action" onClick={()=>{setEditName(current.name);setEditDescription(current.description||"");setEditingCommunity(true);}}><Edit3 size={14}/> Adı ve açıklamayı düzenle</button>:<div className="community-edit-form"><input value={editName} onChange={e=>setEditName(e.target.value)} maxLength={48} placeholder="Topluluk adı"/><textarea value={editDescription} onChange={e=>setEditDescription(e.target.value)} maxLength={500} placeholder="Açıklama"/><button className="friend-action" onClick={()=>void saveCommunity()} disabled={busy||editName.trim().length<3}><Save size={14}/> Kaydet</button><button className="community-setting-action" onClick={()=>setEditingCommunity(false)}><X size={14}/> Vazgeç</button></div>}
         </div>
         <div className="community-settings-section"><small>ÜYE RÜTBELERİ</small>{members.map(m=><div className="community-member-row" key={m.user_id}><span>{m.user_id===uid?"Sen":"Oyuncu "+m.user_id.slice(0,5)}</span>{m.role==="owner"?<small>Kurucu</small>:<select value={m.role} disabled={busy} onChange={e=>void changeRole(m,e.target.value as Member["role"])}><option value="member">Üye</option><option value="moderator">Moderatör</option><option value="admin">Yönetici</option></select>}</div>)}</div>
         <button className="community-setting-action danger" onClick={()=>void deleteCommunity()} disabled={busy}><Trash2 size={14}/> Topluluğu sil</button>
        </>}
        {myRole!=="owner"&&<p className="community-settings-note">Topluluk bilgilerini ve üye rütbelerini yalnızca kurucu yönetebilir.</p>}
       </div>}
      </div>
     </div>
     <CommunityCall communityId={current.id} userId={uid}/>
     <form className="community-post-form" onSubmit={publish}><textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={3000} placeholder="Toplulukla bir şey paylaş..." required/><button className="friend-action" disabled={busy||!draft.trim()}><Send size={15}/> Paylaş</button></form>
     <div className="community-post-list">
      {posts.length===0?<p className="social-empty">İlk mesajı sen gönder!</p>:posts.map(p=><article className={"community-post "+(p.author_id===uid?"community-post-mine":"")} key={p.id}><div><b>{p.author_id===uid?"Sen":"Nexora oyuncusu"}</b><time>{new Date(p.created_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}{p.edited_at&&<span className="edited-label"> · düzenlendi</span>}</time></div>{editingPost===p.id?<div className="community-edit-form"><textarea value={editBody} onChange={e=>setEditBody(e.target.value)} maxLength={3000}/><button className="friend-action" onClick={()=>void savePost(p.id)} disabled={busy||!editBody.trim()}><Save size={14}/> Kaydet</button><button className="friend-action" onClick={()=>setEditingPost("")}>İptal</button></div>:<p>{p.body}</p>}
      {(p.author_id===uid||canManage)&&<div className="community-post-menu-wrap"><button className="community-post-more" aria-label="Gönderi seçenekleri" onClick={()=>setPostMenu(v=>v===p.id?"":p.id)}><MoreVertical size={17}/></button>{postMenu===p.id&&<div className="community-post-menu">{p.author_id===uid&&<button onClick={()=>{setEditingPost(p.id);setEditBody(p.body);setPostMenu("");}}><Edit3 size={13}/> Düzenle</button>}<button className="danger" onClick={()=>{setPostMenu("");void deletePost(p.id);}} disabled={busy}><Trash2 size={13}/> Sil</button></div>}</div>}
     </article>)}
     </div>
    </>}
   </section>
  </div>
 </section></main></WorkspaceShell>;
}
