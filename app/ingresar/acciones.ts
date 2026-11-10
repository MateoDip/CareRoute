"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteSupabase } from "@/lib/supabase-server";

/**
 * Entrar y salir de la sesión, como Server Actions (clase 8).
 *
 * Antes el login era una página entera con "use client" solo para llamar a
 * Supabase desde el navegador. Desde el servidor es lo mismo: Supabase devuelve
 * la URL de Google, el code verifier (PKCE) queda en una cookie y
 * /auth/callback lo canjea por la sesión. Así el único componente de cliente
 * del proyecto es el filtro del listado.
 */
export async function entrarConGoogle() {
  const origen = (await headers()).get("origin");
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origen}/auth/callback` },
  });

  if (error || !data.url) {
    console.error("entrarConGoogle", error?.message ?? "Supabase no devolvió la URL");
    redirect("/ingresar?error=1");
  }
  redirect(data.url);
}

export async function salir() {
  const supabase = await crearClienteSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("salir", error.message);
  redirect("/ingresar");
}
