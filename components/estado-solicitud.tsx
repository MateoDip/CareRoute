import type { EstadoSolicitud, NivelUrgencia } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ETIQUETA_ESTADO, ETIQUETA_NIVEL } from "@/lib/formato";

/*
 * Traducción del dominio a la UI: qué variante de badge lleva cada estado y cada
 * nivel. Vive acá y no en components/ui/, que no conoce el dominio (clase 10).
 * El texto va siempre: dos estados pueden compartir variante, nunca etiqueta.
 */

type Variante = "default" | "secondary" | "destructive" | "outline";

const VARIANTE_ESTADO: Record<EstadoSolicitud, Variante> = {
  PENDIENTE: "outline",
  EVALUANDO: "secondary",
  APROBADA: "default",
  EN_CURSO: "default",
  FINALIZADA: "secondary",
  RECHAZADA: "destructive",
};

const VARIANTE_NIVEL: Record<NivelUrgencia, Variante> = {
  BAJO: "outline",
  MEDIO: "secondary",
  ALTO: "default",
  CRITICO: "destructive",
};

export function BadgeEstado({ estado }: { estado: EstadoSolicitud }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

export function BadgeNivel({ nivel }: { nivel: NivelUrgencia }) {
  return <Badge variant={VARIANTE_NIVEL[nivel]}>Urgencia {ETIQUETA_NIVEL[nivel].toLowerCase()}</Badge>;
}
