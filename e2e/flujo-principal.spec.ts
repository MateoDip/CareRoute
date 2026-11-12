import { devices, expect, test } from "@playwright/test";
import { sesionDe } from "./sesiones";

/**
 * El flujo principal de docs/spec.md §5, de punta a punta, como lo usan dos
 * personas (clase 13).
 *
 * Una prueba larga y no seis cortas: los errores importan en las costuras entre
 * pantallas. Cada `test.step` es un paso de la spec, así el reporte dice cuál
 * falló. Los valores esperados salen de la spec y de los criterios de
 * aceptación, no del código.
 *
 * El derivante usa un teléfono (RNF02: se deriva desde la guardia) y el receptor
 * una computadora. Se busca como busca una persona: por rol, etiqueta y texto.
 * Eso también comprueba la accesibilidad (htmlFor, legend, nombres de botones).
 *
 * Casos de error en el medio: el DNI vacío (HU01) y la IA que no responde (HU02,
 * spec §8): .env.e2e apunta OpenAI a una ruta que no existe.
 */

const DNI = "30123456";
const DNI_EN_PANTALLA = "DNI 30.123.456";
const DESTINO = "Hospital Provincial del Centenario";

test("flujo principal: del DNI del paciente a la cama reservada en el destino", async ({ browser }) => {
  const telefono = await browser.newContext({
    ...devices["Pixel 7"],
    storageState: sesionDe("derivante"),
  });
  const computadora = await browser.newContext({ storageState: sesionDe("receptor") });
  const derivante = await telefono.newPage();
  const receptor = await computadora.newPage();
  let fichaUrl = "";

  await test.step("1. el derivante crea la solicitud con el DNI (HU01), y sin DNI no avanza", async () => {
    await derivante.goto("/");
    await derivante.getByRole("link", { name: "Nueva solicitud" }).click();

    // Caso de error de HU01: falta un campo obligatorio → se señala el campo.
    await derivante.getByRole("button", { name: "Crear solicitud" }).click();
    await expect(derivante.getByText("Completá este campo")).toBeVisible();
    await expect(derivante.getByLabel("DNI del paciente")).toHaveAttribute("aria-invalid", "true");

    await derivante.getByLabel("DNI del paciente").fill(DNI);
    await derivante.getByRole("button", { name: "Crear solicitud" }).click();

    await expect(derivante.getByRole("heading", { level: 1, name: DNI_EN_PANTALLA })).toBeVisible();
    await expect(derivante.getByText("Pendiente", { exact: true })).toBeVisible();
    fichaUrl = derivante.url();
  });

  await test.step("2. carga los signos vitales; la IA no responde y elige el nivel a mano (HU02)", async () => {
    await derivante.getByRole("link", { name: "Cargar triaje" }).click();
    await derivante.getByLabel("Frecuencia cardíaca (lpm)").fill("128");
    await derivante.getByLabel("Presión sistólica (mmHg)").fill("85");
    await derivante.getByLabel("Presión diastólica (mmHg)").fill("50");
    await derivante.getByRole("button", { name: "Guardar triaje" }).click();

    // Caso de error de HU02: avisa que no hubo conexión y no pierde los signos vitales.
    await expect(derivante.getByRole("alert").filter({ hasText: "No se pudo guardar" })).toContainText(
      "La IA no respondió",
    );
    await expect(derivante.getByLabel("Frecuencia cardíaca (lpm)")).toHaveValue("128");

    await derivante.getByRole("radio", { name: "Crítico" }).check();
    await derivante.getByRole("button", { name: "Guardar triaje" }).click();

    await expect(derivante.getByText("Evaluando", { exact: true })).toBeVisible();
    await expect(derivante.getByText("Nivel crítico")).toBeVisible();
    await expect(derivante.getByText("elegido por el médico")).toBeVisible();
  });

  await test.step("3. ve el ranking: solo centros con cama UTI libre, sin el propio (HU03, regla 1)", async () => {
    await derivante.getByRole("link", { name: "Ver ranking y elegir destino" }).click();
    await expect(derivante.getByText("el paciente necesita una cama de UTI")).toBeVisible();

    await expect(derivante.getByRole("radio", { name: new RegExp(DESTINO) })).toBeVisible();
    // El sanatorio tiene 0 camas UTI y el HECA es el origen: ninguno puede aparecer.
    await expect(derivante.getByRole("radio", { name: /Sin Camas UTI/ })).toHaveCount(0);
    await expect(derivante.getByRole("radio", { name: /Clemente Álvarez/ })).toHaveCount(0);
  });

  await test.step("4. elige el destino del ranking y espera la aprobación (HU04)", async () => {
    await derivante.getByRole("radio", { name: new RegExp(DESTINO) }).check();
    await derivante.getByRole("button", { name: "Confirmar destino" }).click();

    await expect(derivante.getByText("Esperando que el centro de destino la apruebe")).toBeVisible();
    await expect(derivante.getByText(DESTINO)).toBeVisible();
  });

  await test.step("5. el receptor la ve entre sus entrantes y la aprueba: se reserva la cama (HU06, HU04)", async () => {
    await receptor.goto("/");
    await receptor
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Entrantes" })
      .click();
    await expect(receptor.getByRole("heading", { level: 1, name: "Solicitudes entrantes" })).toBeVisible();

    await receptor.getByRole("link", { name: new RegExp(DNI_EN_PANTALLA) }).click();
    await expect(receptor.getByRole("heading", { level: 1, name: DNI_EN_PANTALLA })).toBeVisible();
    await receptor.getByRole("button", { name: "Aprobar y reservar cama" }).click();

    await expect(receptor.getByText("Aprobada: la cama está reservada")).toBeVisible();
    // Queda la fecha y hora de la decisión.
    await expect(receptor.getByText("Todavía no", { exact: true })).toHaveCount(0);
  });

  await test.step("6. el derivante ve la aprobación y ya no puede cancelarla (HU07, regla 3)", async () => {
    await derivante.goto(fichaUrl);
    await expect(derivante.getByText("La aprobó el centro de destino")).toBeVisible();
    await expect(derivante.getByRole("button", { name: "Rechazar derivación" })).toHaveCount(0);
    // Paso 6 de la spec (tripulación y bitácora): todavía sin pantalla para cargarlos.
    await expect(derivante.getByRole("heading", { name: "Bitácora del traslado" })).toBeVisible();
  });

  await telefono.close();
  await computadora.close();
});
