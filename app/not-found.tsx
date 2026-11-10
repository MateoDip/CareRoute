import { SinDatos } from "@/components/sin-datos";

/** 404 para direcciones que no existen en ningún grupo de rutas (si no, Next muestra uno en inglés). */
export default function PaginaNoEncontrada() {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <SinDatos
        encabezado="h1"
        titulo="No encontramos esta página"
        descripcion="Revisá que la dirección esté bien escrita."
        accion={{ href: "/", texto: "Ir al inicio" }}
      />
    </main>
  );
}
