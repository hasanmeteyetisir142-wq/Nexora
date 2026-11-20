"use client";

import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { Camera, LoaderCircle, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePanel() {
  const supabase = useMemo(() => createClient(), []);
  const [userId,setUserId] = useState("");
  const [email,setEmail] = useState("");
  const [username,setUsername] = useState("");
  const [displayName,setDisplayName] = useState("");
  const [bio,setBio] = useState("");
  const [avatar,setAvatar] = useState("");
  const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");

  useEffect(()=>{ let live=true; (async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){ window.location.href="/login"; return; }
    const {data}=await supabase.from("profiles").select("username,display_name,bio,avatar_url").eq("id",user.id).maybeSingle();
    if(!live)return;
    setUserId(user.id); setEmail(user.email||"");
    setUsername(data?.username||""); setDisplayName(data?.display_name||user.user_metadata?.display_name||"");
    setBio(data?.bio||""); setAvatar(data?.avatar_url||"");
  })(); return ()=>{live=false;}; },[supabase]);

  async function uploadAvatar(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0]; if(!file||!userId)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)){setError("PNG, JPG veya WEBP dosyası seç.");return;}
    if(file.size>2*1024*1024){setError("Profil fotoğrafı en fazla 2 MB olabilir.");return;}
    setUploading(true);setError("");setNotice("");
    const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const path=`${userId}/avatar-${Date.now()}.${ext}`;
    const {error:uploadError}=await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});
    if(uploadError){setError(uploadError.message);setUploading(false);return;}
    const {data}=supabase.storage.from("avatars").getPublicUrl(path);
    setAvatar(data.publicUrl);setUploading(false);setNotice("Fotoğraf yüklendi. Değişiklikleri kaydetmeyi unutma.");
  }

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setNotice("");
    const clean=username.trim().toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(clean)){setError("Kullanıcı adı 3-24 karakter olmalı; harf, rakam ve _ kullanabilirsin.");setBusy(false);return;}
    const {error:saveError}=await supabase.from("profiles").update({username:clean,display_name:displayName.trim().slice(0,32),bio:bio.trim().slice(0,240),avatar_url:avatar||null,updated_at:new Date().toISOString()}).eq("id",userId);
    if(saveError){setError(saveError.code==="23505"?"Bu kullanıcı adı alınmış. Başka bir tane dene.":saveError.message);}
    else setNotice("Profilin kaydedildi.");
    setBusy(false);
  }

  return <main className="social-page"><section className="social-wrap"><div className="social-heading"><div className="social-icon"><UserRound/></div><div><div className="social-eyebrow">KİŞİSEL ALANIN</div><h1>Profilini düzenle</h1><p>Diğer oyuncuların seni nasıl göreceğini belirle.</p></div></div>
    <form className="social-card profile-form" onSubmit={save}>
      <div className="profile-avatar-row"><div className="profile-avatar">{avatar?<img src={avatar} alt="Profil fotoğrafı"/>:<span>{(displayName||username||"N").slice(0,1).toUpperCase()}</span>}</div><label className="upload-avatar">{uploading?<LoaderCircle className="spin" size={16}/>:<Camera size={16}/>} Fotoğraf değiştir<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} disabled={uploading}/></label><small>PNG, JPG veya WEBP · En fazla 2 MB</small></div>
      <label>Görünen ad<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={32} placeholder="Nasıl hitap edilsin?"/></label>
      <label>Kullanıcı adı<div className="username-input"><span>@</span><input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={24} placeholder="oyuncu_adi"/></div></label>
      <label>E-posta<input value={email} readOnly disabled/></label>
      <label>Hakkında<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={240} rows={4} placeholder="Oyun tarzını, sevdiğin oyunları anlat..."/><small className="char-count">{bio.length}/240</small></label>
      {error&&<div className="social-alert error">{error}</div>}{notice&&<div className="social-alert success">{notice}</div>}
      <button className="social-primary" type="submit" disabled={busy||!userId}>{busy?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>} Değişiklikleri kaydet</button>
    </form></section></main>;
}
