import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });

  const { data: account, error } = await supabase.from("platform_accounts")
    .select("platform_user_id,verification_code,verification_expires_at,verified_at")
    .eq("user_id", user.id).eq("platform", "playstation").maybeSingle();
  if (error) return NextResponse.json({ error: "PSN bağlantısı okunamadı." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Önce PSN Online ID'ni kaydet." }, { status: 404 });
  if (account.verified_at) return NextResponse.json({ verified: true, message: "PSN hesabın zaten doğrulanmış." });
  if (!account.verification_code || !account.verification_expires_at) {
    return NextResponse.json({ error: "Önce yeni bir doğrulama kodu oluştur." }, { status: 400 });
  }
  if (new Date(account.verification_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Doğrulama kodunun süresi dolmuş. Yeni kod oluştur." }, { status: 410 });
  }

  const url = new URL(`https://us-prof.np.community.playstation.net/userProfile/v1/users/${encodeURIComponent(account.platform_user_id)}/profile2`);
  url.searchParams.set("fields", "onlineId,aboutMe,accountId,avatarUrls");
  let profile: any;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Nexora-PSN-Verification/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: response.status === 404 ? "PSN profili bulunamadı veya gizlilik ayarları nedeniyle okunamıyor." : "PlayStation profil servisi şu anda doğrulamaya izin vermiyor. Biraz sonra tekrar dene." }, { status: 502 });
    }
    profile = await response.json();
  } catch {
    return NextResponse.json({ error: "PlayStation profil servisine şu anda ulaşılamıyor. Kodun silinmedi; biraz sonra tekrar dene." }, { status: 502 });
  }

  const candidates = [profile, profile?.profile, profile?.information, profile?.Information, profile?.profile?.profile].filter(Boolean);
  const found = candidates.find((item: any) => typeof item?.aboutMe === "string");
  const aboutMe = found?.aboutMe ?? "";
  const returnedId = found?.onlineId ?? profile?.onlineId ?? profile?.profile?.onlineId;
  if (!returnedId) {
    return NextResponse.json({ error: "PlayStation profili doğrulanabilir Online ID bilgisi döndürmedi. Profil gizlilik ayarlarını kontrol et." }, { status: 502 });
  }
  if (String(returnedId).toLowerCase() !== account.platform_user_id.toLowerCase()) {
    return NextResponse.json({ error: "PSN servisinden farklı bir hesap döndü. Güvenlik için doğrulama durduruldu." }, { status: 409 });
  }
  if (typeof aboutMe !== "string" || !aboutMe.toUpperCase().includes(account.verification_code.toUpperCase())) {
    return NextResponse.json({ error: "Kod PSN Hakkımda alanında bulunamadı. Alanı kaydettiğinden emin ol ve tekrar dene." }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("platform_accounts").update({
    verified_at: new Date().toISOString(),
    verification_code: null,
    verification_expires_at: null,
    psn_about_me: aboutMe.slice(0, 1000),
    avatar_url: found?.avatarUrls?.[0]?.avatarUrl ?? found?.avatarUrl ?? null,
    profile_url: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("platform", "playstation");
  if (updateError) return NextResponse.json({ error: "Kod doğru ancak doğrulama durumu kaydedilemedi. Tekrar dene." }, { status: 500 });
  return NextResponse.json({ verified: true, online_id: account.platform_user_id, message: "PSN hesabının sana ait olduğu doğrulandı." }, { headers: { "Cache-Control": "no-store" } });
}
