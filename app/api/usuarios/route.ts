import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { listarUsuarios } from "@/lib/db/usuarios";
import { responderError } from "@/lib/errores";

/**
 * GET /api/usuarios — todos los usuarios con su rol y centro (solo ADMIN).
 * Es lo que el admin necesita para ver quién se registró y todavía no tiene
 * centro asignado.
 */
export async function GET() {
  try {
    await requerirUsuario("ADMIN");
    const usuarios = await listarUsuarios();
    return NextResponse.json(usuarios, { status: 200 });
  } catch (error) {
    return responderError("GET /api/usuarios", error);
  }
}
