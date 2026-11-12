import { Navegacion } from "@/components/navegacion";
import { requerirMedicoEnPagina } from "@/lib/auth";

/**
 * Layout de las pantallas con sesión (grupo (app); el paréntesis no aparece en
 * la URL). Trae la barra de navegación y, sin sesión, manda a /ingresar.
 *
 * Esa redirección es experiencia de uso, NO autorización: cada página vuelve a
 * llamar a requerirMedicoEnPagina() y cada consulta lleva el centro de la
 * sesión en el `where`. Un layout no se vuelve a ejecutar en todas las
 * navegaciones, así que no se le puede confiar la seguridad.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await requerirMedicoEnPagina();

  return (
    <>
      <Navegacion nombre={usuario.nombre} rol={usuario.rol} />
      <main className="mx-auto w-full max-w-4xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">{children}</main>
    </>
  );
}
