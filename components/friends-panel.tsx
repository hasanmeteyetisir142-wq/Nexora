"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Search, UserPlus, Users, X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile={id:string;username:string|null;display_name:string|null;avatar_url:string|null;bio?:string|null};
type Friendship={id:string;requester_id:string;addressee_id:string;status:string;requester?:Profile;addressee?:Profile};
const virtualPlayers=[
 {key:"shadowfox",name:"ShadowFox",handle:"shadowfox",bio:"Rekabetçi oyunları ve yeni ekipleri seviyor.",online:true},
 {key:"mertx",name:"MertX",handle:"mertx",bio:"Minecraft ve macera oyunlarıyla ilgileniyor.",online:true},
 {key:"nightwolf",name:"NightWolf",handle:"nightwolf",bio:"Gece oyunlarına katılmayı seviyor.",online:true},
 {key:"pixelrider",name:"PixelRider",handle:"pixelrider",bio:"Farklı oyunlar keşfediyor.",online:true},
 {key:"neonblade",name:"NeonBlade",handle:"neonblade",bio:"Aksiyon ve FPS oyunlarını seviyor.",online:true},
 {key:"lunarfox",name:"LunarFox",handle:"lunarfox",bio:"Takım oyunları için burada.",online:true},
 {key:"stormbyte",name:"StormByte",handle:"stormbyte",bio:"Oyun dünyasını keşfediyor.",online:false},
 {key:"frosty",name:"Frosty",handle:"frosty",bio:"Yeni arkadaşlar edinmeyi seviyor.",online:false},
 {key:"darknova",name:"DarkNova",handle:"darknova",bio:"Bilim kurgu ve macera oyunları.",online:false},
 {key:"rapidx",name:"RapidX",handle:"rapidx",bio:"Hızlı tempolu oyunları seviyor.",online:false},
 {key:"skyhunter",name:"SkyHunter",handle:"skyhunter",bio:"Birlikte oyun oynamak için burada.",online:false},
 {key:"echozen",name:"EchoZen",handle:"echozen",bio:"Sakin ve eğlenceli oyunlar arıyor.",online:false},
];

export default function FriendsPanel(){
 const supabase=useMemo(()=>createClient(),[]);
 const [uid,setUid]=useState("");
 const [query,setQuery]=useState("");
 const [results,setResults]=useState<Profile[]>([]);
 const [friends,setFriends]=useState<Profile[]>([]);
 const [incoming,setIncoming]=useState<Friendship[]>([]);
 const [outgoing,setOutgoing]=useState<Friendship[]>([]);
 const [addedVirtual,setAddedVirtual]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [adding,setAdding]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");

 async function load(id?:string){
  const me=id||uid;if(!me)return;
  const [{data:rows},{data:virtualRows}]=await Promise.all([
   supabase.from("friendships").select("id,requester_id,addressee_id,status").or(`requester_id.eq.${me},addressee_id.eq.${me}`),
   supabase.from("virtual_friendships").select("persona_key").eq("user_id",me)
  ]);
  const all=(rows||[]) as Friendship[];
  const accepted=all.filter(r=>r.status==="accepted");
  const pendingIn=all.filter(r=>r.status==="pending"&&r.addressee_id===me);
  const pendingOut=all.filter(r=>r.status==="pending"&&r.requester_id===me);
  const ids=[...new Set(accepted.flatMap(r=>[r.requester_id,r.addressee_id]).filter(x=>x!==me))];
  const incomingIds=pendingIn.map(r=>r.requester_id);
  const outgoingIds=pendingOut.map(r=>r.addressee_id);
  const profileIds=[...new Set([...ids,...incomingIds,...outgoingIds])];
  let people:Profile[]=[];
  if(profileIds.length){const {data}=await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").in("id",profileIds);people=(data||[]) as Profile[];}
  const byId=new Map(people.map(p=>[p.id,p]));
  setFriends(ids.map(x=>byId.get(x)).filter(Boolean) as Profile[]);
  setIncoming(pendingIn.map(r=>({...r,requester:byId.get(r.requester_id)})));
  setOutgoing(pendingOut.map(r=>({...r,addressee:byId.get(r.addressee_id)})));
  setAddedVirtual((virtualRows||[]).map((r:any)=>r.persona_key));
 }
 useEffect(()=>{let live=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/login";return;}if(live){setUid(user.id);await load(user.id);}})();return()=>{live=false;};},[supabase]);
 async function search(){
  setBusy(true);setError("");setNotice("");
  const term=query.trim().replace(/^@/,"").replace(/[,%()._*]/g,"");
  if(term.length<2){setResults([]);setBusy(false);return;}
  const {data,error:e}=await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).neq("id",uid).limit(12);
  if(e)setError(e.message);else setResults((data||[]) as Profile[]);
  setBusy(false);
 }
 async function send(id:string){
  setError("");setNotice("");
  const {error:e}=await supabase.from("friendships").insert({requester_id:uid,addressee_id:id});
  if(e)setError(e.code==="23505"?"Bu oyuncuya zaten istek göndermişsin.":e.message);
  else{setNotice("Arkadaşlık isteği gönderildi.");setResults(old=>old.filter(p=>p.id!==id));await load();}
 }
 async function addVirtual(key:string){
  setAdding(key);setError("");setNotice("");
  const {error:e}=await supabase.from("virtual_friendships").insert({user_id:uid,persona_key:key});
  if(e)setError(e.code==="23505"?"Bu sanal oyuncu zaten arkadaş listende.":e.message);
  else{setNotice("Arkadaşlık isteğin otomatik kabul edildi.");await load();}
  setAdding("");
 }
 async function removeVirtual(key:string){
  const {error:e}=await supabase.from("virtual_friendships").delete().eq("user_id",uid).eq("persona_key",key);
  if(e)setError(e.message);else{setNotice("Sanal oyuncu arkadaş listesinden çıkarıldı.");await load();}
 }
 async function accept(id:string){
  const {error:e}=await supabase.from("friendships").update({status:"accepted"}).eq("id",id);
  if(e)setError(e.message);else{setNotice("Arkadaşlık isteği kabul edildi.");await load();}
 }
 async function remove(id:string){
  const {error:e}=await supabase.from("friendships").delete().eq("id",id);
  if(e)setError(e.message);else{setNotice("Arkadaşlık bağlantısı kaldırıldı.");await load();}
 }
 const person=(p?:Profile)=>p?.display_name||p?.username||"Oyuncu";
 const avatar=(p?:Profile)=><div className="friend-person-avatar">{p?.avatar_url?<img src={p.avatar_url} alt=""/>:<span>{person(p).slice(0,1).toUpperCase()}</span>}</div>;
 return <main className="social-page"><section className="social-wrap"><div className="social-heading"><div className="social-icon"><Users/></div><div><div className="social-eyebrow">EKİBİNİ KUR</div><h1>Arkadaşlar</h1><p>Oyuncuları bul, istek gönder ve ekibini oluştur.</p></div></div>
 <div className="social-card friend-search"><div className="social-search-row"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Kullanıcı adı veya görünen ad ara..."/><button onClick={search} disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>: "Ara"}</button></div>
 {results.length>0&&<div className="friend-results">{results.map(p=><div className="friend-person" key={p.id}>{avatar(p)}<div className="friend-person-copy">{p.username ? <Link href={`/u/${p.username}`} className="friend-profile-link"><b>{person(p)}</b></Link> : <b>{person(p)}</b>}<span>@{p.username||"kullanici"}</span></div><button className="friend-action" onClick={()=>send(p.id)}><UserPlus size={15}/> Ekle</button></div>)}</div>}
 </div>
 {error&&<div className="social-alert error">{error}</div>}{notice&&<div className="social-alert success">{notice}</div>}
 <section className="social-card nexora-bots-card"><div className="social-card-head"><h2><Sparkles size={17}/> Oyuncu önerileri</h2><span>{virtualPlayers.length} PROFİL</span></div><p className="social-empty">Bu bölümdeki profiller Nexora'nın sanal oyuncularıdır. İstek gönderdiğinde arkadaşlığın otomatik kabul edilir.</p><div className="nexora-bot-grid">{virtualPlayers.map(bot=><article className="nexora-bot" key={bot.key}><div className="nexora-bot-avatar">{bot.name.slice(0,1)}</div><div className="nexora-bot-copy"><b>{bot.name}</b><small>@{bot.handle}</small><p>{bot.bio}</p><em>{bot.online?"Çevrimiçi":"Çevrimdışı"} · Sanal profil</em></div>{addedVirtual.includes(bot.key)?<button className="friend-accept" onClick={()=>removeVirtual(bot.key)} title="Arkadaşlıktan çıkar"><Check size={16}/></button>:<button className="friend-action" disabled={adding===bot.key} onClick={()=>addVirtual(bot.key)}>{adding===bot.key?<LoaderCircle className="spin" size={15}/>:<><UserPlus size={15}/> Ekle</>}</button>}</article>)}</div></section>
 <div className="friends-columns"><section className="social-card"><div className="social-card-head"><h2>Gelen istekler</h2><span>{incoming.length}</span></div>{incoming.length===0?<p className="social-empty">Bekleyen arkadaşlık isteğin yok.</p>:incoming.map(r=><div className="friend-person" key={r.id}>{avatar(r.requester)}<div className="friend-person-copy"><b>{person(r.requester)}</b><span>@{r.requester?.username}</span></div><button className="friend-accept" onClick={()=>accept(r.id)} title="Kabul et"><Check size={16}/></button><button className="friend-reject" onClick={()=>remove(r.id)} title="Reddet"><X size={16}/></button></div>)}</section>
 <section className="social-card"><div className="social-card-head"><h2>Gönderilen istekler</h2><span>{outgoing.length}</span></div>{outgoing.length===0?<p className="social-empty">Gönderdiğin bekleyen istek yok.</p>:outgoing.map(r=><div className="friend-person" key={r.id}>{avatar(r.addressee)}<div className="friend-person-copy"><b>{person(r.addressee)}</b><span>İstek bekliyor</span></div><button className="friend-reject" onClick={()=>remove(r.id)} title="İsteği iptal et"><X size={16}/></button></div>)}</section></div>
 <section className="social-card friends-list-card"><div className="social-card-head"><h2>Arkadaş listen</h2><span>{friends.length+addedVirtual.length}</span></div>{friends.length===0&&addedVirtual.length===0?<p className="social-empty">Henüz arkadaşın yok. Yukarıdan oyuncu arayarak ilk isteğini gönder!</p>:<>{friends.map(p=><div className="friend-person" key={p.id}>{avatar(p)}<div className="friend-person-copy"><b>{person(p)}</b><span>@{p.username||"kullanici"}</span></div><button className="friend-reject" onClick={()=>remove(p.id)} title="Arkadaşlıktan çıkar"><X size={16}/></button></div>)}{virtualPlayers.filter(p=>addedVirtual.includes(p.key)).map(p=><div className="friend-person" key={p.key}><div className="friend-person-avatar"><span>{p.name.slice(0,1)}</span></div><div className="friend-person-copy"><b>{p.name}</b><span>@{p.handle} · Sanal profil</span></div><button className="friend-reject" onClick={()=>removeVirtual(p.key)} title="Arkadaşlıktan çıkar"><X size={16}/></button></div>)}</>}</section>
 </section></main>;
}
