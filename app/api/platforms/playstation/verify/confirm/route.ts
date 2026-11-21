import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const profileUrl = typeof body?.profileUrl === "string" ? body.profileUrl.trim() : "";
  let parsedUrl: URL;
  try { parsedUrl = new URL(profileUrl); } catch {
    return NextResponse.json({ error: "Geçerli bir PlayStation profil bağlantısı gir." }, { status: 400 });
  }
  const allowedHosts = new Set(["my.playstation.com", "www.playstation.com", "playstation.com"]);
  if (parsedUrl.protocol !== "https:" || !allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
    return NextResponse.json({ error: "Güvenlik için yalnızca resmi PlayStation profil bağlantısı kabul edilir." }, { status: 400 });
  }

  const { data: account, error } = await supabase.from("platform_accounts")
    .select("platform_user_id,verification_code,verification_expires_at,verified_at,verification_status")
    .eq("user_id", user.id).eq("platform", "playstation").maybeSingle();
  if (error) return NextResponse.json({ error: "PSN bağlantısı okunamadı." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Önce PSN Online ID'ni kaydet." }, { status: 404 });
  if (account.verified_at || account.verification_status === "verified") {
    return NextResponse.json({ verified: true, message: "PSN hesabın zaten doğrulanmış." });
  }
  if (!account.verification_code || !account.verification_expires_at) {
    return NextResponse.json({ error: "Önce yeni bir doğrulama kodu oluştur." }, { status: 400 });
  }
  if (new Date(account.verification_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Doğrulama kodunun süresi dolmuş. Yeni kod oluştur." }, { status: 410 });
  }

  const { error: updateError } = await supabase.from("platform_accounts").update({
    verification_status: "pending",
    verification_profile_url: parsedUrl.toString(),
    verification_submitted_at: new Date().toISOString(),
    verification_reviewed_at: null,
    verification_review_note: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("platform", "playstation");

  if (updateError) return NextResponse.json({ error: "Doğrulama isteği kaydedilemedi. Tekrar dene." }, { status: 500 });
  return NextResponse.json({
    submitted: true,
    status: "pending",
    message: "Doğrulama isteğin incelemeye gönderildi. Yetkili kişi resmi PSN profilini ve Hakkımda alanındaki kodu kontrol edecek.",
  }, { headers: { "Cache-Control": "no-store" } });
}
