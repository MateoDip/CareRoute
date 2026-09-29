import { NextResponse } from "next/server";
import { crearClienteSupabase } from "@/lib/supabase-server";

/**
 * GET /auth/callback — vuelta del login con Google (Supabase Auth).
 *
 * Este endpoint es público a propósito: es el paso que CREA la sesión, así que
 * no puede exigirla. No devuelve datos: canjea el código por la cookie y
 * redirige a la home. El usuario en la tabla Usuario se crea en el primer
 * request autenticado (lib/auth.ts).
 */
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