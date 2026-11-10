import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  titulo: string;
  descripcion: string;
  /** Salida desde el estado vacío: a dónde ir o qué hacer ahora. */
  accion?: { href: string; texto: string };
  /** h1 cuando es todo el contenido de la pantalla (404); h2 si va debajo de otro título. */
  encabezado?: "h1" | "h2";
};

/**
 * Estado vacío (clase 10): lo decide el servidor cuando la consulta trae 0
 * filas. No es lo mismo que "sin resultados", que es el filtro del cliente
 * dejando la lista vacía: cada uno tiene su propio texto.
 */
export function SinDatos({ titulo, descripcion, accion, encabezado = "h2" }: Props) {
  return (
    <Card>
      <CardHeader>
        {/* wrap-anywhere y no break-words: el encabezado de Card es un grid, y una
            palabra larga sin espacios lo ensancharía más allá de la pantalla. */}
        <CardTitle as={encabezado} className="text-lg wrap-anywhere">
          {titulo}
        </CardTitle>
        <CardDescription className="wrap-anywhere">{descripcion}</CardDescription>
      </CardHeader>
      {accion && (
        <CardContent>
          <Link href={accion.href} className={buttonVariants({ variant: "outline" })}>
            {accion.texto}
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
