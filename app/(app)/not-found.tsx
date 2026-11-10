import { SinDatos } from "@/components/sin-datos";

/**
 * 404 de las pantallas con sesión (clase 10). Lo muestra notFound() cuando la
 * solicitud no existe o no es del centro del médico: el texto es el mismo para
 * los dos casos, a propósito, y no habla de permisos. Distinguirlos confirmaría
 * que el id existe.
 */
export default function NoEncontrada() {
  return (
    <SinDatos
      encabezado="h1"
      titulo="No encontramos esa solicitud"
      descripcion="Revisá que el enlace esté completo o buscala desde el listado."
      accion={{ href: "/", texto: "Ir a las solicitudes" }}
    />
  );
}
