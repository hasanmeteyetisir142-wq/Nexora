import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Devam etmek için giriş yapmalısın." }, { status: 401 });

    const body = await request.json().catch(() => null);
    const onlineId = typeof body?.onlineId === "string" ? body.onlineId.trim() : "";
    if (!/^[A-Za-z][A-Za-z0-9_-]{2,15}$/.test(onlineId)) {
      return NextResponse.json({ error: "PSN Online ID 3-16 karakter olmalı; harfle başlamalı ve yalnızca harf, rakam, tire veya alt çizgi içermeli." }, { status: 400 });
    }

    const { data, error } = await supabase.from("platform_accounts").upsert({
      user_id: user.id,
      platform: "playstation",
      platform_user_id: onlineId,
      display_name: onlineId,
      avatar_url: null,
      profile_url: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform" })
      .select("id,platform_user_id,display_name,avatar_url,profile_url")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Bu PSN Online ID zaten başka bir Nexora hesabında kayıtlı. Hesap sahipliği doğrulanamadığı için farklı bir ID kullan." }, { status: 409 });
      console.error("PSN ID save failed:", error.message);
      return NextResponse.json({ error: "PlayStation ID kaydedilemedi. Sunucu veritabanı hatası." }, { status: 500 });
    }
    return NextResponse.json({ account: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("PSN connect route failed:", error);
    return NextResponse.json({ error: "PlayStation bağlantı servisi şu anda hata verdi. Biraz sonra tekrar dene." }, { status: 500 });
  }
}
