import { describe, expect, it } from "vitest";
import { z } from "zod";
import { rechazo } from "./casos/resultado";
import {
  camasDe,
  estadoDeRechazo,
  estadoDeValidacion,
  mensajesEnCastellano,
  numeroDe,
  opcionDe,
  valoresDe,
} from "./formularios";
import { camasPorTipoSchema } from "./schemas/unidad-cuidados";

function formulario(campos: Record<string, string>) {
  const formData = new FormData();
  for (const [campo, valor] of Object.entries(campos)) formData.append(campo, valor);
  return formData;
}

describe("numeroDe", () => {
  it("un campo vacío o con espacios es undefined, para que Zod diga 'Completá este campo'", () => {
    const formData = formulario({ edad: "", presion: "   " });

    expect(numeroDe(formData, "edad")).toBeUndefined();
    expect(numeroDe(formData, "presion")).toBeUndefined();
    expect(numeroDe(formData, "no-existe")).toBeUndefined();
  });

  it("acepta coma decimal, como se escribe en Argentina", () => {
    expect(numeroDe(formulario({ temperatura: "37,5" }), "temperatura")).toBe(37.5);
    expect(numeroDe(formulario({ temperatura: " 38 " }), "temperatura")).toBe(38);
  });

  it("un texto que no es número es NaN, para que Zod diga 'Ingresá un número'", () => {
    expect(numeroDe(formulario({ edad: "abc" }), "edad")).toBeNaN();
  });
});

describe("opcionDe", () => {
  it("la opción vacía de un select ('Elegí…') es undefined", () => {
    expect(opcionDe(formulario({ tipo: "" }), "tipo")).toBeUndefined();
  });

  it("devuelve la opción elegida tal cual", () => {
    expect(opcionDe(formulario({ tipo: "UTI" }), "tipo")).toBe("UTI");
  });
});

describe("valoresDe", () => {
  it("conserva lo que la persona escribió, sin los campos internos de Next ($ACTION_…)", () => {
    const formData = formulario({ dni: "30111222", $ACTION_ID_abc: "", nombre: "Juan" });

    expect(valoresDe(formData)).toEqual({ dni: "30111222", nombre: "Juan" });
  });
});

describe("mensajesEnCastellano", () => {
  const schema = z.object({
    edad: z.number(),
    tipo: z.enum(["UTI", "UCO"]),
  });

  function mensajes(datos: unknown) {
    const resultado = schema.safeParse(datos, { errorMap: mensajesEnCastellano });
    if (resultado.success) throw new Error("se esperaba un error de validación");
    return resultado.error.flatten().fieldErrors;
  }

  it("campo vacío → 'Completá este campo'", () => {
    expect(mensajes({ tipo: "UTI" }).edad).toEqual(["Completá este campo"]);
  });

  it("número inválido → 'Ingresá un número'", () => {
    expect(mensajes({ edad: Number.NaN, tipo: "UTI" }).edad).toEqual(["Ingresá un número"]);
  });

  it("opción fuera de la lista → 'Elegí una opción de la lista'", () => {
    expect(mensajes({ edad: 40, tipo: "QUIROFANO" }).tipo).toEqual([
      "Elegí una opción de la lista",
    ]);
  });

  it("los mensajes propios del schema tienen prioridad", () => {
    const camas = camasPorTipoSchema.safeParse(
      camasDe(formulario({ UTI: "-1", UCO: "2", SALA_COMUN: "3", GUARDIA: "4" })),
      { errorMap: mensajesEnCastellano },
    );

    expect(camas.success).toBe(false);
    expect(camas.error?.flatten().fieldErrors.UTI).toEqual(["No puede haber menos de cero camas"]);
  });
});

describe("camasDe", () => {
  it("lee un campo por tipo de unidad: vacío → undefined, texto → NaN", () => {
    const camas = camasDe(formulario({ UTI: "4", UCO: "", SALA_COMUN: "dos", GUARDIA: "0" }));

    expect(camas.UTI).toBe(4);
    expect(camas.UCO).toBeUndefined();
    expect(camas.SALA_COMUN).toBeNaN();
    expect(camas.GUARDIA).toBe(0);
  });
});

describe("estados del formulario", () => {
  it("validación fallida → errores por campo y conserva lo escrito", () => {
    const formData = formulario({ edad: "" });
    const error = z.object({ edad: z.number() }).safeParse(
      { edad: numeroDe(formData, "edad") },
      { errorMap: mensajesEnCastellano },
    ).error!;

    expect(estadoDeValidacion(error, formData)).toEqual({
      errores: { edad: ["Completá este campo"] },
      valores: { edad: "" },
    });
  });

  it("regla de negocio → un mensaje arriba del formulario y conserva lo escrito", () => {
    const formData = formulario({ dni: "30111222" });
    const motivo = rechazo(
      "DERIVACION_ABIERTA",
      "El paciente ya tiene una derivación abierta desde tu centro",
    );

    expect(estadoDeRechazo(motivo, formData)).toEqual({
      error: "El paciente ya tiene una derivación abierta desde tu centro",
      valores: { dni: "30111222" },
    });
  });
});
