"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Check, LoaderCircle, Search, UserPlus, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile={id:string;username:string|null;display_name:string|null;avatar_url:string|null;bio?:string|null};
type Friendship={id:string;requester_id:string;addressee_id:string;status:string;requester?:Profile;addressee?:Profile};
const nexoraBots=[
 {name:"Nexora Rehberi",handle:"nexora_rehber",bio:"Nexora özelliklerini keşfetmene yardım eder.",role:"Yardım botu"},
 {name:"Takım Bulucu",handle:"takim_bulucu",bio:"Birlikte oynamak için oyun ve takım önerileri sunar.",role:"Oyun botu"},
 {name:"Etkinlik Asistanı",handle:"etkinlik_asistani",bio:"Topluluk etkinlikleri ve oyun geceleri için rehberlik eder.",role:"Etkinlik botu"},
 {name:"Güvenlik Rehberi",handle:"guvenlik_rehberi",bio:"Gizlilik ve hesap güvenliği konusunda ipuçları verir.",role:"Yardım botu"},
];

export default function FriendsPanel(){
 const supabase=useMemo(()=>createClient(),[]);
 const [uid,setUid]=useState("");
 const [query,setQuery]=useState("");
 const [results,setResults]=useState<Profile[]>([]);
 const [friends,setFriends]=useState<Profile[]>([]);
 const [incoming,setIncoming]=useState<Friendship[]>([]);
 const [outgoing,setOutgoing]=useState<Friendship[]>([]);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");

 async function load(id?:string){
  const me=id||uid;if(!me)return;
  const {data:rows}=await supabase.from("friendships").select("id,requester_id,addressee_id,status").or(`requester_id.eq.${me},addressee_id.eq.${me}`);
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
 <div className="friends-columns"><section className="social-card"><div className="social-card-head"><h2>Gelen istekler</h2><span>{incoming.length}</span></div>{incoming.length===0?<p className="social-empty">Bekleyen arkadaşlık isteğin yok.</p>:incoming.map(r=><div className="friend-person" key={r.id}>{avatar(r.requester)}<div className="friend-person-copy"><b>{person(r.requester)}</b><span>@{r.requester?.username}</span></div><button className="friend-accept" onClick={()=>accept(r.id)} title="Kabul et"><Check size={16}/></button><button className="friend-reject" onClick={()=>remove(r.id)} title="Reddet"><X size={16}/></button></div>)}</section>
 <section className="social-card"><div className="social-card-head"><h2>Gönderilen istekler</h2><span>{outgoing.length}</span></div>{outgoing.length===0?<p className="social-empty">Gönderdiğin bekleyen istek yok.</p>:outgoing.map(r=><div className="friend-person" key={r.id}>{avatar(r.addressee)}<div className="friend-person-copy"><b>{person(r.addressee)}</b><span>İstek bekliyor</span></div><button className="friend-reject" onClick={()=>remove(r.id)} title="İsteği iptal et"><X size={16}/></button></div>)}</section></div>
 <section className="social-card nexora-bots-card"><div className="social-card-head"><h2><Bot size={17}/> Nexora botları</h2><span>{nexoraBots.length} BOT</span></div><p className="social-empty">Bunlar Nexora içindeki yardımcı bot karakterleridir; gerçek kullanıcı veya arkadaş sayısına dahil değildir.</p><div className="nexora-bot-grid">{nexoraBots.map(bot=><article className="nexora-bot" key={bot.handle}><div className="nexora-bot-avatar"><Bot size={18}/></div><div className="nexora-bot-copy"><b>{bot.name}<span>BOT</span></b><small>@{bot.handle}</small><p>{bot.bio}</p><em>{bot.role}</em></div></article>)}</div></section>
 <section className="social-card friends-list-card"><div className="social-card-head"><h2>Arkadaş listen</h2><span>{friends.length}</span></div>{friends.length===0?<p className="social-empty">Henüz arkadaşın yok. Yukarıdan oyuncu arayarak ilk isteğini gönder!</p>:friends.map(p=><div className="friend-person" key={p.id}>{avatar(p)}<div className="friend-person-copy"><b>{person(p)}</b><span>@{p.username||"kullanici"}</span></div><button className="friend-reject" onClick={()=>remove(p.id)} title="Arkadaşlıktan çıkar"><X size={16}/></button></div>)}</section>
 </section></main>;
}
