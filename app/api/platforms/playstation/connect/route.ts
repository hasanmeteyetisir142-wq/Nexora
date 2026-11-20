import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devam etmek için giriş yapmalısın." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const onlineId = typeof body?.onlineId === "string" ? body.onlineId.trim() : "";
  if (!/^[A-Za-z][A-Za-z0-9_-]{2,15}$/.test(onlineId)) {
    return NextResponse.json({ error: "PSN Online ID 3-16 karakter olmalı; harfle başlamalı ve yalnızca harf, rakam, tire veya alt çizgi içermeli." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik. Daha sonra tekrar dene." }, { status: 500 });
  }

  const { data, error } = await admin.from("platform_accounts").upsert({
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
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu PSN Online ID başka bir Nexora hesabında kayıtlı." }, { status: 409 });
    }
    return NextResponse.json({ error: "PlayStation ID kaydedilemedi. Tekrar dene." }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}
