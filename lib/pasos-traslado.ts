import type { EstadoSolicitud } from "@prisma/client";

export type EstadoPaso = "hecho" | "actual" | "pendiente" | "cancelado";

export type Paso = { titulo: string; estado: EstadoPaso };

/**
 * En qué punto del flujo principal (spec §5) está una derivación, para la línea
 * de pasos de la ficha. Función pura: no lee la base ni el reloj.
 *
 * Los pasos se marcan por lo que ya ocurrió (tiene triaje, tiene destino, se
 * aprobó), no solo por el estado: una derivación RECHAZADA muestra hasta dónde
 * llegó y termina en "Rechazada", sin los pasos que ya no van a pasar.
 */
export function pasosDelTraslado(params: {
  estado: EstadoSolicitud;
  tieneTriaje: boolean;
  tieneDestino: boolean;
  fueAprobada: boolean;
}): Paso[] {
  const { estado, tieneTriaje, tieneDestino, fueAprobada } = params;

  const alcanzados: [string, boolean][] = [
    ["Solicitud creada", true],
    ["Triaje", tieneTriaje],
    ["Destino elegido", tieneDestino],
    ["Aprobada por el destino", fueAprobada || estado === "EN_CURSO" || estado === "FINALIZADA"],
    ["En traslado", estado === "FINALIZADA"],
    ["Finalizada", estado === "FINALIZADA"],
  ];

  if (estado === "RECHAZADA") {
    const hechos = alcanzados.filter(([, hecho]) => hecho);
    return [
      ...hechos.map(([titulo]) => ({ titulo, estado: "hecho" as const })),
      { titulo: "Rechazada", estado: "cancelado" },
    ];
  }

  const primeroSinHacer = alcanzados.findIndex(([, hecho]) => !hecho);
  return alcanzados.map(([titulo, hecho], indice) => ({
    titulo,
    estado: hecho ? "hecho" : indice === primeroSinHacer ? "actual" : "pendiente",
  }));
}
