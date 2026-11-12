import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { IconoVolver } from "@/components/ui/iconos";
import { Pasos } from "@/components/ui/pasos";
import { cn } from "@/lib/utils";

const PASOS_DEL_DERIVANTE = ["Paciente", "Triaje", "Destino"] as const;

type Props = {
  /** En qué pantalla del derivante está: 1 paciente, 2 triaje, 3 destino (spec §5). */
  paso: 1 | 2 | 3;
  titulo: string;
  descripcion: React.ReactNode;
  volver: { href: string; texto: string };
};

/**
 * Encabezado de las tres pantallas que recorre el médico derivante (HU01 a HU04):
 * volver, en qué paso está y qué hace esta pantalla. Así sabe cuánto le falta
 * sin que nadie se lo explique (criterio "Aprendizaje", spec §7).
 */
export function EncabezadoDelFlujo({ paso, titulo, descripcion, volver }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={volver.href}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 self-start text-muted-foreground")}
      >
        <IconoVolver />
        {volver.texto}
      </Link>
      <Pasos
        etiqueta="Pasos para derivar"
        pasos={PASOS_DEL_DERIVANTE.map((titulo, indice) => ({
          titulo,
          estado: indice + 1 < paso ? "hecho" : indice + 1 === paso ? "actual" : "pendiente",
        }))}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
        <p className="max-w-prose text-muted-foreground">{descripcion}</p>
      </div>
    </div>
  );
}
