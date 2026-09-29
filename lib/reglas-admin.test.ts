import { describe, expect, it } from "vitest";
import {
  impedimentoParaCambiarUsuario,
  impedimentoParaEliminarCentro,
} from "./reglas-admin";

describe("impedimentoParaEliminarCentro", () => {
  it("un centro sin usuarios ni solicitudes se puede borrar", () => {
    expect(
      impedimentoParaEliminarCentro({ usuarios: 0, solicitudes: 0 }),
    ).toBeNull();
  });

  it("con usuarios vinculados no se borra, y dice cuántos son", () => {
    expect(
      impedimentoParaEliminarCentro({ usuarios: 3, solicitudes: 0 }),
    ).toEqual({ usuarios: 3, solicitudes: 0 });
  });

  it("límite: una sola solicitud histórica alcanza para impedirlo", () => {
    expect(
      impedimentoParaEliminarCentro({ usuarios: 0, solicitudes: 1 }),
    ).toEqual({ usuarios: 0, solicitudes: 1 });
  });
});

describe("impedimentoParaCambiarUsuario", () => {
  it("un admin puede cambiarle el rol a otro usuario", () => {
    expect(
      impedimentoParaCambiarUsuario({
        adminId: "a",
        usuarioId: "b",
        rolNuevo: "MEDICO_RECEPTOR",
      }),
    ).toBeNull();
  });

  it("un admin no puede quitarse el rol ADMIN a sí mismo", () => {
    expect(
      impedimentoParaCambiarUsuario({
        adminId: "a",
        usuarioId: "a",
        rolNuevo: "MEDICO_DERIVANTE",
      }),
    ).toBe("AUTO_DEGRADACION");
  });

  it("límite: sí puede cambiarse el centro, o reafirmarse como ADMIN", () => {
    expect(
      impedimentoParaCambiarUsuario({ adminId: "a", usuarioId: "a" }),
    ).toBeNull();
    expect(
      impedimentoParaCambiarUsuario({
        adminId: "a",
        usuarioId: "a",
        rolNuevo: "ADMIN",
      }),
    ).toBeNull();
  });
});
