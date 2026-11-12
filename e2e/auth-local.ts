import { createServer, type ServerResponse } from "node:http";
import { verificarToken } from "./jwt";

/**
 * Supabase Auth de pruebas (clase 13, ADR 0009). Lo levanta playwright.config.ts.
 *
 * Por qué existe: la app no valida la sesión por su cuenta. `getUser()`
 * (lib/auth.ts) le pregunta al servidor de Supabase Auth "¿de quién es este
 * token?". En las pruebas no hay Google ni proyecto de Supabase, así que este
 * servidor ocupa ese lugar y hace lo mismo que Supabase: verifica la firma y el
 * vencimiento del token y, si son válidos, devuelve el usuario.
 *
 * No es un usuario mágico ni un modo prueba: la app no tiene ningún `if` para
 * las pruebas y no conoce el secreto. Un token sin firma, con otra firma o
 * vencido recibe 401, y la app responde 401 o manda a /ingresar.
 *
 * Responde solo lo que la app usa:
 *  - GET  /auth/v1/user     quién es el dueño del token (getUser)
 *  - POST /auth/v1/logout   cerrar sesión (Salir)
 *  - GET  /auth/v1/health   para que Playwright sepa que ya arrancó
 * Cualquier otra ruta es 404. OPENAI_BASE_URL de .env.e2e apunta acá a propósito:
 * la IA "no responde" y el triaje recorre el caso de error de HU02.
 */

const secreto = process.env.E2E_JWT_SECRET;
const urlAuth = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!secreto || !urlAuth) {
  throw new Error("auth-local: faltan E2E_JWT_SECRET o NEXT_PUBLIC_SUPABASE_URL (.env.e2e).");
}
const secretoDePrueba: string = secreto;
const puerto = Number(new URL(urlAuth).port);

function responder(res: ServerResponse, status: number, cuerpo?: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(cuerpo === undefined ? undefined : JSON.stringify(cuerpo));
}

const servidor = createServer((req, res) => {
  const ruta = new URL(req.url ?? "/", "http://localhost").pathname;

  if (req.method === "GET" && ruta === "/auth/v1/health") {
    return responder(res, 200, { estado: "ok" });
  }

  if (req.method === "POST" && ruta === "/auth/v1/logout") {
    return responder(res, 204);
  }

  if (req.method === "GET" && ruta === "/auth/v1/user") {
    const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const usuario = verificarToken(token, secretoDePrueba, Math.floor(Date.now() / 1000));
    if (!usuario) {
      // Mismo formato de error que Supabase Auth.
      return responder(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    }
    return responder(res, 200, {
      id: usuario.sub,
      aud: "authenticated",
      role: "authenticated",
      email: usuario.email,
      app_metadata: { provider: "google" },
      user_metadata: { full_name: usuario.nombre },
      created_at: "2026-01-01T00:00:00Z",
    });
  }

  return responder(res, 404, { msg: "No existe" });
});

servidor.listen(puerto, "127.0.0.1", () => {
  process.stdout.write(`Auth local de pruebas escuchando en ${urlAuth}\n`);
});
