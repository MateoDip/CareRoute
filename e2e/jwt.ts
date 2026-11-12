import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens de sesión de prueba, firmados con HS256 (el algoritmo de los proyectos
 * de Supabase con secreto compartido).
 *
 * Lo usan las dos puntas de la prueba: e2e/sesiones.ts firma el token de cada
 * usuario de prueba y e2e/auth-local.ts verifica la firma antes de responder
 * quién es. Un token firmado con otro secreto, o vencido, no pasa.
 */

export type ClaimsDeSesion = {
  sub: string;
  email: string;
  nombre: string;
  /** Vencimiento, en segundos desde 1970 (estándar JWT). */
  exp: number;
};

function base64url(texto: string | Buffer): string {
  return Buffer.from(texto).toString("base64url");
}

function firma(contenido: string, secreto: string): string {
  return createHmac("sha256", secreto).update(contenido).digest("base64url");
}

export function firmarToken(claims: ClaimsDeSesion, secreto: string): string {
  const encabezado = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      sub: claims.sub,
      email: claims.email,
      exp: claims.exp,
      aud: "authenticated",
      role: "authenticated",
      user_metadata: { full_name: claims.nombre },
    }),
  );
  return `${encabezado}.${cuerpo}.${firma(`${encabezado}.${cuerpo}`, secreto)}`;
}

function esClaims(valor: unknown): valor is ClaimsDeSesion & {
  user_metadata?: { full_name?: unknown };
} {
  if (typeof valor !== "object" || valor === null) return false;
  const { sub, email, exp } = valor as Record<string, unknown>;
  return typeof sub === "string" && typeof email === "string" && typeof exp === "number";
}

/** Los datos del token si la firma es válida y no venció; null en cualquier otro caso. */
export function verificarToken(
  token: string,
  secreto: string,
  ahoraEnSegundos: number,
): { sub: string; email: string; nombre: string } | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [encabezado, cuerpo, firmaRecibida] = partes as [string, string, string];

  const esperada = Buffer.from(firma(`${encabezado}.${cuerpo}`, secreto));
  const recibida = Buffer.from(firmaRecibida);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return null;
  }

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!esClaims(claims) || claims.exp <= ahoraEnSegundos) return null;

  const nombre = claims.user_metadata?.full_name;
  return {
    sub: claims.sub,
    email: claims.email,
    nombre: typeof nombre === "string" ? nombre : claims.email,
  };
}
