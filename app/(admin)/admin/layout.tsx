import { NavegacionAdmin } from "@/components/navegacion-admin";
import { requerirAdminEnPagina } from "@/lib/auth";

/**
 * Layout del panel de administración (grupo (admin)). Trae la barra del admin;
 * sin sesión manda a /ingresar y a un médico le responde 404.
 *
 * Como en (app), esto es experiencia de uso y no autorización: cada página y
 * cada Server Action vuelven a llamar a requerirAdminEnPagina(), porque un
 * layout no se vuelve a ejecutar en todas las navegaciones.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await requerirAdminEnPagina();

  return (
    <>
      <NavegacionAdmin nombre={admin.nombre} />
      <main className="mx-auto w-full max-w-4xl px-4 pt-6 pb-16 sm:px-6 sm:pt-8">{children}</main>
    </>
  );
}
