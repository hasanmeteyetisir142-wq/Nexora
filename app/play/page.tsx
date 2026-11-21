"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceShell from "@/components/workspace-shell";
import { Activity, CalendarDays, Check, Clock3, Gamepad2, Gift, LoaderCircle, MessageSquare, Plus, RefreshCw, Send, Sparkles, Swords, Trophy, Users, X } from "lucide-react";

type Task = { id:string; task_key:string; title:string; description:string; reward_xp:number; active:boolean };
type Session = { id:string; host_id:string; game_name:string; platform:string; slots_total:number; starts_at:string; note:string; status:string; profiles?:{display_name:string|null;username:string|null} };
type EventItem = { id:string; creator_id:string; title:string; description:string; game_name:string; starts_at:string; max_players:number };
type SessionMember = { id:string; session_id:string; user_id:string; status:string; display_name?:string|null; username?:string|null };
type Post = { id:string; user_id:string; body:string; created_at:string; display_name?:string|null; username?:string|null };
type Score = { user_id:string; score:number };
type Wish = { id:string; game_name:string; platform:string };

const todayTR = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

type PlayTab = "tasks" | "sessions" | "mini" | "events" | "feed" | "wishlist";

export default function PlayHubPage({ initialTab = "tasks" }: { initialTab?: PlayTab }){
  const [activeTab] = useState<PlayTab>(initialTab);
  const supabase=useMemo(()=>createClient(),[]);
  const [uid,setUid]=useState("");
  const [tasks,setTasks]=useState<Task[]>([]);
  const [claimed,setClaimed]=useState<string[]>([]);
  const [xp,setXp]=useState(0);
  const [coins,setCoins]=useState(0);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [sessionMembers,setSessionMembers]=useState<SessionMember[]>([]);
  const [events,setEvents]=useState<EventItem[]>([]);
  const [eventMembers,setEventMembers]=useState<{event_id:string;user_id:string}[]>([]);
  const [posts,setPosts]=useState<Post[]>([]);
  const [wishes,setWishes]=useState<Wish[]>([]);
  const [scores,setScores]=useState<Score[]>([]);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [game,setGame]=useState<"idle"|"waiting"|"ready"|"done">("idle");
  const [reaction,setReaction]=useState<number|null>(null);
  const [lastScore,setLastScore]=useState<number|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [challengeId,setChallengeId]=useState<string|null>(null);
  const [sessionGame,setSessionGame]=useState("Minecraft");
  const [sessionPlatform,setSessionPlatform]=useState("PC");
  const [sessionSlots,setSessionSlots]=useState(4);
  const [sessionNote,setSessionNote]=useState("");
  const [postDraft,setPostDraft]=useState("");
  const [wishName,setWishName]=useState("");
  const [wishPlatform,setWishPlatform]=useState("Herhangi biri");
  const [eventTitle,setEventTitle]=useState("");
  const [eventGame,setEventGame]=useState("Minecraft");
  const [eventDate,setEventDate]=useState("");

  const load=useCallback(async(userId:string)=>{
    const day=todayTR();
    const [t,c,r,s,e,p,w,sc]=await Promise.all([
      supabase.from("nexora_daily_tasks").select("id,task_key,title,description,reward_xp,active").eq("active",true),
      supabase.from("nexora_task_claims").select("task_id").eq("user_id",userId).eq("claim_date",day),
      supabase.from("nexora_user_rewards").select("xp,coins").eq("user_id",userId).maybeSingle(),
      supabase.from("play_sessions").select("id,host_id,game_name,platform,slots_total,starts_at,note,status").eq("status","open").order("created_at",{ascending:false}).limit(30),
      supabase.from("nexora_events").select("id,creator_id,title,description,game_name,starts_at,max_players").gte("starts_at",new Date().toISOString()).order("starts_at").limit(20),
      supabase.from("activity_posts").select("id,user_id,body,created_at").order("created_at",{ascending:false}).limit(25),
      supabase.from("game_wishlist").select("id,game_name,platform").eq("user_id",userId).order("created_at",{ascending:false}),
      supabase.from("nexora_daily_game_scores").select("user_id,score").eq("game_date",day).order("score",{ascending:false}).limit(10)
    ]);
    const firstError=[t.error,c.error,r.error,s.error,e.error,p.error,w.error,sc.error].find(Boolean);
    if(firstError) setError(firstError.message);
    setTasks(t.data||[]);setClaimed((c.data||[]).map(x=>x.task_id));setXp(r.data?.xp||0);setCoins(r.data?.coins||0);
    const sessionRows=s.data||[];setSessions(sessionRows);
    const memberResult=sessionRows.length?await supabase.from("play_session_members").select("id,session_id,user_id,status").in("session_id",sessionRows.map(row=>row.id)):{data:[],error:null};
    if(memberResult.error)setError(memberResult.error.message);
    const memberRows=memberResult.data||[];
    if(memberRows.length){
      const {data:memberProfiles}=await supabase.from("profiles").select("id,display_name,username").in("id",[...new Set(memberRows.map(row=>row.user_id))]);
      setSessionMembers(memberRows.map(row=>{const profile=(memberProfiles||[]).find(person=>person.id===row.user_id);return {...row,display_name:profile?.display_name,username:profile?.username};}));
    }else setSessionMembers([]);
    const eventRows=e.data||[];setEvents(eventRows);
    const eventMemberResult=eventRows.length?await supabase.from("nexora_event_participants").select("event_id,user_id").in("event_id",eventRows.map(row=>row.id)):{data:[],error:null};
    if(eventMemberResult.error)setError(eventMemberResult.error.message);setEventMembers(eventMemberResult.data||[]);
    const postRows=p.data||[];
    if(postRows.length){
      const {data:postProfiles}=await supabase.from("profiles").select("id,display_name,username").in("id",[...new Set(postRows.map(row=>row.user_id))]);
      setPosts(postRows.map(row=>{const profile=(postProfiles||[]).find(person=>person.id===row.user_id);return {...row,display_name:profile?.display_name,username:profile?.username};}));
    }else setPosts([]);
    setWishes(w.data||[]);setScores(sc.data||[]);
  },[supabase]);

  useEffect(()=>{
    let alive=true;
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!alive)return;
      if(!user){window.location.href="/login";return;}
      setUid(user.id);void load(user.id);
    });
    return()=>{alive=false;if(timer.current)clearTimeout(timer.current);};
  },[supabase,load]);

  async function claim(task:Task){
    setBusy(true);setError("");setNotice("");
    const {data,error:e}=await supabase.rpc("nexora_claim_daily_task",{p_task_id:task.id});
    if(e)setError(e.message);
    else{setNotice(`+${data.xp_added} XP ve +${data.coins_added} Nexora Jetonu kazandın!`);if(uid)await load(uid);}
    setBusy(false);
  }
  async function createSession(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");setNotice("");
    const {error:e1}=await supabase.from("play_sessions").insert({host_id:uid,game_name:sessionGame.trim(),platform:sessionPlatform,slots_total:sessionSlots,note:sessionNote.trim(),starts_at:new Date().toISOString(),status:"open"});
    if(e1)setError(e1.message);else{setSessionNote("");setNotice("Oyun ilanı oluşturuldu.");if(uid)await load(uid);}
    setBusy(false);
  }
  async function reviewSessionRequest(memberId:string){
    setBusy(true);setError("");const {error:e}=await supabase.rpc("nexora_review_session_request",{p_member_id:memberId});
    if(e)setError(e.message);else{setNotice("Oyuncu ekibe kabul edildi.");if(uid)await load(uid);}
    setBusy(false);
  }
  async function joinSession(id:string){
    setBusy(true);setError("");const {error:e}=await supabase.from("play_session_members").insert({session_id:id,user_id:uid,status:"pending"});
    if(e)setError(e.code==="23505"?"Bu ilana zaten katılma isteği gönderdin.":e.message);else setNotice("Katılma isteğin ev sahibine gönderildi.");
    setBusy(false);
  }
  async function createPost(e:FormEvent){
    e.preventDefault();if(!postDraft.trim())return;setBusy(true);setError("");
    const {error:e1}=await supabase.from("activity_posts").insert({user_id:uid,body:postDraft.trim()});
    if(e1)setError(e1.message);else{setPostDraft("");setNotice("Oyuncu akışında paylaşıldı.");if(uid)await load(uid);}
    setBusy(false);
  }
  async function addWish(e:FormEvent){
    e.preventDefault();if(!wishName.trim())return;setBusy(true);setError("");
    const {error:e1}=await supabase.from("game_wishlist").insert({user_id:uid,game_name:wishName.trim(),platform:wishPlatform});
    if(e1)setError(e1.message);else{setWishName("");setNotice("Oyun istek listene eklendi.");if(uid)await load(uid);}
    setBusy(false);
  }
  async function removeWish(id:string){const {error:e}=await supabase.from("game_wishlist").delete().eq("id",id);if(e)setError(e.message);else if(uid)await load(uid);}
  async function createEvent(e:FormEvent){
    e.preventDefault();if(!eventTitle.trim()||!eventDate)return;setBusy(true);setError("");
    const {error:e1}=await supabase.from("nexora_events").insert({creator_id:uid,title:eventTitle.trim(),game_name:eventGame,starts_at:new Date(eventDate).toISOString(),max_players:16});
    if(e1)setError(e1.message);else{setEventTitle("");setNotice("Etkinlik oluşturuldu.");if(uid)await load(uid);}
    setBusy(false);
  }
  async function joinEvent(id:string){
    setBusy(true);const {error:e}=await supabase.rpc("nexora_join_event",{p_event_id:id});
    if(e)setError(e.message);else{setNotice("Etkinliğe katıldın.");if(uid)await load(uid);}
    setBusy(false);
  }
  function startGame(){
    if(timer.current)clearTimeout(timer.current);
    setReaction(null);setLastScore(null);setGame("waiting");
    timer.current=setTimeout(()=>{void (async()=>{const {data,error:e}=await supabase.rpc("nexora_start_reflex_challenge");if(e){setError(e.message);setGame("done");return;}setChallengeId(data);setGame("ready");})();},1800+Math.floor(Math.random()*2600));
  }
  async function hitGame(){
    if(game==="waiting"){if(timer.current)clearTimeout(timer.current);setGame("done");setReaction(-1);setError("Çok erken! Bir sonraki denemede yeşil ışığı bekle.");return;}
    if(game!=="ready")return;
    if(!challengeId){setError("Deneme doğrulanamadı. Yeniden başlat.");setGame("done");return;}
    setGame("done");setBusy(true);setError("");
    const {data,error:e}=await supabase.rpc("nexora_finish_reflex_challenge",{p_challenge_id:challengeId});
    setChallengeId(null);
    if(e)setError(e.message);else{setReaction(data.elapsed_ms);setLastScore(data.score);setNotice(`Tepki süren ${data.elapsed_ms} ms · ${data.score} puan kaydedildi.`);if(uid)await load(uid);}
    setBusy(false);
  }
  const claimedCount=claimed.length;
  const taskDone=(task:Task)=>claimed.includes(task.id);
  const rankName=(id:string)=>id===uid?"Sen":`Oyuncu ${id.slice(0,4)}`;

  return <WorkspaceShell><main className="content playhub">
    <div className="playhub-head"><div><div className="eyebrow"><Sparkles size={13}/> NEXORA OYUN MERKEZİ</div><h1>Her gün yeni bir macera.</h1><p className="subheading">Ekip bul, görevleri tamamla, XP kazan ve günün mini oyununda rekor kır.</p></div><div className="xp-pill"><Trophy size={18}/><span><b>{xp} XP</b><small>Oyuncu seviyesi puanın</small></span><span className="coin-count"><b>◈ {coins}</b><small>Nexora Jetonu</small></span></div></div>
    <nav className="playhub-tabs" aria-label="Oyun merkezi sekmeleri">
      <a className={activeTab==="tasks"?"active":""} href="/play/tasks">Günlük Görevler</a>
      <a className={activeTab==="sessions"?"active":""} href="/play/sessions">Birlikte Oyna</a>
      <a className={activeTab==="mini"?"active":""} href="/play/mini-games">Mini Oyunlar</a>
      <a className={activeTab==="events"?"active":""} href="/play/events">Etkinlikler</a>
      <a className={activeTab==="feed"?"active":""} href="/play/feed">Oyuncu Akışı</a>
      <a className={activeTab==="wishlist"?"active":""} href="/play/wishlist">İstek Listesi</a>
    </nav>
    {error&&<div className="hub-alert hub-error">{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
    {notice&&<div className="hub-alert hub-success">{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}

    {activeTab === "tasks" && (
    <section className="hub-section">
      <div className="hub-title"><div><span className="eyebrow">BUGÜNÜN HEDEFLERİ</span><h2><Gift size={20}/> Günlük görevler</h2></div><span className="hub-counter">{claimedCount}/{tasks.length} tamamlandı</span></div>
      <div className="hub-task-grid">{tasks.map(task=><article className={`hub-task ${taskDone(task)?"task-complete":""}`} key={task.id}><div className="hub-task-icon"><Check size={17}/></div><div className="hub-task-copy"><b>{task.title}</b><p>{task.description}</p><small>+{task.reward_xp} XP · +{Math.max(1,Math.floor(task.reward_xp/5))} Jeton</small></div><button disabled={busy||taskDone(task)} onClick={()=>void claim(task)}>{taskDone(task)?"Alındı":"Ödülü al"}</button></article>)}</div>
    </section>
    )}

    {activeTab === "sessions" && (
    <section className="hub-section">
      <div className="hub-title"><div><span className="eyebrow">EKİBİNİ KUR</span><h2><Users size={20}/> Birlikte Oyna</h2></div><span className="hub-counter">{sessions.length} açık ilan</span></div>
      <div className="hub-columns"><form className="hub-card hub-form" onSubmit={createSession}><h3><Plus size={17}/> Oyun ilanı oluştur</h3><label>Oyun<input value={sessionGame} onChange={e=>setSessionGame(e.target.value)} required maxLength={60}/></label><label>Platform<select value={sessionPlatform} onChange={e=>setSessionPlatform(e.target.value)}><option>PC</option><option>PlayStation</option><option>Xbox</option><option>Nintendo</option><option>Mobil</option><option>Çapraz platform</option></select></label><label>Toplam oyuncu<select value={sessionSlots} onChange={e=>setSessionSlots(Number(e.target.value))}>{[2,3,4,5,6,8,10,16].map(n=><option key={n} value={n}>{n} kişi</option>)}</select></label><label>Not (isteğe bağlı)<textarea value={sessionNote} onChange={e=>setSessionNote(e.target.value)} maxLength={240} placeholder="Nasıl bir ekip arıyorsun?"/></label><button className="hub-primary" disabled={busy}><Plus size={15}/> İlanı yayınla</button></form>
      <div className="hub-card"><div className="hub-card-heading"><h3><Swords size={17}/> Oyuncu arayanlar</h3><button onClick={()=>uid&&void load(uid)} aria-label="Yenile"><RefreshCw size={15}/></button></div>{sessions.length===0?<p className="hub-empty">Henüz açık ilan yok. İlk ekibi sen kur!</p>:<div className="hub-list">{sessions.map(s=><article className="hub-list-row" key={s.id}><div className="hub-game-badge"><Gamepad2 size={19}/></div><div className="hub-row-copy"><b>{s.game_name}</b><span>{s.platform} · {s.slots_total} kişilik ekip</span>{s.note&&<small>{s.note}</small>}</div>{s.host_id===uid?<div className="hub-session-host"><span className="hub-tag">{1+sessionMembers.filter(m=>m.session_id===s.id&&m.status==="accepted").length}/{s.slots_total} oyuncu</span>{sessionMembers.filter(m=>m.session_id===s.id&&m.status==="pending").map(m=><button className="hub-small-btn" key={m.id} disabled={busy||1+sessionMembers.filter(x=>x.session_id===s.id&&x.status==="accepted").length>=s.slots_total} onClick={()=>void reviewSessionRequest(m.id)}>{`Kabul et: ${m.display_name||m.username||"Oyuncu"}`}</button>)}</div>:(()=>{const mine=sessionMembers.find(m=>m.session_id===s.id&&m.user_id===uid);return mine?<span className="hub-tag">{mine.status==="accepted"?"Ekibe katıldın":"İstek gönderildi"}</span>:<button className="hub-small-btn" disabled={busy||1+sessionMembers.filter(m=>m.session_id===s.id&&m.status==="accepted").length>=s.slots_total} onClick={()=>void joinSession(s.id)}>Katıl</button>;})()}</article>)}</div>}</div></div>
    </section>
    )}

    {activeTab === "mini" && (
    <section className="hub-section">
      <div className="hub-title"><div><span className="eyebrow">HER GÜN DEĞİŞEN OYUN</span><h2><Activity size={20}/> Günün mini oyunu: Refleks</h2></div><span className="hub-counter">Günlük skor tablosu</span></div>
      <div className="hub-columns mini-columns"><div className="hub-card reflex-card"><div className={`reflex-light ${game}`}>{game==="idle"?"HAZIR MISIN?":game==="waiting"?"BEKLE...":game==="ready"?"ŞİMDİ TIKLA!":reaction===-1?"ERKEN TIKLADIN":"TAMAMLANDI"}</div><p>Başlat'a bas, ışığın yeşile dönmesini bekle ve mümkün olduğunca hızlı tıkla.</p><button className="hub-primary" disabled={busy||game==="waiting"} onClick={game==="ready"||game==="waiting"?hitGame:startGame}>{game==="ready"||game==="waiting"?"Işığa tıkla":game==="done"?"Tekrar oyna":"Oyunu başlat"}</button>{reaction!==null&&reaction>0&&<div className="reflex-result"><b>{reaction} ms</b><span>En iyi skorun: {lastScore} puan</span></div>}</div>
      <div className="hub-card"><div className="hub-card-heading"><h3><Trophy size={17}/> Bugünün liderleri</h3><span>İlk 10</span></div>{scores.length===0?<p className="hub-empty">Bugün henüz skor yok. İlk rekoru sen kır!</p>:<div className="hub-list">{scores.map((s,i)=><div className="hub-list-row score-row" key={s.user_id}><b className="score-rank">#{i+1}</b><span className="hub-row-copy">{rankName(s.user_id)}</span><strong>{s.score} puan</strong></div>)}</div>}</div></div>
    </section>
    )}

    {activeTab === "events" && (
    <section className="hub-section">
      <div className="hub-title"><div><span className="eyebrow">TOPLULUĞU CANLANDIR</span><h2><CalendarDays size={20}/> Etkinlikler ve turnuvalar</h2></div></div>
      <div className="hub-columns"><form className="hub-card hub-form" onSubmit={createEvent}><h3><Plus size={17}/> Etkinlik oluştur</h3><label>Etkinlik adı<input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} required maxLength={80} placeholder="Hafta sonu Minecraft buluşması"/></label><label>Oyun<input value={eventGame} onChange={e=>setEventGame(e.target.value)} required maxLength={60}/></label><label>Tarih ve saat<input type="datetime-local" value={eventDate} onChange={e=>setEventDate(e.target.value)} required min={new Date().toISOString().slice(0,16)}/></label><button className="hub-primary" disabled={busy}><CalendarDays size={15}/> Etkinliği yayınla</button></form>
      <div className="hub-card"><h3><CalendarDays size={17}/> Yaklaşan etkinlikler</h3>{events.length===0?<p className="hub-empty">Yaklaşan etkinlik yok. Bir tane düzenleyebilirsin!</p>:<div className="hub-list">{events.map(ev=><article className="hub-list-row" key={ev.id}><div className="hub-game-badge"><Trophy size={18}/></div><div className="hub-row-copy"><b>{ev.title}</b><span>{ev.game_name} · {eventMembers.filter(m=>m.event_id===ev.id).length}/{ev.max_players} kişi · {new Date(ev.starts_at).toLocaleString("tr-TR")}</span><small>{ev.description||"Topluluk etkinliği"}</small></div>{ev.creator_id===uid?<span className="hub-tag">Düzenleyici</span>:eventMembers.some(m=>m.event_id===ev.id&&m.user_id===uid)?<span className="hub-tag">Katıldın</span>:<button className="hub-small-btn" disabled={busy||eventMembers.filter(m=>m.event_id===ev.id).length>=ev.max_players} onClick={()=>void joinEvent(ev.id)}>Katıl</button>}</article>)}</div>}</div></div>
    </section>
    )}

    {activeTab === "feed" && (
    <section className="hub-section">
      <div className="hub-title"><div><span className="eyebrow">PAYLAŞ VE KEŞFET</span><h2><MessageSquare size={20}/> Oyuncu akışı</h2></div></div>
      <div className="hub-card"><form className="hub-post-form" onSubmit={createPost}><textarea value={postDraft} onChange={e=>setPostDraft(e.target.value)} maxLength={1000} placeholder="Bugün ne oynuyorsun? Bir şey paylaş..." required/><button className="hub-primary" disabled={busy||!postDraft.trim()}><Send size={15}/> Paylaş</button></form>{posts.length===0?<p className="hub-empty">Akışta henüz gönderi yok. İlk paylaşımı sen yap!</p>:<div className="hub-feed">{posts.map(p=><article key={p.id}><div className="hub-feed-avatar">{p.user_id===uid?"S":"N"}</div><div><b>{p.user_id===uid?"Sen":p.display_name||p.username||"Nexora oyuncusu"}</b><time>{new Date(p.created_at).toLocaleString("tr-TR")}</time><p>{p.body}</p></div></article>)}</div>}</div>
    </section>
    )}

    {activeTab === "wishlist" && (
    <section className="hub-section">
      <div className="hub-title"><div><span className="eyebrow">SONRA OYNAMAK İÇİN</span><h2><Gamepad2 size={20}/> Oyun istek listem</h2></div></div>
      <div className="hub-columns"><form className="hub-card hub-form" onSubmit={addWish}><h3><Plus size={17}/> Listeye oyun ekle</h3><label>Oyun adı<input value={wishName} onChange={e=>setWishName(e.target.value)} required maxLength={80} placeholder="Örn. Hades II"/></label><label>Platform<select value={wishPlatform} onChange={e=>setWishPlatform(e.target.value)}><option>Herhangi biri</option><option>PC</option><option>PlayStation</option><option>Xbox</option><option>Switch</option></select></label><button className="hub-primary" disabled={busy}><Plus size={15}/> Listeye ekle</button></form>
      <div className="hub-card"><h3><Gamepad2 size={17}/> Takip ettiğim oyunlar</h3>{wishes.length===0?<p className="hub-empty">İstek listen boş. Oynamak istediğin oyunları ekle.</p>:<div className="hub-list">{wishes.map(w=><div className="hub-list-row" key={w.id}><div className="hub-game-badge"><Gamepad2 size={18}/></div><div className="hub-row-copy"><b>{w.game_name}</b><span>{w.platform}</span></div><button className="hub-icon-btn" onClick={()=>void removeWish(w.id)} aria-label="Listeden çıkar"><X size={15}/></button></div>)}</div>}</div></div>
    </section>
    )}
    <p className="hub-footnote"><Clock3 size={13}/> Görevler ve günlük mini oyun Türkiye saatine göre her gün yenilenir. XP puanları Nexora içi sanal ödüldür; nakit para değildir.</p>
  </main></WorkspaceShell>;
}
