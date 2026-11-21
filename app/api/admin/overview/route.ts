import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== "hasanmeteyetisir142@gmail.com") return null;
  return { supabase, user };
}

export async function GET() {
  const auth = await adminClient();
  if (!auth) return NextResponse.json({ error: "Yönetici erişimi gerekli." }, { status: 403 });
  const { data, error } = await auth.supabase.rpc("nexora_admin_overview");
  if (error) return NextResponse.json({ error: "Yönetim verileri alınamadı." }, { status: error.code === "42501" ? 403 : 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, private" } });
}

export async function DELETE(request: NextRequest) {
  const auth = await adminClient();
  if (!auth) return NextResponse.json({ error: "Yönetici erişimi gerekli." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const type = body?.type;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id || !["community_post", "activity_post", "community"].includes(type)) {
    return NextResponse.json({ error: "Geçersiz moderasyon isteği." }, { status: 400 });
  }
  const { data, error } = await auth.supabase.rpc("nexora_admin_delete_content", { p_type: type, p_id: id });
  if (error) return NextResponse.json({ error: error.code === "42501" ? "Yönetici erişimi gerekli." : "İçerik silinemedi." }, { status: error.code === "42501" ? 403 : 500 });
  if (!data?.success) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  return NextResponse.json({ success: true });
}
