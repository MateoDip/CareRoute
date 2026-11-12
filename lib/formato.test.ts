import { describe, expect, it } from "vitest";
import { formatearDni, formatearFechaHora, iniciales } from "./formato";

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

describe("formatearDni", () => {
  it("separa los miles con punto, como se lee un DNI", () => {
    expect(formatearDni("99000003")).toBe("99.000.003");
    expect(formatearDni("1234567")).toBe("1.234.567");
  });

  it("deja igual lo que no son solo números", () => {
    expect(formatearDni("12.345")).toBe("12.345");
  });
});

describe("iniciales", () => {
  it("toma nombre y apellido, sin el título ni lo que va entre paréntesis", () => {
    expect(iniciales("Dra. Gómez (Receptora Centenario)")).toBe("G");
    expect(iniciales("Dr. Juan Pérez")).toBe("JP");
  });

  it("con un mail como nombre, usa la parte de antes de la arroba", () => {
    expect(iniciales("mateo@careroute.test")).toBe("MC");
  });
});
