import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });

  const { data: account, error } = await supabase.from("platform_accounts")
    .select("platform_user_id,verified_at")
    .eq("user_id", user.id).eq("platform", "playstation").maybeSingle();
  if (error) return NextResponse.json({ error: "PSN bağlantısı okunamadı." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Önce PSN Online ID'ni kaydet." }, { status: 404 });
  if (account.verified_at) return NextResponse.json({ verified: true, message: "Bu PSN hesabı zaten doğrulanmış." });

  const code = "NEXORA-" + randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { error: saveError } = await supabase.from("platform_accounts").update({
    verification_code: code,
    verification_expires_at: expiresAt,
    psn_about_me: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("platform", "playstation");

  if (saveError) return NextResponse.json({ error: "Doğrulama kodu oluşturulamadı." }, { status: 500 });
  return NextResponse.json({
    code,
    online_id: account.platform_user_id,
    expires_at: expiresAt,
    instructions: "PlayStation hesabında Profil > Profili Düzenle > Hakkımda alanına bu kodu ekle. Kaydettikten sonra Nexora'ya dönüp doğrula.",
  }, { headers: { "Cache-Control": "no-store" } });
}
