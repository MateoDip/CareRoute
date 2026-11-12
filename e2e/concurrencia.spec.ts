import { expect, test, type APIRequestContext } from "@playwright/test";
import type { PrismaClient } from "@prisma/client";
import { baseDePruebas } from "./base";
import { sesionDe, URL_APP } from "./sesiones";

/**
 * Concurrencia (clase 14): la regla 6 de docs/spec.md §6 con pedidos simultáneos.
 *
 *   "Un paciente no puede tener más de una derivación abierta desde el mismo
 *    centro de origen."
 *
 * Es una regla de "uno solo": entre preguntar "¿ya tiene una abierta?" y guardar
 * hay un hueco, y dos pedidos que llegan juntos pasan los dos por ese hueco. Un
 * doble toque en "Crear solicitud", dos pestañas o un reintento de red alcanzan.
 * El botón deshabilitado no lo frena: la regla la tiene que cumplir la base.
 *
 * Los diez pedidos salen juntos con Promise.all. Con un `for` y un await adentro
 * saldrían de a uno y la carrera no aparecería nunca.
 *
 *   npm run test:e2e -- concurrencia
 */

let derivante: APIRequestContext;
let base: PrismaClient;

test.beforeAll(async ({ playwright }) => {
  derivante = await playwright.request.newContext({
    baseURL: URL_APP,
    storageState: sesionDe("derivante"),
  });
  base = baseDePruebas();
});

test.afterAll(async () => {
  await derivante.dispose();
  await base.$disconnect();
});

/** Las derivaciones abiertas del paciente en el HECA, contadas en la base. */
function contarAbiertas(pacienteDni: string) {
  return base.solicitudTraslado.count({
    where: {
      centroOrigenId: "centro-origen-1",
      pacienteDni,
      estado: { notIn: ["RECHAZADA", "FINALIZADA"] },
    },
  });
}

test("diez pedidos simultáneos para el mismo paciente: se acepta uno y se rechazan nueve con 409", async () => {
  const dni = "40111222";
  // Antes, un pedido para otro paciente: la ruta ya está cargada y el usuario ya
  // existe, así los diez llegan juntos de verdad y no escalonados por el arranque.
  expect((await derivante.post("/api/solicitudes", { data: { pacienteDni: "40000001" } })).status()).toBe(201);

  const respuestas = await Promise.all(
    Array.from({ length: 10 }, () =>
      derivante.post("/api/solicitudes", { data: { pacienteDni: dni } }),
    ),
  );
  const status = respuestas.map((respuesta) => respuesta.status());

  // Lo que importa primero: en la base quedó una sola.
  expect(await contarAbiertas(dni)).toBe(1);
  // Y el resto se rechazó como regla (409), nunca como error del servidor (500).
  expect(status.filter((codigo) => codigo === 201)).toHaveLength(1);
  expect(status.filter((codigo) => codigo === 409)).toHaveLength(9);

  const rechazada = respuestas.find((respuesta) => respuesta.status() === 409);
  expect(await rechazada?.json()).toMatchObject({
    error: "El paciente ya tiene una derivación abierta desde tu centro",
    solicitudAbiertaId: expect.any(String),
  });
});

test("cuando la derivación se rechaza, el paciente se puede volver a derivar", async () => {
  const dni = "40333444";

  const primera = await derivante.post("/api/solicitudes", { data: { pacienteDni: dni } });
  expect(primera.status()).toBe(201);
  const { id } = (await primera.json()) as { id: string };

  expect((await derivante.post(`/api/solicitudes/${id}/rechazo`)).status()).toBe(200);

  const segunda = await derivante.post("/api/solicitudes", { data: { pacienteDni: dni } });
  expect(segunda.status()).toBe(201);
  expect(await contarAbiertas(dni)).toBe(1);
});

test("corregir el DNI al de un paciente con otra derivación abierta también es 409", async () => {
  const abierta = await derivante.post("/api/solicitudes", { data: { pacienteDni: "40555666" } });
  const otra = await derivante.post("/api/solicitudes", { data: { pacienteDni: "40777888" } });
  const { id } = (await otra.json()) as { id: string };
  expect([abierta.status(), otra.status()]).toEqual([201, 201]);

  const correccion = await derivante.patch(`/api/solicitudes/${id}`, {
    data: { pacienteDni: "40555666" },
  });

  expect(correccion.status()).toBe(409);
  expect(await contarAbiertas("40555666")).toBe(1);
});

test("en pantalla: un segundo intento para el mismo paciente avisa y lleva a la derivación abierta", async ({ browser }) => {
  const contexto = await browser.newContext({ storageState: sesionDe("derivante") });
  const pagina = await contexto.newPage();

  // 99000010 es la solicitud PENDIENTE del seed: el paciente ya tiene una abierta.
  await pagina.goto("/solicitudes/nueva");
  await pagina.getByLabel("DNI del paciente").fill("99000010");
  await pagina.getByRole("button", { name: "Crear solicitud" }).click();

  const aviso = pagina.getByRole("alert").filter({ hasText: "No se pudo guardar" });
  await expect(aviso).toContainText("El paciente ya tiene una derivación abierta desde tu centro");
  // El DNI escrito no se pierde.
  await expect(pagina.getByLabel("DNI del paciente")).toHaveValue("99000010");

  await aviso.getByRole("link", { name: "Ver la derivación abierta" }).click();
  await expect(pagina.getByRole("heading", { level: 1, name: "DNI 99.000.010" })).toBeVisible();
  await contexto.close();
});
