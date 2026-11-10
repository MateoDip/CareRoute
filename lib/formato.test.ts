import { describe, expect, it } from "vitest";
import { formatearFechaHora } from "./formato";

describe("formatearFechaHora", () => {
  it("muestra la hora de Argentina aunque el servidor corra en UTC", () => {
    // 23:30 UTC = 20:30 en Rosario (UTC-3).
    const texto = formatearFechaHora(new Date("2026-11-09T23:30:00Z"));

    expect(texto).toContain("20:30");
    expect(texto).toContain("9/11");
  });

  it("cambia de día según la hora argentina, no la UTC", () => {
    // 01:00 UTC del 10/11 todavía es 9/11 a las 22:00 en Argentina.
    const texto = formatearFechaHora(new Date("2026-11-10T01:00:00Z"));

    expect(texto).toContain("9/11");
    expect(texto).toContain("22:00");
  });
});
