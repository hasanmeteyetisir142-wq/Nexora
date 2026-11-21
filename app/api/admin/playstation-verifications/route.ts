import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireReviewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || user.email.toLowerCase() !== "hasanmeteyetisir142@gmail.com") return null;
  return supabase;
}

export async function GET() {
  const supabase = await requireReviewer();
  if (!supabase) return NextResponse.json({ error: "Bu sayfaya erişim yetkin yok." }, { status: 403 });
  const { data, error } = await supabase.rpc("nexora_admin_psn_requests");
  if (error) return NextResponse.json({ error: "Bekleyen doğrulamalar alınamadı." }, { status: error.code === "42501" ? 403 : 500 });
  return NextResponse.json({ requests: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const supabase = await requireReviewer();
  if (!supabase) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;
  if (!accountId || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Geçersiz inceleme isteği." }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("nexora_admin_review_psn", {
    account_id: accountId, decision, note,
  });
  if (error) return NextResponse.json({ error: error.code === "42501" ? "Bu işlem için yetkin yok." : "İnceleme sonucu kaydedilemedi." }, { status: error.code === "42501" ? 403 : 500 });
  return NextResponse.json(data || { success: true });
}
