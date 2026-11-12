import { cargarEntornoE2E, variable } from "./entorno";
import { firmarToken } from "./jwt";

/**
 * Sesiones de los usuarios de prueba (clase 13), sin Google.
 *
 * La prueba fabrica la cookie que dejaría Supabase después del login: un token
 * firmado con el secreto de pruebas (`E2E_JWT_SECRET`, solo en .env.e2e),
 * envuelto como lo guarda @supabase/ssr. La app la lee igual que en producción
 * y le pregunta al servidor de Auth (e2e/auth-local.ts) de quién es.
 *
 * El rol y el centro NO van en el token (ADR 0006): salen de la tabla Usuario,
 * que llena el seed con estos mismos mails (SEED_EMAIL_* de .env.e2e).
 */

const entorno = cargarEntornoE2E();

export const USUARIOS = {
  /** MEDICO_DERIVANTE del HECA (centro-origen-1). */
  derivante: {
    email: variable(entorno, "SEED_EMAIL_DERIVANTE"),
    nombre: "Dr. Pérez (Derivante HECA)",
  },
  /** MEDICO_RECEPTOR del Centenario (centro-destino-1). */
  receptor: {
    email: variable(entorno, "SEED_EMAIL_RECEPTOR"),
    nombre: "Dra. Gómez (Receptora Centenario)",
  },
  /** ADMIN, sin centro: configura el sistema, no deriva. */
  admin: {
    email: variable(entorno, "SEED_EMAIL_ADMIN"),
    nombre: "Admin de prueba",
  },
  /**
   * No está en el seed: en su primer request la app lo registra como
   * MEDICO_DERIVANTE sin centro (spec §6, regla 4), igual que a quien entra con
   * Google por primera vez.
   */
  sinCentro: {
    email: "recien-llegado@careroute.test",
    nombre: "Recién llegado",
  },
} as const;

export type UsuarioDePrueba = keyof typeof USUARIOS;

export const URL_APP = `http://127.0.0.1:${variable(entorno, "PUERTO_E2E")}`;

const UNA_HORA = 60 * 60;

/** El nombre que @supabase/ssr le da a la cookie: sb-<proyecto>-auth-token. */
function nombreCookie(): string {
  const host = new URL(variable(entorno, "NEXT_PUBLIC_SUPABASE_URL")).hostname;
  return `sb-${host.split(".")[0]}-auth-token`;
}

/**
 * El `storageState` de Playwright con la sesión del usuario: sirve para un
 * navegador (`browser.newContext`) y para la API (`request.newContext`).
 */
export function sesionDe(usuario: UsuarioDePrueba, secreto = variable(entorno, "E2E_JWT_SECRET")) {
  const { email, nombre } = USUARIOS[usuario];
  const vence = Math.floor(Date.now() / 1000) + UNA_HORA;
  const sub = `e2e-${usuario}`;
  const sesion = {
    access_token: firmarToken({ sub, email, nombre, exp: vence }, secreto),
    token_type: "bearer",
    expires_in: UNA_HORA,
    expires_at: vence,
    // No se usa: el token vence después de que termina la corrida.
    refresh_token: "sin-refresh-en-pruebas",
    user: { id: sub, email, aud: "authenticated", user_metadata: { full_name: nombre } },
  };

  return {
    cookies: [
      {
        name: nombreCookie(),
        // Mismo formato que escribe @supabase/ssr (cookieEncoding "base64url").
        value: `base64-${Buffer.from(JSON.stringify(sesion)).toString("base64url")}`,
        domain: new URL(URL_APP).hostname,
        path: "/",
        expires: vence,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}
