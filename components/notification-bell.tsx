"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
type Notice={id:string;kind:string;title:string;body:string;href:string;read_at:string|null;created_at:string};
export default function NotificationBell(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<Notice[]>([]);
 const [open,setOpen]=useState(false);
 const [uid,setUid]=useState("");
 const [error,setError]=useState("");
 const load=useCallback(async(id:string)=>{const {data,error:e}=await supabase.from("notifications").select("id,kind,title,body,href,read_at,created_at").eq("recipient_id",id).order("created_at",{ascending:false}).limit(25);if(e)setError(e.message);else setRows((data||[]) as Notice[]);},[supabase]);
 useEffect(()=>{let active=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user||!active)return;setUid(user.id);await load(user.id);const channel=supabase.channel("user-notifications-"+user.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"recipient_id=eq."+user.id},payload=>setRows(old=>[payload.new as Notice,...old].slice(0,25))).subscribe();return channel;})().then(channel=>{if(!channel)return; if(!active)void supabase.removeChannel(channel);});return()=>{active=false;};},[supabase,load]);
 const unread=rows.filter(n=>!n.read_at).length;
 async function markRead(n:Notice){if(!uid)return;if(!n.read_at){const now=new Date().toISOString();const {error:e}=await supabase.from("notifications").update({read_at:now}).eq("id",n.id).eq("recipient_id",uid);if(e){setError(e.message);return;}setRows(old=>old.map(x=>x.id===n.id?{...x,read_at:now}:x));}}
 async function markAll(){if(!uid||!unread)return;const now=new Date().toISOString();const {error:e}=await supabase.from("notifications").update({read_at:now}).eq("recipient_id",uid).is("read_at",null);if(e)setError(e.message);else setRows(old=>old.map(x=>({...x,read_at:x.read_at||now})));}
 return <div className="notification-wrap"><button className="icon-btn notification" aria-label="Bildirimler" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Bell size={18}/>{unread>0&&<i/>}</button>{open&&<div className="notification-popover"><div className="notification-head"><b>Bildirimler {unread>0&&<small>{unread} yeni</small>}</b><button onClick={markAll} disabled={!unread}><CheckCheck size={15}/> Tümünü okundu yap</button></div>{error&&<p className="social-alert error">{error}</p>}{rows.length===0?<p className="notification-empty">Henüz bildirimin yok.</p>:rows.map(n=><Link key={n.id} href={n.href||"/notifications"} onClick={()=>{void markRead(n);setOpen(false);}} className={`notification-item ${n.read_at?"":"unread"}`}><span className="notification-dot"/><span><b>{n.title}</b><small>{n.body}</small><time>{new Date(n.created_at).toLocaleString("tr-TR",{dateStyle:"short",timeStyle:"short"})}</time></span></Link>)}</div>}</div>;
}