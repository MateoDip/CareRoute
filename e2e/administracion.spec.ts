import { expect, test } from "@playwright/test";
import { sesionDe, USUARIOS } from "./sesiones";

/**
 * El panel de administración (/admin), de punta a punta: lo que el admin hace
 * para que la red funcione. Los valores esperados salen de la spec (§2 Roles,
 * reglas 4 y 5) y de docs/api.md, no del código.
 *
 *  - Regla 4: quien entra con Google queda sin centro y no puede operar hasta
 *    que el admin le asigna uno. Un admin no puede quitarse su propio rol.
 *  - Regla 5: no se da de baja un centro con usuarios o derivaciones.
 *  - CentroSalud tiene CRUD completo a cargo del admin (spec §2), y al crearlo
 *    se cargan sus camas libres de cada tipo (regla 7).
 *
 * Todo se escribe a través de la app. El centro que se crea se borra al final,
 * así no aparece en el ranking de las otras pruebas.
 */

const HECA = "Hospital de Emergencias Clemente Álvarez (HECA)";
const CENTRO_NUEVO = "Clínica de Prueba del Panel";
const CENTRO_EDITADO = "Clínica de Prueba del Panel (editada)";

test("panel del admin: asigna centro a una médica nueva y administra los centros", async ({ browser }) => {
  const contextoNueva = await browser.newContext({ storageState: sesionDe("nuevo") });
  const contextoAdmin = await browser.newContext({ storageState: sesionDe("admin") });
  const nueva = await contextoNueva.newPage();
  const admin = await contextoAdmin.newPage();
  const nombreNueva = USUARIOS.nuevo.nombre;

  await test.step("1. la médica entra por primera vez y todavía no puede operar (regla 4)", async () => {
    await nueva.goto("/");
    await expect(nueva).toHaveURL(/\/sin-acceso$/);
    await expect(nueva.getByRole("heading", { name: "Tu cuenta todavía no puede operar" })).toBeVisible();
  });

  await test.step("2. el admin entra a la app y llega a su panel, donde la ve esperando centro", async () => {
    await admin.goto("/");
    await expect(admin).toHaveURL(/\/admin$/);
    await expect(admin.getByRole("heading", { level: 1, name: "Panel de administración" })).toBeVisible();
    await expect(admin.getByRole("link", { name: `Asignar centro a ${nombreNueva}` })).toBeVisible();
  });

  await test.step("3. le asigna rol y centro", async () => {
    await admin.getByRole("link", { name: `Asignar centro a ${nombreNueva}` }).click();
    await expect(admin.getByRole("heading", { level: 1, name: nombreNueva })).toBeVisible();
    await admin.getByLabel("Rol").selectOption({ label: "Médico derivante" });
    await admin.getByLabel("Centro de salud").selectOption({ label: HECA });
    await admin.getByRole("button", { name: "Guardar" }).click();

    await expect(admin.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
    await expect(admin.getByRole("link", { name: new RegExp(`${escapar(nombreNueva)}.*${escapar(HECA)}`) })).toBeVisible();
  });

  await test.step("4. la médica vuelve a entrar y ya ve las solicitudes de su centro", async () => {
    await nueva.goto("/");
    await expect(nueva.getByRole("heading", { level: 1, name: "Solicitudes de tu centro" })).toBeVisible();
    await expect(nueva.getByText(HECA)).toBeVisible();
  });

  await test.step("5. el admin no puede quitarse su propio rol (regla 4)", async () => {
    await admin.getByRole("navigation", { name: "Administración" }).getByRole("link", { name: "Usuarios" }).click();
    await admin.getByRole("link", { name: new RegExp(escapar(USUARIOS.admin.nombre)) }).click();
    await admin.getByLabel("Rol").selectOption({ label: "Médico derivante" });
    await admin.getByRole("button", { name: "Guardar" }).click();

    await expect(admin.getByRole("alert").filter({ hasText: "No se pudo guardar" })).toContainText(
      "No podés quitarte el rol de administrador",
    );
  });

  await test.step("6. da de alta un centro con sus camas, y sin nombre no avanza", async () => {
    await admin.getByRole("navigation", { name: "Administración" }).getByRole("link", { name: "Centros" }).click();
    await admin.getByRole("link", { name: "Nuevo centro" }).first().click();

    await admin.getByRole("button", { name: "Crear centro" }).click();
    await expect(admin.getByLabel("Nombre")).toHaveAttribute("aria-invalid", "true");

    await admin.getByLabel("Nombre").fill(CENTRO_NUEVO);
    await admin.getByLabel("Nivel de complejidad").selectOption({ label: "Media" });
    await admin.getByLabel("Ubicación").fill("Calle de Prueba 123, Rosario");
    // Regla 7: al crear el centro se cargan sus camas libres de cada tipo, y no negativas.
    await admin.getByLabel("UTI").fill("-1");
    await admin.getByRole("button", { name: "Crear centro" }).click();
    await expect(admin.getByText("No puede haber menos de cero camas")).toBeVisible();
    await expect(admin.getByLabel("Nombre")).toHaveValue(CENTRO_NUEVO);

    await admin.getByLabel("UTI").fill("2");
    await admin.getByLabel("Sala común").fill("5");
    await admin.getByRole("button", { name: "Crear centro" }).click();

    await expect(admin.getByRole("heading", { level: 1, name: "Centros de salud" })).toBeVisible();
    await expect(admin.getByRole("link", { name: CENTRO_NUEVO, exact: true })).toBeVisible();
    await expect(admin.getByText("UTI: 2 libres · UCO: 0 libres · Sala común: 5 libres · Guardia: 0 libres")).toBeVisible();
  });

  await test.step("7. lo edita", async () => {
    await admin.getByRole("link", { name: CENTRO_NUEVO, exact: true }).click();
    await admin.getByLabel("Nombre").fill(CENTRO_EDITADO);
    await admin.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(admin.getByRole("link", { name: CENTRO_EDITADO, exact: true })).toBeVisible();
  });

  await test.step("8. no puede dar de baja un centro con usuarios y derivaciones (regla 5)", async () => {
    await admin.getByRole("link", { name: HECA, exact: true }).click();
    await admin.getByRole("button", { name: "Dar de baja el centro" }).click();
    await admin.getByRole("button", { name: "Sí, dar de baja el centro" }).click();

    await expect(admin.getByRole("alert").filter({ hasText: "No se pudo guardar" })).toContainText(
      "No se puede dar de baja un centro con usuarios o derivaciones",
    );
  });

  await test.step("9. da de baja el centro nuevo, que no tiene nada vinculado", async () => {
    await admin.getByRole("navigation", { name: "Administración" }).getByRole("link", { name: "Centros" }).click();
    await admin.getByRole("link", { name: CENTRO_EDITADO, exact: true }).click();
    await admin.getByRole("button", { name: "Dar de baja el centro" }).click();
    await admin.getByRole("button", { name: "Sí, dar de baja el centro" }).click();

    await expect(admin.getByRole("heading", { level: 1, name: "Centros de salud" })).toBeVisible();
    await expect(admin.getByRole("link", { name: CENTRO_EDITADO, exact: true })).toHaveCount(0);
  });

  await contextoNueva.close();
  await contextoAdmin.close();
});

/** Un texto literal dentro de una expresión regular (los paréntesis del nombre). */
function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
