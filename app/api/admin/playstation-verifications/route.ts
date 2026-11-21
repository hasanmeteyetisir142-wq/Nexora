import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireReviewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.NEXORA_ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) return null;
  return user;
}

export async function GET() {
  const reviewer = await requireReviewer();
  if (!reviewer) return NextResponse.json({ error: "Bu sayfaya erişim yetkin yok." }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("platform_accounts")
    .select("id,user_id,platform_user_id,verification_code,verification_expires_at,verification_profile_url,verification_submitted_at,verification_status")
    .eq("platform", "playstation").eq("verification_status", "pending")
    .order("verification_submitted_at", { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: "Bekleyen doğrulamalar alınamadı." }, { status: 500 });
  return NextResponse.json({ requests: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const reviewer = await requireReviewer();
  if (!reviewer) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;
  if (!accountId || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Geçersiz inceleme isteği." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: account, error: readError } = await admin.from("platform_accounts")
    .select("id,verification_status").eq("id", accountId).eq("platform", "playstation").maybeSingle();
  if (readError || !account) return NextResponse.json({ error: "Doğrulama kaydı bulunamadı." }, { status: 404 });
  if (account.verification_status !== "pending") return NextResponse.json({ error: "Bu istek daha önce incelenmiş." }, { status: 409 });

  const now = new Date().toISOString();
  const approved = decision === "approve";
  const { error: updateError } = await admin.from("platform_accounts").update({
    verification_status: approved ? "verified" : "rejected",
    verified_at: approved ? now : null,
    verification_reviewed_at: now,
    verification_review_note: note,
    verification_code: null,
    verification_expires_at: null,
    updated_at: now,
  }).eq("id", accountId).eq("verification_status", "pending");
  if (updateError) return NextResponse.json({ error: "İnceleme sonucu kaydedilemedi." }, { status: 500 });
  return NextResponse.json({ success: true, status: approved ? "verified" : "rejected" });
}
