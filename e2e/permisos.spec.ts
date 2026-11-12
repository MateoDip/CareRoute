import { expect, test, type APIRequestContext } from "@playwright/test";
import { sesionDe, URL_APP, type UsuarioDePrueba } from "./sesiones";

/**
 * Permisos (clase 13): la API contra el contrato, sin pantallas.
 *
 * Cada caso sale de la columna "Rol" de docs/api.md y de su matriz de permisos:
 * quién NO puede hacer algo y qué tiene que responder el servidor. El valor
 * esperado sale del contrato, no del código: "el código dice lo que hace; el
 * contrato dice lo que debería hacer".
 *
 *   401  sin sesión
 *   403  sesión válida, rol insuficiente (o sin centro asignado)
 *   404  recurso de otro centro: para quien pregunta, no existe
 *
 * Ningún caso escribe: todos esperan un rechazo. Los bodies son válidos a
 * propósito, para que el rechazo sea por el permiso y no por Zod (400).
 *
 * Datos del seed (prisma/seed.ts):
 *  - solicitud-pendiente-1: del HECA, sin destino.
 *  - solicitud-propuesta-1: del HECA, propuesta al Centenario (EVALUANDO).
 *  - solicitud-ok-1: del HECA, APROBADA por el Centenario.
 *  - solicitud-ajena-1: del Sanatorio sin camas (ni HECA ni Centenario).
 *  - unidad-origen-uti: UTI del HECA.
 */

type Quien = UsuarioDePrueba | "sinSesion" | "tokenFalso";
type Metodo = "GET" | "POST" | "PATCH" | "DELETE";

type Caso = {
  quien: Quien;
  metodo: Metodo;
  ruta: string;
  body?: Record<string, unknown>;
  status: 401 | 403 | 404;
  /** Por qué, en palabras del contrato. Es el nombre de la prueba. */
  porque: string;
};

const SIGNOS = { frecuenciaCardiaca: 90, presionSistolica: 120, presionDiastolica: 80, nivelUrgenciaSugerido: "MEDIO" };
const CENTRO = { nombre: "Centro de prueba", nivelComplejidad: "MEDIA", ubicacion: "Calle de prueba 123" };

/** Agrupados por fila de la tabla de endpoints de docs/api.md. */
const CONTRATO: Record<string, Caso[]> = {
  "GET /api/solicitudes — médico con centro": [
    { quien: "sinSesion", metodo: "GET", ruta: "/api/solicitudes", status: 401, porque: "sin sesión" },
    { quien: "admin", metodo: "GET", ruta: "/api/solicitudes", status: 403, porque: "el admin no participa del flujo clínico" },
    { quien: "sinCentro", metodo: "GET", ruta: "/api/solicitudes", status: 403, porque: "un médico recién llegado no tiene centro (regla 4)" },
  ],
  "POST /api/solicitudes — solo MEDICO_DERIVANTE": [
    { quien: "sinSesion", metodo: "POST", ruta: "/api/solicitudes", body: { pacienteDni: "20111222" }, status: 401, porque: "sin sesión" },
    { quien: "receptor", metodo: "POST", ruta: "/api/solicitudes", body: { pacienteDni: "20111222" }, status: 403, porque: "el receptor no inicia derivaciones" },
    { quien: "admin", metodo: "POST", ruta: "/api/solicitudes", body: { pacienteDni: "20111222" }, status: 403, porque: "el admin no inicia derivaciones" },
    { quien: "sinCentro", metodo: "POST", ruta: "/api/solicitudes", body: { pacienteDni: "20111222" }, status: 403, porque: "sin centro no se deriva en nombre de nadie" },
  ],
  "GET /api/solicitudes/:id — médico del centro de origen o destino": [
    { quien: "derivante", metodo: "GET", ruta: "/api/solicitudes/solicitud-ajena-1", status: 404, porque: "la solicitud es de otro centro" },
    { quien: "receptor", metodo: "GET", ruta: "/api/solicitudes/solicitud-pendiente-1", status: 404, porque: "su centro no es origen ni destino" },
    { quien: "derivante", metodo: "GET", ruta: "/api/solicitudes/no-existe-123", status: 404, porque: "un id inventado responde igual que uno ajeno" },
    { quien: "admin", metodo: "GET", ruta: "/api/solicitudes/solicitud-ok-1", status: 403, porque: "el admin no ve datos clínicos" },
  ],
  "PATCH /api/solicitudes/:id — MEDICO_DERIVANTE del origen": [
    { quien: "receptor", metodo: "PATCH", ruta: "/api/solicitudes/solicitud-propuesta-1", body: { pacienteDni: "20111222" }, status: 403, porque: "el receptor no corrige el DNI" },
    { quien: "derivante", metodo: "PATCH", ruta: "/api/solicitudes/solicitud-ajena-1", body: { pacienteDni: "20111222" }, status: 404, porque: "no corrige solicitudes de otro centro" },
  ],
  "POST /api/solicitudes/:id/evaluacion — MEDICO_DERIVANTE del origen": [
    { quien: "receptor", metodo: "POST", ruta: "/api/solicitudes/solicitud-pendiente-1/evaluacion", body: SIGNOS, status: 403, porque: "el receptor no registra el triaje" },
    { quien: "derivante", metodo: "POST", ruta: "/api/solicitudes/solicitud-ajena-1/evaluacion", body: SIGNOS, status: 404, porque: "no evalúa pacientes de otro centro" },
  ],
  "GET /api/solicitudes/:id/candidatos — médico del origen o destino": [
    { quien: "derivante", metodo: "GET", ruta: "/api/solicitudes/solicitud-ajena-1/candidatos", status: 404, porque: "no ve el ranking de otro centro" },
    { quien: "sinSesion", metodo: "GET", ruta: "/api/solicitudes/solicitud-evaluada-1/candidatos", status: 401, porque: "sin sesión" },
  ],
  "POST /api/solicitudes/:id/destino — MEDICO_DERIVANTE del origen": [
    { quien: "receptor", metodo: "POST", ruta: "/api/solicitudes/solicitud-evaluada-1/destino", body: { centroDestinoId: "centro-destino-1" }, status: 403, porque: "el destino lo elige el derivante (ADR 0008)" },
    { quien: "derivante", metodo: "POST", ruta: "/api/solicitudes/solicitud-ajena-1/destino", body: { centroDestinoId: "centro-destino-1" }, status: 404, porque: "no elige destino para otro centro" },
  ],
  "POST /api/solicitudes/:id/aprobacion — MEDICO_RECEPTOR del destino": [
    { quien: "derivante", metodo: "POST", ruta: "/api/solicitudes/solicitud-propuesta-1/aprobacion", status: 403, porque: "el derivante no aprueba su propia derivación" },
    { quien: "receptor", metodo: "POST", ruta: "/api/solicitudes/solicitud-pendiente-1/aprobacion", status: 404, porque: "no aprueba lo que no le propusieron" },
    { quien: "admin", metodo: "POST", ruta: "/api/solicitudes/solicitud-propuesta-1/aprobacion", status: 403, porque: "el admin no aprueba derivaciones" },
  ],
  "POST /api/solicitudes/:id/rechazo — derivante (origen) o receptor (destino); una APROBADA, solo el receptor": [
    { quien: "derivante", metodo: "POST", ruta: "/api/solicitudes/solicitud-ok-1/rechazo", status: 403, porque: "una aprobada ya no la cancela el origen (regla 3)" },
    { quien: "receptor", metodo: "POST", ruta: "/api/solicitudes/solicitud-ajena-1/rechazo", status: 404, porque: "no rechaza solicitudes ajenas" },
    { quien: "admin", metodo: "POST", ruta: "/api/solicitudes/solicitud-propuesta-1/rechazo", status: 403, porque: "el admin no rechaza derivaciones" },
  ],
  "GET /api/solicitudes/:id/bitacora — médico del origen o destino": [
    { quien: "receptor", metodo: "GET", ruta: "/api/solicitudes/solicitud-ajena-1/bitacora", status: 404, porque: "no lee la bitácora de otro centro" },
  ],
  "GET /api/centros y /api/centros/:id — cualquier usuario logueado": [
    { quien: "sinSesion", metodo: "GET", ruta: "/api/centros", status: 401, porque: "sin sesión" },
    { quien: "sinSesion", metodo: "GET", ruta: "/api/centros/centro-destino-1", status: 401, porque: "sin sesión" },
  ],
  "POST, PATCH y DELETE /api/centros… — ADMIN": [
    { quien: "derivante", metodo: "POST", ruta: "/api/centros", body: CENTRO, status: 403, porque: "el derivante no da de alta centros" },
    { quien: "receptor", metodo: "PATCH", ruta: "/api/centros/centro-destino-1", body: { nombre: "Otro nombre" }, status: 403, porque: "el receptor no edita centros, ni el suyo" },
    { quien: "derivante", metodo: "DELETE", ruta: "/api/centros/centro-sin-camas-1", status: 403, porque: "el derivante no da de baja centros" },
  ],
  "PATCH /api/unidades/:id — MEDICO_RECEPTOR de ese centro, o ADMIN": [
    { quien: "derivante", metodo: "PATCH", ruta: "/api/unidades/unidad-destino-uti", body: { camasDisponibles: 9 }, status: 403, porque: "el derivante no cambia camas" },
    { quien: "receptor", metodo: "PATCH", ruta: "/api/unidades/unidad-origen-uti", body: { camasDisponibles: 9 }, status: 404, porque: "el receptor solo cambia las camas de su centro" },
  ],
  "GET /api/usuarios y PATCH /api/usuarios/:id — ADMIN": [
    { quien: "derivante", metodo: "GET", ruta: "/api/usuarios", status: 403, porque: "solo el admin ve usuarios" },
    { quien: "receptor", metodo: "PATCH", ruta: "/api/usuarios/cualquiera", body: { rol: "ADMIN" }, status: 403, porque: "solo el admin asigna rol y centro (regla 4)" },
  ],
  "La sesión la valida el servidor de Auth, no el cliente": [
    { quien: "tokenFalso", metodo: "GET", ruta: "/api/solicitudes", status: 401, porque: "un token firmado con otro secreto no es una sesión" },
  ],
};

const contextos = new Map<Quien, APIRequestContext>();

test.beforeAll(async ({ playwright }) => {
  const quienes: Quien[] = ["sinSesion", "tokenFalso", "derivante", "receptor", "admin", "sinCentro"];
  for (const quien of quienes) {
    const storageState =
      quien === "sinSesion"
        ? undefined
        : quien === "tokenFalso"
          ? sesionDe("derivante", "un-secreto-que-el-servidor-no-conoce")
          : sesionDe(quien);
    contextos.set(quien, await playwright.request.newContext({ baseURL: URL_APP, storageState }));
  }
});

test.afterAll(async () => {
  for (const contexto of contextos.values()) await contexto.dispose();
});

const NOMBRE: Record<Quien, string> = {
  sinSesion: "sin sesión",
  tokenFalso: "con un token falso",
  derivante: "el derivante del HECA",
  receptor: "la receptora del Centenario",
  admin: "el admin",
  sinCentro: "un médico sin centro",
};

for (const [fila, casos] of Object.entries(CONTRATO)) {
  test.describe(fila, () => {
    for (const caso of casos) {
      test(`${caso.metodo} ${caso.ruta} › ${NOMBRE[caso.quien]}: ${caso.status} (${caso.porque})`, async () => {
        const contexto = contextos.get(caso.quien);
        if (!contexto) throw new Error(`Falta el contexto de ${caso.quien}`);

        const respuesta = await contexto.fetch(caso.ruta, {
          method: caso.metodo,
          data: caso.body,
        });

        expect(respuesta.status()).toBe(caso.status);
        // Todo error tiene la forma { error: "<mensaje para la persona>" } (docs/api.md).
        const cuerpo: unknown = await respuesta.json();
        expect(cuerpo).toHaveProperty("error");
      });
    }
  });
}

/**
 * Las pantallas tienen la misma autorización, traducida a navegación
 * (AGENTS.md §2.5): sin sesión → /ingresar; otro rol u otro centro → 404.
 * Son las pruebas que la clase 12 pedía hacer a mano.
 */
test.describe("Pantallas — misma autorización que la API", () => {
  test("sin sesión, cualquier pantalla manda a /ingresar", async ({ page }) => {
    await page.goto("/solicitudes/solicitud-propuesta-1");
    await expect(page).toHaveURL(/\/ingresar$/);
    await expect(page.getByRole("button", { name: "Entrar con Google" })).toBeVisible();
  });

  test("la receptora no ve la solicitud PENDIENTE del HECA: 404, igual que un id inventado", async ({ browser }) => {
    const contexto = await browser.newContext({ storageState: sesionDe("receptor") });
    const pagina = await contexto.newPage();

    // Se mira lo que ve la persona y no el status: con loading.tsx la respuesta
    // empieza a enviarse antes de que la página llame a notFound().
    for (const ruta of ["/solicitudes/solicitud-pendiente-1", "/solicitudes/no-existe-123"]) {
      await pagina.goto(ruta);
      await expect(pagina.getByRole("heading", { name: "No encontramos esa solicitud" })).toBeVisible();
      await expect(pagina.getByText("99.000.010")).toHaveCount(0);
    }
    await contexto.close();
  });

  test("la pantalla de otro rol no existe: la receptora no puede iniciar solicitudes", async ({ browser }) => {
    const contexto = await browser.newContext({ storageState: sesionDe("receptor") });
    const pagina = await contexto.newPage();
    await pagina.goto("/solicitudes/nueva");
    await expect(pagina.getByRole("heading", { name: "No encontramos esa solicitud" })).toBeVisible();
    await expect(pagina.getByLabel("DNI del paciente")).toHaveCount(0);
    await contexto.close();
  });

  test("un médico sin centro ve /sin-acceso, no el listado", async ({ browser }) => {
    const contexto = await browser.newContext({ storageState: sesionDe("sinCentro") });
    const pagina = await contexto.newPage();
    await pagina.goto("/");
    await expect(pagina).toHaveURL(/\/sin-acceso$/);
    await expect(pagina.getByRole("heading", { name: "Tu cuenta todavía no puede operar" })).toBeVisible();
    await contexto.close();
  });
});
