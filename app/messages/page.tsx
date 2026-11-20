"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, MessageCircle, Send, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [uid, setUid] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async (me: string, other: string) => {
    const { data, error: loadError } = await supabase.from("messages").select("id,sender_id,recipient_id,body,created_at")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
      .order("created_at", { ascending: true }).limit(150);
    if (loadError) setError(loadError.message);
    else setMessages((data || []) as Message[]);
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      if (!alive) return;
      setUid(user.id);
      const { data: rows, error: listError } = await supabase.from("friendships")
        .select("requester_id,addressee_id").eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      if (listError) setError(listError.message);
      const ids = [...new Set((rows || []).map((r: {requester_id:string;addressee_id:string}) => r.requester_id === user.id ? r.addressee_id : r.requester_id))];
      if (ids.length) {
        const { data: profiles, error: profileError } = await supabase.from("profiles")
          .select("id,username,display_name,avatar_url").in("id", ids).order("display_name");
        if (profileError) setError(profileError.message);
        if (alive) setPeople((profiles || []) as Person[]);
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [supabase]);

  useEffect(() => {
    if (!uid || !selected) { setMessages([]); return; }
    void loadMessages(uid, selected.id);
    const channel = supabase.channel(`dm-${[uid, selected.id].sort().join("-")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if ((m.sender_id === uid && m.recipient_id === selected.id) || (m.sender_id === selected.id && m.recipient_id === uid)) {
          setMessages(current => current.some(x => x.id === m.id) ? current : [...current, m]);
        }
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [uid, selected, supabase, loadMessages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    setSending(true); setError("");
    const body = draft.trim();
    const { data, error: sendError } = await supabase.from("messages")
      .insert({ sender_id: uid, recipient_id: selected.id, body }).select("id,sender_id,recipient_id,body,created_at").single();
    if (sendError) setError(sendError.message);
    else { setMessages(current => current.some(x => x.id === data.id) ? current : [...current, data as Message]); setDraft(""); }
    setSending(false);
  }

  const display = (p: Person) => p.display_name || p.username || "Oyuncu";
  return <main className="social-page">
    <header className="social-top"><Link href="/" className="social-back"><ArrowLeft size={17}/> Nexora'ya dön</Link><span>ÖZEL MESAJLAR</span></header>
    <section className="messages-wrap">
      <div className="social-heading"><div className="social-icon"><MessageCircle/></div><div><div className="social-eyebrow">EKİBİNLE İLETİŞİMDE KAL</div><h1>Mesajlar</h1><p>Yalnızca kabul ettiğin arkadaşlarınla özel sohbet et.</p></div></div>
      <div className="messages-layout">
        <aside className="social-card messages-people"><div className="social-card-head"><h2><Users size={17}/> Arkadaşların</h2><span>{people.length}</span></div>
          {loading ? <p className="social-empty"><LoaderCircle className="spin" size={17}/> Yükleniyor...</p> : people.length === 0 ? <p className="social-empty">Sohbet etmek için önce arkadaş ekle.</p> : people.map(person => <button key={person.id} className={`message-person ${selected?.id === person.id ? "selected" : ""}`} onClick={() => {setSelected(person);setError("");}}>
            <span className="friend-person-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : <span>{display(person).slice(0,1).toUpperCase()}</span>}</span><span className="message-person-copy"><b>{display(person)}</b><small>@{person.username || "oyuncu"}</small></span>
          </button>)}
        </aside>
        <section className="social-card messages-chat">
          {!selected ? <div className="messages-empty"><MessageCircle size={32}/><h2>Bir sohbet seç</h2><p>Soldan bir arkadaşını seçerek mesajlaşmaya başlayabilirsin.</p></div> : <>
            <div className="messages-chat-head"><span className="friend-person-avatar">{selected.avatar_url ? <img src={selected.avatar_url} alt=""/> : <span>{display(selected).slice(0,1).toUpperCase()}</span>}</span><div><b>{display(selected)}</b><small>@{selected.username || "oyuncu"}</small></div></div>
            <div className="messages-stream">{messages.length === 0 ? <p className="social-empty">Henüz mesaj yok. İlk mesajı sen gönder!</p> : messages.map(m => <div key={m.id} className={`message-bubble ${m.sender_id === uid ? "mine" : ""}`}><p>{m.body}</p><time>{new Date(m.created_at).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</time></div>)}</div>
            <form className="messages-compose" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} placeholder="Bir mesaj yaz..." aria-label="Mesajın" /><button type="submit" disabled={sending || !draft.trim()}>{sending ? <LoaderCircle className="spin" size={17}/> : <Send size={17}/>} Gönder</button></form>
          </>}
          {error && <div className="social-alert error">{error}</div>}
        </section>
      </div>
    </section>
  </main>;
}
