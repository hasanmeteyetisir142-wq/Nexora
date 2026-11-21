"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Users, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Participant = { user_id: string; media_mode: "audio" | "video" };
type Signal = { id: string; community_id: string; from_user: string; to_user: string; signal_type: "offer" | "answer" | "ice" | "hangup"; payload: any };

export default function CommunityCall({ communityId, userId }: { communityId: string; userId: string }) {
  const supabase = useRef(createClient()).current;
  const [joined, setJoined] = useState(false);
  const [mode, setMode] = useState<"audio" | "video">("audio");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState("");
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channel = useRef<any>(null);
  const joinedRef = useRef(false);

  const sendSignal = useCallback(async (to: string, type: Signal["signal_type"], payload: any = null) => {
    const { error: e } = await supabase.from("community_call_signals").insert({
      community_id: communityId, from_user: userId, to_user: to, signal_type: type, payload
    });
    if (e) setError("Bağlantı sinyali gönderilemedi: " + e.message);
  }, [communityId, userId, supabase]);

  const closePeer = useCallback((peerId: string) => {
    const pc = peers.current.get(peerId);
    if (pc) pc.close();
    peers.current.delete(peerId);
    setRemoteStreams(old => { const next = { ...old }; delete next[peerId]; return next; });
  }, []);

  const makePeer = useCallback((peerId: string) => {
    const existing = peers.current.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]
    });
    peers.current.set(peerId, pc);
    localStream.current?.getTracks().forEach(track => pc.addTrack(track, localStream.current!));
    pc.onicecandidate = event => { if (event.candidate) void sendSignal(peerId, "ice", event.candidate.toJSON()); };
    pc.ontrack = event => {
      const stream = event.streams[0];
      if (stream) setRemoteStreams(old => ({ ...old, [peerId]: stream }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") closePeer(peerId);
    };
    return pc;
  }, [closePeer, sendSignal]);

  const startOffer = useCallback(async (peerId: string) => {
    if (userId.localeCompare(peerId) >= 0 || peers.current.has(peerId) || !joinedRef.current) return;
    const pc = makePeer(peerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(peerId, "offer", offer);
    } catch { setError("Görüşme bağlantısı kurulamadı."); }
  }, [makePeer, sendSignal, userId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("community_call_participants").select("user_id,media_mode").eq("community_id", communityId);
      setParticipants((data || []) as Participant[]);
    };
    void load();
    const ch = supabase.channel("community-call-" + communityId)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_call_participants", filter: "community_id=eq." + communityId }, payload => {
        if (payload.eventType === "DELETE") setParticipants(old => old.filter(p => p.user_id !== payload.old.user_id));
        else {
          const row = payload.new as Participant;
          setParticipants(old => [...old.filter(p => p.user_id !== row.user_id), row]);
          if (joinedRef.current && row.user_id !== userId) void startOffer(row.user_id);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_call_signals", filter: "to_user=eq." + userId }, async payload => {
        const signal = payload.new as Signal;
        if (signal.community_id !== communityId || signal.from_user === userId) return;
        if (signal.signal_type === "hangup") { closePeer(signal.from_user); return; }
        const pc = makePeer(signal.from_user);
        try {
          if (signal.signal_type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal(signal.from_user, "answer", answer);
          } else if (signal.signal_type === "answer") {
            if (pc.signalingState === "have-local-offer") await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          } else if (signal.signal_type === "ice" && signal.payload) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          }
        } catch { setError("Görüşme bağlantısında bir sorun oluştu."); }
        void supabase.from("community_call_signals").delete().eq("id", signal.id);
      })
      .subscribe();
    channel.current = ch;
    return () => {
      joinedRef.current = false;
      void supabase.removeChannel(ch);
      peers.current.forEach(pc => pc.close()); peers.current.clear();
      localStream.current?.getTracks().forEach(track => track.stop());
    };
  }, [communityId, closePeer, makePeer, sendSignal, startOffer, supabase, userId]);

  async function joinCall(nextMode: "audio" | "video") {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Mikrofon/kamera için HTTPS bağlantısı ve tarayıcı izni gerekiyor.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: nextMode === "video" });
      localStream.current = stream; setMode(nextMode); joinedRef.current = true; setJoined(true);
      const { error: e } = await supabase.from("community_call_participants").upsert({ community_id: communityId, user_id: userId, media_mode: nextMode });
      if (e) throw e;
      const { data } = await supabase.from("community_call_participants").select("user_id").eq("community_id", communityId).neq("user_id", userId);
      for (const p of data || []) await startOffer(p.user_id);
    } catch (e: any) {
      localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null; joinedRef.current = false; setJoined(false);
      setError(e?.message || "Mikrofon veya kamera açılamadı.");
    }
  }

  async function leaveCall() {
    joinedRef.current = false;
    for (const peerId of peers.current.keys()) { await sendSignal(peerId, "hangup"); closePeer(peerId); }
    await supabase.from("community_call_participants").delete().eq("community_id", communityId).eq("user_id", userId);
    localStream.current?.getTracks().forEach(track => track.stop()); localStream.current = null;
    setJoined(false); setRemoteStreams({});
  }

  function toggleMic() {
    const next = !muted; localStream.current?.getAudioTracks().forEach(t => { t.enabled = !next; }); setMuted(next);
  }
  function toggleCamera() {
    const next = !cameraOff; localStream.current?.getVideoTracks().forEach(t => { t.enabled = !next; }); setCameraOff(next);
  }

  return <section className="social-card community-call">
    <div className="social-card-head"><h2><Video size={17}/> Sesli ve görüntülü sohbet</h2><span><Users size={14}/> {participants.length} kişi</span></div>
    <p className="social-empty">Topluluk üyeleriyle canlı görüş. Tarayıcı mikrofon/kamera izni isteyebilir.</p>
    <div className="community-call-actions">
      {!joined ? <><button className="friend-action" onClick={() => void joinCall("audio")}><Phone size={15}/> Sesli katıl</button><button className="friend-action" onClick={() => void joinCall("video")}><Video size={15}/> Görüntülü katıl</button></> : <>
        <button className="friend-action" onClick={toggleMic}>{muted ? <MicOff size={15}/> : <Mic size={15}/>} {muted ? "Mikrofonu aç" : "Mikrofonu kapat"}</button>
        {mode === "video" && <button className="friend-action" onClick={toggleCamera}>{cameraOff ? <CameraOff size={15}/> : <Camera size={15}/>} {cameraOff ? "Kamerayı aç" : "Kamerayı kapat"}</button>}
        <button className="friend-action danger" onClick={() => void leaveCall()}><PhoneOff size={15}/> Ayrıl</button>
      </>}
    </div>
    {joined && localStream.current && <video className="community-call-video" autoPlay muted playsInline ref={el => { if (el && localStream.current && el.srcObject !== localStream.current) el.srcObject = localStream.current; }} />}
    <div className="community-call-grid">{Object.entries(remoteStreams).map(([id, stream]) => <video key={id} className="community-call-video" autoPlay playsInline ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream; }} />)}</div>
    {error && <p className="social-alert error">{error}</p>}
    {participants.length > 0 && <div className="community-call-members">{participants.map(p => <span key={p.user_id}>{p.user_id === userId ? "Sen" : "Topluluk üyesi"} · {p.media_mode === "video" ? "Görüntülü" : "Sesli"}</span>)}</div>}
  </section>;
}
