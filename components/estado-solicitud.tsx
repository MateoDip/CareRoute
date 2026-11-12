import type { EstadoSolicitud, NivelUrgencia } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Pasos } from "@/components/ui/pasos";
import { ETIQUETA_ESTADO, ETIQUETA_NIVEL } from "@/lib/formato";
import { pasosDelTraslado } from "@/lib/pasos-traslado";
import { cn } from "@/lib/utils";

/*
 * Traducción del dominio a la UI: qué variante lleva cada estado y cada nivel.
 * Vive acá y no en components/ui/, que no conoce el dominio (clase 10).
 *
 * Los cuatro colores del triaje (rojo, naranja, amarillo, verde) son solo para
 * el nivel de urgencia. Los estados usan la tinta petróleo y el rojo de error:
 * así "Nivel bajo" y "Aprobada" nunca se ven del mismo color. El texto va
 * siempre: el color nunca es el único dato.
 */

type VarianteEstado = "default" | "secondary" | "outline" | "suave" | "destructivo-suave";
type VarianteNivel = "rojo" | "naranja" | "amarillo" | "verde";

const VARIANTE_ESTADO: Record<EstadoSolicitud, VarianteEstado> = {
  PENDIENTE: "outline",
  EVALUANDO: "suave",
  APROBADA: "default",
  EN_CURSO: "default",
  FINALIZADA: "secondary",
  RECHAZADA: "destructivo-suave",
};

/** Los colores del triaje hospitalario: crítico rojo, alto naranja, medio amarillo, bajo verde. */
const VARIANTE_NIVEL: Record<NivelUrgencia, VarianteNivel> = {
  CRITICO: "rojo",
  ALTO: "naranja",
  MEDIO: "amarillo",
  BAJO: "verde",
};

const COLOR_NIVEL: Record<NivelUrgencia, string> = {
  CRITICO: "bg-triaje-rojo",
  ALTO: "bg-triaje-naranja",
  MEDIO: "bg-triaje-amarillo",
  BAJO: "bg-triaje-verde",
};

export function BadgeEstado({ estado }: { estado: EstadoSolicitud }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

export function BadgeNivel({ nivel }: { nivel: NivelUrgencia }) {
  // "Nivel crítico" y no "Urgencia crítico": las etiquetas son masculinas (el nivel).
  return (
    <Badge variant={VARIANTE_NIVEL[nivel]}>
      <MarcaNivel nivel={nivel} />
      Nivel {ETIQUETA_NIVEL[nivel].toLowerCase()}
    </Badge>
  );
}

/** El punto de color del nivel, como la pulsera del triaje. Decorativo: el texto va al lado. */
export function MarcaNivel({ nivel, className }: { nivel: NivelUrgencia; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", COLOR_NIVEL[nivel], className)} />
  );
}

/**
 * La franja del borde izquierdo de cada solicitud en el listado: el color del
 * nivel o, sin triaje todavía, el del borde. Decorativa: el badge dice el nivel.
 */
export function claseFranjaNivel(nivel: NivelUrgencia | null): string {
  return nivel ? COLOR_NIVEL[nivel] : "bg-border";
}

/** En qué paso del flujo principal (spec §5) está la derivación. */
export function PasosDelTraslado(props: Parameters<typeof pasosDelTraslado>[0]) {
  return <Pasos pasos={pasosDelTraslado(props)} etiqueta="Avance de la derivación" />;
}
