import { SinDatos } from "@/components/sin-datos";

/** 404 del panel: un usuario o un centro que no existe (o una dirección mal escrita). */
export default function NoEncontradoAdmin() {
  return (
    <SinDatos
      encabezado="h1"
      titulo="No encontramos esa página"
      descripcion="Puede que el usuario o el centro ya no exista. Buscalo desde el panel."
      accion={{ href: "/admin", texto: "Ir al resumen" }}
    />
  );
}
