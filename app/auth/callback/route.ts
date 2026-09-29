import { NextResponse } from "next/server";
import { crearClienteSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await crearClienteSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("GET /auth/callback", error.message);
  }

  return NextResponse.redirect(origin);
}