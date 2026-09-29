import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase Auth también es un tercero (clase 7): sin timeout, si no responde, cada
 * request queda colgado en `getUser()`. Con timeout, `getUser()` devuelve error,
 * `getSesion` devuelve null y el handler corta en ≤ 5 s.
 */
const TIMEOUT_MS = 5_000;

function fetchConTimeout(
  recurso: Parameters<typeof fetch>[0],
  opciones?: Parameters<typeof fetch>[1],
) {
  const limite = AbortSignal.timeout(TIMEOUT_MS);
  const signal = opciones?.signal
    ? AbortSignal.any([opciones.signal, limite])
    : limite;
  return fetch(recurso, { ...opciones, signal });
}

export async function crearClienteSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchConTimeout },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
